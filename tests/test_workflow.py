"""HTTP integration tests for the local BANSAY SQLite application.

The suite starts an isolated server and database for each test. It uses only
the fictional accounts and records seeded by the local demo application.
"""

from __future__ import annotations

import http.cookiejar
import json
import os
import socket
import subprocess
import sys
import tempfile
import time
import unittest
import urllib.error
import urllib.request
from datetime import date, timedelta
from pathlib import Path
from typing import Any


PROJECT_ROOT = Path(__file__).resolve().parents[2]
DEMO_PASSWORD = "bansay-demo"


class BansayServer:
    def __init__(self, database_path: Path):
        with socket.socket() as sock:
            sock.bind(("127.0.0.1", 0))
            self.port = sock.getsockname()[1]
        self.base_url = f"http://127.0.0.1:{self.port}"
        env = os.environ.copy()
        env["PYTHONPATH"] = str(PROJECT_ROOT) + os.pathsep + env.get("PYTHONPATH", "")
        self.process = subprocess.Popen(
            [sys.executable, "-m", "bansay.server", "--port", str(self.port), "--db", str(database_path)],
            cwd=PROJECT_ROOT,
            env=env,
            stdout=subprocess.DEVNULL,
            stderr=subprocess.PIPE,
            text=True,
        )
        self._wait_until_ready()

    def _wait_until_ready(self) -> None:
        deadline = time.monotonic() + 8
        while time.monotonic() < deadline:
            if self.process.poll() is not None:
                error = self.process.stderr.read() if self.process.stderr else ""
                raise RuntimeError(f"BANSAY server exited during startup: {error}")
            try:
                with urllib.request.urlopen(self.base_url + "/api/state", timeout=0.25):
                    pass
                return
            except (OSError, urllib.error.URLError):
                time.sleep(0.05)
        self.stop()
        raise RuntimeError("BANSAY server did not become ready")

    def stop(self) -> None:
        if self.process.poll() is None:
            self.process.terminate()
            try:
                self.process.wait(timeout=3)
            except subprocess.TimeoutExpired:
                self.process.kill()
                self.process.wait(timeout=3)
        if self.process.stderr:
            self.process.stderr.close()


class ApiClient:
    def __init__(self, base_url: str):
        self.base_url = base_url
        self.opener = urllib.request.build_opener(
            urllib.request.HTTPCookieProcessor(http.cookiejar.CookieJar())
        )

    def request(self, method: str, path: str, payload: dict[str, Any] | None = None) -> tuple[int, Any]:
        data = None if payload is None else json.dumps(payload).encode("utf-8")
        request = urllib.request.Request(
            self.base_url + path,
            data=data,
            method=method,
            headers={"Content-Type": "application/json"},
        )
        try:
            response = self.opener.open(request, timeout=3)
        except urllib.error.HTTPError as error:
            response = error
        body = response.read()
        parsed = json.loads(body) if body else None
        return response.code, parsed

    def login(self, username: str) -> None:
        status, _ = self.request("POST", "/api/login", {"username": username, "password": DEMO_PASSWORD})
        if status != 200:
            raise AssertionError(f"login for {username} returned HTTP {status}")

    def post(self, path: str, payload: dict[str, Any]) -> tuple[int, Any]:
        return self.request("POST", path, payload)

    def state(self) -> tuple[int, Any]:
        return self.request("GET", "/api/state")


