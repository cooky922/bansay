# Implementation brief for aiProviders.ts

Follow [the final workflow](../plan.md) and [build checklist](../todo.md).

Cache the ten-minute text pack offline. Include a big idea of up to three sentences, degree-based bridge and its limit, two or three reasoned examples including a contrast, misconception choices with feedback, three self-checks, a safe household demo with expected observations, and a rehearsal prompt. Display AI Draft (Unverified) on every draft and offline copy, with a reminder to check safety and formulas before teaching. Version edits and bind human verification to the approved version.

Bind competency, grade, major, language and private stage to structured generation. Use the architecture’s MATATAG grounding route through Grade 9 and K to 12/MELCs route from Grade 10 through SHS; record source/version and verify current approved guides before enabling a grade. Parameterize PPST codes as domain.strand.stage. Require analogy limits, causal contrasts, misconception-based checks and local materials unless lab equipment is enabled. Judge accuracy, analogy fidelity, misconception depth, local feasibility and mobile scannability on 0–3. If any score is below 2 regenerate at most twice, then return a recoverable failure. Only a human can award a badge.

<details><summary>Earlier technical reference (historical; final workflow above governs)</summary>

# Implementation brief for `src/server/aiProviders.ts`

## Current behavior

The module posts to OpenRouter using a server key, a configured model and either text or strict-JSON requests. It JSON-parses structured output and casts it to a generic type. Requests have no timeout, non-JSON provider errors can escape parsing, and raw provider messages flow back through the root error helper.

## Required provider boundary

Keep the existing function names and call signatures where current callers rely on them. Add an optional timeout or AbortSignal argument used by the new workflow. Set a finite default request timeout, such as 45 seconds, and clear the timer after completion. Handle fetch failures, aborts, rate limits, non-JSON error bodies, missing choices, empty text and invalid JSON with a safe typed provider error carrying a stable code and retryable flag.

Keep the OpenRouter key in server process environment. Never serialize it, return raw request/response headers, or log prompt/image contents by default. `hasOpenRouterProvider` should treat blank and the shipped example placeholder as unconfigured. A configured but failing key returns a provider error instead of pretending live output succeeded.

`generateOpenRouterJson` supplies the exact output schema but the calling concept-pack service still runtime-validates semantic counts, option IDs and required safe demo fields. A generic cast is insufficient validation. Keep schema repair logic in the concept-pack service so the transport adapter stays small and student replies do not inherit unexpected retries.

## Prompt and data handling

Continue separating system instructions from the teacher's content. Include an image only after MIME/size validation by the route/service. Provider input for a student reply uses the server's pinned pack and canonical attempt history. Provider input for mentor drafts uses the submitted transcript and text context. Publish no claim about camera-observed behavior when only text went to the model.

Both live and demo results carry an explicit source label at the service boundary. The provider module does not publish badges, feedback or scores. The no-key fallback is the specific supported sugar fixture described in the concept-pack brief.

## Verification

- [ ] Mock fetch to return valid JSON/text, 429 JSON, 500 HTML, empty choices, malformed structured output and a timeout.
- [ ] Confirm safe error codes reach the API without keys, private paths or prompt text.
- [ ] Confirm timeout cleanup and a caller abort do not leave pending handles.
- [ ] Existing legacy API adapters still receive their expected transport result shapes.
- [ ] Live generation produces all required pack fields after service validation.

Consult the official provider schema documentation at implementation time if the configured model changes its structured-output support. Do not hardcode an assumed model-specific response shape beyond the documented API fields.

</details>
