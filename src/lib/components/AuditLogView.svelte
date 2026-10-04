<script>
  import { onMount } from 'svelte'
  import { listAuditEvents } from '../auth.js'

  let events = []
  let error = ''
  let loading = true
  let filter = ''

  const LABELS = {
    login_failed: 'Wrong password',
    login_locked: 'Account locked',
    login_disabled: 'Sign-in to disabled account',
    login_success: 'Signed in (password only, 2FA off)',
    login_password_verified: 'Password OK, 2FA pending',
    '2fa_setup_complete': '2FA set up',
    '2fa_setup_failed': '2FA setup code wrong',
    '2fa_verify_success': 'Signed in (2FA)',
    '2fa_verify_failed': '2FA code wrong',
    '2fa_backup_code_used': 'Signed in with backup code',
    password_changed: 'Password changed',
    backup_codes_regenerated: 'New backup codes',
    admin_user_created: 'User created',
    admin_user_updated: 'User role/status changed',
    admin_user_deleted: 'User deleted',
    admin_password_reset: 'Password reset by admin',
    admin_2fa_reset: '2FA reset by admin',
    data_saved: 'Data saved',
    discover_search: 'Perplexity search',
  }
  const DANGER = new Set(['login_failed', 'login_locked', 'login_disabled', '2fa_setup_failed', '2fa_verify_failed'])

  async function refresh() {
    loading = true
    try {
      events = await listAuditEvents()
      error = ''
    } catch (e) {
      error = e.message
    } finally {
      loading = false
    }
  }
  onMount(refresh)

  const details = (m) => (m ? Object.entries(m).filter(([, v]) => v !== undefined).map(([k, v]) => `${k}: ${v}`).join(' · ') : '')

  $: q = filter.trim().toLowerCase()
  $: shown = events.filter((e) => !q || JSON.stringify(e).toLowerCase().includes(q))
</script>

<section class="manage audit">
  <div class="bar">
    <input type="text" placeholder="Filter by email, event, IP…" bind:value={filter} />
    <button class="btn" on:click={refresh} disabled={loading}>{loading ? 'Loading…' : 'Refresh'}</button>
    <span class="muted">Newest first · last 300 events</span>
  </div>
  {#if error}<div class="msg error">{error}</div>{/if}
  <div class="table-wrap">
    <table>
      <thead><tr><th>Time</th><th>Event</th><th>Who</th><th>IP</th><th>Details</th></tr></thead>
      <tbody>
        {#each shown as e}
          <tr>
            <td class="muted nowrap">{e.at ? new Date(e.at).toLocaleString() : ''}</td>
            <td class:danger={DANGER.has(e.event)}>{LABELS[e.event] || e.event}</td>
            <td>{e.actor ?? ''}</td>
            <td class="muted">{e.ip ?? ''}</td>
            <td class="muted">{details(e.metadata)}</td>
          </tr>
        {:else}
          <tr><td colspan="5" class="muted">{loading ? 'Loading…' : 'No events'}</td></tr>
        {/each}
      </tbody>
    </table>
  </div>
</section>

<style>
  .audit { display: flex; flex-direction: column; gap: 12px; max-width: 1100px; }
  .bar { display: flex; gap: 8px; align-items: center; flex-wrap: wrap; }
  .bar input {
    flex: 1; min-width: 200px; max-width: 360px; padding: 6px 10px; background: var(--surface2);
    border: 1px solid var(--border); border-radius: var(--radius); color: var(--text); font-size: 0.82rem; outline: none;
  }
  .bar input:focus { border-color: var(--accent); }
  .muted { color: var(--text3); font-size: 0.74rem; }
  .nowrap { white-space: nowrap; }
  .danger { color: var(--danger); font-weight: 600; }
  .table-wrap { overflow-x: auto; background: var(--surface); border: 1px solid var(--border); border-radius: var(--radius2); }
  table { width: 100%; border-collapse: collapse; font-size: 0.8rem; }
  th, td { padding: 7px 10px; border-bottom: 1px solid var(--border); text-align: left; }
  th { font-size: 0.7rem; text-transform: uppercase; letter-spacing: 0.05em; color: var(--text3); background: var(--surface2); }
  tr:last-child td { border-bottom: none; }
</style>
