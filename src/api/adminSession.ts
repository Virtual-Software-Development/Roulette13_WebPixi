// Sesión de admin OPCIONAL para las vistas Admin de ESTA app (?preview=admin-*). Esta app no tiene
// login propio: Next Results usa endpoints públicos, y si hay una sesión abierta en el admin real
// (admin/src/api/client.ts) se aprovecha solo para que el backend audite quién leyó o cambió el
// resultado. Esa sesión deja el refresh token en una cookie HttpOnly por host (no por puerto); con
// ella POST /auth/refresh devuelve el access token, que se guarda solo en memoria.
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

// fetch a /api con el access token si lo hay; ante un 401 renueva una vez con la cookie y reintenta.
// Con las rutas públicas de Next Results no debería haber 401 -- si lo hay (p.ej. un backend sin
// esas rutas públicas todavía), lanza AdminAuthError y la vista lo muestra como error de carga.
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
