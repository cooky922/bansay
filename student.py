"""Scripted Grade 7 learner used for the offline rehearsal."""

import re


class StudentUnavailable(Exception):
    """A rehearsal service could not complete a request."""


def mode():
    return "sample"


def transcribe_audio(audio):
    raise ValueError("Start a Live voice rehearsal or type your response.")


def _sample_reply(scenario, history, transcript):
    words = transcript.casefold().strip()
    asked = "?" in words or words.startswith(("what ", "why ", "how ", "do you ", "can you ", "would "))
    dissolved = bool(re.search(r"\b(?:dissolv\w*|still there|still (?:in|present)|mixed into|spread out)\b", words))
    recovery = bool(re.search(r"\b(?:evaporat\w*|boil\w*|crystals?)\b", words))
    if re.search(r"\b(?:grade me|score me|rate me|assess me|ignore your|switch roles)\b", words):
        return "I’m the student. Could we go back to what happened to the salt?", False
    if asked:
        if "evaporat" in words or "boil" in words or "get" in words and "back" in words:
            return "I think the water would go away and the salt might be left behind. Would we see crystals?", False
        if "taste" in words:
            return "I’d expect the water to taste salty, since the salt was mixed into it.", False
        return "I can’t see the grains anymore. I’m still wondering if the salt is in the water.", False
    if re.search(r"\b(?:salt|crystals?)\s+(?:also\s+)?evaporat|\b(?:salt|crystals?)\s+(?:turns?|turned)\s+into\s+(?:gas|steam|water)", words):
        return "I thought it was the water that evaporated. What would we find in the dish afterward?", False
    if dissolved and recovery:
        return "I get it now. The salt is still in the water even though I can’t see it. When the water evaporates, the salt is left behind.", True
    if recovery:
        return "So the water can evaporate and leave salt behind. Where was the salt before that?", False
    if dissolved:
        return "So the salt is still in the water. What could we do to see it again?", False
    if "disappear" in words or "gone" in words:
        return "If the salt really disappeared, how could we get it back?", False
    used = {turn.get("text") for turn in history if turn.get("role") == "student"}
    for follow_up in scenario.get("followUps", []):
        if isinstance(follow_up, str) and follow_up not in used:
            return follow_up, False
    return "What would we observe if the salt was still in the water?", False


def student_reply(scenario, history, text, audio=None, *, sample=False):
    if audio is not None:
        transcribe_audio(audio)
    transcript = text.strip()
    if not transcript:
        raise ValueError("Enter a teacher response first.")
    reply, ended = _sample_reply(scenario, history, transcript)
    return {"reply": reply, "transcript": transcript, "mode": "sample", "ended": ended}
