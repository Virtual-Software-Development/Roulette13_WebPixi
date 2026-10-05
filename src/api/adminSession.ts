// Sesión de admin para las vistas Admin de ESTA app (?preview=admin-*), que hasta ahora solo usaban
// endpoints públicos. Mismo flujo que el admin real (admin/src/api/client.ts): POST /auth/login
// devuelve el access token (solo en memoria, nunca en localStorage) y deja el refresh token en una
// cookie HttpOnly; con esa cookie POST /auth/refresh renueva el access token en silencio. Como la
// cookie es por host (no por puerto), una sesión abierta en el admin real también sirve acá.
let accessToken: string | null = null
let refreshInFlight: Promise<boolean> | null = null

export class AdminAuthError extends Error {}

async function postRefresh(): Promise<boolean> {
  try {
    const res = await fetch('/api/auth/refresh', { method: 'POST', credentials: 'same-origin' })
    if (!res.ok) {
      accessToken = null
      return false
    }
    accessToken = (await res.json()).access_token
    return true
  } catch {
    return false
  }
}

// true si hay (o se pudo recuperar con la cookie) una sesión de admin.
export function restoreAdminSession(): Promise<boolean> {
  if (accessToken) return Promise.resolve(true)
  if (!refreshInFlight) refreshInFlight = postRefresh().finally(() => (refreshInFlight = null))
  return refreshInFlight
}

export async function adminLogin(username: string, password: string): Promise<void> {
  let res: Response
  try {
    res = await fetch('/api/auth/login', {
      method: 'POST',
      credentials: 'same-origin',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password }),
    })
  } catch {
    throw new Error('Could not reach the server. Please try again in a moment.')
  }
  if (res.status === 401 || res.status === 403) throw new AdminAuthError('Invalid username or password.')
  if (!res.ok) throw new Error('Could not reach the server. Please try again in a moment.')
  accessToken = (await res.json()).access_token
}

// fetch a /api con el access token; ante un 401 renueva una vez con la cookie y reintenta. Si aun
// así no hay sesión, lanza AdminAuthError para que la vista vuelva a pedir login.
export async function adminFetch(path: string, init: RequestInit = {}): Promise<Response> {
  const send = () => {
    const headers = new Headers(init.headers)
    if (accessToken) headers.set('Authorization', `Bearer ${accessToken}`)
    return fetch(`/api${path}`, { credentials: 'same-origin', ...init, headers })
  }
  let res = await send()
  if (res.status === 401) {
    accessToken = null
    if (!(await restoreAdminSession())) throw new AdminAuthError('Session expired.')
    res = await send()
    if (res.status === 401) throw new AdminAuthError('Session expired.')
  }
  return res
}
