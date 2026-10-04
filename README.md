# Literature Review Tracker

A self-hosted web app for running a literature review, built for thesis and dissertation work. It shows:

- **Papers** grouped into research domains, with search, sorting, relevance scores, and notes (what, how, results, how you'll use it).
- **Coverage:** how many papers each domain has against your target.
- **Comparison tables:** every paper scored on your own rubric. Tables export to `.xlsx`, PNG, or JPG.
- **Gap analysis:** research gaps with priority, status, evidence, and search guidance.
- **Citation templates:** ready-to-paste sentences for your chapters.
- **Research pipeline:** how the domains connect into your study's method.
- **Charts:** papers per domain and the spread of relevance scores.
- **Rejected papers:** what you read and excluded, and why. Keeping this list makes your selection process transparent.

The app has a login. Admins can add users and add papers from the UI. Your data only ever leaves the server through the authenticated API, and none of it is built into the public JavaScript.

## Quick start (Docker)

```bash
git clone <this repo> && cd literature-review-tracker
cp .env.example .env          # set ADMIN_EMAIL / ADMIN_PASSWORD for the first admin
docker compose up -d --build
```

Open http://localhost:3000 and sign in. The first admin is created only when no users exist yet. After you've signed in, you can delete the two lines from `.env`.

The app starts with a small example corpus in `data/`. Replace those files with your own.

## Local development

```bash
npm install
ADMIN_EMAIL=you@example.com ADMIN_PASSWORD=at-least-8-chars npm run dev:server   # API on :4000
npm run dev                                                                        # UI on :5173
```

## Your data

All content lives in JSON files in `data/`, or in the folder set by `DATA_DIR`. The server re-reads them on every load, so after an edit you only need to refresh the browser. Only `domains.json` and `papers.json` are required. Any other file can be left out, and its view will simply be empty.

| File | Contents |
|------|----------|
| `config.json` | App title, subtitle, icon, and the pipeline view's heading |
| `domains.json` | Research domains: `id`, `slug`, `color`, `label`, `fullLabel`, `description`, `target`, `keywords` |
| `papers.json` | Papers (format below) |
| `comparison.json` | `dimensions` (rubric column names) plus `cells[domainId][paperId][dimensionIndex] = { status, note }`. `status` is `yes`, `partial`, `note`, or `no` |
| `gaps.json` | Gaps: `id`, `title`, `priority` (`critical`/`high`/`medium`/`low`), `status` (`open`/`partial`/`closed`), `description`, `evidence[]`, `opportunity`, `searchGuidance` |
| `citations.json` | Keyed by paper id: `{ where, label, text }` |
| `pipeline.json` | Pipeline layers: `step` (use `0` for one cross-cutting concern), `label`, `sublabel`, `color`, `domain`, `papers[]`, `note` |
| `rejected.json` | Excluded papers: `id`, `status` (`rejected` or `removed`), `batch`, `title`, `authors`, `venue`, `year`, `reason`, and optionally `freedNumber` |

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

- `id` is unique across all domains.
- `score` is a relevance score from 1 to 10.
- `caution: true` marks the paper "cite with caution".
- Each tag's `type` is `yes`, `warn`, or empty.
- A paper's domain comes from its `domain` field, so `domains.json` doesn't need its own list of papers.

Papers added through the **+ Add Paper** form are saved separately, to `CUSTOM_PAPERS_PATH`, so they never overwrite `papers.json`.

### PDFs (optional)

Put PDFs in `papers/<domain slug>/D<domain>-<NN>-<anything>.pdf`, for example `papers/domain-1-sequence-models/D1-01-lstm.pdf`. The number `NN` must match the paper's `id`. Signed-in users then get a download button on that paper.

## Configuration

| Variable | Default | Purpose |
|----------|---------|---------|
| `PORT` | `4000` | HTTP port |
| `DATA_DIR` | `./data` | Folder with the JSON files |
| `PAPERS_DIR` | `./papers` | Folder with the PDFs |
| `AUTH_ENV_PATH` | `./.env` | Where users and the session secret are stored |
| `CUSTOM_PAPERS_PATH` | `./custom-papers.json` | Where papers added in the UI are stored |
| `COOKIE_SECURE` | `false` | Set to `true` when the app is served over HTTPS behind a reverse proxy |
| `ADMIN_EMAIL`, `ADMIN_PASSWORD` | — | Create the first admin on first start |

## License

MIT
