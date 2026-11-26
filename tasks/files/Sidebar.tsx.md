# Implementation brief for Sidebar.tsx

Follow [the final workflow](../plan.md) and [build checklist](../todo.md).

Capture Name, searchable degree, optional major, school/division, English or Filipino, and low-data preference once. Private career-stage selection defaults to Proficient (2), supports 1–4, and never requires plantilla rank.

Acceptance: exercise this step through the normal UI and API, including refresh and retry. Verify only the owning teacher and authorized reviewer can access private evidence.

<details><summary>Earlier technical reference (historical; final workflow above governs)</summary>

# src/components/Sidebar.tsx

**Change the existing authenticated navigation.** Today the sidebar supplies fixed “MR/RV/CO” initials, displays Maria Reyes for every role, and lets anyone select teacher, mentor or coordinator. Its annual-track link and generic navigation can also cross role boundaries.

## Work

1. Replace `role` plus `onChangeRole` with the resolved display profile and an explicit logout action. Render initials from the supplied display name, with one-character or single-word names supported. Show the teacher's degree alongside the name where space permits. Mentor identity is the actual signed-in mentor. Remove the editable role selector in expanded, mobile and collapsed renderings.
2. Build nav items from the authenticated role. Teacher gets Lesson Prep, Virtual Classroom / Rehearsal & Review, and the existing portfolio. Selecting classroom before eligibility links back to the relevant prep step. Mentor gets the review queue. Coordinator retains aggregate oversight. Hide teacher-only progress widgets and their nav shortcuts for other roles. Defend the same routes in App and on the API.
3. Give the mentor queue its actual pending count from that mentor’s assignments. Count the applicable pack/attempt work items once each. A pack review and a class review are two distinct tasks even when they concern the same lesson. Present loading as unknown and a confirmed empty queue as zero.
4. Keep existing language/low-data controls, focus rings, mobile close behavior and accessible icon names. Make sign-out reachable in collapsed desktop and small mobile layouts. Indicate the active section programmatically. Route section changes via the App callback so an active recording gets the same exit handling from all navigation controls.

## Verify

Use a long degree and a single-word name at mobile width, with the mobile drawer, and on a collapsed desktop sidebar. Sign out using the keyboard. Check each actual role in a different cookie session. A teacher never sees an actionable mentor queue via either the nav or annual-track link. Change interface language while viewing an already verified pack and check its underlying version is untouched.

</details>
