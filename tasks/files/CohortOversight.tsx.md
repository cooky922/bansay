# Implementation brief for CohortOversight.tsx

Follow [the final workflow](../plan.md) and [build checklist](../todo.md).

Use the verified guide in live teaching. Offer a voluntary two-minute reflection or materials-only photo. Keep actual class observations separate from simulated performance. Publish only de-identified mentor-verified material to the searchable LAC library. Keep baseline, transcript, critique and transfer history private. Export only teacher-selected finalized evidence on demand. Administrators see anonymous cohort counts and topic trends. No automatic PMES transmission.

Acceptance: exercise this step through the normal UI and API, including refresh and retry. Verify only the owning teacher and authorized reviewer can access private evidence.

<details><summary>Earlier technical reference (historical; final workflow above governs)</summary>

# src/components/CohortOversight.tsx

**Keep the aggregate coordinator view working while moving private reviews into their own authenticated entry point.** This component currently accepts all `cases`, `mentorVideos`, a free `role` prop and case/library mutation callbacks. The top half renders a mentor queue using the first pending sample case. The bottom half calculates pilot metrics from `cohortSeats` and sample budget items.

## Change boundaries

- Move the mentor-specific list, selected case, coaching form and player responsibilities to [MentorWorkspace](MentorWorkspace.tsx.md). Replace the local browser-only video and AI-may-publish behavior there using server APIs. Move any mentor-only state out of this component, including `focusedGap`, `teachingMove`, draft flags and selected review ID. Remove imports and props made unused by that extraction.
- Render the existing coordinator branch only when App has an authenticated coordinator. Its inputs remain aggregate data. A coordinator does not need a session detail, name, email, recording, screening result or coaching transcript for this project. Do not request the mentor queue and then hide columns client-side. The coordinator’s network requests should contain no private review records.
- `INITIAL_COHORT_SEATS`, sample pilot budget and the initial mentor-minute numbers are demo fixtures. Label the view as sample oversight while those are its inputs. Avoid incrementing those totals just because a teacher completed class practice, a mentor read a pack or an AI draft was requested. Real longitudinal cohort reporting is a separate initiative.
- Keep the normal coordinator summary/chart layout, existing calculations and language support. Check the existing logged-minutes state and manual controls after removing the mentor branch. Delete only code orphaned by the extraction.

## Verify

Sign in with a mentor and a coordinator in separate sessions. The mentor lands in the new queue. The coordinator sees only aggregate sample metrics and cannot fetch one teacher’s lesson, playback, feedback or AI draft by altering navigation or a URL. An empty mentor pool or zero newly signed reviews does not break the separate coordinator screen. The teacher has no navigation path that converts their role into coordinator.

</details>
