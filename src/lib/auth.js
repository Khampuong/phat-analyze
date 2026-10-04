async function request(url, options) {
  const res = await fetch(url, {
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    ...options,
  })
  let data = null
  try {
    data = await res.json()
  } catch {
    data = null
  }
  if (!res.ok) {
    throw new Error((data && data.error) || `Request failed (${res.status})`)
  }
  return data
}

export const me = () => request('/api/auth/me').catch(() => null)

export const fetchAppData = () => request('/api/app-data')

export const login = (email, password) =>
  request('/api/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) })

export const logout = () => request('/api/auth/logout', { method: 'POST' })

export const changePassword = (currentPassword, newPassword) =>
  request('/api/auth/change-password', {
    method: 'POST',
    body: JSON.stringify({ currentPassword, newPassword }),
  })

export const listUsers = () => request('/api/users')

export const createUser = (email, password, role) =>
  request('/api/users', { method: 'POST', body: JSON.stringify({ email, password, role }) })

export const deleteUser = (email) =>
  request(`/api/users/${encodeURIComponent(email)}`, { method: 'DELETE' })

export const saveCollection = (name, value) =>
  request(`/api/data/${name}`, { method: 'PUT', body: JSON.stringify(value) })
