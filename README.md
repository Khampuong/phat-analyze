# Literature Review Tracker

A self-hosted web app for running a literature review, built for thesis and dissertation work. You decide which research domains your review covers. Then you log every paper you read, either into the corpus with your notes or onto a rejected list with the reason. The app shows how well each domain is covered, where the gaps are, and gives you tables and sentences you can paste straight into your chapters.

It runs on your own machine or server, needs a login, and keeps all your content in plain JSON files you own.

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
| **Manage Data** *(admins)* | Forms to add, edit, and delete everything above |

---

## How to use it for your review

This is the workflow the app is built around. Every step happens in **Manage Data**, the last item under *Views* in the sidebar. You need an admin account to see it.

### 1. Set up the app

Install it ([Quick start](#quick-start-docker)) and sign in. The app comes with a small example corpus on time-series forecasting, so every view has something to show. Look around, then [clear it out](#starting-from-an-empty-corpus) when you're ready to start.

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

You need [Docker](https://docs.docker.com/get-docker/) with Docker Compose.

```bash
git clone <this repo> && cd literature-review-tracker
cp .env.example .env          # set ADMIN_EMAIL / ADMIN_PASSWORD for the first admin
docker compose up -d --build
```

Open http://localhost:3000 and sign in with that email and password. The first admin is created only while no users exist, so you can delete the two lines from `.env` after signing in.

Folders on the host:

| Folder | Contents |
|--------|----------|
| `data/` | Your corpus (JSON). Mounted writable, because **Manage Data** saves here |
| `papers/` | Optional PDFs (read-only) |
| `state/` | Login users and the session secret. Created on first start |

To update the app after pulling new code, run `docker compose up -d --build`. Your `data/` and `state/` folders are not affected.

## Local development

You need Node.js 20+.

```bash
npm install
ADMIN_EMAIL=you@example.com ADMIN_PASSWORD=at-least-8-chars npm run dev:server   # API on :4000
npm run dev                                                                        # UI on :5173
```

## Users and roles

Open the account panel by clicking your email at the bottom of the sidebar. There you can change your password. Admins can also add or remove users.

- **admin** – sees everything and can edit through **Manage Data**
- **user** – read-only. Good for a supervisor or co-author who only needs to look

## Starting from an empty corpus

Delete the example entries in **Manage Data**: papers first, then domains. Or reset the files directly:

```bash
for f in papers domains gaps pipeline rejected; do echo '[]' > data/$f.json; done
echo '{}' > data/citations.json
echo '{ "dimensions": [], "cells": {} }' > data/comparison.json
```

Then start again from [step 2](#2-define-your-domains).

## Backups

Each save from **Manage Data** writes the whole file, and the version before it is kept next to it as `*.json.bak`, which gives you one step of undo. For real history, make `data/` a Git repository and commit it now and then. Also keep a copy of `state/`, which holds your users.

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
| `PORT` | `4000` | HTTP port |
| `DATA_DIR` | `./data` | Folder with the JSON files (must be writable to use **Manage Data**) |
| `PAPERS_DIR` | `./papers` | Folder with the PDFs |
| `AUTH_ENV_PATH` | `./.env` | Where users and the session secret are stored |
| `COOKIE_SECURE` | `false` | Set to `true` when the app is served over HTTPS behind a reverse proxy |
| `ADMIN_EMAIL`, `ADMIN_PASSWORD` | — | Create the first admin on first start |
| `CUSTOM_PAPERS_PATH` | `./custom-papers.json` | Legacy only (see below) |

### Upgrading from the "+ Add Paper" version

Earlier versions saved papers added in the UI to a separate `custom-papers.json`. On start, the server now moves those papers into `data/papers.json`, giving a paper a new number if its id is already taken, and renames the old file to `custom-papers.json.migrated`.

## License

MIT
