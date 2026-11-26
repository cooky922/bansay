# Implementation brief for workflowApi.ts

Follow [the final workflow](../plan.md) and [build checklist](../todo.md).

Profile → Intake → Concept Pack → Rehearsal → Submit and review → Revision and transfer → Class and reflection → Library and portfolio

Bind the session to the teacher at intake. Keep mentor ID nullable until submission. Store immutable pack versions, confirmed transcript and initial/fresh-case review outcomes. Test an entire text-only cycle without microphone, camera or media probe.

<details><summary>Earlier technical reference (historical; final workflow above governs)</summary>

# src/workflowApi.ts

**Create one browser client for the new workflow.** LessonPrepStudio, RehearsalReview and CohortOversight currently call three stateless AI endpoints directly. The signed-in flow needs resource identities, structured conflict responses and binary upload support. Keep this module small and free of React state.

## Boundary

Use `/api/bansay` at the browser's origin and the shared DTOs. [The route contract](routes.ts.md) owns paths, methods, exact bodies and return envelopes. Export thin named functions grouped by caller, not a generated SDK. Keep just one internal JSON request helper for JSON bodies and response/error decoding. Preserve `AbortSignal` on reads. On same-origin requests pass the session cookie using normal browser credentials. Implement the server’s same-origin write checks. Never send browser-supplied role, teacher ID, reviewer name or recording path as authorization.

| Caller | Functions it needs |
| --- | --- |
| Shell and sign-in | Current user, teacher registration, login/logout, capabilities, session list, session detail |
| Lesson Prep and Concept Pack | Create/match session, update topic, create new pack version, save progress |
| Classroom and recorder | Create/start attempt, submit one teacher turn, acknowledge actual student display cue, stop capture, amend transcript, interrupt, upload one binary piece, finalize, fetch attempt |
| Mentor and history | Assigned queue, detail for pinned version/attempt, draft feedback, submit pack decision or signed feedback, fresh-case follow-up |

## Failure and replay rules

- Decode JSON error envelopes and expose HTTP status plus machine-readable code. Handle an empty success body such as logout. `401` invalidates the authenticated shell. Respect scoped `404`, validation errors, stale revision `409`, oversized data and retryable provider/storage failures. Never display a raw HTML fallback or server stack as feedback.
- The caller allocates a stable operation ID for the lifetime of a create, turn, upload completion or retry. Send it in the exact location the route requires. Retrying after a lost acknowledgment reuses that ID. A teacher intentionally starting another class receives a new ID. Use resource revisions where the route specifies them and refetch before merging a conflict. Avoid global automatic retries on writes.
- A read for lesson A must carry its ID back to the caller. Ignore stale responses if the teacher selected B, switched user or signed out. Fetch fresh pack/review state on view entry, focus return, or explicit refresh. Limit background refetching in low-data mode. Binary media download begins only when the user opens playback.
- Binary uploads use the raw body, correct media type and chunk metadata per the route contract. Do not base64 encode a recording or route it through the existing 8 MB JSON parser. Build the protected same-origin playback URL from the attempt ID for native video streaming, including HTTP Range support. Never place a cookie, bearer credential or local path in the URL.

## Verify

Use two real sign-ins, an expired session, a deliberately slow read, and a repeated command with identical and conflicting payloads. The first duplicate returns the existing result, a conflict prompts a reload, the wrong user cannot read the resource, and a subsequent authenticated request still succeeds. Test binary upload retry independently of JSON error handling.

</details>
