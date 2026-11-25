# BANSAY teaching rehearsal

BANSAY lets secondary teachers rehearse a lesson outside their specialization. The demo covers Grade 7 science. The teacher explains what happens when salt dissolves and later answers an independent question about sugar water. A human mentor reviews the submitted explanation.

## Start Gemini Live on Windows

Extract the ZIP and open PowerShell inside the `bansay` folder. Python 3.11 or newer is required. Install the Live dependencies once, then start the app.

```powershell
python -m pip install -r requirements.txt
python .\start_gemini.py
```

Paste your Google AI Studio API key at the hidden prompt. Open the local URL printed in PowerShell and leave the terminal open while you practice. Sign in as **mara** with password **bansay-demo**, open a lesson and start a voice rehearsal. Use Chrome or Edge, allow the microphone, and speak after the app connects. Use synthetic lesson material. Audio is sent to Google. BANSAY stores completed transcript turns in the local SQLite database.

**Pause microphone** keeps the conversation open for typing. **End live rehearsal** disconnects the session and releases the microphone. You can reconnect to the same lesson and see completed exchanges. Use the offline response button whenever you want a scripted practice question.

After dependencies are installed, you can also double-click **Start-With-Gemini.cmd**. The Python and CMD launchers work without changing PowerShell script execution policy. If the port is already in use, stop the old BANSAY process or pass a free port, for example `python .\start_gemini.py --port 8766`.

Live mode uses `gemini-3.8-live` with native audio in both directions. A valid API key, access to the model and sufficient quota are required. If setup fails, check the reported failure stage. A text response or a successful project login does not verify live audio. Test with a synthetic recording before using a real teacher rehearsal.

You can test the provider separately from the app with the two bundled synthetic teacher recordings. Run this from the same folder and enter your key at the hidden prompt.

```powershell
python .\smoke_live.py --output-dir smoke-replies
```

The check reports whether Gemini sent audio and both transcripts for each turn in one session. Listen to the two WAV replies to verify that the second reply follows the first exchange. The clips under `fixtures` are synthetic Grade 7 examples. The smoke check does not write to the lesson database.

## Start the offline sample

Double-click **Start-BANSAY.cmd** or run `python server.py` inside the `bansay` folder without configuring a key. Open **http://127.0.0.1:8765**. The offline backend runs on the Python standard library and uses scripted student questions. Optional browser speech features depend on the browser.

## Review a rehearsal

1. Explain the lesson to the student, answer a follow-up and finish the rehearsal.
2. Check your transcript. Use **Correct transcript** on any Live teacher caption that misheard you. The mentor can see your correction alongside the original. Submit when ready.
3. In a private browser window, sign in as **mentor** with the same demo password. Select a teacher turn and return one actionable correction.
4. Back in the teacher window, refresh, revise the explanation and answer the independent case. Return to the mentor window to assess it.
5. Open the teacher portfolio to see the record of practice.

The demo also includes **ana** as a second fictional teacher. Keep the app local with these bundled accounts. To bring in an earlier database, back it up first and point the revised launcher at the copy with `--db PATH`. Try the revised workflow on the copy before using it as your primary demo database.

## Development

Run the tests from the directory that contains `bansay`.

```text
python -m unittest discover -s bansay/tests -v
```

Live tests use a fake Gemini provider. A real provider test needs your AI Studio key and an outbound connection to Google.

The prototype allows one active Live rehearsal per teacher, two at a time per server, up to five minutes each. It allows 20 Live session starts per UTC day. Set `--live-daily-limit N` to choose a different cap or `--live-daily-limit 0` to disable Live. Check usage and costs in your Google project during the pilot.
