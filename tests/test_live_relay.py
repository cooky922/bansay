"""End-to-end Live relay tests using an in-process fake model provider."""

from __future__ import annotations

import asyncio
import http.cookiejar
import json
from contextlib import asynccontextmanager
from pathlib import Path
import tempfile
import threading
import unittest
import urllib.error
import urllib.request
from urllib.parse import urljoin

try:
    import websockets
except ImportError:  # pragma: no cover - the app declares websockets as a dependency
    websockets = None

from bansay.server import make_server


DEMO_PASSWORD = "bansay-demo"


class FakeProvider:
    def __init__(self):
        self.events_queue = asyncio.Queue()
        self.audio_frames = []
        self.text_inputs = []
        self.audio_ended = False
        self.closed = False
        self._reply_sent = False

    async def send_audio(self, pcm):
        self.audio_frames.append(pcm)
        if len(self.audio_frames) == 1:
            await self.events_queue.put({"type": "input_transcript", "text": "The salt is still here.", "finished": True})

    async def send_text(self, text):
        self.text_inputs.append(text)
        await self.events_queue.put({"type": "input_transcript", "text": text, "finished": True})
        await self._reply()

    async def end_audio(self):
        self.audio_ended = True
        await self._reply()

    async def _reply(self):
        if self._reply_sent:
            return
        self._reply_sent = True
        if self.send_audio_output:
            await self.events_queue.put({"type": "audio", "data": b"\x01\x00\x02\x00", "sample_rate": 24000})
        await self.events_queue.put({"type": "output_transcript", "text": "I think it is mixed into the water.", "finished": True})
        await self.events_queue.put({"type": "turn_complete"})

    async def events(self):
        while True:
            event = await self.events_queue.get()
            if event is None:
                return
            yield event

    async def close(self):
        self.closed = True
        await self.events_queue.put(None)


class LiveRelayIntegrationTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        if websockets is None:
            raise unittest.SkipTest("The BANSAY websocket dependency is not installed")

    def setUp(self):
        self.temp_dir = tempfile.TemporaryDirectory(prefix="bansay-live-")
        self.database_path = Path(self.temp_dir.name) / "live.sqlite3"
        self.providers = []
        self.fake_audio_output = True

        @asynccontextmanager
        async def fake_open(scenario, history):
            provider = FakeProvider()
            provider.send_audio_output = self.fake_audio_output
            self.providers.append({"provider": provider, "scenario": scenario, "history": history})
            try:
                yield provider
            finally:
                await provider.close()

        self.server = make_server(
            self.database_path,
            port=0,
            live_open=fake_open,
            live_available=lambda: True,
        )
        self.base_url = f"http://127.0.0.1:{self.server.server_port}"
        self.origin = self.base_url
        self.thread = threading.Thread(target=self.server.serve_forever, daemon=True)
        self.thread.start()
        self.teacher = HttpClient(self.base_url)
        self.teacher.login("mara")
        status, state = self.teacher.request("GET", "/api/state")
        self.assertEqual(status, 200)
        self.case_id = next(case["id"] for case in state["cases"] if case["title"] == "Mixtures and solutions")
        status, _ = self.teacher.post(
            "/api/turn",
            {"caseId": self.case_id, "text": "The salt is hidden in the water.", "clientTurnId": "live-test-start", "sample": True},
        )
        self.assertEqual(status, 200)

    def tearDown(self):
        self.server.shutdown()
        self.server.server_close()
        self.thread.join(timeout=2)
        self.temp_dir.cleanup()

    def test_authenticated_ticket_relays_audio_transcripts_and_persists_text_only(self):
        _, initial_state = self.teacher.request("GET", "/api/state")
        initial_case = next(case for case in initial_state["cases"] if case["id"] == self.case_id)
        initial_turn_count = len(initial_case["turns"])
        status, ticket = self.teacher.post("/api/live/ticket", {"caseId": self.case_id})
        self.assertEqual(status, 200)
        self.assertEqual(ticket["inputRate"], 16000)
        self.assertEqual(ticket["outputRate"], 24000)
        websocket_url = urljoin(self.base_url, ticket["url"]).replace("http://", "ws://", 1)

        async def exercise():
            async with websockets.connect(
                websocket_url,
                origin=self.origin,
                additional_headers={"Cookie": self.teacher.cookie_header()},
            ) as socket:
                await socket.send(json.dumps({"type": "authenticate", "ticket": ticket["ticket"]}))
                ready = json.loads(await socket.recv())
                self.assertEqual(ready["type"], "ready")
                await socket.send(b"\x10\x00\x11\x00")
                await socket.send(json.dumps({"type": "end_audio"}))
                received = []
                audio_frames = []
                while True:
                    message = await asyncio.wait_for(socket.recv(), timeout=3)
                    if isinstance(message, bytes):
                        audio_frames.append(message)
                        continue
                    event = json.loads(message)
                    received.append(event)
                    if event.get("type") == "turn_complete":
                        return received, audio_frames

        events, audio_frames = asyncio.run(exercise())
        event_types = [event["type"] for event in events]
        self.assertIn("input_transcript", event_types)
        self.assertIn("output_transcript", event_types)
        self.assertEqual(audio_frames, [b"\x01\x00\x02\x00"])
        completion = next(event for event in events if event["type"] == "turn_complete")
        case = next(case for case in completion["state"]["cases"] if case["id"] == self.case_id)
        self.assertEqual(case["status"], "rehearsing")
        self.assertEqual(len(case["turns"]), initial_turn_count + 2)
        self.assertEqual(case["turns"][-2]["text"], "The salt is still here.")
        self.assertEqual(case["turns"][-1]["text"], "I think it is mixed into the water.")
        self.assertEqual(case["mode"], "live")
        self.assertNotIn("audio", json.dumps(case).lower())
        fake = self.providers[0]["provider"]
        self.assertEqual(fake.audio_frames, [b"\x10\x00\x11\x00"])
        self.assertTrue(fake.audio_ended)
        self.assertTrue(fake.closed)
        self.assertIn("salt dissolves", json.dumps(self.providers[0]["scenario"]).lower())

    def test_ticket_requires_teacher_ownership_and_same_origin(self):
        anonymous = HttpClient(self.base_url)
        status, _ = anonymous.post("/api/live/ticket", {"caseId": self.case_id})
        self.assertEqual(status, 401)

        mentor = HttpClient(self.base_url)
        mentor.login("mentor")
        status, _ = mentor.post("/api/live/ticket", {"caseId": self.case_id})
        self.assertEqual(status, 403)

        other_teacher = HttpClient(self.base_url)
        other_teacher.login("ana")
        status, _ = other_teacher.post("/api/live/ticket", {"caseId": self.case_id})
        self.assertEqual(status, 404)

        status, _ = self.teacher.post(
            "/api/live/ticket", {"caseId": self.case_id}, origin="https://attacker.invalid"
        )
        self.assertEqual(status, 403)

    def test_ticket_is_single_use_and_closed_session_releases_the_lesson_slot(self):
        status, first_ticket = self.teacher.post("/api/live/ticket", {"caseId": self.case_id})
        self.assertEqual(status, 200)
        first_ws = urljoin(self.base_url, first_ticket["url"]).replace("http://", "ws://", 1)

        async def connect_and_stop(url, ticket):
            async with websockets.connect(
                url,
                origin=self.origin,
                additional_headers={"Cookie": self.teacher.cookie_header()},
            ) as socket:
                await socket.send(json.dumps({"type": "authenticate", "ticket": ticket}))
                self.assertEqual(json.loads(await socket.recv())["type"], "ready")
                await socket.send(json.dumps({"type": "stop"}))

        asyncio.run(connect_and_stop(first_ws, first_ticket["ticket"]))

        async def retry_used_ticket():
            async with websockets.connect(
                first_ws,
                origin=self.origin,
                additional_headers={"Cookie": self.teacher.cookie_header()},
            ) as socket:
                await socket.send(json.dumps({"type": "authenticate", "ticket": first_ticket["ticket"]}))
                error = json.loads(await socket.recv())
                self.assertEqual(error["type"], "error")
                self.assertEqual(error["status"], 403)

        asyncio.run(retry_used_ticket())

        status, next_ticket = self.teacher.post("/api/live/ticket", {"caseId": self.case_id})
        self.assertEqual(status, 200)
        self.assertNotEqual(first_ticket["ticket"], next_ticket["ticket"])

    def test_ticket_is_bound_to_the_teacher_session_that_requested_it(self):
        status, ticket = self.teacher.post("/api/live/ticket", {"caseId": self.case_id})
        self.assertEqual(status, 200)
        websocket_url = urljoin(self.base_url, ticket["url"]).replace("http://", "ws://", 1)
        other_teacher = HttpClient(self.base_url)
        other_teacher.login("ana")

        async def attempt(client, expect_ready):
            async with websockets.connect(
                websocket_url,
                origin=self.origin,
                additional_headers={"Cookie": client.cookie_header()},
            ) as socket:
                await socket.send(json.dumps({"type": "authenticate", "ticket": ticket["ticket"]}))
                event = json.loads(await socket.recv())
                if expect_ready:
                    self.assertEqual(event["type"], "ready")
                    await socket.send(json.dumps({"type": "stop"}))
                else:
                    self.assertEqual(event["type"], "error")
                    self.assertEqual(event["status"], 403)

        asyncio.run(attempt(other_teacher, expect_ready=False))
        asyncio.run(attempt(self.teacher, expect_ready=True))

    def test_missing_learner_audio_discards_exchange_without_saving_transcripts(self):
        before_status, before_state = self.teacher.request("GET", "/api/state")
        self.assertEqual(before_status, 200)
        before_case = next(case for case in before_state["cases"] if case["id"] == self.case_id)
        before_turn_count = len(before_case["turns"])
        self.fake_audio_output = False
        status, ticket = self.teacher.post("/api/live/ticket", {"caseId": self.case_id})
        self.assertEqual(status, 200)
        websocket_url = urljoin(self.base_url, ticket["url"]).replace("http://", "ws://", 1)

        async def exercise():
            async with websockets.connect(
                websocket_url,
                origin=self.origin,
                additional_headers={"Cookie": self.teacher.cookie_header()},
            ) as socket:
                await socket.send(json.dumps({"type": "authenticate", "ticket": ticket["ticket"]}))
                self.assertEqual(json.loads(await socket.recv())["type"], "ready")
                await socket.send(b"\x10\x00\x11\x00")
                await socket.send(json.dumps({"type": "end_audio"}))
                while True:
                    message = await asyncio.wait_for(socket.recv(), timeout=3)
                    if isinstance(message, str):
                        event = json.loads(message)
                        if event["type"] == "turn_discarded":
                            await socket.send(json.dumps({"type": "stop"}))
                            return event

        discarded = asyncio.run(exercise())
        self.assertIn("learner audio", discarded["error"])
        after_status, after_state = self.teacher.request("GET", "/api/state")
        self.assertEqual(after_status, 200)
        after_case = next(case for case in after_state["cases"] if case["id"] == self.case_id)
        self.assertEqual(len(after_case["turns"]), before_turn_count)


class HttpClient:
    def __init__(self, base_url):
        self.base_url = base_url
        self.jar = http.cookiejar.CookieJar()
        self.opener = urllib.request.build_opener(urllib.request.HTTPCookieProcessor(self.jar))

    def cookie_header(self):
        return "; ".join(f"{cookie.name}={cookie.value}" for cookie in self.jar)

    def request(self, method, path, payload=None, *, origin=None):
        data = None if payload is None else json.dumps(payload).encode()
        headers = {"Content-Type": "application/json"}
        if origin is not False:
            headers["Origin"] = self.base_url if origin is None else origin
        request = urllib.request.Request(self.base_url + path, data=data, method=method, headers=headers)
        try:
            response = self.opener.open(request, timeout=3)
        except urllib.error.HTTPError as error:
            response = error
        body = response.read()
        return response.code, json.loads(body) if body else None

    def login(self, username):
        status, _ = self.post("/api/login", {"username": username, "password": DEMO_PASSWORD})
        if status != 200:
            raise AssertionError(f"login failed with HTTP {status}")

    def post(self, path, payload, *, origin=None):
        return self.request("POST", path, payload, origin=origin)
