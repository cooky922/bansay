# November 27 coaching workflow

Source: Project_BANSAY_Updated_System_Architecture (1).md, sections 2–6. This revision supersedes earlier mentor-at-intake and mandatory remote video decisions. Keep the teacher’s subsequent English/Filipino UI choice and searchable degree selector.

## 1. Profile

Capture Name, searchable degree, optional major, school/division, English or Filipino, and low-data preference once. Private career-stage selection defaults to Proficient (2), supports 1–4, and never requires plantilla rank.

## 2. Intake

Choose subject, persistent grade dropdown, grade-filtered DepEd preset or custom topic, and class date. Offer an optional baseline before revealing support. Optional materials-only photo requires confirmation and compression to ≤1 MB. Allocate no mentor. Count school days using the configured school calendar. With fewer than three, look up an exact verified competency in the LAC library; on miss use a draft and best-effort/post-class queue. With at least three, offer pre-class review within two school days after submission.

## 3. Concept Pack

Cache the ten-minute text pack offline. Include a big idea of up to three sentences, degree-based bridge and its limit, two or three reasoned examples including a contrast, misconception choices with feedback, three self-checks, a safe household demo with expected observations, and a rehearsal prompt. Display AI Draft (Unverified) on every draft and offline copy, with a reminder to check safety and formulas before teaching. Version edits and bind human verification to the approved version.

## 4. Rehearsal

Run a 3–5 turn exchange in the selected grade voice. Keep probing the same misconception until the teacher addresses it. Let teachers edit speech transcription before sending. Submit a teacher-confirmed structured transcript under 10 KB. Optional local webcam playback uses an in-memory Blob URL discarded on refresh/close; camera permission and media upload never gate submission.

## 5. Submit and review

On explicit submission, atomically save the transcript and route by subject, language and urgency. Make retries idempotent, queue uncovered submissions and escalate to backup before expiry. Only the assigned specialist reads the package. Initial review budgets two minutes for inline pack audit and four for transcript review. Return an exact-version Mentor-Verified badge, one practical correction and one teaching move.

## 6. Revision and transfer

Teacher revises and can redo the original locally. Require an unseen comparable fresh case without hints. Mentor reviews its transcript in four minutes, records decision and evidence, and skips a second pack audit. Preserve original and fresh-case evidence independently.

## 7. Class and reflection

Use the verified guide in live teaching. Offer a voluntary two-minute reflection or materials-only photo. Keep actual class observations separate from simulated performance.

## 8. Library and portfolio

Publish only de-identified mentor-verified material to the searchable LAC library. Keep baseline, transcript, critique and transfer history private. Export only teacher-selected finalized evidence on demand. Administrators see anonymous cohort counts and topic trends. No automatic PMES transmission.

## Media lifecycle

Core webcam video stays local (zero upload). Only Phase 2 COT permits encrypted video upload with separate informed consent, teacher/materials-only framing and deletion within seven calendar days after feedback. Strip video from portfolios. Optional encrypted voice notes require submission consent, target 150 KB/min and expire at the earlier of closeout or 14 days from submission. Strip audio from exports. Private encrypted setup photos need no-face confirmation, explicit export inclusion and purge within 30 days of account deletion or school-year retention expiry.

## Generation controls

Bind competency, grade, major, language and private stage to structured generation. Use the architecture’s MATATAG grounding route through Grade 9 and K to 12/MELCs route from Grade 10 through SHS; record source/version and verify current approved guides before enabling a grade. Parameterize PPST codes as domain.strand.stage. Require analogy limits, causal contrasts, misconception-based checks and local materials unless lab equipment is enabled. Judge accuracy, analogy fidelity, misconception depth, local feasibility and mobile scannability on 0–3. If any score is below 2 regenerate at most twice, then return a recoverable failure. Only a human can award a badge.

## Pilot measurement

Pilot targets: ≤3/16 substantive pack rewrites; ≥75% baseline error elimination or ≥1 point mean gain on the 0–3 scale; median transcript review ≤4 minutes, initial total ≤6 minutes and ≥13/16 on time; ≥5/8 teachers improve on independent transfer without consequential error. Report missing optional baselines and eligible denominators. Budget 96 initial + 64 fresh-case review minutes and 200 preparation/calibration minutes. Treat ₱2.50 per uncached cycle, ₱50 pilot AI and ₱250 mobile/incidentals as planning assumptions.

Use [the checklist](todo.md) and linked file briefs for implementation.
