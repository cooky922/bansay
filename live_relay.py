"""Bridge one authenticated browser to a server-side Live provider session."""

import asyncio
import json
import secrets
import threading
import time
from dataclasses import dataclass
from hashlib import sha256

TICKET_SECONDS = 30
SESSION_SECONDS = 300
MAX_TICKETS = 64
MAX_SESSIONS = 2
MAX_MESSAGE = 65536
MAX_AUDIO_BYTES = 16000 * 2 * SESSION_SECONDS
TRANSCRIPT_GRACE = 0.8
FIRST_REPLY_SECONDS = 20


class RelayError(Exception):
    """A relay failure that the teacher can recover from."""


@dataclass(frozen=True)
class Ticket:
    case_id: str
    session_digest: str
    teacher_id: str
    expires: float


class LiveSlots:
    def __init__(self):
        self.lock = threading.Lock()
        self.tickets = {}
        self.active = {}

    def issue(self, case_id, session_digest, teacher_id):
        token = secrets.token_urlsafe(24)
        now = time.monotonic()
        with self.lock:
            self.tickets = {key: val for key, val in self.tickets.items() if val.expires > now}
            if (
                case_id in self.active or teacher_id in self.active.values()
                or len(self.active) >= MAX_SESSIONS or len(self.tickets) >= MAX_TICKETS
            ):
                return None
            for key, previous in list(self.tickets.items()):
                if previous.case_id == case_id and previous.session_digest == session_digest:
                    del self.tickets[key]
            self.tickets[self.digest(token)] = Ticket(case_id, session_digest, teacher_id, now + TICKET_SECONDS)
        return token

    def claim(self, token, session_digest):
        key = self.digest(token)
        with self.lock:
            ticket = self.tickets.get(key)
            if ticket is None or ticket.expires <= time.monotonic() or ticket.session_digest != session_digest:
                return None, 403
            del self.tickets[key]
            if (
                ticket.case_id in self.active or ticket.teacher_id in self.active.values()
                or len(self.active) >= MAX_SESSIONS
            ):
                return None, 409
            self.active[ticket.case_id] = ticket.teacher_id
            return ticket, 200

    def release(self, case_id):
        with self.lock:
            self.active.pop(case_id, None)

    def is_active(self, case_id):
        with self.lock:
            return case_id in self.active

    @staticmethod
    def digest(token):
        return sha256(token.encode()).digest()


class BrowserSocket:
    def __init__(self, sock):
        from websockets.frames import Opcode
        from websockets.protocol import Protocol, Side

        self.opcode = Opcode
        self.protocol = Protocol(Side.SERVER, max_size=MAX_MESSAGE)
        self.sock = sock
        self.loop = asyncio.get_running_loop()
        self.write_lock = asyncio.Lock()
        self.incoming = self.messages()

    async def _flush(self):
        async with self.write_lock:
            for data in self.protocol.data_to_send():
                if data:
                    await asyncio.wait_for(self.loop.sock_sendall(self.sock, data), 5)

    async def send_event(self, event):
        self.protocol.send_text(json.dumps(event, ensure_ascii=False).encode("utf-8"))
        await self._flush()

    async def send_audio(self, audio):
        for offset in range(0, len(audio), MAX_MESSAGE):
            self.protocol.send_binary(audio[offset:offset + MAX_MESSAGE])
            await self._flush()

    async def close(self, code=1000):
        if not self.protocol.close_expected():
            self.protocol.send_close(code)
            await self._flush()

    async def messages(self):
        opcode = None
        parts = bytearray()
        while data := await self.loop.sock_recv(self.sock, 8192):
            self.protocol.receive_data(data)
            await self._flush()
            for frame in self.protocol.events_received():
                if frame.opcode is self.opcode.CLOSE:
                    return
                if frame.opcode in (self.opcode.TEXT, self.opcode.BINARY):
                    opcode = frame.opcode
                    parts.clear()
                elif frame.opcode is not self.opcode.CONT:
                    continue
                parts.extend(frame.data)
                if frame.fin:
                    if opcode is self.opcode.TEXT:
                        try:
                            yield json.loads(parts)
                        except (ValueError, UnicodeError) as error:
                            raise RelayError("The browser sent an invalid Live command.") from error
                    else:
                        yield bytes(parts)
                    parts.clear()
            if self.protocol.close_expected():
                return


