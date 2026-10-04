# CLAUDE.md

Self-hosted literature review tracker: an Express API with a Svelte 4 + Vite 5 SPA. All corpus content lives in plain JSON files. There is no database.

## Workflow rules

- **When a task is finished, commit and push to GitHub** (`origin`, branch `main`). Don't leave finished work uncommitted.
- Run `npm run build` before committing UI changes. There are no tests or linter, so the build is the check.
- This repo is a public template. Never commit real research data, personal names, or credentials. `data/` holds only the generic example corpus.
- The UI and README are in English.

## Commands

```bash
npm install
ADMIN_EMAIL=you@example.com ADMIN_PASSWORD=at-least-8-chars npm run dev:server   # API on :4000
npm run dev                                                                        # Vite UI on :5173, proxies /api
npm run build                                                                      # -> dist/
docker compose up -d --build                                                       # app on :3000
```

## Layout

- `server/index.js` – Express routes: auth, `/api/app-data`, PDF download, `PUT /api/data/:name`, user admin
- `server/data.js` – reads the JSON files in `DATA_DIR` on every request (optional files fall back to empty values)
- `server/dataStore.js` – validates and writes a whole collection for **Manage Data**: keeps a `.bak`, writes atomically, prunes references when papers are deleted, and runs the one-time migration of the legacy `custom-papers.json`
- `server/appData.js` – builds the client payload: derives `domain.papers` from each paper's `domain` and adds `hasPdf`
- `server/auth.js` – users and the session secret stored as `KEY=value` lines in `AUTH_ENV_PATH` (bcrypt hashes)
- `server/papers.js` – PDF index built by scanning `papers/<slug>/D<domain>-<NN>-*.pdf`
- `src/App.svelte` – shell, sidebar, and tabs. The `manage` tab is admin-only
- `src/lib/components/` – one component per view
- `src/lib/components/manage/` – admin editors. `CollectionEditor` + `ItemForm` are a generic schema-driven list editor (field types: text, textarea, number, select, checkbox, color, lines, numbers, tags). `ComparisonEditor` is the rubric grid

## Data model notes

- The collections are `config, domains, papers, comparison, gaps, citations, pipeline, rejected`, each stored as `<name>.json`. `pipeline` is called `stackLayers` and comparison is split into `dimensions`/`dimensionCells` in the app-data payload.
- Paper `id` is unique across domains. `num` is always `id` padded to two digits, and the server sets it.
- `comparison.cells[domainId][paperId][dimIndex]`: a missing cell means `no`.
- The corpus is sent only through the authenticated API and never bundled into `dist/`.
- To add a new field to a collection, update the validator in `dataStore.js` (it whitelists fields), the field schema in `ManageData.svelte`, the view that shows it, and the README data reference.
