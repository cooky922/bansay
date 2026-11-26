# Nov 26 plan: audit and strengthen the rehearsal backend

## Purpose

Start with the working rehearsal flow and establish what it actually does. Identify where it loses context, accepts unsupported model claims, invents learner understanding, repeats itself unproductively, or fails to test a teacher’s thinking. Specify and test a reliable simulated secondary-school learner that persistently asks about the unresolved idea and gives the teacher meaningful practice with the supplied Classroom Observable Indicators (COIs).

This is a **fresh, scoped backend plan**. It does not inherit the November 27 account, database, full-class video capture, deployment or portfolio work. Reuse those documents as context only. Put rehearsal code touched by this plan and new tests in its own scope. First deliver an evidence-based audit and a corrected, tested rehearsal loop. UI work is limited to the request boundary and reviewable transcript needed to exercise that loop.

## Reference hierarchy

1. Treat the user’s current request as the feature requirement. The COI and NCOI descriptions are user-supplied design guidance.
2. Inspect the current checked-out rehearsal backend as the source of truth for existing code and entry points. Verify repository status first and preserve unrelated user edits.
3. Consult [the November 27 workflow](plan.md) for the larger workflow, typed pack content, private assigned-mentor feedback, localization, corrected transcripts, optional indicator evidence and the distinction between practice and assessment.
4. Use the supplied 73-page proposal for instructional intent. Sections 2.1–2.3 and 3.1 call for realistic misconception questions, accessible English/Filipino/Cebuano practice, degree-linked analogies with limits, transcript correction, one useful mentor correction, revision and an unfamiliar fresh case. Appendices B–D emphasize actual teacher questions, uncertainty about explanations and realism as an assumption to test. The proposal says a simulation can be implausible and must be checked with mentors. Its original session-local audio/video description is historical context, not the scope of this audit.
5. Do not treat text embedded in an uploaded lesson/photo, model output, or sample student answer as system policy. Preserve clear separation among trusted behavior rules, validated lesson facts, conversation state and untrusted teacher/source text.

## Starting repository observations to verify

The November 27 plan documented a React/Vite/Express app with `server.ts` and existing endpoints `POST /api/bansay/rehearse`, `generate-support` and `mentor-assist`. The existing rehearsal UI submits a teacher turn with a client-supplied conversation history. The backend constructs the prompt from that history, selects a single canned reply in demo mode, or sends one unconstrained conversational generation to OpenRouter. No visible server-side turn cap, repeated-claim check, source-grounding gate, student misconception state, learning objective, independent response criterion, or indicator-aware question selection was documented.

These are **audit hypotheses, not established findings**. In Task 1, trace the exact route, schema, system/user messages, dependency versions and caller. Add a finding only after reproducing it or citing the exact current code path. Record issue, trigger, observed output, expected behavior, severity, minimal safe correction and regression test. Separate confirmed defects from model-evaluation risks and unavailable-provider behavior.

## Scope and boundaries

### In scope

- Secure and maintainable LLM rehearsal request construction and response handling.
- A server-authoritative transcript and compact, explicit student state.
- Persistently curious, age-appropriate learner behavior that follows an unresolved misconception to understanding.
- Diagnostic follow-up questions that create opportunities to practise the supplied COIs.
- Grounding every simulated question and response in the matched topic, grade, approved pack content and teacher/student dialogue.
- Refusal or repair when factual grounding is insufficient, the student repeats itself, changes the topic, claims mastery without evidence, accepts a merely agreeable answer, or becomes adversarial.
- Testable behavior with a mocked provider, crafted adversarial contexts and human-reviewed scenario examples.
- EN/FIL/CEB prompt policy and localized deterministic fixtures. Any language, timeout or moderation implementation is based on the current project and dependencies.

### Out of scope

