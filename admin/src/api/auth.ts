import { apiFetch, clearSession, setSessionFromResponse } from './client'

export async function login(username: string, password: string): Promise<void> {
  // quick_money-backend mounts login at /api/v1/auth/login (see its
  // router.go); apiFetch/apiProxy prepend the rest of the path.
  let res: Response
  try {
    res = await apiFetch('/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password }),
    })
  } catch {
    // fetch itself threw -- the dev proxy/backend is down, not a bad password.
    throw new Error('Could not reach the server. Please try again in a moment.')
  }

  // 401/403 from the backend genuinely means wrong credentials. Anything else (502 from the dev
  // proxy when the backend is unreachable, a 500, ...) is an infrastructure problem and telling
  // the user "Invalid credentials" for that would send them second-guessing a password that was
  // never actually checked.
  if (res.status === 401 || res.status === 403) throw new Error('Invalid username or password.')
  if (!res.ok) throw new Error('Could not reach the server. Please try again in a moment.')

  // The refresh token arrives as an HttpOnly cookie set by this same response; only the
  // short-lived access token is in the body.
  setSessionFromResponse(await res.json())
}

export async function logout(): Promise<void> {
  clearSession()
  try {
    // Revokes the refresh token server-side and clears the cookie.
    await apiFetch('/auth/logout', { method: 'POST' })
  } catch {
    // Backend unreachable: the cookie still expires on its own after the inactivity window.
  }
}