class Exchange:
    def __init__(self, browser, persist, diagnostic):
        self.browser = browser
        self.persist = persist
        self.diagnostic = diagnostic
        self.reset()

    def reset(self):
        self.teacher = ""
        self.student = ""
        self.input_finished = False
        self.completed = False
        self.input_at = None
        self.has_audio = False

    def append(self, role, text):
        field = "teacher" if role == "input_transcript" else "student"
        value = getattr(self, field) + text
        if len(value) > 6000:
            raise RelayError("This exchange was too long to save. Try a shorter explanation.")
        setattr(self, field, value)
        if field == "teacher" and text.strip():
            self.input_at = time.monotonic()

    def note_audio(self):
        if not self.has_audio:
            if self.input_at is None:
                self.diagnostic("first learner audio arrived before input transcript")
            else:
                self.diagnostic(f"first learner audio after {time.monotonic() - self.input_at:.2f}s")
            self.has_audio = True

    async def save(self):
        teacher = self.teacher.strip()
        student = self.student.strip()
        has_audio = self.has_audio
        self.reset()
        if not teacher or not student or not has_audio:
            self.diagnostic("unsaved exchange: missing speech, transcription, or learner audio")
            await self.browser.send_event({
                "type": "turn_discarded",
                "error": "Live needs learner audio and both transcripts to save an exchange. Try speaking again or switch to the typed sample.",
            })
            return False
        state, ended = self.persist(teacher, student)
        await self.browser.send_event({"type": "turn_complete", "state": state, "ended": ended})
        return ended


async def _from_browser(browser, provider, exchange):
    audio_bytes = 0
    async for message in browser.incoming:
        if isinstance(message, bytes):
            audio_bytes += len(message)
            if len(message) % 2 or audio_bytes > MAX_AUDIO_BYTES:
                raise RelayError("The Live audio exceeded its session limit or used an invalid format.")
            if message:
                await provider.send_audio(message)
            continue
        if not isinstance(message, dict):
            raise RelayError("The browser sent an invalid Live command.")
        kind = message.get("type")
        if kind == "stop":
            return
        if kind == "end_audio":
            if exchange.input_at is None:
                exchange.input_at = time.monotonic()
            await provider.end_audio()
        elif kind == "text":
            text = message.get("text")
            if not isinstance(text, str) or not text.strip() or len(text) > 3000:
                raise RelayError("Enter a short teacher response.")
            if exchange.teacher or exchange.completed:
                raise RelayError("Wait for the current exchange to finish before sending text.")
            text = text.strip()
            exchange.append("input_transcript", text)
            exchange.input_finished = True
            await browser.send_event({"type": "input_transcript", "text": text, "finished": True})
            await provider.send_text(text)
        else:
            raise RelayError("The browser sent an unknown Live command.")