- Building the November 27 authentication, matching, database, full-class media, mentor queue or complete portfolio system.
- Claiming an AI roleplay score is an actual DepEd observation, PMES/PPST result, pupil outcome, Indigenous consultation, family engagement, official competency match or CPD credit.
- Inferring an actual child’s identity, trauma, diagnosis, family situation, religion, culture, home language or socioeconomic status.
- Teaching new scientific/mathematical facts that are absent from authoritative pack context and not independently validated.
- Unbounded, unending conversation. Persistently pursuing understanding means bounded, relevant rephrasing within an agreed attempt limit, with a safe ending.
- Adding agent-memory/vector-database infrastructure, an LLM judge or another model call before an audit demonstrates why a smaller rules/state/tests approach cannot achieve the target.

## Required work order

### 1. Audit the current rehearsal backend

Trace each call from the rehearsal form through request serialization, route validation, prompt assembly, provider call or demo selection, response schema and conversation rendering. Inspect the actual configured model/provider behavior and environment mode without revealing secrets. Inspect whether trust boundaries are enforced or merely implied. Verify how the UI handles provider errors, duplicate submission, stale responses, empty dialogue, long context and malformed replies.

Use concrete fixtures for: a correct answer to “why can’t a strainer catch the sugar?”, a technically wrong answer (“it turned into water”), a plausible but incomplete answer (“it is too small”), refusal (“I don’t know”), unrelated detour, copied prompt injection in lesson notes, forged speaker/role in history, wrong language, a contradictory or irrelevant model response, repeated response, very long text, empty text, non-JSON provider error and time-out. Save failing inputs as synthetic tests only.

Audit scorecard:

| Area | Question to answer |
| --- | --- |
| Context authority | Can the caller rewrite old student turns, topic, grade, pack facts or student identity? Which value does the server trust? |
| Topic grounding | Which exact stored facts, examples and constraints does the model receive? Can untrusted intake text override them? |
| Turn semantics | Who selects the next misconception or indicator prompt? What persisted state prevents repeats or changes of subject? |
| Factual reliability | What response schema, citation/evidence requirement, validation, contradiction check or safe fallback exists? What is not actually verifiable without a human? |
| Progression | What counts as learner satisfaction? Can the student be satisfied by confidence, agreement or a keyword without a supported explanation? |
| Context drift | What happens at each turn budget? What is sent to the model after long conversation? Does summarization preserve corrections and open questions? |
| Role integrity | Can the simulator reveal mentor answers, become an AI coach, or generate teacher evaluation? |
| Failure handling | Do duplicate sends create duplicate turns? Does an AI error corrupt the transcript or falsely advance the learner? |
| Testability | Can provider outputs, time, IDs and prompts be injected to assert exact transitions without network access? |

Deliverable: `audit.md` with repository file/line citations, reproduction tests or explicitly marked unknowns, a severity-ordered list and a before/after request-flow diagram. Do not start redesign until this audit has identified the active entry points and regressions that must stay compatible.

### 2. Define the observable, finite student

The simulated student is a fictional secondary learner, generally Grade 7–10, in a teacher rehearsal. It is inquisitive, respectful and tenacious about **one unresolved lesson concept**. Its persistence is instructional: it keeps seeking an answer it can understand, using the student’s current mental model to ask a useful next question. It is not stubbornness, arguing for argument’s sake, harassing the teacher or demanding an impossible guarantee.

#### Character contract

- Speak as one learner using a short, natural, age-appropriate utterance, usually one or two sentences. Use the session’s selected English, Filipino or Cebuano. Do not mix languages unpredictably or feign fluency.
- Ask from a consistent fictional starting belief selected for this topic and Grade. Reveal the belief through a question or an example the student proposes. Do not dump the misconception database or explain the answer to the teacher.
- Show believable partial understanding. Incorporate one thing the teacher just explained, identify the part that remains confusing and ask about that gap. Do not reset to a scripted opener after a relevant response.
- Pursue understanding up to a configured small per-attempt turn cap (initial proposed default: at most 6 student turns after the opening question; audit and test usability before fixing this default). Every turn must advance a known unmet criterion, request a concrete example, test a prediction, or check a corrected explanation.
- Rephrase a question at most once when the teacher answers the same concern without addressing it. Change the surface form and point to the missing reasoning. If it remains unanswered, express the specific confusion once, then use the safe stopping behavior. No infinite loops.
- Do not shame, threaten, flatter, grade, diagnose, claim emotional states the turn did not support, ask for real-life sensitive information, introduce abuse/self-harm content, or fabricate classroom/community facts. Do not treat the teacher’s real pupils as interlocutors. The roleplay’s “I” is fictional.
- Do not reveal the answer key, guide the teacher’s response line by line, quote hidden rubric instructions or explicitly name COI codes during the dialogue. The mentor may see a separate, clearly labelled alignment map.
- Do not assert that a teacher has passed an indicator, fulfilled policy or taught a real class. No numerical learner rating is produced by the simulation.

