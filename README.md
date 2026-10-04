# Literature Review Tracker

A self-hosted web app for running a literature review, built for thesis and dissertation work. You decide which research domains your review covers. Then you log every paper you read, either into the corpus with your notes or onto a rejected list with the reason. The app shows how well each domain is covered, where the gaps are, and gives you tables and sentences you can paste straight into your chapters.

It runs on your own machine or server and keeps all your content in plain JSON files you own. Every account signs in with a password **and** an authenticator app (two-factor authentication is required, with no way to turn it off), and what each person can do depends on their role.

## What you get

| View | What it shows |
|------|---------------|
| **Papers** | Papers grouped by domain, with search, sorting, a relevance score, and notes: what the paper does, how, its results, and how you'll use it |
| **Comparison** | Every paper scored on your own rubric. Exports to `.xlsx`, PNG, or JPG for your thesis |
| **Domain Tables** | One table of papers per domain (authors, venue, year, relevance, DOI). Exports to `.xlsx` |
| **Gap Analysis** | Research gaps with priority, status, evidence, and what to search next |
| **Citations** | Ready-to-paste citation sentences, sorted by where they go in your thesis |
| **Pipeline** | How your domains connect into your study's method, with coverage bars against each target |
| **Charts** | Papers per domain and the spread of relevance scores |
| **Rejected Papers** | What you read and excluded, and why. Keeping this list makes your selection process transparent and easy to report |
| **Manage Data** *(admins, managers)* | Forms to add, edit, and delete everything above |
| **Users** *(admins, managers)* | Accounts, roles, 2FA status. Admins can add, disable, and reset users |
| **Audit Log** *(admins)* | Sign-ins, failed attempts, 2FA events, admin actions, and data saves |

---

## How to use it for your review

This is the workflow the app is built around. Every step happens in **Manage Data**, under *Views* in the sidebar. You need an admin or manager account to see it.

### 1. Set up the app

