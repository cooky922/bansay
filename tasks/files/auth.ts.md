# Implementation brief for auth.ts

Follow [the final workflow](../plan.md) and [build checklist](../todo.md).

Capture Name, searchable degree, optional major, school/division, English or Filipino, and low-data preference once. Private career-stage selection defaults to Proficient (2), supports 1–4, and never requires plantilla rank.

Acceptance: exercise this step through the normal UI and API, including refresh and retry. Verify only the owning teacher and authorized reviewer can access private evidence.

<details><summary>Earlier technical reference (historical; final workflow above governs)</summary>

# Implementation brief for `src/server/auth.ts`

## Responsibility

Implement account creation, sign-in, sign-out and cookie-session authentication. The current app's role selector and Maria Reyes label are browser state. This module supplies the authenticated identity for every live request. Read the account types in [bansay.ts](bansay.ts.md) and the endpoint definitions in [routes.ts](routes.ts.md).

## Account creation and profile data

Registration accepts `email`, `password`, `displayName`, `degree`, optional `major`, and `preferredLanguage`. Trim names/degree/major, normalize email for uniqueness, and validate required names and degree without restricting them to preset majors. Suggested input bounds are 120 characters for display name, 200 for degree/major, 254 for email and 12–128 for password. A whitespace-only value is invalid. A registration request cannot set role, mentor specialties or verification permissions. Create the teacher and authentication session atomically, returning a safe `UserProfile` and setting the cookie.

Login accepts normalized email/password, checks the password, rotates to a fresh session token and returns the same profile DTO. Use a generic invalid-credentials response. Protect register/login with a small bounded per-IP and normalized-email rate limiter and return 429 with a retry window. The limiter may be in memory for the planned single-process deployment. Remove old buckets so it cannot grow indefinitely.

## Password and session handling

Use Node's asynchronous `crypto.scrypt` with a per-user cryptographically random salt, explicit versioned parameters and a 64-byte derived key. Compare equal-length hashes with `timingSafeEqual`. Start with tested parameters such as N 32768, r 8, p 1 and sufficient max memory, then verify the installed runtime accepts them. Reuse this password function in the mentor provisioning command. Never log passwords, hashes, cookies, API keys or full request bodies.

Generate 32 random bytes for the opaque browser token, store its SHA-256 in `auth_sessions`, and put the raw value only in an HttpOnly cookie. Give sessions a documented finite lifetime, such as seven days, and validate expiry on each request. Use `SameSite=Lax`, `Path=/`, HttpOnly, and Secure when the configured application origin uses HTTPS. Keep development localhost HTTP functional. Logout deletes that token and clears the cookie with identical attributes. Existing sessions for other browsers may remain active.

Cookie authentication makes mutating routes require same-origin protection. Check the request Origin against configured `APP_URL` or the actual same-origin development request, and require the client API's `X-Bansay-Request: 1` header on JSON and binary mutations. Reject unexpected origins. Keep CORS closed. A missing/expired cookie returns 401. Tests exercise the same mechanism using a cookie jar.

## Exported boundary

Expose a request authenticator returning the safe principal plus server-only identity, `requireRole`, and helpers checking session ownership or assigned mentor identity. Resource services should load the target row and check access before producing data. An unrelated mentor and another teacher receive 404 for a private resource to avoid confirming that it exists. A coordinator retains reference aggregate views and receives no private coaching access.

`GET /auth/me` returns 200 profile or 401. The client uses this endpoint on boot and refresh. Public registration creates teachers. The CLI provisions mentors through the shared password helpers. The application has no browser role-elevation endpoint.

## Verification criteria

- [ ] Required name/degree, custom degrees, duplicate normalized emails and role-injection requests behave as specified.
- [ ] Passwords are hashed with distinct salts and absent from every DTO.
- [ ] Login succeeds after server restart and logout invalidates only the presented token.
- [ ] Missing, forged, expired and revoked cookies fail consistently.
- [ ] Wrong-origin mutations fail for normal JSON and recording chunk uploads.
- [ ] Teacher A and unassigned mentor B cannot read or mutate teacher C's pack, attempt, recording or feedback.
- [ ] A browser refresh restores the authenticated profile and sign-out clears private client state.

</details>
