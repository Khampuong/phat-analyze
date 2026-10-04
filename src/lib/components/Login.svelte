<script>
  import { createEventDispatcher, onMount, tick } from 'svelte'
  import { login, startTwoFactorSetup, confirmTwoFactorSetup, verifyTwoFactor } from '../auth.js'
  import BackupCodes from './BackupCodes.svelte'

  // Sign-in always has two factors: step 'password', then 'setup' (first time, or after an admin
  // reset) or 'verify'. After setup the new backup codes are shown once ('backup').
  const dispatch = createEventDispatcher()

  let step = 'password'
  let email = ''
  let password = ''
  let code = ''
  let error = ''
  let loading = false
  let setup = null // { qrCodeDataUrl, secret }
  let backupCodes = []
  let signedInUser = null
  let useBackupCode = false
  let codeInput
  let config = { title: 'Literature Review', subtitle: '', icon: '📚' }

  onMount(async () => {
    try {
      const res = await fetch('/api/config')
      if (res.ok) config = await res.json()
      document.title = config.title
    } catch {}
  })

  function restart(message = '') {
    step = 'password'
    password = ''
    code = ''
    setup = null
    useBackupCode = false
    error = message
  }

  async function run(fn) {
    error = ''
    loading = true
    try {
      await fn()
    } catch (e) {
      // 401 here means the 5-minute sign-in step expired: go back to the password.
      if (e.status === 401 && step !== 'password') restart(e.message)
      else error = e.message
    } finally {
      loading = false
    }
  }

  const submitPassword = () => run(async () => {
    const { stage, user } = await login(email, password)
    password = ''
    if (stage === 'complete') return dispatch('success', user) // REQUIRE_2FA=false on the server
    if (stage === 'setup_required') {
      step = 'setup'
      setup = await startTwoFactorSetup()
    } else {
      step = 'verify'
    }
    await tick()
    codeInput?.focus()
  })

  const submitSetup = () => run(async () => {
    const result = await confirmTwoFactorSetup(code.trim())
    backupCodes = result.backupCodes
    signedInUser = result.user
    step = 'backup'
  })

  const submitVerify = () => run(async () => {
    const result = await verifyTwoFactor(code.trim())
    dispatch('success', result.user)
  })
</script>

<div class="auth-screen">
  <div class="auth-card" class:wide={step === 'setup' || step === 'backup'}>
    <div class="auth-logo">
      <div class="logo-icon">{config.icon}</div>
      <div>
        <div class="logo-title">{config.title}</div>
        {#if config.subtitle}<div class="logo-sub">{config.subtitle}</div>{/if}
      </div>
    </div>

    {#if step === 'password'}
      <form class="stack" on:submit|preventDefault={submitPassword}>
        <h1 class="auth-heading">Sign in</h1>
        <label class="auth-field">
          <span>Email</span>
          <input type="email" bind:value={email} autocomplete="username" required />
        </label>
        <label class="auth-field">
          <span>Password</span>
          <input type="password" bind:value={password} autocomplete="current-password" required maxlength="128" />
        </label>
        {#if error}<div class="auth-error">{error}</div>{/if}
        <button class="auth-btn" type="submit" disabled={loading}>{loading ? 'Signing in…' : 'Continue'}</button>
      </form>

    {:else if step === 'setup'}
      <form class="stack" on:submit|preventDefault={submitSetup}>
        <h1 class="auth-heading">Set up two-factor authentication</h1>
        <p class="auth-text">
          Every account needs a second factor. Scan this QR code with an authenticator app
          (Google Authenticator, Microsoft Authenticator, Authy, 1Password, …), then enter the
          6-digit code it shows.
        </p>
        {#if setup}
          <img class="qr" src={setup.qrCodeDataUrl} alt="QR code for your authenticator app" width="200" height="200" />
          <p class="auth-text center">Can't scan it? Enter this key in the app instead:</p>
          <div class="secret-box">{setup.secret}</div>
        {:else}
          <p class="auth-text">Generating your key…</p>
        {/if}
        <label class="auth-field">
          <span>6-digit code</span>
          <input class="code" bind:this={codeInput} bind:value={code} inputmode="numeric" autocomplete="one-time-code" maxlength="6" required />
        </label>
        {#if error}<div class="auth-error">{error}</div>{/if}
        <button class="auth-btn" type="submit" disabled={loading || !setup}>{loading ? 'Checking…' : 'Turn on 2FA'}</button>
        <button type="button" class="auth-link" on:click={() => restart()}>Cancel</button>
      </form>

    {:else if step === 'verify'}
      <form class="stack" on:submit|preventDefault={submitVerify}>
        <h1 class="auth-heading">Two-factor authentication</h1>
        {#if useBackupCode}
          <p class="auth-text">Enter one of your backup codes. Each code works only once.</p>
          <label class="auth-field">
            <span>Backup code</span>
            <input class="code" bind:this={codeInput} bind:value={code} autocomplete="off" maxlength="9" placeholder="XXXX-XXXX" required />
          </label>
        {:else}
          <p class="auth-text">Enter the 6-digit code from your authenticator app.</p>
          <label class="auth-field">
            <span>6-digit code</span>
            <input class="code" bind:this={codeInput} bind:value={code} inputmode="numeric" autocomplete="one-time-code" maxlength="6" required />
          </label>
        {/if}
        {#if error}<div class="auth-error">{error}</div>{/if}
        <button class="auth-btn" type="submit" disabled={loading}>{loading ? 'Checking…' : 'Verify'}</button>
        <button type="button" class="auth-link" on:click={() => { useBackupCode = !useBackupCode; code = ''; error = '' }}>
          {useBackupCode ? 'Use the authenticator app instead' : 'Lost your phone? Use a backup code'}
        </button>
        <button type="button" class="auth-link" on:click={() => restart()}>Back to sign in</button>
      </form>

    {:else if step === 'backup'}
      <div class="stack">
        <h1 class="auth-heading">Save your backup codes</h1>
        <p class="auth-text">
          2FA is on. If you lose your phone, each of these codes lets you sign in once. Store them
          somewhere safe. <strong>You won't see them again</strong>, but you can make a new set from
          your account panel.
        </p>
        <BackupCodes codes={backupCodes} />
        <button class="auth-btn" on:click={() => dispatch('success', signedInUser)}>I've saved them, continue</button>
      </div>
    {/if}
  </div>
</div>

<style>
  .stack { display: flex; flex-direction: column; gap: 14px; }
  .qr { align-self: center; border-radius: var(--radius); background: #fff; padding: 6px; }
  .center { text-align: center; }
</style>
