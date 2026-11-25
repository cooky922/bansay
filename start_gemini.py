"""Launch BANSAY with a locally entered Gemini API key."""

import os
import sys
import warnings
from getpass import GetPassWarning, getpass
from pathlib import Path

if not __package__:
    sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from bansay import server


def main():
    if not sys.stdin.isatty():
        raise SystemExit("Run this launcher in a terminal so the API key can be entered privately.")
    with warnings.catch_warnings():
        warnings.simplefilter("error", GetPassWarning)
        try:
            key = getpass("Google AI Studio API key (hidden): ").strip()
        except GetPassWarning:
            raise SystemExit("This terminal cannot hide input. Open PowerShell or Command Prompt.") from None
    if not key:
        raise SystemExit("Enter a Gemini API key to start Live voice.")
    os.environ["BANSAY_GEMINI_API_KEY"] = key
    server.main()


if __name__ == "__main__":
    main()
