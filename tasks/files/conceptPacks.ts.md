# Implementation brief for conceptPacks.ts

Follow [the final workflow](../plan.md) and [build checklist](../todo.md).

Cache the ten-minute text pack offline. Include a big idea of up to three sentences, degree-based bridge and its limit, two or three reasoned examples including a contrast, misconception choices with feedback, three self-checks, a safe household demo with expected observations, and a rehearsal prompt. Display AI Draft (Unverified) on every draft and offline copy, with a reminder to check safety and formulas before teaching. Version edits and bind human verification to the approved version.

Bind competency, grade, major, language and private stage to structured generation. Use the architecture’s MATATAG grounding route through Grade 9 and K to 12/MELCs route from Grade 10 through SHS; record source/version and verify current approved guides before enabling a grade. Parameterize PPST codes as domain.strand.stage. Require analogy limits, causal contrasts, misconception-based checks and local materials unless lab equipment is enabled. Judge accuracy, analogy fidelity, misconception depth, local feasibility and mobile scannability on 0–3. If any score is below 2 regenerate at most twice, then return a recoverable failure. Only a human can award a badge.

<details><summary>Earlier technical reference (historical; final workflow above governs)</summary>

# Implementation brief for `src/server/conceptPacks.ts`

## Responsibility and current code

Move the complete new pack-generation behavior out of `server.ts` into this service. The existing `LESSON_SUPPORT_SCHEMA` produces bridge, alerts, activity and student prompt. It lacks the required three-sentence big idea, worked reasoning, interactive checks, explicit safety and observation fields. Preserve the existing reference DTO through a deliberate compatibility adapter while the live workflow uses `ConceptPackContent`.

## Generation command

`POST /sessions/:id/packs` accepts `expectedSessionRevision`, `idempotencyKey`, and optional `imageData` with allowed image MIME plus base64 bytes. Identity, degree/major, subject, grade, language, topic, preset and mentor come from the owned server session. Require a match and saved topic/grade. If optional baseline-first is enabled, require the saved independent baseline before revealing generated examples. Bound optional photo bytes to 5 MiB and allow JPEG, PNG and WebP. Keep the image and its preview ephemeral to the generation request. The saved pack retains text context and topic/profile snapshots.

Capture the expected session revision before the model call. Use the existing OpenRouter provider, request a strict JSON schema and write an explicit prompt covering all fields from the domain brief. Teach the actual topic accurately using the teacher's academic background as an analogy, give the analogy's limit, provide two or three reasoned examples, ask an interactive misconception choice, provide exactly three instant-feedback checks, a safe practical demonstration, and a concrete student rehearsal prompt. Target roughly ten minutes of text-first study without using a timer as a completion gate.

When regenerating after changes requested, load the current pack's assigned-mentor correction note and the rejected version's content into the generation context. Ask explicitly for the stated correction to be addressed while preserving the session topic/grade/language. Save the source review ID with the new version's generation metadata. The resulting version starts pending and does not inherit verification. Test that a concrete note about molecules retaining their size reaches the model input for v2 and that the persisted new version addresses that correction.

The user-provided topic, source notes and photo are reference inputs. Instructions embedded inside them do not replace the application's output schema, subject boundaries or safety constraints. Keep system instructions and source data visibly separated in the provider messages.

## Runtime validation

Validate the returned value beyond JSON parsing and TypeScript casting. Require all fields, exactly three big-idea strings, two or three examples, exactly three self-check questions, nonempty reasoning/materials/steps/safety/observations, unique IDs, and correct-option references. Trim text and reject blank required strings. Enforce bounded string lengths and array sizes so malformed output cannot create unusable pages or oversized records.

Reject invalid structured output as a retryable generation error. Allow one bounded repair call with the validation errors if the provider is configured, then surface a safe error while preserving the teacher's inputs. Avoid saving partial packs. A provider timeout/rate-limit error leaves the session and any previous pack usable. Commit a validated new immutable version only if the session revision remains current. A stale result returns 409 and does not overwrite the newer topic.

Use an idempotency operation record before making the external call. The same key returns the existing successful version or an in-progress response. A safe failed operation may be retried. Reusing its key with a different body returns 409. No database write transaction stays open during model work.

## Version and review behavior

Each generation, content correction or translation inserts a new version with independent progress and pending verification. Set the session's current pack ID inside the successful insert transaction. Reuse the existing pack only when the idempotency key identifies the same operation. A mentor review never edits content. A changes-requested decision requires a subsequent teacher-requested regenerated version before new classroom starts. Historical attempts still display the exact old version and review record.

The UI shell language controls interface copy. A pack's saved language remains part of its version. Switching shell language does not rewrite saved content or carry a badge into translated content.

## Exact demo coverage

When OpenRouter is absent, the new workflow supports only the existing Grade 7 Science sugar-strainer preset, backed by `SUGAR_CONCEPT_PACKS` in the data file, in English, Filipino and Cebuano. Validate those fixtures with the same validator as live output and mark provenance `demo`. Matching and recording still use real authenticated sessions. Every other preset and all custom topics return 503 with `AI_UNAVAILABLE`, an honest explanation and a retry path after provider configuration. Avoid a generic template that pretends to teach a custom concept.

The fixture must show sugar molecules dispersing through water, ordinary filtration retaining sand while dissolved sugar passes, and conserved mass when the container/system is kept closed during comparison. It should preserve sugar's identity, explain the limit of a dancer analogy, include a scale, spill/evaporation caveats, safe sunlight drying or adult-supervised gentle heat, and expected residue after drying. A mass-conservation self-check accounts for the container and all contents in both measurements.

Apply the dancer bridge only to explicitly identified MAPEH backgrounds. For another degree use the data file's clearly labeled general observation/measurement sample bridge and keep the user's actual degree snapshot. Indicate that live AI supplies specialty personalization. Test a custom non-MAPEH degree to ensure the no-key sample never credits it with dance/MAPEH training.

## Progress command

`PUT /packs/:id/progress` accepts expected progress revision, completed section IDs, misconception choice ID and self-check answer map. Verify the owner, IDs and selected options against this exact content version. Require an actual choice before completing misconception-check, and attempts at all three questions before completing self-check. Set `completedAt` only when all six sections are complete. Persist incorrect answers with their feedback. Return progress plus classroom eligibility and a specific pending prerequisite.

## Verification

- [ ] Validate curated fixtures in all three languages and reject incomplete or fabricated pack content.
- [ ] Exercise preset/custom generation, malformed JSON, missing safety, wrong counts, duplicate IDs, provider failure, stale revision and duplicate request.
- [ ] Refresh after each learning section and verify choices/progress survive.
- [ ] Ensure new versions reset progress/verification and old attempts retain their original version.
- [ ] Ensure no-key unsupported topics fail honestly and the sugar fixture is complete.

</details>
