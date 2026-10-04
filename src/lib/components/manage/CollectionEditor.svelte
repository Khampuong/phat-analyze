<script>
  import ItemForm from './ItemForm.svelte'

  // Generic list editor driven by a field schema (see ItemForm.svelte for the field types).
  // Every add / edit / delete is saved right away through `save(nextItems)`, which writes the
  // whole collection back to its JSON file.
  export let items = []
  export let fields = []
  export let itemTitle = (item) => item.title ?? item.label ?? ''
  export let itemMeta = () => ''
  export let create = () => ({})
  export let save
  export let single = false // edit one object (e.g. config) instead of a list
  export let addLabel = '+ Add'

  let editing = null // null | index | 'new'
  let draft = null
  let texts = {}
  let error = ''
  let ok = ''
  let saving = false
  let confirmIndex = null
  let query = ''

  function open(item, index) {
    error = ''
    ok = ''
    confirmIndex = null
    draft = JSON.parse(JSON.stringify(item))
    texts = {}
    for (const f of fields) {
      if (f.type === 'lines') texts[f.key] = (draft[f.key] || []).join('\n')
      if (f.type === 'numbers') texts[f.key] = (draft[f.key] || []).join(', ')
      if (f.type === 'tags') draft[f.key] = draft[f.key] || []
    }
    editing = index
  }

  function close() {
    editing = null
    draft = null
    error = ''
  }

  function collect() {
    const out = { ...draft }
    for (const f of fields) {
      if (f.type === 'lines') out[f.key] = texts[f.key].split('\n').map((s) => s.trim()).filter(Boolean)
      if (f.type === 'numbers') {
        out[f.key] = texts[f.key].split(/[\s,]+/).filter(Boolean).map(Number)
        if (out[f.key].some((n) => !Number.isInteger(n))) throw new Error(`${f.label}: use whole numbers separated by commas`)
      }
      if (f.type === 'tags') out[f.key] = out[f.key].filter((t) => t.label?.trim())
    }
    return out
  }

  async function persist(next, message) {
    error = ''
    ok = ''
    saving = true
    try {
      await save(next)
      ok = message
      return true
    } catch (e) {
      error = e.message
      return false
    } finally {
      saving = false
    }
  }

  async function submit() {
    let item
    try {
      item = collect()
    } catch (e) {
      error = e.message
      return
    }
    if (single) {
      await persist(item, 'Saved')
      return
    }
    const next = editing === 'new' ? [...items, item] : items.map((it, i) => (i === editing ? item : it))
    if (await persist(next, editing === 'new' ? 'Added' : 'Saved')) close()
  }

  async function remove(index) {
    confirmIndex = null
    await persist(items.filter((_, i) => i !== index), 'Deleted')
  }

  $: if (single && items[0] && draft === null) open(items[0], 0)

  $: q = query.trim().toLowerCase()
  $: visible = items
    .map((item, index) => ({ item, index }))
    .filter(({ item }) => !q || `${itemTitle(item)} ${itemMeta(item)}`.toLowerCase().includes(q))
</script>

<div class="ce">
  {#if single}
    {#if draft}
      <ItemForm {fields} bind:draft bind:texts {saving} {error} cancellable={false} on:submit={submit} />
      {#if ok}<div class="msg ok">{ok}</div>{/if}
    {/if}
  {:else}
    <div class="ce-toolbar">
      <button class="btn primary" on:click={() => open(create(items), 'new')} disabled={editing === 'new'}>{addLabel}</button>
      {#if items.length > 8}
        <input class="ce-search" type="text" placeholder="Filter…" bind:value={query} />
      {/if}
      <span class="ce-count">{items.length} item{items.length === 1 ? '' : 's'}</span>
    </div>

    {#if ok && editing === null}<div class="msg ok">{ok}</div>{/if}
    {#if error && editing === null}<div class="msg error">{error}</div>{/if}

    {#if editing === 'new' && draft}
      <ItemForm {fields} bind:draft bind:texts {saving} {error} submitLabel="Add" on:submit={submit} on:cancel={close} />
    {/if}

    <ul class="ce-list">
      {#each visible as { item, index } (index)}
        <li class="ce-row" class:open={editing === index}>
          <div class="ce-row-head">
            <div class="ce-row-text">
              <div class="ce-title">{itemTitle(item) || '(untitled)'}</div>
              {#if itemMeta(item)}<div class="ce-meta">{itemMeta(item)}</div>{/if}
            </div>
            {#if confirmIndex === index}
              <span class="ce-confirm">Delete this item?</span>
              <button class="btn danger" on:click={() => remove(index)} disabled={saving}>Delete</button>
              <button class="btn" on:click={() => (confirmIndex = null)}>Cancel</button>
            {:else if editing !== index}
              <button class="btn" on:click={() => open(item, index)}>Edit</button>
              <button class="btn ghost-danger" on:click={() => (confirmIndex = index)}>Delete</button>
            {/if}
          </div>
          {#if editing === index && draft}
            <div class="ce-row-form">
              <ItemForm {fields} bind:draft bind:texts {saving} {error} on:submit={submit} on:cancel={close} />
            </div>
          {/if}
        </li>
      {:else}
        <li class="ce-empty">{items.length ? 'Nothing matches the filter' : 'Nothing here yet'}</li>
      {/each}
    </ul>
  {/if}
</div>

<style>
  .ce { display: flex; flex-direction: column; gap: 12px; }
  .ce-toolbar { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; }
  .ce-search {
    flex: 1; min-width: 160px; max-width: 320px; padding: 6px 10px;
    background: var(--surface2); border: 1px solid var(--border); border-radius: var(--radius);
    color: var(--text); font-size: 0.82rem; outline: none;
  }
  .ce-search:focus { border-color: var(--accent); }
  .ce-count { font-size: 0.75rem; color: var(--text3); margin-left: auto; }

  .ce-list { list-style: none; display: flex; flex-direction: column; gap: 6px; }
  .ce-row {
    background: var(--surface); border: 1px solid var(--border);
    border-radius: var(--radius2); padding: 10px 14px;
  }
  .ce-row.open { border-color: var(--accent); }
  .ce-row-head { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
  .ce-row-text { flex: 1; min-width: 200px; }
  .ce-title { font-size: 0.86rem; font-weight: 600; color: var(--text); line-height: 1.35; }
  .ce-meta { font-size: 0.74rem; color: var(--text3); }
  .ce-confirm { font-size: 0.78rem; color: var(--danger); }
  .ce-row-form { margin-top: 10px; }
  .ce-empty {
    text-align: center; color: var(--text3); font-size: 0.85rem; padding: 28px;
    background: var(--surface); border: 1px dashed var(--border); border-radius: var(--radius2);
  }
</style>
