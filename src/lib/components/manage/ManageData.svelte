<script>
  import CollectionEditor from './CollectionEditor.svelte'
  import ComparisonEditor from './ComparisonEditor.svelte'
  import { saveCollection } from '../../auth.js'

  export let appData
  // Re-fetches /api/app-data so every view (and these editors) shows what was just saved.
  export let refresh

  let section = 'papers'

  async function saveTo(name, value) {
    await saveCollection(name, value)
    await refresh()
  }

  $: ({ config, domains, papers, gaps, citations, stackLayers: pipeline, rejected, dimensions, dimensionCells } = appData)

  const nextId = (items) => Math.max(0, ...items.map((i) => Number(i.id) || 0)) + 1
  const nextCode = (items, prefix) => {
    const nums = items.map((i) => Number(String(i.id).replace(prefix, ''))).filter(Number.isInteger)
    return `${prefix}${Math.max(0, ...nums) + 1}`
  }
  const PALETTE = ['#6c8fff', '#a78bfa', '#34d399', '#fbbf24', '#f97316', '#ef4444', '#22d3ee', '#ec4899']
  const domainLabel = (id) => {
    const d = domains.find((x) => x.id === id)
    return d ? `D${d.id} ${d.label}` : `D${id}`
  }

  $: domainOptions = domains.map((d) => ({ value: d.id, label: `D${d.id} — ${d.label}` }))
  $: paperOptions = [...papers].sort((a, b) => a.id - b.id).map((p) => ({ value: p.id, label: `#${p.num} ${p.title}` }))

  const configFields = [
    { key: 'title', label: 'App title', type: 'text', required: true },
    { key: 'icon', label: 'Icon', type: 'text', hint: 'One emoji, shown next to the title' },
    { key: 'subtitle', label: 'Subtitle', type: 'text', wide: true, hint: 'For example your thesis topic' },
    { key: 'pipelineTitle', label: 'Pipeline heading', type: 'text' },
    { key: 'pipelineSubtitle', label: 'Pipeline subheading', type: 'text', wide: true },
  ]

  const domainFields = [
    { key: 'id', label: 'Domain number', type: 'number', min: 1, required: true, hint: 'Shown as D1, D2, … Papers point at this number.' },
    { key: 'label', label: 'Short name', type: 'text', required: true },
    { key: 'fullLabel', label: 'Full name', type: 'text' },
    { key: 'slug', label: 'Slug', type: 'text', required: true, hint: 'Lowercase, digits and "-". PDFs go in papers/<slug>/' },
    { key: 'color', label: 'Color', type: 'color' },
    { key: 'target', label: 'Target paper count', type: 'number', min: 0 },
    { key: 'description', label: 'Description', type: 'textarea', rows: 2 },
    { key: 'keywords', label: 'Search keywords', type: 'lines', hint: 'One search string per line, the ones you use in Scopus / Google Scholar' },
  ]

  $: paperFields = [
    { key: 'id', label: 'Paper number', type: 'number', min: 1, required: true, hint: 'Unique across all domains. Must match NN in the PDF file name.' },
    { key: 'domain', label: 'Domain', type: 'select', options: domainOptions },
    { key: 'score', label: 'Relevance (1–10)', type: 'number', min: 1, max: 10, required: true },
    { key: 'title', label: 'Title', type: 'text', required: true, wide: true },
    { key: 'authors', label: 'Authors', type: 'text', required: true, placeholder: 'Zhou et al.' },
    { key: 'venue', label: 'Venue', type: 'text', required: true, placeholder: 'Journal or conference' },
    { key: 'year', label: 'Year', type: 'number', required: true },
    { key: 'doi', label: 'DOI', type: 'text', placeholder: '10.xxxx/...' },
    { key: 'caution', label: '⚠️ Cite with caution', type: 'checkbox' },
    { key: 'what', label: 'What: the paper in one or two sentences', type: 'textarea', rows: 2 },
    { key: 'how', label: 'How: method', type: 'textarea', rows: 2 },
    { key: 'results', label: 'Results', type: 'textarea', rows: 2 },
    { key: 'usage', label: 'Usage: where you will cite it and why', type: 'textarea', rows: 2 },
    { key: 'tags', label: 'Tags', type: 'tags' },
  ]

  const gapFields = [
    { key: 'id', label: 'Gap ID', type: 'text', required: true, placeholder: 'G1' },
    { key: 'priority', label: 'Priority', type: 'select', options: ['critical', 'high', 'medium', 'low'].map((v) => ({ value: v, label: v })) },
    { key: 'status', label: 'Status', type: 'select', options: [
      { value: 'open', label: 'open: still a gap' },
      { value: 'partial', label: 'partial: partly covered' },
      { value: 'closed', label: 'closed: covered' },
    ] },
    { key: 'title', label: 'Title', type: 'text', required: true, wide: true },
    { key: 'description', label: 'Description', type: 'textarea' },
    { key: 'evidence', label: 'Evidence', type: 'lines', hint: 'One point per line, e.g. "Paper 04: no decision layer"' },
    { key: 'opportunity', label: 'Opportunity for your study', type: 'textarea', rows: 2 },
    { key: 'searchGuidance', label: 'Search guidance', type: 'textarea', rows: 2, hint: 'What to search next to close this gap' },
  ]

  $: citationFields = [
    { key: 'paperId', label: 'Paper', type: 'select', options: paperOptions, wide: true },
    { key: 'where', label: 'Where it goes', type: 'text', placeholder: 'Chapter 2: Related work' },
    { key: 'label', label: 'Label', type: 'text', placeholder: 'Zhou et al. (2021): long-horizon Transformer' },
    { key: 'text', label: 'Citation sentence', type: 'textarea', rows: 4 },
  ]
  $: citationItems = Object.entries(citations)
    .map(([id, c]) => ({ paperId: Number(id), where: '', label: '', ...c }))
    .sort((a, b) => a.paperId - b.paperId)

  function saveCitations(items) {
    const out = {}
    for (const c of items) {
      if (out[c.paperId]) throw new Error(`Paper #${c.paperId} already has a citation. Edit that one instead.`)
      out[c.paperId] = { where: c.where, label: c.label, text: c.text }
    }
    return saveTo('citations', out)
  }

  $: pipelineFields = [
    { key: 'step', label: 'Step', type: 'number', min: 0, required: true, hint: '1, 2, 3… in order. Use 0 for one cross-cutting concern.' },
    { key: 'label', label: 'Label', type: 'text', required: true },
    { key: 'sublabel', label: 'Sublabel', type: 'text' },
    { key: 'color', label: 'Color', type: 'color' },
    { key: 'domain', label: 'Domain', type: 'select', options: [{ value: null, label: '(none)' }, ...domainOptions] },
    { key: 'papers', label: 'Paper numbers', type: 'numbers' },
    { key: 'note', label: 'Note', type: 'textarea', rows: 2 },
  ]

  const rejectedFields = [
    { key: 'id', label: 'ID', type: 'text', required: true, placeholder: 'x1' },
    { key: 'status', label: 'Status', type: 'select', options: [
      { value: 'rejected', label: 'rejected: read, never included' },
      { value: 'removed', label: 'removed: included, then taken out' },
    ] },
    { key: 'batch', label: 'Batch', type: 'text', placeholder: '2026-01', hint: 'Which search or screening round' },
    { key: 'title', label: 'Title', type: 'text', required: true, wide: true },
    { key: 'authors', label: 'Authors', type: 'text' },
    { key: 'venue', label: 'Venue', type: 'text' },
    { key: 'year', label: 'Year', type: 'number' },
    { key: 'freedNumber', label: 'Freed paper number', type: 'number', hint: 'For "removed": the number it had in the corpus' },
    { key: 'reason', label: 'Reason for excluding', type: 'textarea', rows: 2 },
  ]

  $: sections = [
    { id: 'papers', label: 'Papers', count: papers.length },
    { id: 'domains', label: 'Domains', count: domains.length },
    { id: 'comparison', label: 'Comparison', count: dimensions.length },
    { id: 'gaps', label: 'Gaps', count: gaps.length },
    { id: 'citations', label: 'Citations', count: citationItems.length },
    { id: 'pipeline', label: 'Pipeline', count: pipeline.length },
    { id: 'rejected', label: 'Rejected', count: rejected.length },
    { id: 'settings', label: 'Settings' },
  ]