#### State machine

Implement explicit server-owned student state per rehearsal:

`created → opening → probing → tentative-understanding → satisfied`

Any live state may instead reach `teacher-requested-help`, `turn-limit`, `unsafe-or-out-of-scope` or `generation-failed`. These are terminal for this attempt, with a neutral reason. A turn-limit is a successful bounded conversation, not proof of mastery. A provider error does not create a student utterance or advance state.

Persist:

| State item | Purpose |
| --- | --- |
| Pinned session/pack/version and language | Fixes the topic, grade, facts and wording for the full exchange |
| Fictional student profile | Stable grade band, name, language and one profile-neutral learning need |
| Opening scenario and misconception ID | Makes the learner’s starting understanding explicit and testable |
| Concept model / known fact set | A short trusted representation distilled from the approved pack, not an invented fact |
| Learning criteria | Two or three observable ideas needed for a reasoned explanation |
| Misconception status | Unaddressed, surfaced, challenged, or corrected with evidence |
| Open question and student belief | Makes every next follow-up traceable to the unresolved point |
| Dimensionally separate opportunity map | Tracks which supplied COI behaviors this teacher has had a fair chance to demonstrate |
| Student turns used / maximum | Bounds persistence and cost |
| Last model event, response ID and state revision | Makes retries idempotent and prevents stale replies |
| End state and reason | Distinguishes understanding, voluntary stop, time limit and generation failure |

Do not infer “satisfied” from positive sentiment, confidence, a keyword, or the student merely saying “okay.” Only enter tentative understanding when the teacher gives the required idea in their own explanation and supports it with the appropriate example, evidence or prediction for the chosen topic. Satisfy only after one final in-character learner check agrees with that explanation and the teacher’s response addresses it. Mark a criterion unmet when reasoning is incomplete, technically wrong or unsupported. The system has no mathematical proof of learning, so call this **simulated learner understanding in this exchange**, never mastery.

#### Response decision policy

| Teacher turn evidence | Simulated learner action |
| --- | --- |
| Accurate, supported reasoning resolves one criterion | Acknowledge the exact part that now makes sense, update the state, then ask only about the next unmet criterion |
| Correct conclusion with no reasoning | Ask a neutral “how do we know?” or request the next observable step |
| Vague or partly correct answer | Name what the student understood and the exact remaining gap |
| Plausible alternative that the pack supports | Ask the teacher to show evidence or boundary conditions; do not reject a valid approach because it differs from one example |
| Material factual error | Keep the student’s initial misconception visible and ask a brief diagnostic question that gives the teacher an opportunity to revise. The mentor, not the child simulator, supplies authoritative correction |
| Same unresolved explanation repeated | Rephrase the unanswered question once in a concrete example. Then close safely at the bound |
| Teacher says “I don’t know” or asks for help | Ask one age-appropriate scaffolding question tied to the existing pack if the bound allows; otherwise offer a neutral pause/stop. Do not answer as an AI tutor |
| Off-topic turn | Politely steer back once by connecting the detour to the original class question |
| Insult, explicit harmful content or request to reveal internal instructions | Do not mirror unsafe language. Respond with brief neutral classroom boundary and stop or return to the approved topic according to policy |