class WorkflowIntegrationTests(unittest.TestCase):
    def setUp(self) -> None:
        self.temp_dir = tempfile.TemporaryDirectory(prefix="bansay-http-")
        self.database_path = Path(self.temp_dir.name) / "workflow.sqlite3"
        self.server = BansayServer(self.database_path)
        self.teacher = ApiClient(self.server.base_url)
        self.teacher.login("mara")

    def tearDown(self) -> None:
        self.server.stop()
        self.temp_dir.cleanup()

    @staticmethod
    def cases_in(state: dict[str, Any]) -> list[dict[str, Any]]:
        cases = state.get("cases", [])
        if not isinstance(cases, list):
            raise AssertionError("state.cases should be a list")
        return cases

    def case_id(self, client: ApiClient | None = None) -> str:
        client = client or self.teacher
        status, state = client.state()
        self.assertEqual(status, 200)
        for case in self.cases_in(state):
            if case.get("title") == "Mixtures and solutions":
                return str(case["id"])
        self.fail("seeded Mixtures and solutions case was not available")

    def case_from(self, state: dict[str, Any], case_id: str) -> dict[str, Any]:
        for case in self.cases_in(state):
            if str(case.get("id")) == case_id:
                return case
        self.fail(f"case {case_id} was not present in the returned state")

    def test_entire_workflow_survives_restart_and_rejects_double_actions(self) -> None:
        class_date = (date.today() + timedelta(days=10)).isoformat()
        status, prepared = self.teacher.post(
            "/api/cases",
            {
                "title": "Workflow test mixtures lesson",
                "specialization": "English",
                "subject": "Science",
                "grade": "7",
                "competency": "Explain what happens when salt dissolves in water.",
                "classDate": class_date,
            },
        )
        self.assertEqual(status, 200)
        created = next(case for case in self.cases_in(prepared) if case.get("title") == "Workflow test mixtures lesson")
        self.assertTrue(created.get("supported"))
        case_id = str(created["id"])

        status, turn = self.teacher.post(
            "/api/turn",
            {"caseId": case_id, "text": "Salt is present even when I cannot see it.", "clientTurnId": "turn-once-1", "sample": True},
        )
        self.assertEqual(status, 200)
        self.assertEqual(self.case_from(turn, case_id).get("status"), "rehearsing")

        duplicate_status, duplicate = self.teacher.post(
            "/api/turn",
            {"caseId": case_id, "text": "Salt is present even when I cannot see it.", "clientTurnId": "turn-once-1", "sample": True},
        )
        self.assertEqual(duplicate_status, 200)
        self.assertEqual(duplicate, turn, "retrying a client turn ID should return the original result")

        status, submitted = self.teacher.post("/api/submit", {"caseId": case_id, "text": "Salt dissolves into the water."})
        self.assertEqual(status, 200)
        self.assertEqual(self.case_from(submitted, case_id).get("status"), "submitted")
        duplicate_status, duplicate_submit = self.teacher.post(
            "/api/submit", {"caseId": case_id, "text": "Salt dissolves into the water."}
        )
        self.assertEqual(duplicate_status, 200)
        self.assertEqual(duplicate_submit, submitted, "a repeated submit should not create another submission")

        mentor = ApiClient(self.server.base_url)
        mentor.login("mentor")
        status, mentor_state = mentor.state()
        self.assertEqual(status, 200)
        mentor_case = self.case_from(mentor_state, case_id)
        self.assertEqual(mentor_case.get("status"), "submitted")
        status, reviewed = mentor.post(
            "/api/review", {"caseId": case_id, "text": "Distinguish what is visible from what remains present.", "turnIndex": 1}
        )
        self.assertEqual(status, 200)
        self.assertEqual(self.case_from(reviewed, case_id).get("status"), "reviewed")

        status, revised = self.teacher.post("/api/revise", {"caseId": case_id, "text": "The salt is still present as particles in solution."})
        self.assertEqual(status, 200)
        self.assertEqual(self.case_from(revised, case_id).get("status"), "revised")
        status, transferred = self.teacher.post(
            "/api/transfer", {"caseId": case_id, "text": "Sugar is still in the clear drink even though it is no longer visible."}
        )
        self.assertEqual(status, 200)
        self.assertEqual(self.case_from(transferred, case_id).get("status"), "fresh_case_submitted")
        status, assessed = mentor.post(
            "/api/assess", {"caseId": case_id, "text": "Accurate transfer.", "scores": {"accuracy": 2, "majorError": False}}
        )
        self.assertEqual(status, 200)
        self.assertEqual(self.case_from(assessed, case_id).get("status"), "assessed")

        final_state_status, final_state = self.teacher.state()
        self.assertEqual(final_state_status, 200)
        final_case = next(case for case in self.cases_in(final_state) if str(case.get("id")) == case_id)
        self.assertEqual(final_case.get("status"), "assessed")
        self.assertIn("Salt is present", json.dumps(final_case))
        self.assertIn("Distinguish what is visible", json.dumps(final_case))
        self.assertIn("Sugar is still", json.dumps(final_case))

        self.server.stop()
        self.server = BansayServer(self.database_path)
        persisted = ApiClient(self.server.base_url)
        persisted.login("mara")
        status, restarted_state = persisted.state()
        self.assertEqual(status, 200)
        restarted_case = next(case for case in self.cases_in(restarted_state) if str(case.get("id")) == case_id)
        self.assertEqual(restarted_case.get("status"), "assessed")
        self.assertIn("Distinguish what is visible", json.dumps(restarted_case))

    def test_role_and_record_access_are_enforced_by_http_api(self) -> None:
        case_id = self.case_id()
        self.assertEqual(self.teacher.post("/api/review", {"caseId": case_id, "text": "Unauthorized review", "turnIndex": 1})[0], 403)
        self.assertEqual(
            self.teacher.post("/api/turn", {"caseId": case_id, "text": "Salt remains in solution.", "clientTurnId": "access-turn-1", "sample": True})[0],
            200,
        )
        self.assertEqual(self.teacher.post("/api/submit", {"caseId": case_id, "text": "Salt remains in solution."})[0], 200)

        ana = ApiClient(self.server.base_url)
        ana.login("ana")
        ana_state_status, ana_state = ana.state()
        self.assertEqual(ana_state_status, 200)
        self.assertFalse(any(str(case.get("id")) == case_id for case in self.cases_in(ana_state)))
        self.assertEqual(ana.post("/api/revise", {"caseId": case_id, "text": "Read another teacher's record"})[0], 404)

        mentor = ApiClient(self.server.base_url)
        mentor.login("mentor")
        mentor_state_status, mentor_state = mentor.state()
        self.assertEqual(mentor_state_status, 200)
        self.assertTrue(any(str(case.get("id")) == case_id for case in self.cases_in(mentor_state)))
        self.assertEqual(mentor.post("/api/cases", {"title": "Forbidden", "specialization": "Science", "subject": "Science", "grade": "7", "competency": "Matter", "classDate": "2026-11-26"})[0], 403)

    def test_unauthenticated_mutations_are_rejected(self) -> None:
        anonymous = ApiClient(self.server.base_url)
        status, state = anonymous.state()
        self.assertEqual(status, 200)
        self.assertIsNone(state.get("user"))
        self.assertEqual(anonymous.post("/api/submit", {"caseId": "seed-mixtures", "text": "No session"})[0], 401)


if __name__ == "__main__":
    unittest.main()