</script>

<section class="manage">
  <p class="intro">
    Everything you edit here is saved straight into the JSON files in the data folder. The previous
    version of each file is kept next to it as <code>*.json.bak</code>.
  </p>

  <nav class="tabs">
    {#each sections as s}
      <button class="tab" class:active={section === s.id} on:click={() => (section = s.id)}>
        {s.label}{#if s.count !== undefined}<span class="tab-count">{s.count}</span>{/if}
      </button>
    {/each}
  </nav>

  {#if section === 'papers'}
    {#if !domains.length}
      <div class="msg error">Add a domain first. Every paper belongs to one.</div>
    {:else}
      <CollectionEditor
        items={papers}
        fields={paperFields}
        addLabel="+ Add paper"
        itemTitle={(p) => `#${p.num ?? p.id} ${p.title}`}
        itemMeta={(p) => `${domainLabel(p.domain)} · ${p.authors} · ${p.venue} ${p.year} · relevance ${p.score}/10`}
        create={(items) => ({ id: nextId(items), domain: domains[0].id, score: 7, year: new Date().getFullYear(), caution: false, title: '', authors: '', venue: '', doi: '', what: '', how: '', results: '', usage: '', tags: [] })}
        save={(items) => saveTo('papers', items)}
      />
      <p class="foot">Deleting a paper also removes its citation, comparison scores and pipeline references.</p>
    {/if}
  {:else if section === 'domains'}
    <CollectionEditor
      items={domains}
      fields={domainFields}
      addLabel="+ Add domain"
      itemTitle={(d) => `D${d.id} ${d.label}`}
      itemMeta={(d) => `${d.papers?.length ?? 0} / ${d.target} papers · ${d.slug}`}
      create={(items) => {
        const id = nextId(items)
        return { id, slug: `domain-${id}`, color: PALETTE[(id - 1) % PALETTE.length], label: '', fullLabel: '', description: '', target: 5, keywords: [] }
      }}
      save={(items) => saveTo('domains', items)}
    />
  {:else if section === 'comparison'}
    <ComparisonEditor {papers} {domains} {dimensions} cells={dimensionCells} save={(v) => saveTo('comparison', v)} />
  {:else if section === 'gaps'}
    <CollectionEditor
      items={gaps}
      fields={gapFields}
      addLabel="+ Add gap"
      itemTitle={(g) => `${g.id} ${g.title}`}
      itemMeta={(g) => `${g.priority} priority · ${g.status}`}
      create={(items) => ({ id: nextCode(items, 'G'), title: '', priority: 'medium', status: 'open', description: '', evidence: [], opportunity: '', searchGuidance: '' })}
      save={(items) => saveTo('gaps', items)}
    />
  {:else if section === 'citations'}
    {#if !papers.length}
      <div class="msg error">Add a paper first. Each citation belongs to one paper.</div>
    {:else}
      <CollectionEditor
        items={citationItems}
        fields={citationFields}
        addLabel="+ Add citation"
        itemTitle={(c) => c.label || `Paper #${c.paperId}`}
        itemMeta={(c) => `Paper #${String(c.paperId).padStart(2, '0')}${c.where ? ` · ${c.where}` : ''}`}
        create={(items) => {
          const used = new Set(items.map((c) => c.paperId))
          const free = paperOptions.find((o) => !used.has(o.value)) ?? paperOptions[0]
          return { paperId: free.value, where: '', label: '', text: '' }
        }}
        save={saveCitations}
      />
    {/if}
  {:else if section === 'pipeline'}
    <CollectionEditor
      items={pipeline}
      fields={pipelineFields}
      addLabel="+ Add step"
      itemTitle={(l) => `${l.step === 0 ? 'Cross-cutting' : `Step ${l.step}`}: ${l.label}`}
      itemMeta={(l) => [l.sublabel, l.papers?.length ? `papers ${l.papers.join(', ')}` : ''].filter(Boolean).join(' · ')}
      create={(items) => ({ step: Math.max(0, ...items.map((l) => l.step)) + 1, label: '', sublabel: '', color: PALETTE[items.length % PALETTE.length], domain: null, papers: [], note: '' })}
      save={(items) => saveTo('pipeline', items)}
    />
  {:else if section === 'rejected'}
    <CollectionEditor
      items={rejected}
      fields={rejectedFields}
      addLabel="+ Add rejected paper"
      itemTitle={(r) => r.title}
      itemMeta={(r) => [r.status, r.batch, r.authors, r.year].filter(Boolean).join(' · ')}
      create={(items) => ({ id: nextCode(items, 'x'), status: 'rejected', batch: '', title: '', authors: '', venue: '', year: new Date().getFullYear(), reason: '', freedNumber: null })}
      save={(items) => saveTo('rejected', items)}
    />
  {:else if section === 'settings'}
    <CollectionEditor items={[config]} fields={configFields} single save={([c]) => saveTo('config', c)} />
  {/if}
</section>

<style>
  .manage { display: flex; flex-direction: column; gap: 14px; max-width: 1100px; }
  .intro { font-size: 0.8rem; color: var(--text2); line-height: 1.6; }
  code { font-size: 0.76rem; background: var(--surface2); padding: 1px 5px; border-radius: 4px; }
  .tabs { display: flex; gap: 4px; flex-wrap: wrap; border-bottom: 1px solid var(--border); padding-bottom: 8px; }
  .tab {
    padding: 6px 12px; border-radius: var(--radius); border: 1px solid transparent;
    background: none; color: var(--text2); font-size: 0.8rem; cursor: pointer;
    display: inline-flex; align-items: center; gap: 6px;
  }
  .tab:hover { background: var(--surface2); }
  .tab.active { background: var(--accent-glow); color: var(--accent); border-color: var(--accent); font-weight: 600; }
  .tab-count { font-size: 0.68rem; color: var(--text3); font-weight: 700; }
  .tab.active .tab-count { color: var(--accent); }
  .foot { font-size: 0.72rem; color: var(--text3); }
</style>
