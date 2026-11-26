# Implementation brief for App.tsx

Follow [the final workflow](../plan.md) and [build checklist](../todo.md).

Profile → Intake → Concept Pack → Rehearsal → Submit and review → Revision and transfer → Class and reflection → Library and portfolio

Bind the session to the teacher at intake. Keep mentor ID nullable until submission. Store immutable pack versions, confirmed transcript and initial/fresh-case review outcomes. Test an entire text-only cycle without microphone, camera or media probe.

<details><summary>Earlier technical reference (historical; final workflow above governs)</summary>

# src/App.tsx

**Change the existing application shell.** A signed-in teacher should be able to close the site, come back, select a lesson, and see exactly where they left off. A mentor opening another browser should see only assigned work. This file owns identity bootstrap, navigation and selected resource IDs. Child views own their forms.

## Starting points

Read `loadStored`, `handleRoleChange`, `handleLanguageChange`, `handleStoreMentorVideo` and the four section render branches. The current default case is the first sample, the rehearsal branch indexes `activeCase.id`, and the cohort branch converts a teacher role into a coordinator. A genuine new account has zero sessions. Model that state explicitly.

## Implementation sequence

1. Start in a loading state. Call the account endpoint through [the browser client](workflowApi.ts.md). Render the sign-in form on an unauthenticated result. An unreachable server gets a retry action. Mount the workspace only after resolving identity. On registration or returning login, use the canonical server profile. Key account-owned views by profile ID.
2. For a teacher, load their session list. On first visit show Lesson Prep with **Start a session**. For a returning teacher show **Resume** per lesson, including a waiting match or pending recording upload. Fetch the selected session composite on selection. Restore from its match, topic, current pack, progress and attempts. An optional last-selection hint must be account-scoped and checked against this list.
3. For a mentor, open the assigned queue directly. For an already provisioned coordinator, expose the existing aggregate view. Remove the role setter, role selector callbacks and `onSwitchToMentorQueue`. A section guard should also reject unavailable navigation from a stale tab or an old remembered section.
4. Keep only section, selected IDs, current query result and relevant transient UI state. Give children narrow callbacks such as select session, refresh this resource, enter this pack’s classroom, open this attempt. Authenticate all mutations on the server. After a mutation, use the returned record or refetch. Drop out-of-order results by account and resource IDs. Return focus to the new step heading.
5. Keep an active classroom mounted until the teacher ends or explicitly interrupts capture. Route sidebar navigation, mobile back, session switching and logout through this lifecycle. For a normal exit after capture ends, allow a saved local upload to resume when the same account returns. A browser crash during capture leaves an interrupted attempt. Recover according to [the recorder brief](useClassRecording.ts.md).
6. On logout/expiry, release any hardware, abort requests and clear all private render state, preview URLs and in-memory responses before the next user sees the shell. A pending upload may be resumed only by its original authenticated owner. Never display a previous user’s name while checking the next session.

## Old device data and adjacent views

Do not write new sessions, signed reviews or media to `bansay_cases_v1`. The global v1 cases, evidence and library keys contain no reliable account ID. Leave them intact on disk. Never seed a real account with the demo cases, infer ownership from “Maria Reyes”, or clear another user’s work during logout. Keep public sample library/portfolio/cohort content visibly labeled when shown. Preserve existing portfolio logging and library save controls through account-scoped local keys for those existing device-local features. Initialize real teacher evidence with an empty list and quarterly counts at zero. Never add private class recordings or automatic practice claims to those exports. The course-language selector changes chrome and future defaults. The selected lesson’s stored content, conversation and human feedback retain their recorded language.

## Verification

- Fresh profile, zero rows, first subject selected, matched or waiting. Refresh twice at each step and recover the same ID. Register a second teacher with the same display name in a separate browser profile and verify an empty workspace there.
- Sign out from a lesson, open the mentor account and use Back. Private teacher state does not reappear. Switch rapidly between two sessions during a slow fetch. Only the last selected session can update the view.
- Start a live class, attempt to navigate, cancel, then complete. Playback contains the exchange on both sides of the navigation attempt. Changing chrome language leaves the pack version, badge and old recording intact.

</details>
