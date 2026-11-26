# Implementation brief for SignIn.tsx

Follow [the final workflow](../plan.md) and [build checklist](../todo.md).

Capture Name, searchable degree, optional major, school/division, English or Filipino, and low-data preference once. Private career-stage selection defaults to Proficient (2), supports 1–4, and never requires plantilla rank.

Acceptance: exercise this step through the normal UI and API, including refresh and retry. Verify only the owning teacher and authorized reviewer can access private evidence.

<details><summary>Earlier technical reference (historical; final workflow above governs)</summary>

# src/components/SignIn.tsx

**Create the signed-out screen.** This is the identity boundary before Lesson Prep. Use the existing Bansay logo, form controls and mobile layout conventions. The visible account name and degree supplied here become the teacher context used by the lesson bridge.

## Screen and contract

- Offer **Sign in** and **Create teacher account**. Returning users, including provisioned mentors, enter email and password. Registration also requires the full name and degree as awarded. Support entries such as “Bachelor of Secondary Education, major in MAPEH”, apostrophes, accents and multi-part Filipino surnames. Provide an optional specialization/major when the degree alone is broad. Reuse `TEACHER_MAJORS` as suggestions and accept free text. Keep account role out of the editable form.
- Display the chosen instructional language as a default that the teacher can confirm before matching. Use the shared language codes. Label name and degree separately from assigned subject. Never ask a returning teacher to enter the degree again for every class.
- Submit the [auth contract](auth.ts.md) through [workflowApi](workflowApi.ts.md). Use the canonical response as the shell identity. Teacher registration triggers a teacher session, and mentor login leads to the mentor queue. Clear password inputs after success or mode change. Use native labels, email and autocomplete attributes (`username`, `new-password`, `current-password`), a real submit button, and field-associated errors.
- Trim name, degree and email on input boundary. Preserve meaningful internal spaces and exact password characters. Present policy errors from the server in the selected UI language. Preserve non-secret registration fields on a retry. Distinguish offline, validation and invalid credentials. A duplicate click while pending must not create a second account. Do not render private content while auth state is unresolved.

## Verify through the normal entry points

1. First use on a phone-width screen, keyboard only. Submit missing degree, then a custom degree outside the suggestions. The accepted profile displays the exact name and degree in the shell and later in Prep.
2. Log out, reload, log in with the original credentials. The same account receives its saved sessions. Two teachers with identical names remain distinct. Source inspection of local storage should reveal no password or session token written by this component.
3. Sign in with a provisioned mentor credential. The queue opens directly. Test offline retry and an incorrect password. A failed attempt leaves the form usable and the workspace inaccessible.

</details>
