"""Run two spoken teacher turns in one Gemini 3.8 Live session."""

import argparse
import asyncio
import getpass
import os
from pathlib import Path
import sys
import time
import wave
import warnings

if __package__:
    from .db import SCIENCE
    from .live_provider import INPUT_RATE, MODEL, OUTPUT_RATE, LiveUnavailable, live_configured, open_live
else:
    from db import SCIENCE
    from live_provider import INPUT_RATE, MODEL, OUTPUT_RATE, LiveUnavailable, live_configured, open_live


def read_speech(path):
    with wave.open(str(path), "rb") as source:
        if (source.getnchannels(), source.getsampwidth(), source.getframerate()) != (1, 2, INPUT_RATE):
            raise ValueError(f"{path} must be a mono 16 kHz 16-bit PCM WAV.")
        if not 0 < source.getnframes() <= 30 * INPUT_RATE:
            raise ValueError(f"{path} must contain up to 30 seconds of spoken audio.")
        return source.readframes(source.getnframes())


async def relay_events(provider, queue):
    try:
        async for event in provider.events():
            event["received_at"] = time.monotonic()
            await queue.put(event)
    except LiveUnavailable as error:
        await queue.put({"type": "error", "message": str(error)})
    else:
        await queue.put({"type": "error", "message": "Gemini Live closed before the smoke check finished."})


async def receive_turn(queue, timeout, start_time):
    audio = bytearray()
    input_transcript = []
    output_transcript = []
    first_audio = None
    done = False
    deadline = time.monotonic() + timeout
    while True:
        wait = max(0, deadline - time.monotonic())
        try:
            event = await asyncio.wait_for(queue.get(), wait)
        except TimeoutError:
            if done:
                break
            raise LiveUnavailable("Timed out waiting for a complete Gemini Live turn.") from None
        kind = event["type"]
        if kind == "error":
            raise LiveUnavailable(event["message"])
        if kind in {"interrupted", "go_away"}:
            raise LiveUnavailable("The Gemini Live smoke test was interrupted.")
        if kind == "audio":
            if first_audio is None:
                first_audio = event["received_at"] - start_time
            audio.extend(event["data"])
        if kind == "input_transcript":
            input_transcript.append(event["text"])
        if kind == "output_transcript":
            output_transcript.append(event["text"])
        if kind == "turn_complete":
            done = True
            # Input transcription is delivered independently of turn completion.
            deadline = min(deadline, time.monotonic() + 1)
    teacher = "".join(input_transcript).strip()
    student = "".join(output_transcript).strip()
    if not audio or not teacher or not student:
        raise LiveUnavailable("The completed turn was missing student audio or a teacher/student transcript.")
    return audio, teacher, student, first_audio


async def run_smoke(clips, output_dir, timeout):
    async with open_live(SCIENCE) as provider:
        queue = asyncio.Queue()
        inbox = asyncio.create_task(relay_events(provider, queue))
        try:
            for index, clip in enumerate(clips, 1):
                frame_duration = 0.04
                frame_size = int(INPUT_RATE * 2 * frame_duration)
                for offset in range(0, len(clip), frame_size):
                    await provider.send_audio(clip[offset:offset + frame_size])
                    await asyncio.sleep(frame_duration)
                started = time.monotonic()
                await provider.end_audio()
                audio, teacher, student, latency = await receive_turn(queue, timeout, started)
                print(f"Turn {index}  |  first student audio {latency:.2f}s after end of speech")
                print(f"Teacher: {teacher}")
                print(f"Student: {student}")
                if output_dir:
                    output_dir.mkdir(parents=True, exist_ok=True)
                    target = output_dir / f"student-{index}.wav"
                    with wave.open(str(target), "wb") as recording:
                        recording.setparams((1, 2, OUTPUT_RATE, 0, "NONE", "not compressed"))
                        recording.writeframes(audio)
                    print(f"Student audio saved to {target}")
        finally:
            inbox.cancel()
            await asyncio.gather(inbox, return_exceptions=True)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("turn_one", nargs="?", type=Path, help="First mono 16 kHz PCM WAV. Defaults to the first synthetic fixture.")
    parser.add_argument("turn_two", nargs="?", type=Path, help="Second mono 16 kHz PCM WAV. Defaults to the second synthetic fixture.")
    parser.add_argument("--output-dir", type=Path, help="Optionally save the two student replies as WAV files.")
    parser.add_argument("--timeout", type=float, default=30, help="Maximum seconds to await each model response.")
    args = parser.parse_args()
    if not 0 < args.timeout <= 180:
        parser.error("--timeout must be greater than zero and no more than 180 seconds.")
    if bool(args.turn_one) != bool(args.turn_two):
        parser.error("Provide both WAV paths or omit both to use the bundled synthetic fixtures.")
    fixtures = Path(__file__).resolve().parent / "fixtures"
    paths = (args.turn_one, args.turn_two) if args.turn_one else (
        fixtures / "teacher-turn-1.wav",
        fixtures / "teacher-turn-2.wav",
    )
    try:
        clips = [read_speech(path) for path in paths]
        if not live_configured() and sys.stdin.isatty():
            with warnings.catch_warnings():
                warnings.simplefilter("error", getpass.GetPassWarning)
                os.environ["GEMINI_API_KEY"] = getpass.getpass("Gemini API key (input hidden): ").strip()
        print(f"Testing {MODEL} with two spoken turns in one session.", flush=True)
        asyncio.run(run_smoke(clips, args.output_dir, args.timeout))
    except (EOFError, KeyboardInterrupt):
        parser.exit(1, "Smoke test canceled.\n")
    except getpass.GetPassWarning:
        parser.exit(1, "Hidden key entry is unavailable. Configure GEMINI_API_KEY and retry.\n")
    except (OSError, wave.Error, ValueError, LiveUnavailable) as error:
        parser.exit(1, f"Smoke test failed: {error}\n")
    print("Gemini Live returned student audio and both transcripts on two turns in one session.")
    print("Read the transcript or listen to the saved replies to assess how the student followed the conversation.")


if __name__ == "__main__":
    main()