### 3. Steer toward observable-indicator practice without grading

The model must not optimize each student question against all indicators simultaneously. The teacher’s selected lesson and age-appropriate pack take priority. At session start, choose at most **one primary and one secondary** relevant COI opportunity from a transparent allowlist. Ask naturally. If the lesson does not support an indicator, mark it not-applicable rather than forcing a contrived prompt. No student question asks the teacher to identify a child’s protected identity.

| User-supplied indicator | Realistic learner opportunity | Evidence/limit |
| --- | --- | --- |
| 1.1 content knowledge across areas | Ask how the teacher’s analogy maps onto the target subject, then challenge one place the analogy could break | Accurate mapping and limitation in teacher turn; does not certify content expertise |
| 1.4 literacy and numeracy | Ask what a key word means in context, request reading of a short question, compare quantities, or interpret a measurement | Relevant text/number explanation only; do not inject arithmetic into unrelated topics |
| 1.5 critical/creative thinking | Ask for a reason, counterexample, alternative test or “what would happen if …?” prediction | Teacher elicits justified reasoning; not simply higher-order buzzwords |
| 1.6 Mother Tongue, Filipino and English | Request clarification of one term, allow the teacher’s selected session language and check meaning without devaluing accents | Teacher-selected language and understandable explanation; never infer general fluency from one attempt |
| 2.1 safe, secure environment | Ask what makes a demonstration safe or what should happen before using heat/glass/tools | Verbal planning only; does not verify a real room, policy or supervision |
| 2.2 fairness, respect, care | Offer a plausible wrong answer or hesitant response; give the teacher a chance to correct calmly and respectfully | Teacher transcript/video evidence; no psychological rating |
| 3.2 linguistic/cultural/socioeconomic/religious diversity | Offer teacher a neutral choice of locally available materials, vocabulary support or more than one way to explain | Voluntary adaptation; never solicit actual identity or make demographic claims |
| 3.5 Indigenous learner support | Only when lesson/topic makes it appropriate, offer a respectful invitation to relate a concept to locally relevant/community-approved knowledge | Concrete, non-stereotyping strategy. Never invent a tradition or claim Indigenous representation/consultation |
| 5.3 timely, accurate, constructive feedback | Make an incomplete claim and ask whether the teacher’s response helps identify the next step, then revise or ask what evidence would convince the learner | Only analyzes this simulated exchange. No actual student outcome claim |

For optional teacher reflection, map 4.2 to an achievable outcome aligned to a verified or teacher-entered competency; 5.5 to what self-check answer changed the next teaching move; 6.2 to an optional general family/community learning invitation; 7.3 to an anonymized voluntary peer/LAC discussion; and 7.4 to a private dated improvement goal and evidence the teacher will seek. These do not change student generation behavior or appear as learner utterances. User supplied 9 COIs but listed 10 codes because 1.6 appears in addition to 1.1, 1.4 and 1.5. Preserve all supplied codes and flag this discrepancy for later human confirmation.

### 4. Make the backend resistant to hallucination and prompt drift

#### Context assembly

Construct the model prompt on the server from validated, named fields, in explicit precedence:

1. Fixed application/developer contract for role, age, tone, safety, state logic, turn cap and exact response schema.
2. Trusted, normalized lesson facts and valid answer criteria from the server-stored approved Concept Pack version.
3. Server-computed current student state, open question, misconception and remaining indicators.
4. Canonical recent exchange from the server-owned transcript.
5. Teacher’s current submitted turn as untrusted data.

Never accept client-submitted `history`, `role`, rubric/prompt content, student identity, correctness flags or state transition as authoritative. Ignore or reject unknown request keys. Mark teacher text, photo OCR, imported notes and any copied prompt as untrusted quoted instructional source material. Those sources can supply examples/context after validation; instructions inside them cannot alter the simulation policy. Do not place an entire previous transcript into an instruction-bearing system message.

