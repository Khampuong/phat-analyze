# CI/CD

How changes get checked and released. [CLAUDE.md](CLAUDE.md) requires reading this before starting a feature.

```mermaid
flowchart TD
    Dev["Change code locally"] --> Local["Run the local checks below"]
    Local --> Push["git push / pull request"]
    Push --> CI{"CI: .github/workflows/ci.yml"}
    CI --> Audit["npm audit (high+)"]
    CI --> Test["build + smoke test"]
    Test --> Docker["Docker image + smoke test in container + non-root check"]
    CI --> Snyk["Snyk: dependencies, code, container"]
    Audit & Docker & Snyk --> Gate{"all green?"}
    Gate -->|no| Fix["fix and push again"] --> CI
    Gate -->|yes| Main["merge to main"]
    Main --> Tag["git tag vX.Y.Z && git push --tags"]
    Tag --> CD{"CD: .github/workflows/cd.yml"}
    CD --> Rerun["runs the full CI again on the tag"]
    Rerun --> Publish["push ghcr.io/&lt;owner&gt;/literature-review-tracker:X.Y.Z and :latest (amd64 + arm64)"]
    Publish --> Monitor["snyk container monitor (watch the released image for new CVEs)"]
```

## CI: every push to `main` and every pull request

| Job | What it does | Why |
|-----|--------------|-----|
| `npm audit` | `npm audit --omit=dev --audit-level=high` blocks. A full `npm audit` is also printed for information | Known-vulnerable code that runs in production fails the build. Production means `dependencies`: server packages **and** libraries bundled into the browser (svelte, write-excel-file, html-to-image). Build-only tools (vite and its plugin) are `devDependencies` and never reach the image |
| `Build + smoke test` | `npm run build`, then `npm test` ([scripts/smoke-test.mjs](scripts/smoke-test.mjs)) | Starts the real server on throwaway data and walks the whole security flow: forced 2FA setup, backup codes, TOTP replay rejection, forced password change, RBAC for all three roles, lockout and admin unlock, disable, 2FA reset, the audit log, and data validation |
| `Docker image + smoke test` | Builds the image, starts it, runs the same smoke test against the container, checks it doesn't run as root | Catches Dockerfile breakage and anything that only differs in the production image |
| `Snyk` | `snyk test` (npm dependencies), `snyk code test` (static analysis of our source), `snyk container test` (base image OS packages + what's installed in the image), each failing on **high** or **critical**. Results go to the repo's *Security → Code scanning* tab. On `main` it also runs `snyk monitor` so Snyk keeps alerting on new CVEs | Dependency, code, and image vulnerabilities from one tool |

Dependabot ([.github/dependabot.yml](.github/dependabot.yml)) opens weekly update PRs for npm packages, GitHub Actions, and the Docker base image. CI checks them like any other PR.

### Setting up Snyk (once per repository)

1. Sign in at [app.snyk.io](https://app.snyk.io) (free for open source) and copy your token from *Account settings → Auth Token*, or better, create a service account token for the organisation.
2. In GitHub: *Settings → Secrets and variables → Actions → New repository secret*, name **`SNYK_TOKEN`**.

Without the secret the Snyk job passes with a warning instead of scanning, so forks of this template still get green CI. **Once the secret exists, a high or critical finding fails the build.**

## Run the same checks locally before pushing

```bash
npm ci
npm audit --omit=dev --audit-level=high
npm run build && npm test                  # smoke test on a throwaway server

snyk auth                                  # once; opens the browser
npm run security:scan                      # snyk test + snyk code test (high+)

docker build -t literature-review-tracker:local .
snyk container test literature-review-tracker:local --file=Dockerfile --severity-threshold=high
```

If a change touches sign-in, 2FA, roles, or the data API, add checks for it to `scripts/smoke-test.mjs`. That script is the regression suite.

## Accepted findings

These remain on purpose. None of them is a production dependency at `high` or above, so they don't fail CI:

| Finding | Severity | Why it is accepted |
|---------|----------|--------------------|
| Svelte 4 SSR advisories (XSS via spread attributes, `<svelte:element>`, `bind:innerText`) | moderate | Only exploitable with server-side rendering. This app renders only in the browser and never imports `svelte/server` |
| Svelte "DOM clobbering of internal framework state" | moderate | Needs attacker-controlled HTML injected into the page. The app never uses `{@html}`, and the CSP blocks inline scripts |
| esbuild / Vite dev-server CORS (GHSA-67mh-4wv8-2f99) | moderate | Affects only `npm run dev`, never the production build. `server.cors` is also turned off in `vite.config.js` |
| Vite ≤ 6.4 dev server: path traversal in optimized-deps `.map` handling, `launch-editor` NTLM hash disclosure on Windows | high (devDependency) | Only exists while `npm run dev` is running on a developer machine. Vite isn't installed in the production image (`npm ci --omit=dev`) and isn't used by `npm start`. Don't expose the dev server beyond localhost (`npm run dev` uses `--host`, so run it only on trusted networks) |

Snyk Code findings reviewed as false positives (medium/low, so they don't fail CI):

| Finding | Why it is a false positive |
|---------|----------------------------|
| "Allocation of resources without limits" on the PDF route and the SPA fallback (`server/index.js`) | Every request goes through `apiLimiter` (`app.use`, 600 per minute per IP) before these routes. Snyk only looks for a limiter on the route itself |
| "CSRF protection is disabled" | Session cookies are `SameSite=Lax`, the API only accepts JSON bodies, and `sameOrigin` rejects cross-site state-changing requests (the smoke test checks it). Snyk only recognises the `csurf` package |
| "Hardcoded passwords / credentials" in `scripts/smoke-test.mjs` | Throwaway test accounts on a throwaway server created by the test itself |

Mark them *Ignored* in the Snyk web UI after checking that the reasoning still holds.

Fixed after the first Snyk scan: `proxy-addr` 2.0.7 → 2.0.8 (critical, user impersonation via `X-Forwarded-For` parsing; comes in through express).

All of the Svelte/Vite items go away with the Svelte 5 + Vite 6 upgrade, which is a rewrite of every component's reactivity and is tracked as future work.

Replaced instead of accepted: the `xlsx` package (SheetJS on npm is unmaintained and has high-severity prototype pollution and ReDoS advisories) was swapped for `write-excel-file` ([src/lib/xlsx.js](src/lib/xlsx.js)).

## CD: release a version

```bash
git checkout main && git pull
git tag v1.2.0 && git push origin v1.2.0
```

`cd.yml` runs the whole CI pipeline again on the tag. If it passes, it builds the image for `linux/amd64` and `linux/arm64`, then pushes `ghcr.io/<owner>/literature-review-tracker:1.2.0` and `:latest` using the built-in `GITHUB_TOKEN`, so no extra secret is needed. With `SNYK_TOKEN` set, Snyk then monitors that exact image.

Versioning follows [SemVer](https://semver.org): MAJOR for changes that need action from people running it (env vars, data format), MINOR for features, PATCH for fixes.

**Rollback:** every release keeps its own tag, so run the previous one, `image: ghcr.io/<owner>/literature-review-tracker:1.1.0` in compose, then `docker compose up -d`.

**Deploying:** the pipeline stops at publishing the image because every install runs somewhere different (a lab server, a VM, a NAS). To deploy automatically, add a job after `publish` in `cd.yml` that, for example, SSHes to your server and runs `docker compose pull && docker compose up -d`.

## Secrets used by the workflows

| Workflow | Needs | Notes |
|----------|-------|-------|
| `ci.yml` | `SNYK_TOKEN` (optional) | Smoke tests generate throwaway keys and passwords on each run |
| `cd.yml` | `SNYK_TOKEN` (optional), `GITHUB_TOKEN` (automatic) | `packages: write` is declared in the workflow |
