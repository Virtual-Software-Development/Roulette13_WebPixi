// Sesión de admin de las vistas Admin (?preview=admin-*). LoginPage la abre con POST /auth/login:
// el backend deja el refresh token en una cookie HttpOnly (path /api, por host y no por puerto) y
// devuelve el access token, que se guarda solo en memoria. Al recargar, POST /auth/refresh lo
// recupera con esa cookie. Todos los endpoints del Admin exigen este token.
let accessToken: string | null = null
let refreshInFlight: Promise<boolean> | null = null

export class AdminAuthError extends Error {}

export type AdminLoginFailureReason = 'invalid-credentials' | 'not-admin' | 'unavailable'

export class AdminLoginFailure extends Error {
  readonly reason: AdminLoginFailureReason

  constructor(reason: AdminLoginFailureReason) {
    super(reason)
    this.reason = reason
  }
}

interface AccessTokenClaims {
  sub?: string
  role?: string
}

// Claims del access token (JWT) -- solo para leer el usuario y el rol; quien valida la firma es el
// backend.
function tokenClaims(token: string | null): AccessTokenClaims | null {
  const payload = token?.split('.')[1]
  if (!payload) return null
  try {
    const base64 = payload.replace(/-/g, '+').replace(/_/g, '/')
    return JSON.parse(atob(base64.padEnd(base64.length + ((4 - (base64.length % 4)) % 4), '=')))
  } catch {
    return null
  }
}

// Id del usuario de la sesión actual, o null sin sesión.
export function currentAdminUserId(): string | null {
  return tokenClaims(accessToken)?.sub ?? null
}

async function postLogout(): Promise<void> {
  try {
    await fetch('/api/auth/logout', { method: 'POST', credentials: 'same-origin' })
  } catch {
    // sin red: la cookie vence sola
  }
}

// Abre la sesión. Solo los admin entran al panel: una cuenta de cajero se cierra enseguida.
export async function loginAdmin(username: string, password: string): Promise<void> {
  let res: Response
  try {
    res = await fetch('/api/auth/login', {
      method: 'POST',
      credentials: 'same-origin',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: username.trim(), password }),
    })
  } catch {
    throw new AdminLoginFailure('unavailable')
  }
  // 400 = no pasa la validación (ej. contraseña de menos de 8): para el usuario es lo mismo.
  if (res.status === 400 || res.status === 401) throw new AdminLoginFailure('invalid-credentials')
  if (!res.ok) throw new AdminLoginFailure('unavailable')

  const token: string = (await res.json()).access_token
  if (tokenClaims(token)?.role !== 'admin') {
    await postLogout()
    throw new AdminLoginFailure('not-admin')
  }
  accessToken = token
}

// Cierra la sesión en el backend (revoca el refresh token y borra la cookie).
export async function logoutAdmin(): Promise<void> {
  accessToken = null
  await postLogout()
}

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

// true si hay (o se pudo recuperar con la cookie) una sesión.
export function restoreAdminSession(): Promise<boolean> {
  if (accessToken) return Promise.resolve(true)
  if (!refreshInFlight) refreshInFlight = postRefresh().finally(() => (refreshInFlight = null))
  return refreshInFlight
}

// true si hay una sesión de un usuario con rol admin.
export async function hasAdminSession(): Promise<boolean> {
  return (await restoreAdminSession()) && tokenClaims(accessToken)?.role === 'admin'
}

// JSON de una respuesta OK; si no, lanza con el `error` que manda el backend (apperror) o el status.
export async function readAdminJson<T>(res: Response, what: string): Promise<T> {
  if (!res.ok) {
    let message = `${what} failed: ${res.status}`
    try {
      const body = await res.json()
      if (body?.error) message = body.error
    } catch {
      // cuerpo no-JSON: queda el status
    }
    throw new Error(message)
  }
  return res.json()
}

// fetch a /api con el access token si lo hay; ante un 401 renueva una vez con la cookie y reintenta.
// Si sigue en 401 (sesión vencida), lanza AdminAuthError y la vista lo muestra como error de carga.
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
