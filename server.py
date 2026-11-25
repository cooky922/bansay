"""Run the BANSAY prototype with `python -m bansay.server`."""

import argparse
import asyncio
import base64
import binascii
import hmac
import importlib.util
import json
import mimetypes
import os
import secrets
import threading
import time
from datetime import date, datetime, timedelta, timezone
from hashlib import sha1, sha256
from http import HTTPStatus
from http.cookies import CookieError, SimpleCookie
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import urlsplit

if __package__:
    from . import db, live_provider, live_relay, student
else:
    import db
    import live_provider
    import live_relay
    import student


STATIC = Path(__file__).resolve().parent / "static"
COOKIE = "bansay_session"
SESSION_SECONDS = 8 * 60 * 60
MAX_REQUEST = 6 * 1024 * 1024
WS_GUID = "258EAFA5-E914-47DA-95CA-C5AB0DC85B11"
TRANSITIONS = {
    "submit": ("teacher", ("rehearsing",), "submitted", "submission"),
    "review": ("mentor", ("submitted",), "reviewed", "review"),
    "revise": ("teacher", ("reviewed",), "revised", "revision"),
    "transfer": ("teacher", ("revised",), "fresh_case_submitted", "transfer"),
    "assess": ("mentor", ("fresh_case_submitted",), "assessed", "assessment"),
}


class APIError(Exception):
    def __init__(self, status, message, **details):
        self.status = status
        self.payload = {"error": message, **details}
        super().__init__(message)


def required_text(data, key, *, maximum=6000):
    value = data.get(key)
    if not isinstance(value, str) or not value.strip() or len(value) > maximum:
        raise APIError(400, f"Enter a value for {key} of up to {maximum} characters.")
    return value.strip()


def role_required(user, role):
    if user["role"] != role:
        raise APIError(403, f"This action requires a {role} account.")


def assigned_case(connection, user, case_id):
    row = connection.execute("SELECT * FROM cases WHERE id = ?", (case_id,)).fetchone()
    if user["role"] == "teacher":
        permitted = row and row["teacher_id"] == user["id"]
    else:
        permitted = row and row["mentor_id"] == user["id"] and row["status"] not in ("draft", "rehearsing")
    if not permitted:
        raise APIError(404, "The lesson case is unavailable.")
    return row


def token_digest(token):
    return sha256(token.encode()).hexdigest()


