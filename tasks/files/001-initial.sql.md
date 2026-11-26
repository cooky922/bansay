# Implementation brief for 001-initial.sql

Follow [the final workflow](../plan.md) and [build checklist](../todo.md).

Profile → Intake → Concept Pack → Rehearsal → Submit and review → Revision and transfer → Class and reflection → Library and portfolio

Bind the session to the teacher at intake. Keep mentor ID nullable until submission. Store immutable pack versions, confirmed transcript and initial/fresh-case review outcomes. Test an entire text-only cycle without microphone, camera or media probe.

<details><summary>Earlier technical reference (historical; final workflow above governs)</summary>

# Implementation brief for `src/server/migrations/001-initial.sql`

## Schema purpose

Create the first durable workflow schema. The repository currently has no database. This migration must distinguish real account work from sample `LessonCase` records and must support exact pack verification, full-class recordings, independent retries and mentor feedback.

## Tables and keys

| Table | Required stored fields and constraints |
| --- | --- |
| `users` | UUID ID, normalized unique email, display name, degree, nullable major, role CHECK, preferred language CHECK, password salt/hash/parameters, created timestamp |
| `auth_sessions` | Hashed opaque token primary key, user FK, created/expiry timestamps. Keep raw cookies out of storage |
| `mentor_profiles` | Mentor user FK primary key, affiliation, available integer CHECK, supported subjects/languages JSON validated by the service, nullable last-assigned timestamp |
| `lesson_sessions` | UUID ID, teacher FK, profile snapshot JSON, subject CHECK, nullable grade/topic source/preset/topic/class date, starting material, baseline-first flag and baseline answer, language CHECK, nullable assigned mentor FK, match status CHECK, nullable current pack ID, revision, created/updated timestamps |
| `concept_pack_versions` | UUID ID, session FK, version integer, subject/grade/language/topic/profile snapshots, source CHECK, validated content JSON, generation idempotency key, created timestamp, unique session/version and session/generation key |
| `pack_progress` | Pack FK plus teacher FK compound key, completed sections JSON, nullable misconception choice, self-check answers JSON, nullable completed timestamp, revision |
| `pack_reviews` | UUID ID, pack FK, mentor FK, status CHECK verified or changes-requested, required review notes, reviewed timestamp, idempotency key |
| `classroom_attempts` | UUID ID, session FK, pack FK, attempt number, nullable retry FK, lifecycle status CHECK, start/end/duration, transcript revision, canonical transcript confirmation timestamp, media MIME/track flags/bytes/hash/private relative storage key, recording state, stop/finish idempotency fields and expected chunk count, fresh-case text/status/revision/decision/review fields, created timestamp |
| `transcript_entries` | UUID ID, attempt FK, monotonic sequence, sender CHECK, canonical text, nullable media offset integer, cue-pending flag, source CHECK, client message ID, nullable reply-to entry FK, reply-generation state, created timestamp, unique attempt/sequence and attempt/client message ID |
| `recording_chunks` | Attempt FK and zero-based sequence compound key, byte count, SHA-256, MIME, durable relative storage key, uploaded timestamp |
| `attempt_feedback` | UUID ID, attempt FK with UNIQUE(attempt_id), assigned mentor FK, coaching fields, rubric version, validated scores/evidence JSON, published timestamp, idempotency key |
| `request_deduplication` | Principal ID, operation name, client key compound key, request fingerprint, resulting resource ID/response marker, created timestamp, operation state |

`schema_migrations` is created by db bootstrap before applying numbered migration files. Keep the circular current-pack pointer nullable at creation and enforce that it belongs to the same session in application transactions. Where foreign keys can enforce that relationship with a composite key, use it. UUID strings retain their server-generated identity.

## Indexes and checks

Index lesson sessions by teacher/updated time and mentor/updated time. Index pack reviews by pack/reviewed time, attempts by session/attempt number, feedback by attempt/published time and auth sessions by expiry. Add a partial unique index allowing one created/recording/uploading attempt per session. An interrupted attempt is historical and recoverable through its existing ID, while starting another attempt prevents restarting the old capture. Persist unique `(session_id, attempt_number)` independently of timestamps.

Use CHECK constraints for nonnegative media offsets/bytes/chunk sequence, positive version/revision/attempt number, valid lifecycle values, and a valid 0–2 score range where represented as columns. Service validation must check array shapes and JSON references. Add uniqueness for all idempotency keys within their actual operation scope. Reject reuse with a different request fingerprint in the service.

## Mutation invariants

Content JSON is immutable once inserted. Reviews append decisions associated with an exact pack ID. Teacher progress changes only the owner's row. Feedback publication creates an authoritative mentor record. A new attempt never overwrites a previous attempt. A retry's previous attempt must belong to the same session and teacher.

Enforce one published feedback row per attempt through the explicit unique attempt key. A race between two publish requests is resolved by that database invariant and returns the existing result or a conflict. Store a new version's source correction-review ID in generation metadata so the mentor can trace the correction.

Submitted attempts require a ready recording, both track flags, positive duration, canonical transcript confirmation, and an ending timestamp. Enforce simple conditions in SQL CHECKs and the remaining multi-table conditions in the finish transaction. Submission freezes transcript entries through service authorization. A database read reconstructs the exact pack version used by an old attempt even when the session's current pointer advances.

## Migration verification

- [ ] Apply on a temporary empty database, insert the minimum valid account-to-feedback chain, and reopen it.
- [ ] Reject duplicate email, duplicate chunk number with different content, second active attempt and cross-session retry.
- [ ] Fail midway through a matching or feedback transaction and confirm rollback.
- [ ] Confirm mentor queue indexes exist and sample browser data is absent from live tables.

Document schema changes through a later numbered migration when implementation has shipped. The initial build may revise this first migration while the schema has no deployed user data.

</details>
