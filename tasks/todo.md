# Remaining BANSAY work

This checklist consolidates unfinished work from the Nov 26 rehearsal-backend audit and the Nov 27 coaching workflow.

## Nov 26 rehearsal backend

### Server-owned rehearsal state

- [ ] Create a durable rehearsal-attempt record that pins the approved lesson version, learner belief, misconception, open question, turn count, language, prompt revision, and terminal reason.
- [ ] Replace client-supplied lesson context and transcript history with authenticated attempt identifiers and server-owned canonical turns.
- [ ] Implement and test the learner transition table: opening, probing, partial understanding, resolved understanding, teacher stop, turn limit, unsafe/out-of-scope, provider failure, and retry.
- [ ] Add idempotency keys and ordered turn writes so retries cannot create duplicate learner messages.

### Model-output controls

- [ ] Require bounded structured learner output: intent, active criterion, misconception state, proposed transition, and learner text.
- [ ] Independently validate output against the pinned lesson facts, selected language, active question, allowed transition, and previous learner turns.
- [ ] Allow at most one safe repair attempt for malformed output; otherwise return a retryable failure without creating a learner turn.
- [ ] Treat provider timeouts and uncertain commits safely, without duplicate transcript events.

### Evaluation and handoff

- [ ] Add synthetic regression fixtures for sugar/filtration/mass, fractions, evidence versus inference, unsafe heat, correct-but-unexplained answers, valid alternate explanations, detours, teacher stop, malformed output, timeout, and concurrent retries.
- [ ] Exercise each relevant COI opportunity only when topic-appropriate; keep NCOI reflection private and outside learner dialogue.
- [ ] Run subject-mentor and teacher review of persistence, grade/language fit, and non-punitive behavior. Record limits and disagreements.
- [ ] Document API contracts, test results, provider checks, and remaining model risks before connecting this rehearsal work to persistent accounts.

## Nov 27 coaching workflow

### Accounts and durable ownership

- [ ] Connect the existing server auth endpoints to the onboarding and logout UI with signed sessions.
- [ ] Persist teacher profile, role, biological sex, lesson intake, and preferences with server-enforced account ownership.
- [ ] Add restart and cross-account isolation tests.

### Lesson preparation and Concept Pack

- [ ] Implement school-day lead-time calculation and optional materials-only photo confirmation/compression.
- [ ] Build the complete versioned six-part Concept Pack: big idea, worked examples, misconception check, self-check, safe demo, and rehearsal bridge.
- [ ] Ground generation in the correct MATATAG/K to 12 source with recorded source/version, competency lookup, major, grade, language, and career stage.
- [ ] Add the generation-quality gate, two maximum regenerations, offline caching, and immutable verified-pack versions.

### Rehearsal, mentor review, and transfer

- [ ] Persist the 3–5-turn rehearsal transcript through the server-owned learner state machine in the Nov 26 task set.
- [ ] Save and route submissions atomically by subject, language, and urgency; queue uncovered work, apply backup coverage, and enforce retry idempotency.
- [ ] Build the mentor’s two-minute pack audit, transcript review, exact-version verification badge, practical correction, and teaching move.
- [ ] Implement revision and an unseen fresh-case attempt with separate evidence and mentor decision.

### Post-class, library, and portfolio

- [ ] Add voluntary post-class reflection and materials-only photo handling; keep actual class evidence distinct from simulated rehearsal.
- [ ] Publish only de-identified mentor-verified packs to the searchable peer library.
- [ ] Complete the private teaching portfolio, teacher-selected PMES/CPD export, and anonymized coordinator reporting.

### Verification and privacy

- [ ] Exercise media lifecycle, consent, expiry, deletion, export, and zero-core-video-upload checks with a fake clock.
- [ ] Validate draft rejection, competency lookup, generation limits, deadline/backup routing, duplicate submission, fresh-case isolation, and selected-export behavior.
- [ ] Run the initial and fresh-case pilot with separate teacher and mentor accounts, then record the planned pilot measures.
