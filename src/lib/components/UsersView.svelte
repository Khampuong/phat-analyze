<script>
  import { onMount } from 'svelte'
  import { listUsers, createUser, updateUser, resetUserPassword, resetUserTwoFactor, deleteUser } from '../auth.js'

  export let user // the signed-in user
  export let canWrite = false // users:write; managers can only look

  const ROLES = [
    { value: 'user', label: 'User: read only' },
    { value: 'manager', label: 'Manager: edit data, view users' },
    { value: 'admin', label: 'Admin: everything' },
  ]

  let users = []
  let error = ''
  let ok = ''
  let busy = null // id of the user an action is running on
  let pending = null // { id, action: 'password'|'2fa'|'delete' }
  let tempPassword = ''

  let newEmail = ''
  let newRole = 'user'
  let newPassword = ''
  let creating = false

  // 16 characters from an unambiguous alphabet: easy to read out to someone, hard to guess.
  function generatePassword() {
    const chars = 'abcdefghijkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789'
    const bytes = crypto.getRandomValues(new Uint32Array(16))
    return Array.from(bytes, (b) => chars[b % chars.length]).join('')
  }

  async function refresh() {
    try {
      users = await listUsers()
    } catch (e) {
      error = e.message
    }
  }
  onMount(refresh)

  async function act(id, fn, message) {
    error = ''
    ok = ''
    busy = id
    try {
      await fn()
      ok = message
      pending = null
      tempPassword = ''
      await refresh()
    } catch (e) {
      error = e.message
      await refresh() // e.g. put a rejected role change back in its select
    } finally {
      busy = null
    }
  }

  function ask(id, action) {
    pending = { id, action }
    tempPassword = action === 'password' ? generatePassword() : ''
    error = ''
    ok = ''
  }

  async function submitCreate() {
    error = ''
    ok = ''
    creating = true
    try {
      const created = await createUser(newEmail.trim(), newRole, newPassword)
      ok = `Created ${created.email}. Give them the temporary password. They'll set up 2FA and choose their own password at first sign-in.`
      newEmail = ''
      newRole = 'user'
      newPassword = ''
      await refresh()
    } catch (e) {
      error = e.message
    } finally {
      creating = false
    }
  }

  const fmt = (iso) => (iso ? new Date(iso).toLocaleString() : 'never')
</script>

