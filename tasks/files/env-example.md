# Implementation brief for env-example

Follow [the final workflow](../plan.md) and [build checklist](../todo.md).

Profile → Intake → Concept Pack → Rehearsal → Submit and review → Revision and transfer → Class and reflection → Library and portfolio

Bind the session to the teacher at intake. Keep mentor ID nullable until submission. Store immutable pack versions, confirmed transcript and initial/fresh-case review outcomes. Test an entire text-only cycle without microphone, camera or media probe.

<details><summary>Earlier technical reference (historical; final workflow above governs)</summary>

# Implementation brief for `.env.example`

## Scope and privacy

Update the committed environment template with the required persistent storage, application origin, local probe path and recording limits. Keep the user's real `.env` contents private. Read only the existing template when documenting required settings and avoid printing real secrets or copying them into task files.

## Template settings

| Variable | Planned value/meaning |
| --- | --- |
| `OPENROUTER_API_KEY` | Existing optional live-AI key placeholder, blank means curated demo coverage |
| `OPENROUTER_MODEL` | Existing model configuration |
| `APP_URL` | Actual browser origin, such as `http://localhost:3000` locally, used for cookie security and origin checks |
| `BANSAY_DATA_DIR` | Optional private persistent root, default `<os.homedir()>/.bansay/data`, outside the app/Vite workspace |
| `FFPROBE_PATH` | Absolute maintained ffprobe executable path, verified at startup |
| `BANSAY_MAX_CHUNK_BYTES` | 8388608 default, eight MiB |
| `BANSAY_MAX_RECORDING_BYTES` | 536870912 default, 512 MiB per attempt |
| `BANSAY_MAX_RECORDING_DURATION_MS` | 7200000 default, two hours |

Add comments describing `<data root>/bansay.sqlite` and private recordings under `<data root>/recordings`. Resolve custom roots and symlink targets and reject overlap with the repository, Vite filesystem-allowed roots, public or dist trees before opening data. Deployment must mount a persistent volume for the directory. Keep all secrets server-only and avoid `VITE_` prefixes for keys or storage configuration. Session tokens use cryptographic randomness and hashed server storage, so a fabricated JWT secret is unnecessary for this selected auth design.

Validate numeric bounds at startup and reject nonsensical/nonfinite values. Derive browser preflight limits from server capabilities, so a local UI limit never silently exceeds the configured server bound. Missing/unusable ffprobe sets recording readiness false and blocks recorded starts/finalization with an actionable 503 while sign-in/preparation/feedback and verified playback remain available. Provision it before accepting the complete recording workflow.

## Verification

- [ ] Copying the example and supplying the local ffprobe path starts the server with the supported no-key sugar fixture.
- [ ] Setting an OpenRouter key enables the other preset/custom pack paths.
- [ ] The origin value supports same-origin auth and HTTPS Secure cookies in deployment.
- [ ] Changing storage location persists all account, pack and recording state under that location.
- [ ] No sample value resembles a real API credential or a real mentor password.

</details>
