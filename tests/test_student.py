"""Check the offline student and its separation from Live voice."""

import os
import unittest
from unittest.mock import patch

from bansay import student


class LearnerTests(unittest.TestCase):
    def test_sample_follows_explanation(self):
        unclear = student.student_reply({}, [], "The salt disappeared.", sample=True)
        self.assertFalse(unclear["ended"])
        resolved = student.student_reply({}, [], "It dissolved; when water evaporates, salt remains.", sample=True)
        self.assertTrue(resolved["ended"])
        incorrect = student.student_reply({}, [], "Salt dissolves and the salt evaporates.", sample=True)
        self.assertFalse(incorrect["ended"])

    def test_key_does_not_enable_legacy_rest(self):
        with patch.dict(os.environ, {"GEMINI_API_KEY": "test-only"}):
            result = student.student_reply({}, [], "The salt dissolved.")
        self.assertEqual(result["mode"], "sample")

    def test_legacy_audio_redirects_to_live_rehearsal(self):
        with self.assertRaisesRegex(ValueError, "Live voice rehearsal"):
            student.transcribe_audio({"mimeType": "audio/wav", "data": "AA=="})