Install it ([Quick start](#quick-start-docker)) and sign in. On your first sign-in you'll scan a QR code with an authenticator app and get 10 backup codes (see [Sign-in and two-factor authentication](#sign-in-and-two-factor-authentication)). The app comes with a small example corpus on time-series forecasting, so every view has something to show. Look around, then [clear it out](#starting-from-an-empty-corpus) when you're ready to start.

In **Manage Data → Settings**, set the app title (for example your thesis title), an icon, and a subtitle.

### 2. Define your domains

A *domain* is one strand of literature your review has to cover, such as "Recurrent sequence models" or "Reinforcement learning for control". Most reviews have 3–6.

In **Manage Data → Domains**, add one entry per domain:

- **Domain number** – shown as D1, D2, …
- **Short name / Full name / Description**
- **Target paper count** – how many papers you aim to include. The coverage bars measure progress against this number.
- **Search keywords** – the exact search strings you use in Scopus, Google Scholar, and so on. Writing them down makes your search reproducible.
- **Slug and color** – the slug is also the folder name for that domain's PDFs.

### 3. Log every paper you read

For each paper you screen, make one decision:

- **Include it** → **Manage Data → Papers → + Add paper.** Choose its domain, give it a relevance score from 1 to 10, and fill in the four notes:
  - **What** – the paper in one or two sentences
  - **How** – its method
  - **Results** – what it found
  - **Usage** – where you'll cite it and why

  Use tags for quick labels such as "Baseline model" (positive) or "Not time-series data" (warning). Tick *Cite with caution* for preprints or weak evidence.
- **Exclude it** → **Manage Data → Rejected → + Add rejected paper.** Record a short **reason** and the **batch**, meaning the search round it came from. If you remove a paper you had already included, delete it from Papers, add it here with status `removed`, and put its old number in **Freed paper number**.

The sidebar counts update as you go: papers read, kept, rejected outright, and removed later.

### 4. Score the papers on a rubric

In **Manage Data → Comparison**, list the rubric **dimensions**, the criteria every paper is judged on (for example "Uses real-world data" or "Evaluates decision-making"). Then pick a domain and set a status for each paper and dimension:

| Status | Meaning |
|--------|---------|
| ✓ Yes | Fully covers it |
| ◑ Partial | Partly covers it |
| · Note | Relevant, with a remark |
| — No | Doesn't cover it (default) |

Add a short note to explain a cell. The **Comparison** view then shows one table per domain. You can export it as Excel or an image for your literature review chapter.

### 5. Record the gaps

The rubric shows what the literature hasn't done. In **Manage Data → Gaps**, write each gap down with a priority, a status (`open` / `partial` / `closed`), evidence (one line per paper that supports it), the opportunity it gives your study, and what to search next. Close gaps as new papers cover them.

### 6. Draft your citations

In **Manage Data → Citations**, attach a ready-written sentence to a paper. Add where it goes (for example "Chapter 2: Related work") and a short label. The **Citations** view lists them sorted by where they go, each with a copy button.

### 7. Draw the research pipeline

In **Manage Data → Pipeline**, describe how the domains feed into your method, step by step: step 1, 2, 3, and so on, each linked to a domain and its key papers. Use step `0` for one concern that runs across all steps, such as evaluation or ethics. The headings are set in **Settings**.

### 8. Use it in your writing

- Export comparison tables from **Comparison** (`.xlsx`, PNG, JPG) and paper lists from **Domain Tables** (`.xlsx`).
- Copy citation sentences from **Citations**.
- Use **Charts** and the rejected-paper counts when you describe your search and selection process.

---

## Quick start (Docker)

You need [Docker](https://docs.docker.com/get-docker/) with Docker Compose, and an authenticator app on your phone (Google Authenticator, Microsoft Authenticator, Authy, 1Password, …).

```bash
git clone <this repo> && cd literature-review-tracker
bash scripts/generate-secrets.sh   # creates .env with a random 2FA encryption key and first-admin password
docker compose up -d --build
```

The script prints the first admin's email and password. Open http://localhost:3000, sign in, scan the QR code, and save your backup codes. The first admin is created only while no users exist, so you can delete `ADMIN_EMAIL` / `ADMIN_PASSWORD` from `.env` afterwards.

> **Keep `TOTP_ENCRYPTION_KEY` in `.env` safe and never change it.** It encrypts everyone's 2FA secret. If it is lost or changed, nobody can complete 2FA. Recovering means deleting `state/users.json` and starting again from the first admin.

Folders on the host:

| Folder | Contents |
|--------|----------|
| `data/` | Your corpus (JSON). Mounted writable, because **Manage Data** saves here |
| `papers/` | Optional PDFs (read-only) |
| `state/` | Users (with 2FA state), the session secret, and the audit log |

The container runs as an unprivileged user (uid 1000). On Linux, `data/` and `state/` must be writable by that uid: run `sudo chown -R 1000:1000 data state` if needed.

To update after pulling new code, run `docker compose up -d --build`. Your `data/` and `state/` folders are not affected. Released versions are also published as images, `ghcr.io/<owner>/literature-review-tracker:<version>` (see [CI-CD.md](CI-CD.md)).

### Behind HTTPS

For anything beyond your own machine, put a reverse proxy (Caddy, nginx, Traefik) in front and set `COOKIE_SECURE=true` and `TRUST_PROXY=1` in `.env`. Without a proxy, leave `TRUST_PROXY` at `false`, or clients could fake their IP address and get around the rate limits.

## Local development

You need Node.js 20+.

```bash
npm install
bash scripts/generate-secrets.sh   # .env with TOTP_ENCRYPTION_KEY and a first admin
npm run dev:server                 # API on :4000 (reads .env)
npm run dev                        # UI on :5173
npm run build && npm test          # end-to-end smoke test, the same one CI runs
```

## Sign-in and two-factor authentication

Two-factor authentication (2FA) is required for **every** account, and nobody can switch it off:

1. **Password.** A correct password alone never opens a session.
2. **First sign-in** (or after an admin resets your 2FA): scan the QR code with an authenticator app and enter the 6-digit code. You then get **10 backup codes**. Save them, because they are shown only once.
3. **Every later sign-in:** enter the current 6-digit code from the app. A code can't be used twice. If you lost your phone, use a backup code instead; each one works once.
4. **Temporary passwords:** people whose account was created or reset by an admin must choose their own password right after signing in.

From the account panel (click your email at the bottom of the sidebar) you can change your password and create a new set of backup codes. If you lose both your phone and your backup codes, ask an admin to **reset your 2FA**, and your next sign-in starts the setup again.

Other protections:

- **Lockout:** an account locks for 15 minutes after 5 wrong passwords. An admin password reset unlocks it.
- **Rate limits:** sign-in and 2FA requests are limited per IP.
- **Immediate sign-out:** changing someone's role, disabling the account, or resetting their password or 2FA signs them out everywhere at once.

## Users and roles

| Permission | admin | manager | user |
|------------|:-----:|:-------:|:----:|
| Read every view, download PDFs | ✓ | ✓ | ✓ |
| Edit data (**Manage Data**) | ✓ | ✓ | |
| See the user list (**Users**) | ✓ | ✓ | |
| Add, change role, disable, reset password / 2FA, delete users | ✓ | | |
| Read the **Audit Log** | ✓ | | |

- **admin** – runs the app and manages accounts
- **manager** – a co-researcher or research assistant who maintains the data
- **user** – read-only, e.g. a supervisor or examiner

Roles are defined in one place, [server/permissions.js](server/permissions.js), and the server checks them on every request. Admins can't remove their own admin role or disable or delete themselves, and at least one active admin always remains.

## Starting from an empty corpus

Delete the example entries in **Manage Data**: papers first, then domains. Or reset the files directly:

```bash
for f in papers domains gaps pipeline rejected; do echo '[]' > data/$f.json; done
echo '{}' > data/citations.json
echo '{ "dimensions": [], "cells": {} }' > data/comparison.json
```

Then start again from [step 2](#2-define-your-domains).

## Backups

Each save from **Manage Data** writes the whole file, and the version before it is kept next to it as `*.json.bak`, which gives you one step of undo. For real history, make `data/` a Git repository and commit it now and then.

Back up `state/` too (users, 2FA state, audit log), along with **`TOTP_ENCRYPTION_KEY` from `.env`**. The users file is useless without the key that decrypts its 2FA secrets. Keep the two in separate places.

---

## Data file reference

You don't need this if you use **Manage Data**. It's here if you'd rather edit the JSON by hand, import from another tool, or script changes. The server re-reads the files on every page load, so after editing one, refresh the browser. Only `domains.json` and `papers.json` are required. A missing file just leaves its view empty.

| File | Contents |
|------|----------|
| `config.json` | `title`, `subtitle`, `icon`, `pipelineTitle`, `pipelineSubtitle` |
| `domains.json` | `id`, `slug`, `color`, `label`, `fullLabel`, `description`, `target`, `keywords[]` |
| `papers.json` | Papers (format below) |
| `comparison.json` | `dimensions[]` (rubric column names) plus `cells[domainId][paperId][dimensionIndex] = { status, note }`. `status` is `yes`, `partial`, `note`, or `no`. A missing cell means `no` |
| `gaps.json` | `id`, `title`, `priority` (`critical`/`high`/`medium`/`low`), `status` (`open`/`partial`/`closed`), `description`, `evidence[]`, `opportunity`, `searchGuidance` |
| `citations.json` | Keyed by paper id: `{ where, label, text }` |
| `pipeline.json` | `step` (`0` = cross-cutting), `label`, `sublabel`, `color`, `domain`, `papers[]`, `note` |
| `rejected.json` | `id`, `status` (`rejected`/`removed`), `batch`, `title`, `authors`, `venue`, `year`, `reason`, optional `freedNumber` |

A paper looks like this:

```json
{
  "id": 1, "num": "01", "domain": 1, "score": 9, "caution": false,
  "title": "Long Short-Term Memory",
  "authors": "Hochreiter & Schmidhuber",
  "venue": "Neural Computation", "year": 1997,
  "doi": "10.1162/neco.1997.9.8.1735",
  "what": "...", "how": "...", "results": "...", "usage": "...",
  "tags": [{ "label": "Foundational", "type": "yes" }]
}
```

- `id` is unique across all domains. `num` is `id` padded to two digits.
- `score` is a relevance score from 1 to 10.
- Each tag's `type` is `yes` (positive), `warn` (warning), or empty (neutral).
- A paper's domain comes from its `domain` field, so `domains.json` doesn't keep its own list of papers.

Saving from **Manage Data** checks the whole file before writing. Examples: ids must be unique, scores must be from 1 to 10, every paper's domain must exist, and you can't delete a domain that still has papers. Deleting a paper also removes its citation, comparison scores, and pipeline references.

### PDFs (optional)

Put PDFs in `papers/<domain slug>/D<domain>-<NN>-<anything>.pdf`, for example `papers/domain-1-sequence-models/D1-01-lstm.pdf`. `NN` must match the paper's `id`. Signed-in users then get a download button on that paper. New files show up on the next page load.

## Configuration

| Variable | Default | Purpose |
|----------|---------|---------|
| `TOTP_ENCRYPTION_KEY` | — (**required**) | 64 hex characters that encrypt users' 2FA secrets. `scripts/generate-secrets.sh` creates one |
| `ADMIN_EMAIL`, `ADMIN_PASSWORD` | — | Create the first admin on first start |
| `PORT` | `4000` | HTTP port |
| `DATA_DIR` | `./data` | Folder with the JSON files (must be writable to use **Manage Data**) |
| `PAPERS_DIR` | `./papers` | Folder with the PDFs |
| `STATE_DIR` | `./state` | Users, session secret, audit log |
| `COOKIE_SECURE` | `false` | `true` when served over HTTPS (also turns on HSTS) |
| `TRUST_PROXY` | `false` | Number of reverse-proxy hops to trust for the client IP (e.g. `1`). Leave `false` without a proxy |
| `TWOFA_ISSUER` | `Literature Review Tracker` | Name shown in the authenticator app |
| `SESSION_SECRET` | generated | Fixed session secret (32+ characters). Otherwise one is generated into `state/` |
| `LOGIN_MAX_ATTEMPTS`, `LOGIN_LOCK_MINUTES` | `5`, `15` | Account lockout |
| `RATE_LIMIT_LOGIN`, `RATE_LIMIT_2FA` | `20`, `10` | Requests per IP per 15 min (sign-in) and per 5 min (2FA) |

Sessions are kept in memory, so restarting the app signs everyone out.

### Upgrading from older versions

- **Users from before 2FA** were stored as `APP_USER_*` lines in `AUTH_ENV_PATH` (`state/users.env` in Docker). On start they are moved into `state/users.json` with their passwords and roles unchanged, and each person sets up 2FA at their next sign-in.
- **Papers from the old "+ Add Paper" form** in `custom-papers.json` (`CUSTOM_PAPERS_PATH`) are moved into `data/papers.json`. A paper whose id is already taken gets a new number, and the old file is renamed to `custom-papers.json.migrated`.

## Development process

Every push and pull request runs CI:

- `npm audit` and the build
- the end-to-end smoke test, run both directly and against the Docker image
- Snyk scans of dependencies, source code, and the container image

Release tags (`vX.Y.Z`) publish an image to GitHub Container Registry. See [CI-CD.md](CI-CD.md).

## License

MIT
