# Implementation brief for README.md

Follow [the final workflow](../plan.md) and [build checklist](../todo.md).

Profile → Intake → Concept Pack → Rehearsal → Submit and review → Revision and transfer → Class and reflection → Library and portfolio

Bind the session to the teacher at intake. Keep mentor ID nullable until submission. Store immutable pack versions, confirmed transcript and initial/fresh-case review outcomes. Test an entire text-only cycle without microphone, camera or media probe.

<details><summary>Earlier technical reference (historical; final workflow above governs)</summary>

# Implementation brief for `README.md`

## Documentation outcome

Update the current concise project README to explain how to run the implemented teacher-to-mentor flow with real account separation and saved complete classes. Ground every statement in the actual completed build. Keep its existing description of BANSAY and project structure accurate.

## Local setup

Document the actual supported Node patch floor from package.json, dependency install, .env.example configuration, development server and production start. Explain the default private root `<os.homedir()>/.bansay/data`, its `bansay.sqlite` file and `recordings` descendant. Custom `BANSAY_DATA_DIR` values must resolve outside repository/Vite-served/public/dist trees. Show the normal commands `npm install`, `npm run dev`, `npm run build`, `npm start`, `npm test`, `npm run lint`, and `npm run mentor:provision`.

Build with full dependencies, then run the server with `NODE_ENV=production`. For PowerShell show `$env:NODE_ENV = 'production'` followed by `npm start` on the next line. Document that deployment `npm ci --omit=dev` keeps the runtime tsx runner. Source imports must avoid loading dev-only code on the production path. A built dist directory and the maintained local ffprobe executable are required for a production smoke check.

Provision maintained FFmpeg tools before recording validation. Direct the operator to a build linked by the official download page, set the absolute `FFPROBE_PATH`, run its version command, and record the exact installed version/checksum in the deployment notes maintained by the operator. The application checks the binary at startup. Windows paths with spaces are passed as a single executable path through Node process APIs. A missing/incompatible binary produces `recording.ready=false`, blocks new recorded class starts/finalization with an actionable 503, and keeps sign-in, lesson preparation, saved feedback and authorized playback of verified existing recordings available. Complete-workflow tests and deployment acceptance require a functioning probe. [FFmpeg downloads](https://ffmpeg.org/download.html)

Explain that the synthetic fixture is already checked in after implementation, so ordinary tests need ffprobe and do not need to regenerate the video. Its fixture brief contains the offline FFmpeg reproduction command.

## Account and mentor setup

Describe teacher registration with name, degree, optional major, email and password, then the returning sign-in flow. Name and degree persist in the profile and supply the lesson bridge context. Explain the operator-only mentor provisioning command and subject/language/availability coverage. Document `npm run mentor:provision -- --role coordinator` for an operator-provisioned coordinator reference account, using the same private password prompt and shared auth hashing. Keep actual credentials out of documentation. A new teacher begins with an empty live workspace. Reference cases and old browser v1 records stay in their existing sample context.

## User workflow and reliability states

Describe starting a lesson-prep session, selecting subject and session language, matching an eligible mentor, choosing a preset or custom topic and grade, then learning the complete six-section Concept Pack. Explain that optional class date, source notes/photo and independent baseline still provide intake context where offered.

Explain pending human verification, the exact-version badge, changes requested and new pack versions. The teacher can rehearse after learning completion while verification is pending. A rejected version requires corrected generated content before another new class starts.

Describe preflight camera/microphone permission, supported secure context/browser/codec, explicit recording start, continuous video+audio, the complete canonical transcript and end-of-class confirmation. State the supported limits from configuration. Explain pending upload, original-browser recovery from IndexedDB, interrupted evidence, and completed cross-device mentor playback. A transcript can be corrected before submission, and a teaching redo becomes another preserved attempt.

Published mentor feedback appears to the owner teacher. Explain the three behavior-anchored rubric dimensions and same-pack/same-rubric comparison using the first reviewed attempt and a selected later review. Present practice gains as rehearsal progress. Keep existing real-classroom evidence and CPD reference material in its applicable separate context.

## AI and demo coverage

Document the configured OpenRouter model and the exact no-key coverage. The complete curated Grade 7 sugar-strainer pack is available in English, Filipino and Cebuano. Other presets/custom topics need live AI and show an unavailable/retry message without a key. Both demo and AI-generated content need an explicit assigned human decision to show a verification badge.

List the live ID-based API groups through concise examples and refer maintainers to shared types/routes for complete shapes. Retain accurate legacy endpoint notes while those adapters remain. Describe AI draft feedback as a mentor aid requiring an explicit publish action.

## Deployment and private evidence

Document one Express process with a persistent mounted data directory outside every development served root. Private recording files are served through authenticated endpoints with Range support. Teacher owners and their assigned mentors can access saved evidence. SQLite and media must be backed up/restored consistently. Completed recordings persist across logout and restarts, with no automatic purge in this feature. A finished locally saved capture can recover a lost stop/upload after server restart. Document the server's safe-path checks for Vite `/@fs/` exposure and the difference between persistent deployment storage and an ephemeral container disk.

Mention the PDF's browser-local recording description as historical reference when explaining implementation changes. The user's requested cross-device video/audio/transcript review is the current feature requirement. Keep source documents as reference content and application instructions as code/configuration.

## Verification of documentation

- [ ] Follow the written setup on a clean dependency install with a temporary data root.
- [ ] Provision a mentor, create a teacher, finish a class and reopen its media from another signed-in mentor browser.
- [ ] Confirm every documented command exists and all paths/default limits match the code.
- [ ] Confirm no real secrets/private account data enter examples or screenshots.
- [ ] Report unavailable browser or media checks honestly in the implementation handoff.

</details>
