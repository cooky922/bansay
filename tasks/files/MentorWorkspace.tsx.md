# Implementation brief for MentorWorkspace.tsx

Follow [the final workflow](../plan.md) and [build checklist](../todo.md).

On explicit submission, atomically save the transcript and route by subject, language and urgency. Make retries idempotent, queue uncovered submissions and escalate to backup before expiry. Only the assigned specialist reads the package. Initial review budgets two minutes for inline pack audit and four for transcript review. Return an exact-version Mentor-Verified badge, one practical correction and one teaching move.

Acceptance: exercise this step through the normal UI and API, including refresh and retry. Verify only the owning teacher and authorized reviewer can access private evidence.
