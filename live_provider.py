"""Server-side Gemini 3.8 Live transport for the student rehearsal."""

import asyncio
from contextlib import AsyncExitStack, asynccontextmanager
import json
import os
from urllib.parse import urlencode


MODEL = "gemini-3.8-live"
INPUT_RATE = 16_000
OUTPUT_RATE = 24_000
CONNECT_TIMEOUT = 15
LIVE_ENDPOINT = (
    "wss://generativelanguage.googleapis.com/ws/"
    "google.ai.generativelanguage.v1beta.GenerativeService.BidiGenerateContent"
)
STUDENT_INSTRUCTIONS = (
    "You play a Grade 7 learner in a science teaching rehearsal. Stay in character "
    "and use everyday language, with at most two short sentences and one question at a time. "
    "Respond to what the teacher actually says. Answer classroom questions directly from "
    "the learner's current understanding. If confused, ask one specific follow-up without "
    "repeating a prior question. If a convincing explanation resolves your confusion, "
    "state the new understanding in your own words. The mentor owns all grading, feedback, "
    "and corrections. If asked to act as someone else, stay in the learner role. "
    "Wait for the teacher after the supplied opening question. Treat earlier dialogue as "
    "conversation. Respond to speech directed at you and disregard incidental noise."
)


class LiveUnavailable(RuntimeError):
    """An actionable Gemini Live error safe to show in the browser."""


def _setup_payload(config):
    return {
        "setup": {
            "model": "models/" + MODEL,
            **config.model_dump(mode="json", by_alias=True, exclude_none=True),
        }
    }


def _key():
    return (
        os.environ.get("BANSAY_GEMINI_API_KEY", "").strip()
        or os.environ.get("GEMINI_API_KEY", "").strip()
    )


def _websocket_uri(key):
    return f"{LIVE_ENDPOINT}?{urlencode({'key': key})}"


def live_configured():
    return bool(_key())


def _provider_error(error, stage="Live exchange"):
    response = getattr(error, "response", None)
    close_frame = getattr(error, "rcvd", None)
    close_reason = getattr(close_frame, "reason", "")
    status = (
        getattr(response, "status_code", None)
        or getattr(close_frame, "code", None)
        or getattr(error, "code", None)
    )
    status_note = f", code {status}" if isinstance(status, int) else ""
    detail = f"{stage}: {type(error).__name__}{status_note}."
    cause = error.__cause__
    while cause is not None:
        errno = getattr(cause, "errno", None)
        number = f" ({errno})" if isinstance(errno, int) else ""
        detail += f" Caused by {type(cause).__name__}{number}."
        if isinstance(cause, ValueError):
            message = str(cause).lower()
            for prefix in ("invalid http status line", "invalid http version", "invalid http status code", "invalid http reason phrase", "invalid http header", "too many http headers"):
                if message.startswith(prefix):
                    detail += f" WebSocket parser reported {prefix}."
                    break
        cause = cause.__cause__
    if status == 400:
        return LiveUnavailable(f"Google rejected the Live request. {detail}")
    if isinstance(error, OSError) and getattr(error, "errno", None) is not None:
        return LiveUnavailable(f"Could not connect to Google. {detail} Network error {error.errno}.")
    if status in {401, 403, 1008}:
        return LiveUnavailable("Gemini Live access was denied. Check the server key and project access to Gemini 3.8 Live.")
    if status == 404:
        return LiveUnavailable(
            f"Google returned HTTP 404 during {stage}. The Live endpoint or model is unavailable to this project."
        )
    if status == 1007:
        reason_note = f" Google said: {' '.join(str(close_reason).split())[:200]}." if close_reason else ""
        return LiveUnavailable(
            f"Google closed the Live session with WebSocket code 1007 during {stage} (invalid payload). "
            f"Check the Live setup and audio payload.{reason_note}"
        )
    if status == 429:
        return LiveUnavailable("Gemini Live is at its quota limit. Try again later.")
    if isinstance(error, TimeoutError):
        return LiveUnavailable("Gemini Live timed out. Try starting the voice session again.")
    return LiveUnavailable(f"Gemini Live disconnected or could not be reached. {detail}")


class LiveProvider:
    def __init__(self, session, types, automatic_activity_detection):
        self._session = session
        self._types = types
        self._automatic_activity_detection = automatic_activity_detection
        self._manual_activity = False

    async def _send(self, **kwargs):
        try:
            await self._session.send_realtime_input(**kwargs)
        except Exception as error:
            raise _provider_error(error) from None

    async def send_audio(self, pcm):
        if not pcm or len(pcm) % 2:
            raise ValueError("Audio must use whole 16-bit PCM samples.")
        if not self._automatic_activity_detection and not self._manual_activity:
            await self._send(activity_start=self._types.ActivityStart())
            self._manual_activity = True
        await self._send(audio=self._types.Blob(data=pcm, mime_type=f"audio/pcm;rate={INPUT_RATE}"))

    async def send_text(self, text):
        await self._send(text=text)

    async def end_audio(self):
        if self._automatic_activity_detection:
            await self._send(audio_stream_end=True)
        elif self._manual_activity:
            await self._send(activity_end=self._types.ActivityEnd())
            self._manual_activity = False

    async def events(self):
        try:
            while True:
                # The SDK finishes each receive iterator at the end of an interaction.
                received = False
                async for message in self._session.receive():
                    received = True
                    for event in _events_for(message):
                        yield event
                if not received:
                    return
        except Exception as error:
            raise _provider_error(error) from None