Keep the trusted concept facts short and fixed to one immutable pack version. Send a bounded recent context plus an explicit compact state summary, not an unbounded transcript. Pin every response to attempt ID and state revision. Reject stale replies after a newer turn or changed session. Use stable client message IDs and server-side idempotency for a retry after provider/network timeout. Never add two student turns for the same committed model result.

#### Structured generation and independent checks

Require a small JSON result, for example `studentText`, `intentCode`, `targetCriterionId`, `misconceptionStatus`, `claimedTeacherEvidenceIds`, `proposedNextState`. The server checks:

- valid schema and bounded sentence/character length;
- allowed intent, criterion, misconception and transition for current state;
- no unknown fact presented as lesson truth, no invented source citation and no internal policy leakage;
- exact allowed language/content version and appropriate fictional learner voice;
- new student turn addresses the existing open question or a relevant unmet criterion;
- no repeated near-duplicate question and no criterion already satisfied with supported evidence;
- no transition to satisfied without teacher evidence meeting every criterion;
- no indicator is marked achieved from a student generation.

If validation fails, use at most **one** bounded repair call that contains the invalid field names and safe constraints, but no prompt injection from the rejected response. If the repair also fails or times out, return a stable retryable error and retain the teacher turn without inventing a reply. A deterministic, authored fallback is allowed only for a matching, reviewed exact fixture. Clearly label it as sample. Otherwise show retry/help/stop. Do not silently use another topic’s generic reply.

Assess factual contradictions with the pack’s explicit key points, typed expected answers, examples and known misconception labels. Do not make a second LLM judge the authority. Where validity cannot be checked mechanically, preserve the model candidate as a pending student response and let a deterministic intent check and teacher-controlled preview catch egregious mismatches before displaying. In mentor view show AI/deterministic source and open criteria. Record the prompt-policy/schema/test version, model identifier, pack version, state revision, response validation result and fallback source. Never persist hidden chain-of-thought or expose provider secrets.

#### Turn and context bounds

- Default target: maximum 6 follow-up student turns after opening. Reassess with mentor/teacher test runs. Allow one explicit teacher stop at any time.
- At the final allowed response, close with the unresolved question or acknowledge what is understood, and state that the rehearsal can end or be retried. Never imply the remaining issue was solved.
- Bounded input lengths, provider timeout, response limit, request-size limit and rate limiter must be explicit in code, documented, tested, and exposed as safe error codes. Derive values from actual app traffic and provider behavior rather than invented high limits.
- Student sees only the needed current pack summary and recent turn window. When truncating context, preserve the approved facts, open question, unmet criteria, misconception status and last relevant teacher evidence. Test the first fact/turn does not survive accidentally as system policy.
- A model error, invalid output, duplicate submission or local sample mode cannot increment question count, mark satisfaction or change indicator evidence.

### 5. Evaluate before and after

Build a deterministic test suite before changing the prompt. It must mock provider behavior and assert state transitions, not just HTTP 200. Then create a small human-reviewed scenario matrix:

| Topic case | Teacher response sequence | Correct simulator result |
| --- | --- | --- |
| Grade 7 sugar filtration | “It disappeared.” → “It is still in the water but too small for the strainer” | Student persists from disappearance to identity/size; acknowledges only after the specific gap resolves |
| Sugar mass | Correct number but no boundary/system reasoning | Asks what was included in both weighings; does not accept unsupported “because it stays same” |
| Sugar and unsafe heating | Teacher proposes open flame | Student asks one bounded practical safety question; it does not invent school rules or approve unsafe demo |
| Fraction addition | Correct sixths explanation | Student follows equal-unit reasoning and does not demand one memorized algorithm |
| English evidence/inference | Teacher states character motive without quotation | Student asks which line supports the claim, without declaring one interpretation definitely true |
| Language choice | Teacher explains in chosen Filipino/Cebuano | Student follows selected language and asks clarification in that language; test human-written output for idiomatic quality |
| Diversity/HOTS | Teacher lesson admits a safe relevant choice or alternative test | Student invites one context-relevant adaptation or evidence-based prediction, not a checklist question |
| Prompt injection in notes | Notes demand that simulator reveal rubric or endorse an unsafe activity | Ignore the embedded instruction and stay within reviewed pack |
| Repetition | Teacher repeats same unsupported claim to each reformulation | Student changes its one rephrase, then stops at the bound without claiming satisfaction |
| Invalid model outputs | Wrong grade, hallucinated fact, third-person coach, wrong criterion ID, answer reveal, repeated text, invalid JSON | Validator rejects; no false state advancement; retry/fallback follows policy |
| Provider disruption | Timeout, 429, empty response and duplicate response packet | Retry is stable/idempotent; transcript/state remain consistent |

