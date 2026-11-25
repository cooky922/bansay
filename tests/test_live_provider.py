"""Tests for Gemini Live connection setup."""

import unittest
from types import SimpleNamespace
from urllib.parse import parse_qs, urlsplit

from google.genai import types

from bansay.live_provider import (
    LIVE_ENDPOINT,
    MODEL,
    LiveUnavailable,
    _provider_error,
    _setup_payload,
    _websocket_uri,
)


class LiveProviderTests(unittest.TestCase):
    def test_websocket_uri_encodes_api_key_as_query_parameter(self):
        key = "test+key/value="

        uri = _websocket_uri(key)
        parsed = urlsplit(uri)

        self.assertEqual(f"{parsed.scheme}://{parsed.netloc}{parsed.path}", LIVE_ENDPOINT)
        self.assertEqual(parse_qs(parsed.query), {"key": [key]})

    def test_setup_uses_sdk_live_config_wire_shape(self):
        config = types.LiveConnectConfig(
            response_modalities=["AUDIO"],
            system_instruction=types.Content(parts=[types.Part(text="Be a student.")]),
            speech_config={"voice_config": {"prebuilt_voice_config": {"voice_name": "Leda"}}},
            realtime_input_config={"automatic_activity_detection": {"disabled": False}},
        )

        payload = _setup_payload(config)
        setup = payload["setup"]

        self.assertEqual(setup["model"], f"models/{MODEL}")
        self.assertEqual(setup["responseModalities"], ["AUDIO"])
        self.assertNotIn("generationConfig", setup)
        self.assertEqual(setup["systemInstruction"], {"parts": [{"text": "Be a student."}]})

    def test_http_404_is_distinguished_from_invalid_websocket_payload(self):
        error = RuntimeError()
        error.response = SimpleNamespace(status_code=404)

        message = str(_provider_error(error, "Connecting to Google"))

        self.assertIn("HTTP 404", message)

    def test_websocket_1007_reports_invalid_payload(self):
        error = RuntimeError()
        error.rcvd = SimpleNamespace(code=1007, reason="Invalid realtime configuration")

        message = str(_provider_error(error, "Live exchange"))

        self.assertRegex(message, "code 1007.*invalid payload")
        self.assertIn("Invalid realtime configuration", message)


if __name__ == "__main__":
    unittest.main()
