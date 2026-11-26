# Implementation brief for bansay.ts

Follow [the final workflow](../plan.md) and [build checklist](../todo.md).

Profile → Intake → Concept Pack → Rehearsal → Submit and review → Revision and transfer → Class and reflection → Library and portfolio

Bind the session to the teacher at intake. Keep mentor ID nullable until submission. Store immutable pack versions, confirmed transcript and initial/fresh-case review outcomes. Test an entire text-only cycle without microphone, camera or media probe.

<details><summary>Earlier technical reference (historical; final workflow above governs)</summary>

# Implementation brief for `src/types/bansay.ts`

## Ownership and prerequisites

The domain worker owns this existing file. Read [the main plan](../plan.md), [the routes brief](routes.ts.md), and the existing consumers before changing any exported type. Coordinate this file before client and server work branches. This file defines shared serialized contracts. Keep database handles, Express types, password hashes, cookie tokens, filesystem paths, and browser MediaStream objects in their owning server or capture modules.

## Current behavior

The file currently defines `LessonCase`, `GeneratedLessonSupport`, one mutable `mentorReview`, one `rehearsalMessages` array, and support for Science, Mathematics, English and `en`, `fil`, `ceb`. It has no authenticated principal, mentor pool, pack version, durable recording, or independent classroom attempt. Existing `LessonCase` and sample portfolio/library types still serve the isolated reference views and browser v1 records.

## Shared primitive conventions

Use opaque server-generated UUID strings for persistent IDs and ISO 8601 UTC strings for timestamps. Store media-relative times as integer milliseconds. `SubjectName` and `BansayLanguage` retain their current unions. `UserRole` retains teacher, mentor, coordinator, while registration creates only teacher accounts. Distinguish a nullable value from a missing response field consistently. All JSON DTOs use camelCase. All persisted revisions start at 1 and increment on successful mutable updates.

## Account and mentor contracts

Define `UserProfile` with `id`, `email`, `displayName`, `degree`, optional `major`, `role`, `preferredLanguage`, `createdAt`. Name and degree are required at registration. Preserve the full free-text degree, such as Bachelor of Secondary Education, and use optional major for a more precise specialty bridge. Derive the AI background from `major?.trim() || degree`; the application must accept a degree outside the current `TEACHER_MAJORS` list.

Define `TeacherProfileSnapshot` with `displayName`, `degree`, `major` and capture it at session creation. `MentorSummary` has `id`, `displayName`, `affiliation`, `subjects`, `languages`, `available`. The public DTO excludes email and password data. A mentor account ID is the identity used for assignment and authorization.

## Lesson session contracts

Define `LessonSession` with `id`, `teacherId`, `teacherProfileSnapshot`, `subject`, nullable `gradeLevel`, `language`, nullable `mentorId`, `matchStatus` as matched or waiting, nullable `topicSource` as preset or custom, nullable `presetId`, nullable `topic`, nullable `currentPackVersionId`, optional intake context, `revision`, `createdAt`, `updatedAt`. Intake context consists of nullable `classDate`, `startingMaterial` defaulting empty, `baselineFirst` defaulting false and `baselineExplanation` defaulting empty. Save this text context with generation snapshots.

The teacher chooses a subject and session language before `POST /sessions`. Grade and topic are selected after matching. A waiting session exists durably, has no mentor, and cannot generate a pack. Define a session composite DTO with `session`, nullable `mentor`, `packVersions`, `progressByPackVersionId`, and chronological `attempts`. This is the authoritative resume response from `GET /sessions/:id`. Return only public mentor summary data.

## Exact Concept Pack content

Define `ConceptPackContent` using these fields.

| Field | Required structure and constraints |
| --- | --- |
| `bigIdea` | Tuple of exactly three nonempty sentences in plain language |
| `specialtyBridge` | Existing `SpecialtyBridge` structure, tied to the degree or major and including the analogy's limitation |
| `workedExamples` | Two or three objects with `id`, `title`, `problem`, nonempty `reasoningSteps`, `answer` |
| `misconceptionCheck` | `prompt`, at least two `{id,text,feedback}` options, `correctOptionId`, `explanation` |
| `selfCheck` | Exactly three objects with `id`, `prompt`, at least two `{id,text,feedback}` options, `correctOptionId` |
| `demo` | `title`, nonempty `materials`, ordered `steps`, nonempty `safetyNotes`, nonempty `expectedObservations`, `keyTakeaway` |
| `rehearsalBridge` | `studentName`, `prompt`, `freshCasePrompt` |

Each check's feedback explains the reasoning for that choice. IDs are unique within the containing pack and correct option IDs reference actual options. A worked example exposes intermediate reasoning. The bridge remains visible alongside the six-part learning sequence.

Define `ConceptPackVersion` with `id`, `sessionId`, `version`, `language`, `subject`, `gradeLevel`, `topicSnapshot`, `profileSnapshot`, `content`, `source` as ai, demo or legacy, nullable `sourceReviewId` for correction provenance, `createdAt`, nullable `review`. `review === null` means awaiting mentor verification. Each regenerated or translated content body receives a new ID. Keep historical content immutable.

