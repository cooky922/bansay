# Implementation brief for db.ts

Follow [the final workflow](../plan.md) and [build checklist](../todo.md).

Profile → Intake → Concept Pack → Rehearsal → Submit and review → Revision and transfer → Class and reflection → Library and portfolio

Bind the session to the teacher at intake. Keep mentor ID nullable until submission. Store immutable pack versions, confirmed transcript and initial/fresh-case review outcomes. Test an entire text-only cycle without microphone, camera or media probe.

<details><summary>Earlier technical reference (historical; final workflow above governs)</summary>

# Implementation brief for `src/server/db.ts`

## Purpose and ownership

Create the SQLite connection and small repository primitives used by auth, sessions, packs, attempts and reviews. Keep the existing Express process and use `better-sqlite3` 12.4.1 with the compatible type package specified in the package brief. Read [the schema brief](001-initial.sql.md) first. This module owns connection lifecycle, transactions, migration application, and explicit row-to-DTO parsing.

## Startup contract

Export `openDatabase({databasePath})`, accepting `:memory:` or a test temporary path, and return a connection with an explicit close method. Default `BANSAY_DATA_DIR` to `path.join(os.homedir(), ".bansay", "data")` and use `<data root>/bansay.sqlite` as the database file. Resolve custom paths and existing symlink ancestors before creating directories. Reject private paths overlapping the repository, development Vite filesystem-allowed roots, public or dist trees. Validate the real path again after creation. Tests use their isolated OS temporary directory. Create only that root and required descendants. Enable foreign keys, WAL journaling for disk databases, and a finite busy timeout such as 5 seconds. Apply numbered SQL migration files in lexical order inside transactions and record each successful filename in `schema_migrations`. Resolve migrations relative to this module, independent of the shell working directory.

A failed migration rolls back and fails startup with an actionable safe error. Existing user records survive subsequent starts. Opening the database twice applies no duplicate schema or fake fixtures. Include database close in normal shutdown and test cleanup.

## Repository rules

Bind every variable through prepared statements. Keep authentication secrets in server-only row types and return explicit public DTO fields. Parse persisted JSON through the same runtime validators used for new content. Throw a clear integrity error for corrupt data and avoid silently resetting user records to samples.

Use short synchronous transactions for matching, attempt numbering, uniqueness checks, publishing reviews, and final submission. Network requests and filesystem streaming execute outside a SQLite transaction. For AI generation, capture session revision first, call the model, then transact only the validated result if the session still matches. The same pattern applies to simulated replies. Use affected-row counts to detect a stale expected revision and return 409.

Store UTC timestamps once at a mutation boundary and use them consistently across rows changed by that operation. Inject a clock/UUID source for deterministic tests only where the test genuinely needs it. Keep direct repository functions readable instead of introducing a generic CRUD framework.

## File and database consistency

The recordings module owns binary file writes. A chunk receives a database acknowledgment only after its private file is atomically in place and its checksum verified. Final recording publication happens after atomic assembly, then a short transaction sets ready/submitted metadata. A retry can reconcile an already assembled file by its known attempt ID and checksum. Startup preserves recording/uploading reservations and their chunks. A server restart alone cannot establish whether the browser completed its capture. The owner can replay a lost stop from a complete local manifest and finish the original bytes. Mark capture interrupted only from an explicit interruption or confirmed capture gap. A fresh recorder run always receives another attempt.

Never store Blobs, base64 video or object URLs in JSON columns. Keep recordings outside public/dist and return a protected playback path. Keep legacy browser-local sample data outside these tables.

## Required checks

- [ ] Fresh migration creates every table and constraint.
- [ ] A second startup is idempotent and preserves an account, pack, attempt and review.
- [ ] Foreign-key rejection and a failing multi-row mutation leave no partial records.
- [ ] Concurrent matching/attempt-create requests honor stable IDs and unique attempt numbers.
- [ ] Private DTO mapping excludes password/salt/token/file paths.
- [ ] An injected AI timeout cannot hold the database write lock.
- [ ] Private custom paths, including symlinks into Vite-served roots, fail startup before data is exposed.
- [ ] Lost stop while offline, server restart and later owner reconciliation preserve one completable attempt.

Use the targeted cases in [workflow.test.ts](workflow.test.ts.md), followed by `npm run lint` and `npm run build`.

</details>