<section class="manage users">
  <p class="intro">
    Every account must use two-factor authentication. An admin can't switch it off for anyone, only
    <strong>reset</strong> it, which makes the person set it up again at their next sign-in.
    {#if !canWrite}You can view users; only admins can change them.{/if}
  </p>

  {#if error}<div class="msg error">{error}</div>{/if}
  {#if ok}<div class="msg ok">{ok}</div>{/if}

  <div class="table-wrap">
    <table>
      <thead>
        <tr><th>Email</th><th>Role</th><th>Status</th><th>2FA</th><th>Last sign-in</th>{#if canWrite}<th>Actions</th>{/if}</tr>
      </thead>
      <tbody>
        {#each users as u (u.id)}
          {@const self = u.id === user.id}
          <tr class:disabled={u.status === 'disabled'}>
            <td>
              {u.email}
              {#if self}<span class="chip">you</span>{/if}
              {#if u.mustChangePassword}<span class="chip warn" title="Signed in with a temporary password and hasn't replaced it yet">temp password</span>{/if}
            </td>
            <td>
              {#if canWrite && !self}
                <select value={u.role} disabled={busy === u.id} on:change={(e) => act(u.id, () => updateUser(u.id, { role: e.target.value }), `${u.email} is now ${e.target.value}`)}>
                  {#each ROLES as r}<option value={r.value}>{r.value}</option>{/each}
                </select>
              {:else}
                <span class="chip role-{u.role}">{u.role}</span>
              {/if}
            </td>
            <td>
              {#if u.locked}<span class="chip danger" title="Too many wrong passwords. Resetting the password unlocks it.">locked</span>
              {:else if u.status === 'disabled'}<span class="chip danger">disabled</span>
              {:else}<span class="chip ok">active</span>{/if}
            </td>
            <td>{#if u.totpEnabled}<span class="chip ok">on</span> <span class="muted">{u.backupCodesRemaining} codes</span>{:else}<span class="chip warn">setup at next sign-in</span>{/if}</td>
            <td class="muted">{fmt(u.lastLoginAt)}</td>
            {#if canWrite}
              <td class="actions">
                {#if pending?.id === u.id}
                  {#if pending.action === 'password'}
                    <input class="temp" bind:value={tempPassword} aria-label="Temporary password" />
                    <button class="btn primary" disabled={busy === u.id} on:click={() => act(u.id, () => resetUserPassword(u.id, tempPassword), `Password reset for ${u.email}. Temporary password: ${tempPassword}`)}>Reset</button>
                  {:else if pending.action === '2fa'}
                    <span class="confirm">Reset 2FA and sign them out?</span>
                    <button class="btn danger" disabled={busy === u.id} on:click={() => act(u.id, () => resetUserTwoFactor(u.id), `2FA reset for ${u.email}. They'll set it up again at next sign-in.`)}>Reset 2FA</button>
                  {:else}
                    <span class="confirm">Delete this user?</span>
                    <button class="btn danger" disabled={busy === u.id} on:click={() => act(u.id, () => deleteUser(u.id), `Deleted ${u.email}`)}>Delete</button>
                  {/if}
                  <button class="btn" on:click={() => (pending = null)}>Cancel</button>
                {:else if !self}
                  {#if u.status === 'active'}
                    <button class="btn" disabled={busy === u.id} on:click={() => act(u.id, () => updateUser(u.id, { status: 'disabled' }), `Disabled ${u.email} and signed them out`)}>Disable</button>
                  {:else}
                    <button class="btn" disabled={busy === u.id} on:click={() => act(u.id, () => updateUser(u.id, { status: 'active' }), `Enabled ${u.email}`)}>Enable</button>
                  {/if}
                  <button class="btn" on:click={() => ask(u.id, 'password')}>Reset password</button>
                  <button class="btn" on:click={() => ask(u.id, '2fa')}>Reset 2FA</button>
                  <button class="btn ghost-danger" on:click={() => ask(u.id, 'delete')}>Delete</button>
                {:else}
                  <span class="muted">Use the account panel</span>
                {/if}
              </td>
            {/if}
          </tr>
        {/each}
      </tbody>
    </table>
  </div>

  {#if canWrite}
    <form class="create" on:submit|preventDefault={submitCreate}>
      <h3>Add a user</h3>
      <div class="create-row">
        <label class="f">
          <span>Email</span>
          <input type="email" bind:value={newEmail} autocomplete="off" required />
        </label>
        <label class="f">
          <span>Role</span>
          <select bind:value={newRole}>
            {#each ROLES as r}<option value={r.value}>{r.label}</option>{/each}
          </select>
        </label>
        <label class="f">
          <span>Temporary password</span>
          <div class="pw-row">
            <input bind:value={newPassword} autocomplete="new-password" required minlength="8" maxlength="128" />
            <button type="button" class="btn" on:click={() => (newPassword = generatePassword())}>Generate</button>
          </div>
        </label>
      </div>
      <button class="btn primary" type="submit" disabled={creating}>{creating ? 'Creating…' : 'Create user'}</button>
    </form>
  {/if}
</section>

<style>
  .users { display: flex; flex-direction: column; gap: 14px; max-width: 1100px; }
  .intro { font-size: 0.8rem; color: var(--text2); line-height: 1.6; }
  .table-wrap { overflow-x: auto; background: var(--surface); border: 1px solid var(--border); border-radius: var(--radius2); }
  table { width: 100%; border-collapse: collapse; font-size: 0.8rem; }
  th, td { padding: 8px 10px; border-bottom: 1px solid var(--border); text-align: left; vertical-align: middle; }
  th { font-size: 0.7rem; text-transform: uppercase; letter-spacing: 0.05em; color: var(--text3); background: var(--surface2); }
  tr:last-child td { border-bottom: none; }
  tr.disabled td { opacity: 0.6; }
  .actions { display: flex; gap: 6px; flex-wrap: wrap; align-items: center; }
  .muted { color: var(--text3); font-size: 0.74rem; }
  .confirm { font-size: 0.75rem; color: var(--danger); }
  .chip {
    display: inline-block; font-size: 0.66rem; font-weight: 700; padding: 1px 7px; border-radius: 99px;
    background: var(--surface3); color: var(--text3); text-transform: uppercase; letter-spacing: 0.03em; margin-left: 4px;
  }
  .chip.ok { background: var(--success-bg); color: var(--success); }
  .chip.warn { background: var(--tag-warn-bg); color: var(--tag-warn-text); }
  .chip.danger { background: var(--danger-bg); color: var(--danger); }
  .chip.role-admin { background: var(--accent-glow); color: var(--accent); }
  select, input {
    padding: 5px 8px; background: var(--surface2); border: 1px solid var(--border); border-radius: var(--radius);
    color: var(--text); font-size: 0.8rem; outline: none; font-family: inherit;
  }
  select:focus, input:focus { border-color: var(--accent); }
  .temp { width: 170px; font-family: ui-monospace, monospace; }

  .create {
    display: flex; flex-direction: column; gap: 12px; align-items: flex-start;
    background: var(--surface); border: 1px solid var(--border); border-radius: var(--radius2); padding: 16px;
  }
  h3 { font-size: 0.92rem; font-weight: 700; }
  .create-row { display: flex; gap: 12px; flex-wrap: wrap; width: 100%; }
  .f { display: flex; flex-direction: column; gap: 5px; font-size: 0.78rem; color: var(--text2); flex: 1; min-width: 200px; }
  .pw-row { display: flex; gap: 6px; }
  .pw-row input { flex: 1; font-family: ui-monospace, monospace; }
</style>
