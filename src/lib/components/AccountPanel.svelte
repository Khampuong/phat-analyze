<script>
  import { createEventDispatcher, onMount } from 'svelte'
  import { listUsers, createUser, deleteUser, changePassword } from '../auth.js'

  export let user

  const dispatch = createEventDispatcher()

  let users = []
  let usersError = ''
  let confirmingEmail = null
  let deleteError = ''
  let deletingEmail = null

  $: adminCount = users.filter((u) => u.role === 'admin').length

  let newEmail = ''
  let newPassword = ''
  let newRole = 'user'
  let createError = ''
  let createOk = ''
  let creating = false

  let currentPassword = ''
  let nextPassword = ''
  let confirmPassword = ''
  let pwError = ''
  let pwOk = ''
  let pwSaving = false

  async function refreshUsers() {
    if (user.role !== 'admin') return
    try {
      users = await listUsers()
    } catch (e) {
      usersError = e.message
    }
  }

  onMount(refreshUsers)

  async function submitCreate() {
    createError = ''
    createOk = ''
    creating = true
    try {
      await createUser(newEmail, newPassword, newRole)
      createOk = `Created ${newEmail}`
      newEmail = ''
      newPassword = ''
      newRole = 'user'
      await refreshUsers()
    } catch (e) {
      createError = e.message
    } finally {
      creating = false
    }
  }

  function askDelete(email) {
    deleteError = ''
    confirmingEmail = email
  }

  function cancelDelete() {
    confirmingEmail = null
  }

  async function confirmDelete(email) {
    deleteError = ''
    deletingEmail = email
    try {
      await deleteUser(email)
      confirmingEmail = null
      await refreshUsers()
    } catch (e) {
      deleteError = e.message
    } finally {
      deletingEmail = null
    }
  }

  async function submitPasswordChange() {
    pwError = ''
    pwOk = ''
    if (nextPassword !== confirmPassword) {
      pwError = 'New passwords do not match'
      return
    }
    pwSaving = true
    try {
      await changePassword(currentPassword, nextPassword)
      pwOk = 'Password updated'
      currentPassword = ''
      nextPassword = ''
      confirmPassword = ''
    } catch (e) {
      pwError = e.message
    } finally {
      pwSaving = false
    }
  }
</script>

<svelte:window on:keydown={(e) => e.key === 'Escape' && dispatch('close')} />

