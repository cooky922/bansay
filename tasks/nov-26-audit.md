# Rehearsal backend audit

Audited against the checked-out baseline before the Nov 26 implementation change.

## Confirmed baseline findings

| Severity | Finding | Evidence | Correction and regression expectation |
| --- | --- | --- | --- |
| High | The browser supplied the entire conversation history and the server used it directly in the provider prompt. | `server.ts`, former `/api/bansay/rehearse` handler; `RehearsalReview.tsx`, `handleSendToStudent` sent `activeCase.rehearsalMessages`. | Validate a bounded alternating transcript that begins with the learner. Reject forged roles, empty text and oversized histories. |
| High | The route accepted unbounded topic, name, grade, message and history values. | Same route had only a non-empty teacher-message check. | Apply subject/language allowlists and bounded inputs before provider/demo work. |
| Medium | Demo mode always returned the same generic follow-up for a topic, regardless of the teacher explanation. | `createDemoStudentReply` in `server.ts`. | Use a limited, reviewed sugar progression and a bounded generic evidence question for other topics. |
| Medium | Neither demo nor live mode had a finite learner turn cap. | Same route and component. | Cap learner follow-ups at five after the opening. Return a terminal response once reached. |
| Medium | Live model instruction did not prohibit evaluation, answer leakage, hidden-instruction disclosure or topic drift. | Former `instructions` string in `/api/bansay/rehearse`. | Add explicit learner-role, safety, grounding and response-length constraints. |
| Medium | Live responses were accepted with only provider success. | Former route returned raw `generateOpenRouterText` output. | Reject empty, oversized, repeated and off-role responses before the UI receives them. |
| Low | The UI treated every successful response as a new learner message. | `RehearsalReview.tsx`, `handleSendToStudent`. | Handle terminal turn-limit results without adding a fabricated learner reply. |

## Current limits

The app still uses client-held cases and does not persist rehearsal state on the server. The validation protects the active request but cannot establish identity, durable idempotency or immutable pack facts. Those requirements belong to the Nov 27 account/session design. The live model remains unable to prove factual correctness from a prompt alone. Human mentor review and approved lesson content remain the authority for those judgments.

## Request flow

```text
Teacher text + displayed transcript
        ↓
Client submits the active lesson context
        ↓
Server validates subject, language, sizes and alternating turns
        ↓
Server bounds canonical history and builds a learner-only prompt
        ↓
Demo progression or configured provider
        ↓
Server rejects unsafe, repeated or oversized learner text
        ↓
Client appends one learner reply or shows the turn-limit result
```

## Follow-up audit work

The implemented scope does not introduce a database or a signed session. Before connecting this endpoint to persistent accounts, replace client-provided lesson context/history with server-owned attempt, pack and transcript identifiers as specified in the Nov 27 task set.