`PackReview` has `id`, `packVersionId`, `mentorId`, `mentorName`, `status` as verified or changes-requested, `notes`, `reviewedAt`. Store previous decisions in the database audit rows while DTOs expose the current decision for that version. A badge renders only the exact version's verified decision. AI provenance never supplies a human verification identity.

Define `PackSection` as `big-idea`, `worked-examples`, `misconception-check`, `self-check`, `demo`, `rehearsal-bridge`. `PackProgress` contains `packVersionId`, `completedSections`, nullable `misconceptionChoiceId`, `selfCheckAnswers` keyed by question ID, nullable `completedAt`, and `revision`. All six sections require explicit completion. Finishing self-check requires an answer to each of three questions. Incorrect answers still count as attempts. Keep correctness as learning feedback and avoid a pass-score gate.

## Classroom and transcript contracts

Define `ClassroomAttempt` with `id`, `sessionId`, `packVersionId`, `attemptNumber`, nullable `retryOfAttemptId`, `status` as created, recording, uploading, submitted or interrupted, nullable `startedAt`, nullable `endedAt`, nullable `durationMs`, `transcriptRevision`, `createdAt`, and recording summary. Append a new attempt for each redo. Preserve every previous recording, transcript, feedback record and pack reference.

Define a canonical `TranscriptEntry` with `id`, `attemptId`, `sequence`, `sender` as teacher or student, `text`, nullable `offsetMs`, `cuePending`, `createdAt`, and `source` as typed, speech-corrected or manual. Student openings and replies have a pending cue until the client acknowledges their actual display time through the cue endpoint. A confirmed cue has an integer offset and cannot be replaced. Teacher entries have immediate supplied offsets. Use sequence to resolve same-time events. The client discards interim speech-recognition guesses. Before submission the teacher may correct saved teacher text and supplement a missing spoken segment. Student opening and AI replies remain exact. Freeze the complete canonical transcript on submission, requiring every cue to be finalized.

`RecordingSummary` contains `status` as pending, uploading, ready or interrupted, nullable `mimeType`, nullable `bytes`, nullable `durationMs`, `uploadedChunkSequences`, nullable `playbackUrl`, `hasAudio`, `hasVideo`. The playback URL is an authenticated API path. The server excludes private disk paths and cookie tokens. A submitted full class has video, audio, and confirmed transcript.

Define an attempt composite containing `attempt`, ordered `transcript`, nullable published `feedback`, `freshCase`, and `recording`. Owner teachers and the assigned mentor can read it, including after refresh or from another device.

## Feedback and improvement contracts

Use `RubricVersion = "v1"`. `RubricScores` contains `conceptualAccuracy`, `explanationClarity`, `misconceptionResponse`; each value is 0, 1 or 2. Keep dimensions and anchors in the review brief. `AttemptFeedback` has `id`, `attemptId`, `mentorId`, `mentorName`, `focusedGap`, `teachingMove`, `quickRefresher`, `masteredSkill`, `practiceSkill`, `rubricVersion`, `scores`, dimension evidence, and `publishedAt`. AI drafts use a separate DTO and carry no publication identity or verification effect.

`FreshCaseSubmission` has `prompt`, `response`, status as locked, ready, submitted or reviewed, `revision`, nullable mentor note, nullable decision as mastered or needs-practice and nullable reviewed timestamp. It belongs to its attempt. Mentor feedback unlocks the teacher's independent application. A mentor signs off explicitly after submission. Teacher text corrections are complete before classroom submission. Instructional improvement appears in a new attempt.

An improvement comparison requires the same session, pack version and rubric version, plus published mentor scores for both attempts. Return dimension deltas, evidence, dates, and attempt numbers. Leave missing scores visibly pending. A different pack version remains available in history with its own context.

## Request and response types

Export request DTOs for all routes in [routes.ts](routes.ts.md) and response composite DTOs used by the client API module. Use `ApiError` with `error`, `code`, optional `fieldErrors`, and optional `retryable`. Requests carry expected revision for mutable records and client idempotency keys for create/start/message/finish operations. Server identity is derived from the cookie.

Define `RuntimeCapabilities` with `recording` containing `ready`, nullable `reason` carrying a safe code/message, `supportedMimeTypes`, `maxChunkBytes`, `maxAttemptBytes`, `maxDurationMs`, and `ai` containing `configured`, `demoPresetIds`. The signed-in preflight reads these values from `GET /capabilities`. Missing ffprobe uses `MEDIA_PROBE_UNAVAILABLE`. No executable path or provider credential enters this response.

## Compatibility and verification

Keep existing sample types while the reference views depend on them. Do not assign a real owner to old localStorage cases or auto-import them. An old partial guide cannot satisfy a complete new pack through a type cast.

- [ ] Typecheck existing sample consumers and new workflow consumers together.
- [ ] Server and browser import shared DTOs without pulling server runtime dependencies into Vite.
- [ ] Invalid option IDs, absent demo safety, missing A/V and mutable historical attempts cannot be represented as completed authoritative records without explicit validation failures.
- [ ] Every route request and composite response has an unambiguous serialized shape.

</details>
