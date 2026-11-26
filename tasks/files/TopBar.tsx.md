# Implementation brief for TopBar.tsx

Follow [the final workflow](../plan.md) and [build checklist](../todo.md).

Capture Name, searchable degree, optional major, school/division, English or Filipino, and low-data preference once. Private career-stage selection defaults to Proficient (2), supports 1–4, and never requires plantilla rank.

Acceptance: exercise this step through the normal UI and API, including refresh and retry. Verify only the owning teacher and authorized reviewer can access private evidence.

<details><summary>Earlier technical reference (historical; final workflow above governs)</summary>

# src/components/TopBar.tsx

**Change the existing connectivity and cache status.** This component currently renders `offlineCacheReady` and a count of lessons derived from `LessonCase.cachedOffline`. Generated cases are assigned `cachedOffline: true` even when no downloadable file has been saved. Once cases are server-backed, that wording gives teachers a misleading expectation before they close a tab.

## Work

- Continue to expose the mobile navigation button and low-data/standard display preference. Keep the low-data indicator independent of actual network reachability and of a class recording’s upload state.
- Remove the unconditional offline-ready claim and its `cachedCount` input. Display a verified offline/download state inside the selected guide if available. A successful browser download can be acknowledged as a requested download. The site cannot promise that the file remains on disk.
- Show the active authenticated workspace consistently with the sidebar. Keep recorder-specific status adjacent to its controls in the classroom. If App supplies a pending-upload indicator in the header, use the server-confirmed status of the signed-in teacher’s own attempt. Hiding that optional indicator leaves the classroom’s upload outcome fully visible.
- Preserve the existing breakpoints, keyboard-operable mobile menu and visible focus state. Use localized copy for any new status.

## Verify

Toggle low-data mode while online, disconnect, reconnect and visit an empty account. Each state communicates only what the app knows. Reload a submitted lesson on another device without a local download. It should open from the server without claiming an offline copy. Check that the mobile menu is still accessible before and after switching sections.

</details>
