# Implementation brief for ConceptPack.tsx

Follow [the final workflow](../plan.md) and [build checklist](../todo.md).

Cache the ten-minute text pack offline. Include a big idea of up to three sentences, degree-based bridge and its limit, two or three reasoned examples including a contrast, misconception choices with feedback, three self-checks, a safe household demo with expected observations, and a rehearsal prompt. Display AI Draft (Unverified) on every draft and offline copy, with a reminder to check safety and formulas before teaching. Version edits and bind human verification to the approved version.

Bind competency, grade, major, language and private stage to structured generation. Use the architecture’s MATATAG grounding route through Grade 9 and K to 12/MELCs route from Grade 10 through SHS; record source/version and verify current approved guides before enabling a grade. Parameterize PPST codes as domain.strand.stage. Require analogy limits, causal contrasts, misconception-based checks and local materials unless lab equipment is enabled. Judge accuracy, analogy fidelity, misconception depth, local feasibility and mobile scannability on 0–3. If any score is below 2 regenerate at most twice, then return a recoverable failure. Only a human can award a badge.

<details><summary>Earlier technical reference (historical; final workflow above governs)</summary>

# src/components/ConceptPack.tsx

**Create the shared text-first lesson reader.** Teacher mode teaches a roughly ten-minute sequence and persists active learning. Mentor mode shows the very same immutable version, including the answer explanations, analogy limits and demo safety notes. Use the structured fields described in [the shared types](bansay.ts.md) and [generation brief](conceptPacks.ts.md).

## Reader behavior and timing budget

| Section | Budget | Interaction |
| --- | --- | --- |
| Big idea and specialty bridge | 1½ min | Render exactly three simple sentences from `bigIdea`. Then show the degree-specific analogy, something the teacher can say and where the analogy breaks down |
| Worked examples | 2 min | Render two or three examples in order. For each, show the problem, intermediate reasoning steps and answer. In math and English support multiple defensible explanations |
| Misconception check | 1 min | Ask the teacher to predict a student’s statement. On selection immediately explain the reasoning behind that particular statement and how to address it |
| Quick self-check | 2 min | Present exactly three questions. Each selection gives immediate option-specific feedback, including the explanation for a correct choice. Allow the teacher to reconsider |
| Ready-to-use demo | 2½ min | Materials, numbered steps, safety notes and expected observations are visible together. A longer real demonstration can be prepared in advance |
| Bridge to rehearsal | 1 min | Show the exact simulated learner question and “Now explain it to a student who asks …”. Save completion and open classroom preflight on a deliberate click |

The time is a reading estimate. No countdown or exam pass mark. Use normal headings, button/radio semantics, visible focus, text labels for feedback and a polite live region. Show a count such as “2 of 3 answered.” No autoplay. Narrow phone screens must display steps and feedback in reading order.

## State and verification badge

- Key the reader, progress and selection IDs by pack version. Render content exactly as saved in its pack language. Tell the teacher whether this version is AI-generated or a labeled sample. Show “Awaiting mentor review”, “Verified by [mentor]” with date/version or “Changes requested” with the mentor’s note. Keep the attribution adjacent to the bridge as well as in the pack header. AI has no means of signing this component.
- Save visited/read sections on explicit progression. The interactive sections require a persisted choice and all three persisted responses. The server computes completion. Display explanations immediately from this version's option data, allow retry after a save failure and keep “ready to enter classroom” tied to server confirmation. Reconcile two tabs against progress revision. Keyboard focus stays with the question when feedback appears.
- Mentor preview is read-only and reveals answer keys for inspection. It never marks teacher progress. A newer pack starts pending with fresh answers. If the mentor requests changes, show the note and return the teacher to generate the revised pack from that instruction. Keep prior attempts and their original version accessible. A completed pending version may be rehearsed.

## Grade 7 acceptance fixture

Use this authored example to test both the generator’s shape and the actual reader. The exact wording may vary by language. The scientific relationships must survive translation.

1. **Big idea, exactly three sentences.** “When sugar dissolves, the tiny particles that make up its crystals separate and spread through the water. The sugar is still there, even though you cannot see it or catch it in a kitchen strainer. If nothing spills or escapes, the sugar and water together weigh the same before and after mixing.” A MAPEH connection can use dancers spreading across a floor. Acknowledge that molecules already exist in the crystal and move without choosing a formation.
2. **Two worked examples.** (a) Pour sand-water and clear sugar solution separately through the same mesh. Sand grains exceed the openings so they stay behind. Individual dissolved sugar molecules pass through with the water. (b) Weigh 100 g of water and 10 g of sugar together in a tared covered setup. After dissolving, the same substances remain in that setup, so the contents still weigh about 110 g within scale precision.
3. **Misconception.** Ask which statement reveals a student thinks invisible matter has vanished. Choices include “The sugar disappeared”, “The sugar turned into water” and “The sugar is still spread through the water”. The first expresses the target misconception. Remaining mass and recovered solid challenge it. The second proposes a different misconception about identity, countered by recovery after drying. The third describes what happened. Selecting any option explains that specific reasoning.
4. **Three instant checks.** (a) Did the total mass increase, decrease or stay the same during stirring? Same setup and no material lost means the mass stays the same. (b) Will a kitchen strainer recover sand, dissolved sugar, or both? It catches sand because grain size exceeds the mesh opening. (c) After water on a saucer evaporates, what remains? Sugar remains as solid residue. Water left as vapor. Include specific feedback for each distractor.
5. **Demo.** Materials include sugar, water, sand, two clear cups, stirrer, strainer, saucer, cover and balance. Weigh the whole setup with sugar and water before mixing and the same setup after stirring. Keep the spoon and all material inside the weighing procedure or account for them. Compare filtered sand and sugar mixtures, then leave a small sample of the solution on a labeled saucer to dry. Prepare a dry saucer beforehand so the teacher can show the result immediately. The class sees a clear solution, sand retained, little/no change in combined mass during mixing and residue after drying. Keep the weighing and drying observations separate. Use sunlight or adult-supervised gentle heat, avoid open flame, clean spills and do not taste demonstration materials.
6. **Handoff.** “Why can’t we catch the sugar with a strainer?” Verify that the same exact question is the first simulated-student turn recorded on attempt one and on its same-pack redo.

## Check the boundary cases

Reload after one wrong answer and two unanswered questions. The chosen explanation should remain visible and correct progress should resume. Try all three answers incorrectly and complete the reading. Access opens when the attempt requirements are met. Compare the teacher reader with the mentor preview for the same version. No section, check, safety note or analogy limit may disappear.

</details>
