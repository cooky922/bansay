# Implementation brief for server.ts

Follow [the final workflow](../plan.md) and [build checklist](../todo.md).

Profile → Intake → Concept Pack → Rehearsal → Submit and review → Revision and transfer → Class and reflection → Library and portfolio

Bind the session to the teacher at intake. Keep mentor ID nullable until submission. Store immutable pack versions, confirmed transcript and initial/fresh-case review outcomes. Test an entire text-only cycle without microphone, camera or media probe.

<details><summary>Earlier technical reference (historical; final workflow above governs)</summary>

# Implementation brief for `server.ts`

## Existing entry point

The root file currently owns Express setup, the complete support JSON schema, generic no-key demo generators, three stateless AI endpoints, and Vite/static serving. `startServer()` runs unconditionally on import. The application has no persistence or authenticated request identity.

## Target changes

Keep this file as the runtime composition point. Load dotenv first, resolve the application root through `fileURLToPath`, validate the private storage boundary, create/open the database and storage root, instantiate service dependencies and mount the router factory from `src/server/routes.ts`. Default the data root to `path.join(os.homedir(), ".bansay", "data")`. Resolve existing symlink ancestors and reject overlap with the repository, public/dist and development Vite filesystem-allowed roots. Obtain those allowed roots from the actual development Vite configuration before opening private data. Vite's `/@fs/` access means an unmounted folder inside the workspace is insufficient privacy. Move new domain logic to its corresponding modules and reuse the existing OpenRouter adapter.

Export a testable `createApp` accepting database/storage/provider dependencies and a switch to skip Vite/static middleware for HTTP tests. Export a `startServer` wrapper that opens runtime dependencies, attaches development Vite or production static serving, and starts the port. Guard direct execution so importing the factory does not open a socket. Use the ESM-compatible direct-entry check supported by the documented Node floor and `tsx` invocation. A test should prove import does not listen.

## Middleware order

1. Install safe request context and same-origin checking without logging request bodies.
2. Mount the authenticated binary recording upload route with its route-local bounded raw parser.
3. Mount bounded JSON parsing for normal API commands and the optional image-generation request. Keep the existing 8 MiB upper bound sufficient for a 5 MiB base64 image, and smaller limits where practical.
4. Mount authentication and workflow routes.
5. Return JSON 404 for unknown API paths and use the safe API error handler.
6. Attach development Vite middleware or production static assets and SPA fallback for browser routes.

Ensure a private media GET reaches its authorization handler before the SPA fallback. A malformed JSON request returns the documented error shape. Use an explicit trusted origin configuration and avoid blindly trusting arbitrary proxy headers. Configure proxy handling only for the known deployment topology.

## Runtime durability

Database migration failure or an unwritable/unsafe storage root fails startup clearly. Check FFPROBE_PATH at startup and report missing/unusable probe through `capabilities.recording.ready=false` with an actionable reason. Keep sign-in/prep/read-feedback and authorized previously verified playback available. New recorded starts and finalizations return 503 until readiness recovers. On startup, reconcile files and metadata while preserving recording/uploading reservations. The owner's complete local manifest can replay a stop lost while offline and finish the original capture after restart. Explicit interruption or a confirmed capture gap closes an incomplete attempt. On SIGINT/SIGTERM, stop accepting requests, close database resources and flush completed writes.

Production still serves the Vite-built `dist`. The server source runs through runtime-installed `tsx` so the supported TypeScript imports work consistently. Build with the full dependency set, then run with `NODE_ENV=production`. A production install using `npm ci --omit=dev` retains tsx, dotenv, Express and the dependencies required by actual imports. Import Vite only inside the development branch. Runtime data directories stay outside all development/publicly served trees and require a persistent deployment volume. Keep private recordings outside Vite's existing asset-copy plugin.

## Compatibility boundaries

Keep existing stateless endpoint shapes through the route compatibility adapters while migrating live callers. Remove the old in-file handler bodies after the adapters replace them, avoiding duplicated provider logic. Preserve existing Vite configuration behavior and the optional OpenRouter demo experience for the curated supported fixture.

## Acceptance and checks

- [ ] `npm run dev` serves React and authenticated API routes on the existing port.
- [ ] `npm run build` followed by `npm start` serves the production shell and private workflow.
- [ ] The API returns JSON errors for unknown API routes and browser navigation still loads the SPA.
- [ ] Importing the app in a test does not listen or create production data.
- [ ] A server restart preserves teacher identity, mentor assignment, pack, complete recording and feedback.
- [ ] Unauthenticated media requests and static URL guesses cannot access private files.
- [ ] Development requests to `/data/...` and `/@fs/<absolute-private-path>` cannot read SQLite, chunks or complete media. Symlinked unsafe custom roots fail fast.

Run the integration test, typecheck and Vite build. Use temporary storage for smoke tests and clean up only those known test paths.

</details>
