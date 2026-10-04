<script>
  // Shows freshly issued backup codes once. They are never stored in plain text on the server,
  // so this is the only time anyone can see them.
  export let codes = []

  let copied = false

  function copyAll() {
    navigator.clipboard?.writeText(codes.join('\n'))
    copied = true
    setTimeout(() => (copied = false), 2000)
  }

  function download() {
    const blob = new Blob([`Backup codes (each works once)\n\n${codes.join('\n')}\n`], { type: 'text/plain' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = 'backup-codes.txt'
    a.click()
    URL.revokeObjectURL(a.href)
  }
</script>

<div class="bc">
  <ol class="bc-grid">
    {#each codes as code}<li>{code}</li>{/each}
  </ol>
  <div class="bc-actions">
    <button type="button" class="bc-btn" on:click={copyAll}>{copied ? 'Copied ✓' : 'Copy all'}</button>
    <button type="button" class="bc-btn" on:click={download}>Download .txt</button>
  </div>
</div>

<style>
  .bc { display: flex; flex-direction: column; gap: 10px; }
  .bc-grid {
    list-style: none; display: grid; grid-template-columns: 1fr 1fr; gap: 6px;
    font-family: ui-monospace, monospace; font-size: 0.86rem;
  }
  .bc-grid li {
    text-align: center; padding: 6px; background: var(--surface2);
    border: 1px solid var(--border); border-radius: var(--radius); color: var(--text);
  }
  .bc-actions { display: flex; gap: 8px; }
  .bc-btn {
    flex: 1; padding: 6px 10px; background: var(--surface2); border: 1px solid var(--border);
    border-radius: var(--radius); color: var(--text2); font-size: 0.76rem; cursor: pointer;
  }
  .bc-btn:hover { border-color: var(--accent); color: var(--text); }
</style>