<!-- svelte-ignore a11y-click-events-have-key-events -->
<!-- svelte-ignore a11y-no-static-element-interactions -->
<div class="overlay" on:click|self={() => dispatch('close')}>
  <div class="panel">
    <div class="panel-header">
      <h2>Account</h2>
      <button class="close-btn" on:click={() => dispatch('close')}>✕</button>
    </div>

    <section class="section">
      <div class="section-title">Signed in as</div>
      <div class="you-row">
        <span class="you-email">{user.email}</span>
        <span class="role-badge" class:admin={user.role === 'admin'}>{user.role}</span>
      </div>
    </section>

    <section class="section">
      <div class="section-title">Change my password</div>
      <form class="stacked-form" on:submit|preventDefault={submitPasswordChange}>
        <input type="password" placeholder="Current password" bind:value={currentPassword} autocomplete="current-password" required />
        <input type="password" placeholder="New password (min 8 chars)" bind:value={nextPassword} autocomplete="new-password" required minlength="8" />
        <input type="password" placeholder="Confirm new password" bind:value={confirmPassword} autocomplete="new-password" required minlength="8" />
        {#if pwError}<div class="msg error">{pwError}</div>{/if}
        {#if pwOk}<div class="msg ok">{pwOk}</div>{/if}
        <button class="btn" type="submit" disabled={pwSaving}>{pwSaving ? 'Saving…' : 'Update password'}</button>
      </form>
    </section>

    {#if user.role === 'admin'}
      <section class="section">
        <div class="section-title">Users ({users.length})</div>
        {#if usersError}
          <div class="msg error">{usersError}</div>
        {:else}
          <ul class="user-list">
            {#each users as u}
              {@const isSelf = u.email.toLowerCase() === user.email.toLowerCase()}
              {@const isLastAdmin = u.role === 'admin' && adminCount <= 1}
              <li>
                <span class="you-email">{u.email}</span>
                <span class="row-right">
                  <span class="role-badge" class:admin={u.role === 'admin'}>{u.role}</span>
                  {#if confirmingEmail === u.email}
                    <button class="mini-btn danger" on:click={() => confirmDelete(u.email)} disabled={deletingEmail === u.email}>
                      {deletingEmail === u.email ? '...' : 'ยืนยันลบ'}
                    </button>
                    <button class="mini-btn" on:click={cancelDelete} disabled={deletingEmail === u.email}>ยกเลิก</button>
                  {:else if isSelf}
                    <span class="mini-hint" title="ลบบัญชีตัวเองไม่ได้ตอนที่ยัง sign in อยู่">คุณ</span>
                  {:else if isLastAdmin}
                    <span class="mini-hint" title="ต้องมี admin เหลืออย่างน้อย 1 คน">admin คนสุดท้าย</span>
                  {:else}
                    <button class="mini-btn danger" on:click={() => askDelete(u.email)}>ลบ</button>
                  {/if}
                </span>
              </li>
            {/each}
          </ul>
          {#if deleteError}<div class="msg error">{deleteError}</div>{/if}
        {/if}
      </section>

      <section class="section">
        <div class="section-title">Add a user</div>
        <form class="stacked-form" on:submit|preventDefault={submitCreate}>
          <input type="email" placeholder="Email" bind:value={newEmail} autocomplete="off" required />
          <input type="password" placeholder="Password (min 8 chars)" bind:value={newPassword} autocomplete="new-password" required minlength="8" />
          <select bind:value={newRole}>
            <option value="user">User</option>
            <option value="admin">Admin</option>
          </select>
          {#if createError}<div class="msg error">{createError}</div>{/if}
          {#if createOk}<div class="msg ok">{createOk}</div>{/if}
          <button class="btn" type="submit" disabled={creating}>{creating ? 'Creating…' : 'Create user'}</button>
        </form>
      </section>
    {/if}
  </div>
</div>

<style>
  .overlay {
    position: fixed; inset: 0; background: rgba(0,0,0,0.5);
    display: flex; align-items: flex-start; justify-content: center;
    padding: 60px 20px; z-index: 100; overflow-y: auto;
  }
  .panel {
    width: 100%; max-width: 420px;
    background: var(--surface); border: 1px solid var(--border);
    border-radius: var(--radius2); padding: 20px;
    display: flex; flex-direction: column; gap: 18px;
  }
  .panel-header { display: flex; align-items: center; justify-content: space-between; }
  .panel-header h2 { font-size: 1rem; color: var(--text); font-weight: 700; }
  .close-btn { background: none; border: none; color: var(--text3); font-size: 0.9rem; cursor: pointer; }
  .close-btn:hover { color: var(--text); }

  .section { display: flex; flex-direction: column; gap: 10px; }
  .section-title { font-size: 0.7rem; font-weight: 700; color: var(--text3); text-transform: uppercase; letter-spacing: 0.06em; }

  .you-row, .user-list li {
    display: flex; align-items: center; justify-content: space-between;
    padding: 8px 10px; background: var(--surface2); border-radius: var(--radius);
    font-size: 0.82rem;
  }
  .user-list { list-style: none; display: flex; flex-direction: column; gap: 6px; }
  .you-email { color: var(--text); }
  .role-badge {
    font-size: 0.66rem; font-weight: 700; text-transform: uppercase;
    padding: 2px 8px; border-radius: 99px; letter-spacing: 0.04em;
    background: var(--surface3); color: var(--text3);
  }
  .role-badge.admin { background: var(--accent-glow); color: var(--accent); }

  .row-right { display: flex; align-items: center; gap: 6px; flex-shrink: 0; }
  .mini-hint { font-size: 0.68rem; color: var(--text3); font-style: italic; white-space: nowrap; }
  .mini-btn {
    padding: 3px 8px; background: var(--surface3); border: 1px solid var(--border);
    border-radius: var(--radius); color: var(--text2); font-size: 0.68rem; font-weight: 600;
    cursor: pointer; transition: all var(--transition); white-space: nowrap;
  }
  .mini-btn:hover { border-color: var(--accent); color: var(--text); }
  .mini-btn:disabled { opacity: 0.6; cursor: not-allowed; }
  .mini-btn.danger { color: var(--danger); border-color: var(--danger-border); background: var(--danger-bg); }
  .mini-btn.danger:hover { filter: brightness(1.1); }

  .stacked-form { display: flex; flex-direction: column; gap: 8px; }
  .stacked-form input, .stacked-form select {
    padding: 8px 10px; background: var(--surface2);
    border: 1px solid var(--border); border-radius: var(--radius);
    color: var(--text); font-size: 0.83rem; outline: none;
  }
  .stacked-form input:focus, .stacked-form select:focus { border-color: var(--accent); }

  .msg { font-size: 0.76rem; padding: 6px 9px; border-radius: var(--radius); }
  .msg.error { color: var(--danger); background: var(--danger-bg); border: 1px solid var(--danger-border); }
  .msg.ok { color: var(--success); background: var(--success-bg); border: 1px solid var(--success-border); }

  .btn {
    padding: 8px 14px; background: var(--accent); border: none;
    border-radius: var(--radius); color: #fff; font-size: 0.83rem;
    font-weight: 600; cursor: pointer; transition: opacity var(--transition);
  }
  .btn:hover { opacity: 0.9; }
  .btn:disabled { opacity: 0.6; cursor: not-allowed; }
</style>
