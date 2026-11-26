# Implementation brief for provisionMentor.ts

Follow [the final workflow](../plan.md) and [build checklist](../todo.md).

Capture Name, searchable degree, optional major, school/division, English or Filipino, and low-data preference once. Private career-stage selection defaults to Proficient (2), supports 1–4, and never requires plantilla rank.

Acceptance: exercise this step through the normal UI and API, including refresh and retry. Verify only the owning teacher and authorized reviewer can access private evidence.

<details><summary>Earlier technical reference (historical; final workflow above governs)</summary>

# Implementation brief for `scripts/provisionMentor.ts`

## Purpose

Provide a controlled local command to create real mentor accounts and pool profiles. Public registration creates teachers. The current hardcoded names in sample cases cannot authorize real reviews or supply login credentials.

## Command contract

Expose `npm run mentor:provision` using `tsx scripts/provisionMentor.ts`. Default the private operator command to role mentor, and accept only the explicit optional `--role coordinator` alternate for an authenticated coordinator reference account. Prompt for email, display name, degree, optional major and an initial password. Mentor mode additionally prompts for affiliation, supported subjects, supported languages and availability. Coordinator mode skips mentor coverage and creates no mentor profile. Read passwords through hidden input and confirm them. Keep passwords out of command-line arguments, console output, committed fixtures and environment examples. Reuse auth password validation/hashing and the same private database path/migration setup as the application.

Validate subjects against Science, Mathematics and English, languages against en, fil and ceb, and require at least one of each for mentors. Preserve free-text name/degree. Create user role mentor and mentor profile inside one transaction, or a coordinator account without a profile in the explicit alternate mode. Print only created account ID, public display name, role and selected public coverage. An existing email fails clearly and does not convert an existing account's role. A new eligible mentor can be provisioned for the waiting-pool recovery scenario without adding a management UI.

Close the database before exit. Cancellation or validation failure leaves no half-created account. Keep provisioning independent from default startup and avoid a shipped universal mentor password.

## Operational handoff

Document that the pilot operator provisions participating mentors before teachers begin matched sessions. Supply example nonsecret coverage combinations for all supported subjects and chosen session languages. An empty pool remains a valid waiting state and should not trigger fabricated matches. Credentials are delivered through the operator's existing private process.

For the preserved authenticated coordinator reference view, document `npm run mentor:provision -- --role coordinator`. That account can open its authorized sample aggregate view and receives no private teacher/mentor evidence access. There is no public role-selection privilege change.

## Verification

- [ ] Provision a mentor on a temporary database, log in through normal UI/API and see only assigned sessions.
- [ ] Confirm required name/degree, supported subject/language validation and password hashing.
- [ ] Cancel mid-prompt and verify no user/profile rows were created.
- [ ] Retry duplicate email and confirm no role conversion or duplicate profile.
- [ ] Provision an eligible mentor after a teacher waits, retry matching and confirm assignment uses the real account.

</details>
