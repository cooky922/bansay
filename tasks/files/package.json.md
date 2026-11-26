# Implementation brief for package.json

Follow [the final workflow](../plan.md) and [build checklist](../todo.md).

Profile → Intake → Concept Pack → Rehearsal → Submit and review → Revision and transfer → Class and reflection → Library and portfolio

Bind the session to the teacher at intake. Keep mentor ID nullable until submission. Store immutable pack versions, confirmed transcript and initial/fresh-case review outcomes. Test an entire text-only cycle without microphone, camera or media probe.

<details><summary>Earlier technical reference (historical; final workflow above governs)</summary>

# Implementation brief for `package.json`

## Required edits

Add pinned runtime `better-sqlite3` 12.4.1 and development `@types/better-sqlite3` 7.6.13. Keep the existing React, Express, Vite, TypeScript and provider dependencies. Reuse Node crypto, node:test and existing `tsx` instead of adding auth/test frameworks. SQLite gives the planned single-server deployment durable multi-account state. Native package installation must succeed on the supported deployment platform.

Move the existing `tsx` package from devDependencies to dependencies, preserving its current version range, because production `start` invokes it after `npm ci --omit=dev`. Update the TypeScript server start script to `tsx server.ts`, preserving the current development watcher. Add the focused test and mentor provisioning scripts.

```json
{
  "start": "tsx server.ts",
  "test": "tsx --test src/server/workflow.test.ts",
  "mentor:provision": "tsx scripts/provisionMentor.ts"
}
```

Declare the supported Node engine as `^20.19.0 || ^22.12.0 || ^24.0.0` for these pinned dependencies. The existing README's generic Node20 statement omits Vite's actual patch floor. Registry/package inspection found the installed Vite8.3.0 requires `^20.19.0 || >=22.12.0`, and the pinned SQLite release lists Node20/22/23/24 compatibility. Confirm clean installation on the chosen supported runtime during implementation. [SQLite package source](https://github.com/WiseLibs/better-sqlite3/blob/v12.4.1/package.json)

FFprobe is a maintained deployment-provisioned executable configured through `FFPROBE_PATH`. Document that dependency in README and .env.example. Keep its binary outside npm's package tree. Do not introduce a dated ffprobe npm bundle.

## Verification

- [ ] `npm install` updates the existing lockfile and successfully loads the native SQLite module.
- [ ] `npm test` finds the new test and requires the configured local media probe for real-media integration.
- [ ] `npm run mentor:provision` uses the shared private database path.
- [ ] `npm run lint` and `npm run build` pass with existing source and tests.
- [ ] `npm start` starts the production server through the supported TypeScript runner.
- [ ] A production-only install retains tsx and starts the built app with `NODE_ENV=production`, while Vite is imported only for development.

Keep unrelated scripts and package versions intact. Document any native compilation prerequisite only if installation evidence shows it is needed on the target environment.

</details>
