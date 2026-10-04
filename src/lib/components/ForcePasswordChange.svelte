<script>
  import { createEventDispatcher } from 'svelte'
  import { changePassword } from '../auth.js'

  // Shown after sign-in when an admin created the account or reset its password: the temporary
  // password has to be replaced before anything else. The server blocks every other API call until then.
  export let user

  const dispatch = createEventDispatcher()

  let currentPassword = ''
  let newPassword = ''
  let confirmPassword = ''
  let error = ''
  let saving = false

  async function submit() {
    error = ''
    if (newPassword !== confirmPassword) {
      error = 'The new passwords do not match'
      return
    }
    saving = true
    try {
      dispatch('changed', await changePassword(currentPassword, newPassword))
    } catch (e) {
      error = e.message
    } finally {
      saving = false
    }
  }
</script>

<div class="auth-screen">
  <form class="auth-card" on:submit|preventDefault={submit}>
    <h1 class="auth-heading">Choose a new password</h1>
    <p class="auth-text">
      You signed in as <strong>{user.email}</strong> with a temporary password. Choose your own
      password to continue.
    </p>
    <label class="auth-field">
      <span>Temporary password</span>
      <input type="password" bind:value={currentPassword} autocomplete="current-password" required maxlength="128" />
    </label>
    <label class="auth-field">
      <span>New password (8–128 characters)</span>
      <input type="password" bind:value={newPassword} autocomplete="new-password" required minlength="8" maxlength="128" />
    </label>
    <label class="auth-field">
      <span>Confirm new password</span>
      <input type="password" bind:value={confirmPassword} autocomplete="new-password" required minlength="8" maxlength="128" />
    </label>
    {#if error}<div class="auth-error">{error}</div>{/if}
    <button class="auth-btn" type="submit" disabled={saving}>{saving ? 'Saving…' : 'Save password'}</button>
    <button type="button" class="auth-link" on:click={() => dispatch('logout')}>Sign out</button>
  </form>
</div>