async def _from_provider(browser, provider, exchange):
    events = aiter(provider.events())
    pending = None
    deadline = None
    waiting_for_canceled_completion = False
    try:
        while True:
            if pending is None:
                pending = asyncio.create_task(anext(events))
            if deadline is not None:
                timeout = max(0, deadline - asyncio.get_running_loop().time())
                done, _ = await asyncio.wait({pending}, timeout=timeout)
                if not done:
                    deadline = None
                    if await exchange.save():
                        return
                    continue
            event = await pending
            pending = None
            kind = event["type"]
            if exchange.completed and kind in ("audio", "output_transcript", "interrupted"):
                deadline = None
                if await exchange.save():
                    return
            if kind == "audio":
                audio = event["data"]
                if audio and len(audio) % 2 == 0:
                    waiting_for_canceled_completion = False
                    exchange.note_audio()
                    await browser.send_audio(audio)
            elif kind in ("input_transcript", "output_transcript"):
                text = event["text"]
                exchange.append(kind, text)
                finished = event.get("finished") is True
                await browser.send_event({"type": kind, "text": text, "finished": finished})
                if kind == "input_transcript" and finished:
                    exchange.input_finished = True
                    if exchange.completed:
                        deadline = None
                        if await exchange.save():
                            return
            elif kind == "interrupted":
                exchange.reset()
                waiting_for_canceled_completion = True
                exchange.diagnostic("pending exchange interrupted before saving")
                await browser.send_event({"type": "interrupted"})
            elif kind == "turn_complete":
                if waiting_for_canceled_completion:
                    waiting_for_canceled_completion = False
                    continue
                if not exchange.teacher and not exchange.student and not exchange.has_audio:
                    continue
                if exchange.input_finished:
                    if await exchange.save():
                        return
                else:
                    exchange.completed = True
                    deadline = asyncio.get_running_loop().time() + TRANSCRIPT_GRACE
            elif kind == "go_away":
                raise RelayError("Gemini is ending this Live connection. Reconnect to continue.")
    except StopAsyncIteration as error:
        raise RelayError("The Live connection ended. Reconnect to continue.") from error
    finally:
        if pending is not None:
            pending.cancel()
            await asyncio.gather(pending, return_exceptions=True)


async def _watch_session(authorize, exchange):
    while True:
        await asyncio.sleep(2)
        authorize()
        if (
            exchange.input_at is not None and not exchange.has_audio
            and time.monotonic() - exchange.input_at >= FIRST_REPLY_SECONDS
        ):
            raise RelayError("No learner audio arrived in time. Check the microphone, reconnect, or use the offline sample.")


async def _forward(browser, opener, scenario, history, persist, authorize, diagnostic):
    async with opener(scenario, history) as provider:
        diagnostic("provider ready")
        exchange = Exchange(browser, persist, diagnostic)
        await browser.send_event({"type": "ready"})
        tasks = (
            asyncio.create_task(_from_browser(browser, provider, exchange)),
            asyncio.create_task(_from_provider(browser, provider, exchange)),
            asyncio.create_task(_watch_session(authorize, exchange)),
        )
        try:
            done, _ = await asyncio.wait(tasks, return_when=asyncio.FIRST_COMPLETED)
            for task in tasks:
                if task in done:
                    task.result()
        finally:
            for task in tasks:
                task.cancel()
            await asyncio.gather(*tasks, return_exceptions=True)
            if (
                exchange.completed and exchange.input_finished and exchange.has_audio
                and exchange.teacher.strip() and exchange.student.strip()
            ):
                persist(exchange.teacher.strip(), exchange.student.strip())


async def run(browser, opener, scenario, history, persist, authorize, *, recoverable, diagnostic):
    try:
        await asyncio.wait_for(_forward(browser, opener, scenario, history, persist, authorize, diagnostic), SESSION_SECONDS)
    except TimeoutError:
        diagnostic("session time or output deadline reached")
        await browser.send_event({"type": "session_end", "error": "This Live session reached its time limit. Reconnect to continue."})
    except recoverable + (RelayError,) as error:
        diagnostic("recoverable Live failure")
        if not browser.protocol.close_expected():
            await browser.send_event({
                "type": "error", "error": str(error), "status": getattr(error, "status", 503), "sampleAvailable": True,
            })
    except OSError:
        diagnostic("browser connection ended")
    except Exception as error:
        diagnostic(f"unexpected Live failure ({type(error).__name__})")
        if not browser.protocol.close_expected():
            await browser.send_event({
                "type": "error",
                "error": "The Live connection failed. Reconnect or use the offline sample.",
                "sampleAvailable": True,
            })
    finally:
        await browser.close()
