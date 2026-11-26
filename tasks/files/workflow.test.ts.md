# Implementation brief for workflow.test.ts

Follow [the final workflow](../plan.md) and [build checklist](../todo.md).

Profile → Intake → Concept Pack → Rehearsal → Submit and review → Revision and transfer → Class and reflection → Library and portfolio

Bind the session to the teacher at intake. Keep mentor ID nullable until submission. Store immutable pack versions, confirmed transcript and initial/fresh-case review outcomes. Test an entire text-only cycle without microphone, camera or media probe.

<details><summary>Earlier technical reference (historical; final workflow above governs)</summary>

# Implementation brief for `src/server/workflow.test.ts`

## Test approach

Create focused integration/regression coverage using `node:test`, `node:assert/strict`, Node HTTP/fetch, and the existing `tsx` runner. The repository currently has typecheck and Vite build scripts and no test harness. The planned feature adds persisted identity and full-class evidence, so these cases protect actual account separation, data integrity and retry behavior. Keep all test state in a unique temporary directory and use the app factory with Vite disabled and an ephemeral port.

Use a deterministic injected AI adapter for most tests. Use the curated sugar pack for the no-key path. Keep a small explicit cookie-jar helper inside this file, safe unique emails and synthetic passwords. Create mentors through shared provisioning helpers or direct validated service functions. Test database/file outcomes through fresh HTTP reads after operations. Avoid assertions about incidental internal call counts.

## Core scenario

1. Register a teacher with a custom degree and name, and sign in again.
2. Create a Science/en session, match a real provisioned mentor, select the sugar preset and generate a complete pack.
3. Save progress through all six sections, including three attempted questions with one incorrect choice.
4. Create/start a video+audio attempt, acknowledge the opening cue, submit teacher text, save an exact student reply and acknowledge its cue.
5. Upload the synthetic A/V fixture as several numbered chunks, stop with the correct duration/count, correct teacher text, append a closing segment and confirm the final transcript.
6. Finish and verify a submitted attempt, protected whole-file playback and transcript on a fresh HTTP client.
7. Sign in as assigned mentor, verify the exact pack, draft then publish classroom feedback with scores/evidence, and confirm the teacher sees both independent outcomes.
8. Create a redo with the same pack, submit a second complete class and publish another review. Confirm both recordings remain accessible and the comparison uses the first reviewed same-pack/same-rubric attempt.
9. Reopen the database and private directory through a new app instance and repeat profile/session/recording/feedback reads.

## Required targeted groups

| Group | Specific assertions |
| --- | --- |
| Identity | Required name/degree, custom degree accepted, duplicate normalized email rejected, role injection rejected, invalid/expired/revoked cookie rejected |
| Access | Another teacher, unassigned mentor and coordinator cannot read/review private session, pack, transcript or video. Wrong-origin JSON and binary mutations fail |
| Matching | Subject/language filters, available flag, stable assignment, deterministic tie, empty pool then retry, concurrent creates with no duplicate session |
| Topics | Preset ID derives correct subject/grade, wrong-subject ID rejected, custom topic validated, optional class date/baseline validated |
| Generation | Exact section counts, option references, safety and expected observations, malformed provider result, timeout, stale session revision, same-key retry |
| Correction | A changes-requested note is loaded into v2 generation, source review ID persists, corrected content starts pending |
| Demo | EN/FIL/CEB sugar fixtures validate, unrelated degree uses general sample bridge without MAPEH attribution, unsupported no-key topic returns AI_UNAVAILABLE |
| Progress | Incorrect self-check answer accepted as an attempt, incomplete sections block start, wrong option IDs and stale revision rejected |
| Attempts | Repeated create/start/send/stop/finish idempotent, one active capture, pinned pack version, cross-session retry rejected, historical rows preserved |
| Transcript | Exact student text, display cue acknowledgment, pending cue blocks stop, teacher-only correction before finish, missing spoken/closing segment allowed, submitted transcript frozen |
| Failed reply | Definite provider failure persists settled failed state, same turn can retry or class can end, pending work/cues still block stop |
| Chunks | Out-of-order writes, duplicate checksum, changed checksum conflict, missing/extra final sequence, raw and aggregate byte limits, crash/retry consistency |
| Media | Real ffprobe detects both streams and advancing packet tail, rejects truncated tail/spoofed MIME/duration mismatch, missing binary gives clear failure |
| Probe readiness | Missing binary sets capability false and 503 start/finish, while sign-in/prep/read feedback/verified playback remain usable. Real-media check fails clearly until provisioned |
| Restart recovery | Stop lost offline, service restart, local complete original manifest replay, same bytes submit under original attempt ID |
| Dev privacy | Direct `/data/...` and `/@fs/<absolute-private-path>` requests cannot read SQLite/media, symlinked unsafe data root rejected |
| Review | Only assigned mentor publishes, separate badge/feedback states, exact-version badge, concurrent review conflict, unpublished draft absent for teacher |
| Improvement | Same pack/rubric baseline versus later attempt, per-dimension deltas/evidence, unreviewed attempt stays pending, different pack remains contextual history |
| Fresh case | Feedback unlocks response, owner submits, only mentor signs off |

## Real media fixture and dependency

Read `src/server/fixtures/classroom-av.webm`, described in its own brief. It is a self-authored synthetic 12-second VP8/Opus video with moving test pattern and tone. The real-file integration path invokes configured local ffprobe. It must fail clearly when the binary is unavailable. Do not silently skip the requirement and report success. Pure provider/auth tests can still run independently with an explicit test-name pattern.

Derive truncated-byte variants in the temporary test directory. Include a case that preserves a valid container header and both declared streams while removing enough tail to end at least six seconds early. The validator must inspect actual packet progression and reject it. Use injected probe output for precise single-track edge cases and a real local probe for valid media and tail truncation. Test `Math.min(2000, Math.max(250, durationMs * 0.02))` tolerance on both sides of its boundaries, including short valid clips. Confirm upload time cannot inflate the declared capture duration.

## Browser verification outside this file

Node tests cannot establish actual permission prompts, camera/microphone tracks, browser transcription, MediaRecorder final events or cross-browser codec playback. Run the main plan's browser scenario with actual/fake device sources, clear isolated teacher and mentor browser contexts, and reload during complete-capture pending upload. Confirm IndexedDB recovery, full A/V sound and image, and transcript cue seeking at start/middle/end. Record browser versions and unavailable checks honestly.

## Commands

Use `npm test`, targeted `npm test -- --test-name-pattern=...` only if the script argument order supports Node's flag parsing, `npm run lint`, and `npm run build`. Prefer an explicit direct `npx tsx --test --test-name-pattern="..." src/server/workflow.test.ts` when filtering. Run broader checks after focused cases pass. Clean up only each test's own resolved temporary path.

</details>
