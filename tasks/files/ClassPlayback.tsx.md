# Implementation brief for ClassPlayback.tsx

Follow [the final workflow](../plan.md) and [build checklist](../todo.md).

Core webcam video stays local (zero upload). Only Phase 2 COT permits encrypted video upload with separate informed consent, teacher/materials-only framing and deletion within seven calendar days after feedback. Strip video from portfolios. Optional encrypted voice notes require submission consent, target 150 KB/min and expire at the earlier of closeout or 14 days from submission. Strip audio from exports. Private encrypted setup photos need no-face confirmation, explicit export inclusion and purge within 30 days of account deletion or school-year retention expiry.

Acceptance: a teacher with denied camera access completes the core cycle. Upload recovery, remote video playback, binary fixtures and FFprobe belong only to separately enabled COT work. Never persist core webcam bytes to an outbox.
