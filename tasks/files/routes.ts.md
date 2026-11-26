# Implementation brief for routes.ts

Follow [the final workflow](../plan.md) and [build checklist](../todo.md).

Profile → Intake → Concept Pack → Rehearsal → Submit and review → Revision and transfer → Class and reflection → Library and portfolio

Bind the session to the teacher at intake. Keep mentor ID nullable until submission. Store immutable pack versions, confirmed transcript and initial/fresh-case review outcomes. Test an entire text-only cycle without microphone, camera or media probe.

<details><summary>Earlier technical reference (historical; final workflow above governs)</summary>

# Implementation brief for `src/server/routes.ts`

## Responsibility

Create a router factory that mounts the live workflow commands and query endpoints under `/api/bansay`. Inject the database, private storage root and AI adapter so HTTP integration tests can run on an ephemeral server. Keep route bodies limited to parsing, authorization, invoking the owning service and returning its result. Keep database and lifecycle logic in the services named by the other briefs.

## Common HTTP contract

Success responses return the resource or documented composite. List queries return `{items,nextCursor}`. Error responses return `{error,code,fieldErrors?,retryable?}` with human-readable safe wording. Use 400 for invalid input, 401 for absent authentication, 403 for role/origin failures, 404 for missing or inaccessible private resources, 409 for stale revision or lifecycle/idempotency conflict, 413 for bounded payload failure, 429 for rate limiting, and 502/503 for AI/storage dependency failures. Include retry guidance only where retry is safe.

All routes below require authenticated cookies except register/login. All mutations require the same-origin/header protection from auth. Identity, mentor identity and teacher background are loaded by the server. Apply strict shape validation, supported union checks, bounded inputs and unexpected-field rejection for security-sensitive commands. Async Express 4 handlers must catch errors and pass them to a final JSON error handler.

Expected revisions are optimistic concurrency numbers. Every idempotency key is scoped to principal and operation. The same key plus same canonical body returns the original outcome. Changed bodies return 409. Transient operation states include safe in-progress responses. Inaccessible IDs return no resource data.

## Account routes

| Method and suffix | Request | Response and access |
| --- | --- | --- |
| POST `/auth/register` | `{email,password,displayName,degree,major?,preferredLanguage}` | 201 safe profile and cookie, always teacher |
| POST `/auth/login` | `{email,password}` | 200 safe profile and rotated cookie |
| GET `/auth/me` | None | Current safe profile, 401 when signed out |
| POST `/auth/logout` | Empty JSON | 204 and cleared cookie/session |
| GET `/capabilities` | None | Signed-in recording readiness/bounds/MIME list and configured AI/demo preset coverage |

## Session and learning routes

| Method and suffix | Request | Response and access |
| --- | --- | --- |
| GET `/sessions` | Optional bounded cursor/limit | Teacher-owned or mentor-assigned session summaries |
| POST `/sessions` | `{subject,language,idempotencyKey}` | 201 session composite with matched or waiting status |
| GET `/sessions/:id` | None | Owned/assigned session, mentor, packVersions, progressByPackVersionId, attempts |
| POST `/sessions/:id/match` | `{idempotencyKey}` | Teacher-only matching retry, existing match is stable |
| PATCH `/sessions/:id/topic` | `{expectedRevision,topicSource,presetId?,topic?,gradeLevel?,classDate?,startingMaterial?,baselineFirst?,baselineExplanation?}` | Updated session composite. Preset ID determines canonical topic/grade |
| POST `/sessions/:id/packs` | `{expectedSessionRevision,idempotencyKey,imageData?}` | 201 immutable pack/progress and updated session pointer |
| PUT `/packs/:id/progress` | `{expectedRevision,completedSections,misconceptionChoiceId,selfCheckAnswers}` | Saved progress and classroom eligibility |

`classDate` is optional YYYY-MM-DD context, `startingMaterial` is optional bounded text, `baselineFirst` defaults false and `baselineExplanation` is the teacher's optional independent answer. Persist these in the session and generation snapshots. Validate date syntax/calendar value without adding an advance-notice gate. A chosen baseline-first option requires its answer before examples are revealed. Optional photo input is at most 5 MiB of JPEG/PNG/WebP and travels only in the generation command.

## Classroom routes