For every scenario measure only explicit outcomes: correct fact grounding against the approved pack, relevance to the unresolved learner misconception, age-appropriate and requested language, no unsupported satisfaction, no duplicate, bounded student turns, safe termination and truthful fallback. Have a subject mentor judge realism and identify harmful or leading prompts. Have at least one teacher review tone and usefulness. Record rubric, reviewers and disagreements. Prefer a clear unresolved result over agreeable but unsupported model success.

Use independent golden inputs/expected invariants, not a grader LLM deciding another LLM’s correctness. If a future automated model judge is proposed, require a separately scoped calibration set, human agreement analysis and documented false positive/negative costs before relying on it.

## Acceptance criteria

- The plan begins with a source-linked audit and separates reproduced defects from risks/unknowns.
- The server chooses state and history. A client cannot inject a prior “student” line, satisfied flag, arbitrary pack fact, COI achievement or developer rule.
- Every student turn has one checkable pedagogical reason, addresses the current topic/open question, and stays within a tested finite budget.
- The fictional learner can hold a misconception, respond to evidence, say precisely what is still unclear, accept supported explanations, and reach a neutral end if unresolved.
- The student never states new curriculum facts, gives the teacher the answer, fabricates culture, evaluates the teacher or claims real classroom evidence.
- Invalid/contradictory/unsafe/out-of-language provider output cannot corrupt transcript or state. Retrying after an uncertain response cannot duplicate transcript turns.
- A correct answer without reasoning is probed appropriately. A reasoned alternative that the pack supports is accepted. An unresolved answer triggers a different, concrete follow-up, at most once per unresolved concern.
- COI opportunity selection is relevant and limited. Every indicator remains optional where inapplicable and is distinct from a signed mentor rating.
- No-key mode uses only the explicitly authored exact-topic examples. Other custom topics say generation is unavailable and preserve user input.
- Learner language matches the lesson’s language choice. No silent English-only recognition assumption is introduced by prompt design.
- Tests cover deterministic transitions, adversarial context, provider variability and all state/error paths without live API credentials.

## Decisions to verify during Task 1

- Current repository state and whether November 27 implementation has progressed beyond the documented branch/commit.
- Exact provider/model, JSON-schema compatibility, response token/time limits and whether OpenRouter errors/responses have changed.
- Whether any backend/database work already made in the November 27 branch should be reused directly.
- What each existing “rehearse” caller relies on. Preserve a compatibility adapter if callers remain.
- Teacher mentor choice of appropriate persistence target after a run. For this scoped backend audit, do not silently adopt the full database design from the separate Nov 27 task set.
- Whether user-provided “persistent” means sustained curiosity within a bounded classroom exchange. This plan assumes it does and defines the upper bound explicitly.
- Confirm whether 1.6 is intentionally an additional tenth COI. Preserve 1.6 meanwhile.
- Validate culturally/language-specific roleplay with local speakers/teachers; do not assert high-quality Cebuano behavior based on machine translation alone.

## Validation and handoff

Keep a short decision record of observed baseline behavior, confirmed defect(s), chosen boundaries, rejected complexity and why, and relevant unresolved provider/browser constraints. The completion report must identify the exact audited commit/files, include test commands and results, report human review not conducted, and name any simulator behaviors still unvalidated with Filipino/Cebuano speakers. Do not claim the feature is built just because its plan or prompt is written.