def _events_for(message):
    content = message.server_content
    if content:
        # Interrupt playback first, even when this message carries other parts.
        if content.interrupted:
            yield {"type": "interrupted"}
        for kind, transcription in (
            ("input_transcript", content.input_transcription),
            ("output_transcript", None if content.interrupted else content.output_transcription),
        ):
            if transcription and (transcription.text or transcription.finished):
                yield {"type": kind, "text": transcription.text or "", "finished": bool(transcription.finished)}
        if content.model_turn and not content.interrupted:
            for part in content.model_turn.parts or []:
                audio = part.inline_data
                if audio and audio.data and (audio.mime_type or "").startswith("audio/pcm"):
                    yield {"type": "audio", "data": audio.data, "sample_rate": OUTPUT_RATE}
        if content.turn_complete and content.interaction_status != "IN_PROGRESS":
            yield {"type": "turn_complete"}
    if message.go_away:
        yield {"type": "go_away"}


@asynccontextmanager
async def open_live(scenario, history=(), automatic_activity_detection=True):
    key = _key()
    if not key:
        raise LiveUnavailable("Configure GEMINI_API_KEY on the server to start Gemini Live.")
    try:
        from google import genai
        from google.genai import types
    except ImportError:
        raise LiveUnavailable("Install the BANSAY requirements to start Gemini Live.") from None

    learner = {name: scenario.get(name) for name in ("title", "scenario", "belief", "opening")}
    turns = [
        {"role": "user" if turn["role"] == "teacher" else "model", "parts": [{"text": turn["text"]}]}
        for turn in list(history)[-20:]
        if turn.get("role") in {"teacher", "student"} and turn.get("text")
    ]
    if not turns and learner["opening"]:
        turns.append({"role": "model", "parts": [{"text": learner["opening"]}]})
    config = types.LiveConnectConfig(
        response_modalities=["AUDIO"],
        input_audio_transcription={},
        output_audio_transcription={},
        system_instruction=types.Content(parts=[types.Part(
            text=f"{STUDENT_INSTRUCTIONS}\n\nLearner context: {json.dumps(learner, ensure_ascii=False)}"
        )]),
        speech_config={"voice_config": {"prebuilt_voice_config": {"voice_name": "Leda"}}},
        realtime_input_config={
            "automatic_activity_detection": (
                {"disabled": False, "prefix_padding_ms": 150, "silence_duration_ms": 700}
                if automatic_activity_detection
                else {"disabled": True}
            ),
        },
        history_config={"initial_history_in_client_content": True} if turns else None,
    )
    stage = "Connecting to Google"
    try:
        from websockets.sync.client import connect
        socket = await asyncio.to_thread(
            connect,
            _websocket_uri(key),
            open_timeout=CONNECT_TIMEOUT,
            close_timeout=2,
        )
        try:
            stage = "Setting up Gemini Live"
            await asyncio.to_thread(socket.send, json.dumps(_setup_payload(config)))
            ack = json.loads(await asyncio.to_thread(socket.recv, CONNECT_TIMEOUT))
            if "setupComplete" not in ack:
                code = ack.get("error", {}).get("code")
                raise LiveUnavailable(f"Google rejected Live setup (code {code if isinstance(code, int) else 'unknown'}).")
            if turns:
                await asyncio.to_thread(socket.send, json.dumps({"clientContent": {"turns": turns, "turnComplete": True}}))
            stage = "Live exchange"
            yield LiveProvider(_WireSession(socket, types), types, automatic_activity_detection)
        finally:
            await asyncio.to_thread(socket.close)
    except LiveUnavailable:
        raise
    except (OSError, TimeoutError) as error:
        raise _provider_error(error, stage) from None
    except Exception as error:
        if type(error).__module__.startswith(("google.genai", "websockets", "pydantic")):
            raise _provider_error(error, stage) from None
        raise


class _WireSession:
    def __init__(self, socket, types):
        self.socket = socket
        self.types = types

    async def send_realtime_input(self, **fields):
        import base64
        message = self.types.LiveClientRealtimeInput(**fields).model_dump(mode="json", by_alias=True, exclude_none=True)
        if "audio" in fields:
            message["audio"]["data"] = base64.b64encode(fields["audio"].data).decode("ascii")
        await asyncio.to_thread(self.socket.send, json.dumps({"realtimeInput": message}))

    async def receive(self):
        while True:
            raw = await asyncio.to_thread(self.socket.recv)
            yield self.types.LiveServerMessage.model_validate_json(raw)
