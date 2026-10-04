<script>
  import { createEventDispatcher, onMount } from 'svelte'
  import { login } from '../auth.js'

  const dispatch = createEventDispatcher()

  let email = ''
  let password = ''
  let error = ''
  let loading = false
  let config = { title: 'Literature Review', subtitle: '', icon: '📚' }

  onMount(async () => {
    try {
      const res = await fetch('/api/config')
      if (res.ok) config = await res.json()
      document.title = config.title
    } catch {}
  })

  async function submit() {
    error = ''
    loading = true
    try {
      const user = await login(email, password)
      dispatch('success', user)
    } catch (e) {
      error = e.message
    } finally {
      loading = false
    }
  }
</script>

<div class="login-screen">
  <form class="login-card" on:submit|preventDefault={submit}>
    <div class="login-logo">
      <div class="logo-icon">{config.icon}</div>
      <div>
        <div class="logo-title">{config.title}</div>
        {#if config.subtitle}<div class="logo-sub">{config.subtitle}</div>{/if}
      </div>
    </div>

    <h1 class="login-heading">Sign in</h1>

    <label class="field">
      <span>Email</span>
      <input type="email" bind:value={email} autocomplete="username" required />
    </label>

    <label class="field">
      <span>Password</span>
      <input type="password" bind:value={password} autocomplete="current-password" required />
    </label>

    {#if error}
      <div class="login-error">{error}</div>
    {/if}

    <button class="login-btn" type="submit" disabled={loading}>
      {loading ? 'Signing in…' : 'Sign in'}
    </button>
  </form>
</div>

<style>
  .login-screen {
    min-height: 100vh;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 24px;
  }
  .login-card {
    width: 100%;
    max-width: 360px;
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: var(--radius2);
    padding: 28px;
    display: flex;
    flex-direction: column;
    gap: 14px;
  }
  .login-logo {
    display: flex;
    align-items: center;
    gap: 10px;
    padding-bottom: 14px;
    border-bottom: 1px solid var(--border);
  }
  .logo-icon { font-size: 1.6rem; }
  .logo-title { font-size: 0.88rem; font-weight: 700; color: var(--text); line-height: 1.2; }
  .logo-sub { font-size: 0.68rem; color: var(--text3); }
  .login-heading { font-size: 1.05rem; font-weight: 700; color: var(--text); margin-top: 2px; }

  .field { display: flex; flex-direction: column; gap: 6px; font-size: 0.78rem; color: var(--text2); }
  .field input {
    padding: 8px 10px;
    background: var(--surface2);
    border: 1px solid var(--border);
    border-radius: var(--radius);
    color: var(--text);
    font-size: 0.85rem;
    outline: none;
    transition: border-color var(--transition);
  }
  .field input:focus { border-color: var(--accent); }

  .login-error {
    font-size: 0.78rem;
    color: var(--danger);
    background: var(--danger-bg);
    border: 1px solid var(--danger-border);
    border-radius: var(--radius);
    padding: 8px 10px;
  }

  .login-btn {
    margin-top: 4px;
    padding: 9px 14px;
    background: var(--accent);
    border: none;
    border-radius: var(--radius);
    color: #fff;
    font-size: 0.85rem;
    font-weight: 600;
    cursor: pointer;
    transition: opacity var(--transition);
  }
  .login-btn:hover { opacity: 0.9; }
  .login-btn:disabled { opacity: 0.6; cursor: not-allowed; }
</style>