class Handler(BaseHTTPRequestHandler):
    server_version = "BANSAY"
    sys_version = ""

    def log_request(self, code="-", size="-"):
        # Upgrade queries contain short-lived browser tickets.
        self.log_message('"%s %s %s" %s %s', self.command, self.path.partition("?")[0], self.request_version, str(code), str(size))

    def send_bytes(self, status, body, content_type, *, cookie=None):
        self.send_response(status)
        self.send_header("Content-Type", content_type)
        self.send_header("Content-Length", str(len(body)))
        self.send_header("Cache-Control", "no-store")
        self.send_header("X-Content-Type-Options", "nosniff")
        self.send_header("X-Frame-Options", "DENY")
        self.send_header("Referrer-Policy", "no-referrer")
        self.send_header("Permissions-Policy", "microphone=(self)")
        if cookie is not None:
            self.send_header("Set-Cookie", cookie)
        self.end_headers()
        if self.command != "HEAD":
            try:
                self.wfile.write(body)
            except (BrokenPipeError, ConnectionResetError):
                pass

    def send_json(self, status, payload, *, cookie=None):
        body = json.dumps(payload, ensure_ascii=False).encode("utf-8")
        self.send_bytes(status, body, "application/json; charset=utf-8", cookie=cookie)

    def session_cookie(self, token, max_age):
        secure = "; Secure" if self.server.secure_cookie else ""
        return f"{COOKIE}={token}; Path=/; HttpOnly; SameSite=Strict; Max-Age={max_age}{secure}"

    def request_token_digest(self):
        try:
            token = SimpleCookie(self.headers.get("Cookie", "")).get(COOKIE)
        except (CookieError, TypeError, ValueError):
            return ""
        return token_digest(token.value) if token else ""

    def user(self, connection, *, required=True):
        row = connection.execute(
            """SELECT u.id, u.name, u.role FROM sessions s JOIN users u ON u.id = s.user_id
            WHERE s.token_hash = ? AND s.expires_at > ?""",
            (self.request_token_digest(), db.now()),
        ).fetchone()
        if required and row is None:
            raise APIError(401, "Sign in again to continue.")
        return dict(row) if row else None

    def state(self, connection, user):
        mode = student.mode()
        live_enabled = self.server.live_enabled()
        return {
            "user": user,
            "cases": db.visible_cases(connection, user) if user else [],
            "mode": mode,
            "liveEnabled": live_enabled,
            "audioEnabled": False,
        }

    def read_json(self):
        origin = self.headers.get("Origin")
        if origin:
            parsed = urlsplit(origin)
            if parsed.scheme not in ("http", "https") or parsed.netloc != self.headers.get("Host"):
                raise APIError(403, "This request must come from BANSAY.")
        if self.headers.get_content_type() != "application/json":
            raise APIError(415, "Send an application/json request.")
        try:
            length = int(self.headers.get("Content-Length", "0"))
            if not 0 < length <= MAX_REQUEST:
                raise APIError(413, "The request is empty or too large.")
            result = json.loads(self.rfile.read(length))
        except (ValueError, UnicodeError) as error:
            raise APIError(400, "The request contains invalid JSON.") from error
        if not isinstance(result, dict):
            raise APIError(400, "Send a JSON object.")
        return result

    def do_GET(self):
        route = urlsplit(self.path).path
        if route == "/api/state":
            with db.connect(self.server.db_path) as connection:
                state = self.state(connection, self.user(connection, required=False))
            self.send_json(200, state)
            return
        if route == "/api/live/ws" and self.command == "GET":
            self.live_upgrade()
            return
        relative_path = "index.html" if route == "/" else route.removeprefix("/static/").lstrip("/")
        path = (STATIC / relative_path).resolve()
        if not path.is_relative_to(STATIC) or not path.is_file():
            self.send_json(404, {"error": HTTPStatus.NOT_FOUND.phrase})
            return
        media_type = mimetypes.guess_type(path)[0] or "application/octet-stream"
        if media_type.startswith("text/"):
            media_type += "; charset=utf-8"
        self.send_bytes(200, path.read_bytes(), media_type)

    do_HEAD = do_GET

    def do_POST(self):
        try:
            route = urlsplit(self.path).path.removeprefix("/api/")
            data = self.read_json()
            cookie = None
            if route == "login":
                state, cookie = self.login(data)
            elif route == "logout":
                with db.connect(self.server.db_path, write=True) as connection:
                    connection.execute("DELETE FROM sessions WHERE token_hash = ?", (self.request_token_digest(),))
                    state = self.state(connection, None)
                cookie = self.session_cookie("", 0)
            elif route == "turn":
                state = self.add_turn(data)
            elif route == "live/ticket":
                state = self.live_ticket(data)
            elif route == "transcribe":
                with db.connect(self.server.db_path) as connection:
                    role_required(self.user(connection), "teacher")
                raise APIError(410, "Use Live microphone mode or type your response in the sample.")
            elif route in ("cases", "end", "live/correct") or route in TRANSITIONS:
                with db.connect(self.server.db_path, write=True) as connection:
                    user = self.user(connection)
                    if route == "cases":
                        self.create_case(connection, user, data)
                    elif route == "end":
                        self.end_rehearsal(connection, user, data)
                    elif route == "live/correct":
                        self.correct_transcript(connection, user, data)
                    else:
                        self.add_evidence(connection, user, route, data)
                    state = self.state(connection, user)
            else:
                raise APIError(404, "The endpoint is unavailable.")
            self.send_json(200, state, cookie=cookie)
        except APIError as error:
            self.send_json(error.status, error.payload)
        except ValueError as error:
            self.send_json(400, {"error": str(error)})

    def live_origin(self):
        scheme = "https" if self.server.secure_cookie else "http"
        if self.headers.get("Origin") != f"{scheme}://{self.headers.get('Host')}":
            raise APIError(403, "Open Live from the same BANSAY page.")

    def live_case(self, connection, case_id):
        user = self.user(connection)
        role_required(user, "teacher")
        case = assigned_case(connection, user, case_id)
        snapshot = json.loads(case["snapshot"])
        turns = db.case_turns(connection, case_id)
        self.check_open_turn(case, snapshot, turns)
        return user, snapshot, turns

    def live_ticket(self, data):
        self.live_origin()
        case_id = required_text(data, "caseId", maximum=80)
        with db.connect(self.server.db_path) as connection:
            user, _, _ = self.live_case(connection, case_id)
            if not self.server.live_enabled():
                raise APIError(503, "Live Gemini is not configured on this server. You can use the offline sample.", sampleAvailable=True)
            if db.live_limit_reached(connection, self.server.live_daily_limit):
                raise APIError(429, "This server reached its daily Live session limit. Use the offline sample.", sampleAvailable=True)
        token = self.server.live_slots.issue(case_id, self.request_token_digest(), user["id"])
        if token is None:
            raise APIError(409, "Live is busy or already open for this lesson.")
        return {"url": "/api/live/ws", "ticket": token, "inputRate": 16000, "outputRate": 24000}

    def live_upgrade(self):
        try:
            self.live_origin()
            key = self.headers.get("Sec-WebSocket-Key", "")
            try:
                key_bytes = base64.b64decode(key, validate=True)
            except (ValueError, binascii.Error):
                key_bytes = b""
            connection_tokens = {item.strip().casefold() for item in self.headers.get("Connection", "").split(",")}
            if (
                self.request_version != "HTTP/1.1"
                or self.headers.get("Upgrade", "").casefold() != "websocket"
                or "upgrade" not in connection_tokens
                or self.headers.get("Sec-WebSocket-Version") != "13"
                or len(key_bytes) != 16
            ):
                raise APIError(400, "Open Live using a browser WebSocket.")
            with db.connect(self.server.db_path) as connection:
                role_required(self.user(connection), "teacher")
            if not self.server.live_enabled():
                raise APIError(503, "Live Gemini is not configured on this server.")
            if not self.server.live_handshakes.acquire(blocking=False):
                raise APIError(409, "The Live service is busy. Try again shortly.")
        except APIError as error:
            self.send_json(error.status, error.payload)
            return

        self.close_connection = True
        self.protocol_version = "HTTP/1.1"
        try:
            accept = base64.b64encode(sha1((key + WS_GUID).encode("ascii")).digest()).decode("ascii")
            self.send_response(101)
            self.send_header("Upgrade", "websocket")
            self.send_header("Connection", "Upgrade")
            self.send_header("Sec-WebSocket-Accept", accept)
            self.end_headers()
            self.wfile.flush()
            self.connection.setblocking(False)
            self.log_message("Live transport upgraded")
            asyncio.run(self.live_connection())
        except OSError:
            pass
        finally:
            self.server.live_handshakes.release()

    async def live_connection(self):
        browser = live_relay.BrowserSocket(self.connection)
        ticket = None
        try:
            try:
                message = await asyncio.wait_for(anext(browser.incoming), timeout=5)
            except TimeoutError as error:
                raise APIError(403, "The Live authorization message did not arrive in time.") from error
            except StopAsyncIteration:
                return
            except live_relay.RelayError as error:
                raise APIError(400, str(error)) from error
            if not isinstance(message, dict) or message.get("type") != "authenticate":
                raise APIError(403, "The first Live message must authorize the lesson.")
            token = required_text(message, "ticket", maximum=128)
            ticket, status = self.server.live_slots.claim(token, self.request_token_digest())
            if not ticket:
                raise APIError(status, "The Live ticket expired, was already used, or the lesson is busy.")
            with db.connect(self.server.db_path, write=True) as connection:
                _, snapshot, rows = self.live_case(connection, ticket.case_id)
                if not db.reserve_live_session(connection, self.server.live_daily_limit):
                    raise APIError(429, "This server reached its daily Live session limit. Use the offline sample.")
        except APIError as error:
            if ticket:
                self.server.live_slots.release(ticket.case_id)
            if not browser.protocol.close_expected():
                await browser.send_event({
                    **error.payload, "type": "error", "status": error.status, "sampleAvailable": True,
                })
            await browser.close(code=1008)
            return

        case_id = ticket.case_id
        turn_count = len(rows)
        expected_turns = turn_count

        def authorize():
            with db.connect(self.server.db_path) as connection:
                self.live_case(connection, case_id)

        def persist(teacher, learner):
            nonlocal expected_turns
            with db.connect(self.server.db_path, write=True) as connection:
                user, _, turns = self.live_case(connection, case_id)
                if len(turns) != expected_turns:
                    raise APIError(409, "The rehearsal changed in another tab. Reopen it before continuing.")
                ended = sum(turn["role"] == "teacher" for turn in turns) + 1 >= 5
                db.save_exchange(connection, case_id, f"live-{secrets.token_urlsafe(18)}", teacher, learner, "live", ended)
                state = self.state(connection, user)
            expected_turns += 2
            return state, ended

        try:
            await live_relay.run(
                browser, self.server.live_open, snapshot, db.public_turns(rows),
                persist, authorize, recoverable=(APIError, live_provider.LiveUnavailable),
                diagnostic=lambda message: self.log_message("Live: %s", message),
            )
        finally:
            self.server.live_slots.release(case_id)
            self.log_message("Live transport closed; %s exchanges saved", (expected_turns - turn_count) // 2)

    def login(self, data):
        username = required_text(data, "username", maximum=80).casefold()
        password = required_text(data, "password", maximum=256)
        with db.connect(self.server.db_path) as connection:
            row = connection.execute(
                "SELECT id, name, role, salt, digest FROM users WHERE id = ?", (username,),
            ).fetchone()
        digest = db.password_hash(password, row["salt"] if row else bytes(16))
        if not hmac.compare_digest(digest, row["digest"] if row else bytes(32)) or row is None:
            raise APIError(401, "The username or password is incorrect.")
        token = secrets.token_urlsafe(32)
        expires = datetime.now(timezone.utc) + timedelta(seconds=SESSION_SECONDS)
        user = {key: row[key] for key in ("id", "name", "role")}
        with db.connect(self.server.db_path, write=True) as connection:
            connection.execute(
                "DELETE FROM sessions WHERE expires_at <= ? OR token_hash = ?",
                (db.now(), self.request_token_digest()),
            )
            connection.execute("INSERT INTO sessions VALUES (?, ?, ?)", (token_digest(token), username, expires.isoformat(timespec="milliseconds")))
            state = self.state(connection, user)
        return state, self.session_cookie(token, SESSION_SECONDS)

    def create_case(self, connection, user, data):
        role_required(user, "teacher")
        details = {
            key: required_text(data, key, maximum=size)
            for key, size in (
                ("title", 150), ("subject", 80), ("specialization", 100), ("grade", 16),
                ("competency", 1000), ("classDate", 10),
            )
        }
        try:
            class_date = date.fromisoformat(details["classDate"])
            details["classDate"] = class_date.isoformat()
            snapshot = db.lesson_snapshot(details, self.server.closures)
        except (ValueError, OverflowError) as error:
            raise APIError(400, "Enter a valid class date.") from error
        db.create_case(connection, snapshot, user["id"])

    def correct_transcript(self, connection, user, data):
        role_required(user, "teacher")
        case_id = required_text(data, "caseId", maximum=80)
        case = assigned_case(connection, user, case_id)
        if case["status"] != "rehearsing":
            raise APIError(409, "Transcript corrections are available before submitting a rehearsal.")
        if self.server.live_slots.is_active(case_id):
            raise APIError(409, "Disconnect Live before correcting a transcript.")
        text = required_text(data, "text", maximum=6000)
        i = data.get("turnIndex")
        turns = db.case_turns(connection, case_id)
        if type(i) is not int or not 0 <= i < len(turns) - 1:
            raise APIError(400, "Select a saved teacher turn.")
        turn, reply = turns[i:i + 2]
        if turn["role"] != "teacher" or reply["role"] != "student" or reply["mode"] != "live":
            raise APIError(400, "Select a saved teacher turn from a Live exchange.")
        if text != turn["text"]:
            connection.execute(
                """INSERT INTO transcript_corrections VALUES (?, ?, ?)
                ON CONFLICT(turn_id) DO UPDATE SET text = excluded.text, corrected_at = excluded.corrected_at""",
                (turn["id"], text, db.now()),
            )

    def add_turn(self, data):
        case_id = required_text(data, "caseId", maximum=80)
        client_id = required_text(data, "clientTurnId", maximum=120)
        text = required_text(data, "text", maximum=3000)
        with db.connect(self.server.db_path) as connection:
            user = self.user(connection)
            role_required(user, "teacher")
            case = assigned_case(connection, user, case_id)
            existing = connection.execute(
                "SELECT text FROM turns WHERE case_id = ? AND client_id = ?", (case_id, client_id),
            ).fetchone()
            if existing:
                if existing["text"] != text:
                    raise APIError(409, "This turn was already saved with different text.")
                return self.state(connection, user)
            snapshot = json.loads(case["snapshot"])
            turns = db.case_turns(connection, case_id)
            self.check_open_turn(case, snapshot, turns)
        started = time.monotonic()
        result = student.student_reply(snapshot, db.public_turns(turns), text, sample=True)
        with db.connect(self.server.db_path, write=True) as connection:
            user = self.user(connection)
            case = assigned_case(connection, user, case_id)
            current_turns = db.case_turns(connection, case_id)
            existing = connection.execute(
                "SELECT text FROM turns WHERE case_id = ? AND client_id = ?", (case_id, client_id),
            ).fetchone()
            if existing:
                if existing["text"] != text:
                    raise APIError(409, "This turn was already saved with different text.")
                return self.state(connection, user)
            self.check_open_turn(case, snapshot, current_turns)
            if len(current_turns) != len(turns):
                raise APIError(409, "The conversation changed. Refresh it before sending another turn.")
            db.save_exchange(connection, case_id, client_id, text, result["reply"], result["mode"], bool(result.get("ended")))
            self.log_message("learner %s reply in %.2fs", result["mode"], time.monotonic() - started)
            return self.state(connection, user)

    @staticmethod
    def check_open_turn(case, snapshot, turns):
        if not snapshot["supported"]:
            raise APIError(409, "This lesson does not have an approved rehearsal case yet.")
        if case["status"] not in ("draft", "rehearsing") or turns[-1]["ended"]:
            raise APIError(409, "The rehearsal has ended.")
        if sum(turn["role"] == "teacher" for turn in turns) >= 5:
            raise APIError(409, "You have reached five rehearsal turns. Request mentor review to continue.")

    @staticmethod
    def end_rehearsal(connection, user, data):
        role_required(user, "teacher")
        case = assigned_case(connection, user, required_text(data, "caseId", maximum=80))
        if case["status"] != "rehearsing":
            raise APIError(409, "Start a rehearsal turn before ending the discussion.")
        turn = db.case_turns(connection, case["id"])[-1]
        connection.execute("UPDATE turns SET ended = 1 WHERE id = ?", (turn["id"],))

    def add_evidence(self, connection, user, route, data):
        role, allowed, next_status, kind = TRANSITIONS[route]
        role_required(user, role)
        case = assigned_case(connection, user, required_text(data, "caseId", maximum=80))
        existing = connection.execute(
            "SELECT 1 FROM evidence WHERE case_id = ? AND kind = ?", (case["id"], kind),
        ).fetchone()
        if route == "submit" and existing:
            return
        if case["status"] not in allowed:
            raise APIError(409, "This action is unavailable at the case's current step.")
        if route == "submit":
            turns = db.public_turns(db.case_turns(connection, case["id"]))
            payload = {
                "text": (required_text(data, "text") if data.get("text") else ""),
                "classDate": case["class_date"],
                "turns": turns,
            }
        else:
            payload = {"text": required_text(data, "text")}
        if route == "review":
            submitted = connection.execute(
                "SELECT payload FROM evidence WHERE case_id = ? AND kind = 'submission'", (case["id"],),
            ).fetchone()
            turns = json.loads(submitted["payload"])["turns"]
            index = data.get("turnIndex")
            if type(index) is not int or not 0 <= index < len(turns) or turns[index]["role"] != "teacher":
                raise APIError(400, "Select a teacher utterance from the submitted discussion.")
            payload.update(turnIndex=index, quote=turns[index]["text"])
            if data.get("highlight"):
                highlight = required_text(data, "highlight", maximum=500)
                if highlight not in payload["quote"]:
                    raise APIError(400, "Highlight text from the selected teacher utterance.")
                payload["highlight"] = highlight
            if data.get("issue"):
                payload["issue"] = required_text(data, "issue", maximum=500)
        if route == "assess":
            scores = data.get("scores")
            if (
                not isinstance(scores, dict)
                or type(scores.get("accuracy")) is not int or scores["accuracy"] not in (0, 1, 2)
                or type(scores.get("majorError")) is not bool
            ):
                raise APIError(400, "Provide an accuracy score from 0 to 2 and record whether there was a major error.")
            payload["scores"] = {"accuracy": scores["accuracy"], "majorError": scores["majorError"]}
        if route in ("review", "assess") and data.get("durationSeconds") is not None:
            duration = data["durationSeconds"]
            if type(duration) is not int or not 0 <= duration <= 8 * 60 * 60:
                raise APIError(400, "Provide review time in seconds.")
            payload["durationSeconds"] = duration
        connection.execute(
            "INSERT INTO evidence VALUES (?, ?, ?, ?, ?)",
            (case["id"], kind, user["id"], json.dumps(payload), db.now()),
        )
        connection.execute("UPDATE cases SET status = ? WHERE id = ?", (next_status, case["id"]))


def make_server(
    db_path, host="127.0.0.1", port=8765, *, secure_cookie=False, closures=(),
    live_open=live_provider.open_live, live_available=live_provider.live_configured, live_daily_limit=20,
):
    db.initialize(db_path, closures)
    server = ThreadingHTTPServer((host, port), Handler)
    server.db_path = db_path
    server.secure_cookie = secure_cookie
    server.closures = closures
    server.live_slots = live_relay.LiveSlots()
    server.live_handshakes = threading.BoundedSemaphore(12)
    server.live_open = live_open
    server.live_daily_limit = live_daily_limit
    server.live_enabled = lambda: (
        live_daily_limit > 0 and live_available() and importlib.util.find_spec("websockets") is not None
    )
    return server


def main():
    parser = argparse.ArgumentParser(description="Start the BANSAY prototype.")
    parser.add_argument("--host", default="127.0.0.1")
    parser.add_argument("--port", type=int, default=8765)
    parser.add_argument("--db", type=Path, default=Path(__file__).resolve().parent / "data" / "bansay.sqlite3")
    parser.add_argument("--secure-cookie", action="store_true", help="Require HTTPS for cookies behind a TLS proxy.")
    parser.add_argument("--live-daily-limit", type=int, default=os.environ.get("BANSAY_LIVE_DAILY_LIMIT", "20"))
    args = parser.parse_args()
    if args.live_daily_limit < 0:
        parser.error("The Live daily limit must be zero or a positive integer.")
    closures = frozenset(value.strip() for value in os.environ.get("BANSAY_SCHOOL_CLOSURES", "").split(",") if value.strip())
    try:
        for value in closures:
            date.fromisoformat(value)
    except ValueError:
        parser.error("BANSAY_SCHOOL_CLOSURES must list dates as YYYY-MM-DD, separated by commas.")
    with make_server(
        args.db, args.host, args.port, secure_cookie=args.secure_cookie,
        closures=closures, live_daily_limit=args.live_daily_limit,
    ) as server:
        print(f"BANSAY is listening at http://{args.host}:{server.server_port}", flush=True)
        try:
            server.serve_forever()
        except KeyboardInterrupt:
            pass


if __name__ == "__main__":
    main()