| Method and suffix | Request | Response and access |
| --- | --- | --- |
| POST `/sessions/:id/attempts` | `{packVersionId,retryOfAttemptId?,idempotencyKey}` | 201 created attempt, no opening prompt yet |
| GET `/attempts/:id` | None | Attempt, transcript, recording summary, published feedback, freshCase |
| POST `/attempts/:id/start` | `{idempotencyKey,mimeType,hasVideo:true,hasAudio:true}` | Recording state and one persisted student opening |
| POST `/attempts/:id/messages` | `{clientMessageId,text,source,offsetMs}` | Persisted teacher turn and exact generated student reply |
| PUT `/attempts/:id/messages/:messageId/cue` | `{offsetMs}` | Finalized actual display cue for the exact saved student opening/reply |
| POST `/attempts/:id/stop` | `{idempotencyKey,durationMs,finalChunkCount}` | Uploading state and expected capture boundary, uploads may remain pending |
| PUT `/attempts/:id/transcript` | `{expectedRevision,teacherEdits:[{id,text}],additionalTeacherSegments:[{clientMessageId,text,offsetMs}]}` | Canonical transcript and new revision before submission |
| PUT `/attempts/:id/recording/chunks/:sequence` | Binary bytes with MIME and `X-Chunk-SHA256` | Durable chunk acknowledgment and uploaded sequence summary |
| POST `/attempts/:id/finish` | `{idempotencyKey,finalChunkCount,durationMs,transcriptRevision,transcriptConfirmed:true}` | Submitted attempt after successful durable assembly |
| POST `/attempts/:id/interrupt` | `{idempotencyKey,reason}` | Interrupted attempt preserving partial evidence |
| GET `/attempts/:id/recording` | Optional Range header | Authorized complete media with 200/206/416 behavior |
| PUT `/attempts/:id/fresh-case` | `{expectedRevision,response,submit:boolean}` | Teacher-owned independent answer, feedback unlock required |

Student openings and replies initially have `cuePending=true` and `offsetMs=null`. The cue command records the time the client actually displays that saved text using its recorder-relative clock. A repeated identical acknowledgment is idempotent, a changed offset returns 409, and stop/finish reject pending cues. Preserve exact saved student text after response loss and acknowledge it when displayed.

For lifecycle conflicts return the current attempt status and safe next action. Return missing chunk sequence numbers when finish is waiting on upload. Enforce the actual recorded duration as the bound for final transcript offsets. Created, interrupted and unfinished records never return the submitted success shape.

The capabilities response includes recording readiness and a safe reason code/message. If local ffprobe is missing/unusable, recorded start and finish return 503 `MEDIA_PROBE_UNAVAILABLE`. Keep sign-in, preparation, feedback reads, binary recovery uploads and authorized playback of previously verified files available. Recheck readiness after the operator fixes the dependency.

## Mentor routes

| Method and suffix | Request | Response and access |
| --- | --- | --- |
| GET `/mentor/queue` | Optional bounded cursor | Only assigned sessions' pending packs and submitted attempts |
| POST `/packs/:id/review` | `{status,notes,expectedReviewId,idempotencyKey}` | Exact-version human decision and signed badge metadata |
| POST `/attempts/:id/feedback-draft` | Empty JSON | Mentor-local AI/demo draft with source label |
| POST `/attempts/:id/feedback` | `{focusedGap,teachingMove,quickRefresher,masteredSkill,practiceSkill,rubricVersion,scores,evidence,reviewedVideo:true,reviewedAudio:true,reviewedTranscript:true,idempotencyKey}` | Published immutable mentor feedback |
| POST `/attempts/:id/fresh-case-review` | `{decision,notes,expectedRevision,idempotencyKey}` | Explicit mentor signoff, decision is mastered or needs-practice |

Teacher reads of sessions/attempts include only published mentor feedback. AI drafts do not create signatures or badges. Sharing a saved browser role or a teacher-supplied mentor ID never authorizes a review.

## Legacy API compatibility

Keep the three current stateless endpoint request/response shapes working during migration for the isolated reference flow. They are `/generate-support`, `/rehearse`, and `/mentor-assist`. Authenticate them and validate their inputs, with mentor role required for the assist endpoint. Their results never become a persisted session, badge, review or improvement score by themselves. New live clients call the ID-based commands above. Reuse the same provider/generation helpers and adapt their output to the existing legacy shapes. Remove an old endpoint only after its callers and README references have been intentionally migrated.

## Router verification

- [ ] HTTP integration tests exercise cookie auth, input validation, private-resource ACL and all normal state transitions.
- [ ] Undefined `/api` paths return JSON 404 before the Vite/static SPA fallback.
- [ ] Binary routes bypass JSON parsing and respect their own bounded body parser.
- [ ] No public route mounts the private recording root or returns credential/path data.
- [ ] Fresh login on another device reopens packs, video/audio/transcript, badge and feedback.

</details>
