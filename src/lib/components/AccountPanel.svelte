<script>
  import { createEventDispatcher } from 'svelte'
  import { changePassword, regenerateBackupCodes } from '../auth.js'
  import BackupCodes from './BackupCodes.svelte'

  export let user

  const dispatch = createEventDispatcher()

  let currentPassword = ''
  let nextPassword = ''
  let confirmPassword = ''
  let pwError = ''
  let pwOk = ''
  let pwSaving = false

  let newCodes = []
  let codesError = ''
  let confirmingCodes = false
  let codesSaving = false

  async function submitPasswordChange() {
    pwError = ''
    pwOk = ''
    if (nextPassword !== confirmPassword) {
      pwError = 'New passwords do not match'
      return
    }
    pwSaving = true
    try {
      const updated = await changePassword(currentPassword, nextPassword)
      pwOk = 'Password updated. Your other sessions were signed out.'
      currentPassword = ''
      nextPassword = ''
      confirmPassword = ''
      dispatch('updated', updated)
    } catch (e) {
      pwError = e.message
    } finally {
      pwSaving = false
    }
  }

  async function makeNewCodes() {
    codesError = ''
    codesSaving = true
    try {
      newCodes = (await regenerateBackupCodes()).backupCodes
      confirmingCodes = false
      dispatch('updated', { ...user, backupCodesRemaining: newCodes.length })
    } catch (e) {
      codesError = e.message
    } finally {
      codesSaving = false
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
      <button class="close-btn" on:click={() => dispatch('close')} aria-label="Close">✕</button>
    </div>

    <section class="section">
      <div class="section-title">Signed in as</div>
      <div class="you-row">
        <span class="you-email">{user.email}</span>
        <span class="role-badge" class:admin={user.role === 'admin'}>{user.role}</span>
      </div>
    </section>

    {#if user.twoFactorRequired === false}
    <section class="section">
      <div class="section-title">Two-factor authentication</div>
      <p class="hint">Off for this install (REQUIRE_2FA=false). Sign-in needs only your password.</p>
    </section>
    {:else}
    <section class="section">
      <div class="section-title">Two-factor authentication</div>
      <div class="you-row">
        <span>✓ On (authenticator app)</span>
        <span class="muted">{user.backupCodesRemaining} backup codes left</span>
      </div>
      {#if newCodes.length}
        <p class="hint">Your new backup codes. The old ones no longer work. Save these now; they won't be shown again.</p>
        <BackupCodes codes={newCodes} />
      {:else if confirmingCodes}
        <p class="hint">This replaces all your current backup codes.</p>
        <div class="row">
          <button class="btn" on:click={makeNewCodes} disabled={codesSaving}>{codesSaving ? 'Creating…' : 'Create new codes'}</button>
          <button class="btn ghost" on:click={() => (confirmingCodes = false)}>Cancel</button>
        </div>
      {:else}
        <button class="btn ghost" on:click={() => (confirmingCodes = true)}>New backup codes</button>
      {/if}
      {#if codesError}<div class="msg error">{codesError}</div>{/if}
      <p class="hint">Lost your authenticator app and your backup codes? Ask an admin to reset your 2FA, then set it up again at your next sign-in.</p>
    </section>
    {/if}

    <section class="section">
      <div class="section-title">Change my password</div>
      <form class="stacked-form" on:submit|preventDefault={submitPasswordChange}>
        <input type="password" placeholder="Current password" bind:value={currentPassword} autocomplete="current-password" required maxlength="128" />
        <input type="password" placeholder="New password (8–128 characters)" bind:value={nextPassword} autocomplete="new-password" required minlength="8" maxlength="128" />
        <input type="password" placeholder="Confirm new password" bind:value={confirmPassword} autocomplete="new-password" required minlength="8" maxlength="128" />
        {#if pwError}<div class="msg error">{pwError}</div>{/if}
        {#if pwOk}<div class="msg ok">{pwOk}</div>{/if}
        <button class="btn" type="submit" disabled={pwSaving}>{pwSaving ? 'Saving…' : 'Update password'}</button>
      </form>
    </section>
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
  .hint { font-size: 0.74rem; color: var(--text3); line-height: 1.5; }
  .muted { color: var(--text3); font-size: 0.74rem; }
  .row { display: flex; gap: 8px; }

  .you-row {
    display: flex; align-items: center; justify-content: space-between; gap: 8px;
    padding: 8px 10px; background: var(--surface2); border-radius: var(--radius);
    font-size: 0.82rem; color: var(--text);
  }
  .you-email { color: var(--text); overflow: hidden; text-overflow: ellipsis; }
  .role-badge {
    font-size: 0.66rem; font-weight: 700; text-transform: uppercase;
    padding: 2px 8px; border-radius: 99px; letter-spacing: 0.04em;
    background: var(--surface3); color: var(--text3);
  }
  .role-badge.admin { background: var(--accent-glow); color: var(--accent); }

  .stacked-form { display: flex; flex-direction: column; gap: 8px; }
  .stacked-form input {
    padding: 8px 10px; background: var(--surface2);
    border: 1px solid var(--border); border-radius: var(--radius);
    color: var(--text); font-size: 0.83rem; outline: none;
  }
  .stacked-form input:focus { border-color: var(--accent); }

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
  .btn.ghost { background: var(--surface2); color: var(--text2); border: 1px solid var(--border); font-weight: 500; }
</style>
