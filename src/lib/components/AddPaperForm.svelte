<script>
  import { createEventDispatcher } from 'svelte'
  import { addPaper } from '../auth.js'

  export let domains

  const dispatch = createEventDispatcher()

  let domainId = domains[0]?.id ?? 1
  let title = ''
  let authors = ''
  let venue = ''
  let year = new Date().getFullYear()
  let doi = ''
  let score = 7
  let caution = false
  let what = ''
  let how = ''
  let results = ''
  let usage = ''
  let tagsInput = ''

  let saving = false
  let error = ''
  let ok = ''

  function resetForm() {
    title = ''
    authors = ''
    venue = ''
    year = new Date().getFullYear()
    doi = ''
    score = 7
    caution = false
    what = ''
    how = ''
    results = ''
    usage = ''
    tagsInput = ''
  }

  async function submit() {
    error = ''
    ok = ''
    saving = true
    try {
      const payload = {
        domain: Number(domainId),
        title: title.trim(),
        authors: authors.trim(),
        venue: venue.trim(),
        year: Number(year),
        doi: doi.trim() || undefined,
        caution,
        score: Number(score),
        what: what.trim(),
        how: how.trim(),
        results: results.trim(),
        usage: usage.trim(),
        tags: tagsInput.split(',').map(t => t.trim()).filter(Boolean).map(label => ({ label, type: '' })),
      }
      const created = await addPaper(payload)
      ok = `เพิ่ม paper #${created.num} เรียบร้อยแล้ว`
      resetForm()
      dispatch('added', created)
    } catch (e) {
      error = e.message
    } finally {
      saving = false
    }
  }
</script>

<section class="apf-section">
  <div class="apf-header">
    <h2>เพิ่ม Paper ใหม่</h2>
    <p class="subtitle">
      เพิ่มแบบเร็วเข้าคลัง — ระบบจะออกเลข # ให้อัตโนมัติ (ต่อจากเลขล่าสุดในคลัง ทุก domain ใช้ตัวนับเดียวกัน)
      ข้อมูลจะถูกเก็บแยกจาก papers.js ที่ผ่านการรีวิวแล้ว แนะนำให้ตรวจทานและย้ายเข้าคลังหลักภายหลัง
    </p>
  </div>

  <form class="apf-form" on:submit|preventDefault={submit}>
    <label class="field">
      <span>Domain</span>
      <select bind:value={domainId}>
        {#each domains as d}
          <option value={d.id}>D{d.id} — {d.fullLabel}</option>
        {/each}
      </select>
    </label>

    <label class="field">
      <span>Title *</span>
      <input type="text" bind:value={title} required />
    </label>

    <div class="field-row">
      <label class="field">
        <span>Authors *</span>
        <input type="text" bind:value={authors} required />
      </label>
      <label class="field narrow">
        <span>Year *</span>
        <input type="number" bind:value={year} required />
      </label>
    </div>

    <div class="field-row">
      <label class="field">
        <span>Venue *</span>
        <input type="text" bind:value={venue} required />
      </label>
      <label class="field narrow">
        <span>DOI</span>
        <input type="text" bind:value={doi} placeholder="10.xxxx/..." />
      </label>
    </div>

    <label class="field narrow">
      <span>Relevance (1-10) *</span>
      <input type="number" min="1" max="10" bind:value={score} required />
    </label>

    <label class="field">
      <span>What (สรุปสั้น)</span>
      <textarea rows="2" bind:value={what}></textarea>
    </label>
    <label class="field">
      <span>How (วิธีการ)</span>
      <textarea rows="2" bind:value={how}></textarea>
    </label>
    <label class="field">
      <span>Results</span>
      <textarea rows="2" bind:value={results}></textarea>
    </label>
    <label class="field">
      <span>Usage (จะอ้างอิงตรงไหน)</span>
      <textarea rows="2" bind:value={usage}></textarea>
    </label>
    <label class="field">
      <span>Tags (คั่นด้วยจุลภาค)</span>
      <input type="text" bind:value={tagsInput} placeholder="เช่น Baseline model, Real-world data" />
    </label>

    <label class="checkbox-field">
      <input type="checkbox" bind:checked={caution} />
      <span>⚠️ Cite with caution</span>
    </label>

    {#if error}<div class="msg error">{error}</div>{/if}
    {#if ok}<div class="msg ok">{ok}</div>{/if}

    <button class="submit-btn" type="submit" disabled={saving}>{saving ? 'กำลังบันทึก…' : 'เพิ่ม Paper'}</button>
  </form>
</section>

<style>
  .apf-section { display: flex; flex-direction: column; gap: 16px; max-width: 640px; }
  .apf-header h2 { font-size: 1.3rem; font-weight: 700; margin-bottom: 6px; }
  .subtitle { font-size: 0.82rem; color: var(--text2); line-height: 1.6; }

  .apf-form {
    display: flex; flex-direction: column; gap: 12px;
    background: var(--surface); border: 1px solid var(--border);
    border-radius: var(--radius2); padding: 20px;
  }

  .field { display: flex; flex-direction: column; gap: 6px; font-size: 0.8rem; color: var(--text2); flex: 1; }
  .field.narrow { max-width: 140px; }
  .field-row { display: flex; gap: 12px; flex-wrap: wrap; }

  .field input, .field select, .field textarea {
    padding: 8px 10px; background: var(--surface2);
    border: 1px solid var(--border); border-radius: var(--radius);
    color: var(--text); font-size: 0.85rem; outline: none;
    font-family: inherit; resize: vertical;
    transition: border-color var(--transition);
  }
  .field input:focus, .field select:focus, .field textarea:focus { border-color: var(--accent); }

  .checkbox-field {
    display: flex; align-items: center; gap: 8px;
    font-size: 0.82rem; color: var(--text2); cursor: pointer;
  }

  .msg { font-size: 0.78rem; padding: 8px 10px; border-radius: var(--radius); }
  .msg.error { color: var(--danger); background: var(--danger-bg); border: 1px solid var(--danger-border); }
  .msg.ok { color: var(--success); background: var(--success-bg); border: 1px solid var(--success-border); }

  .submit-btn {
    margin-top: 4px; padding: 10px 16px;
    background: var(--accent); border: none; border-radius: var(--radius);
    color: #fff; font-size: 0.88rem; font-weight: 600; cursor: pointer;
    transition: opacity var(--transition);
  }
  .submit-btn:hover { opacity: 0.9; }
  .submit-btn:disabled { opacity: 0.6; cursor: not-allowed; }
</style>
