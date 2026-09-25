// The access token lives only in memory. It used to be persisted in localStorage, so every page
// load went straight to the dashboard with a stale token. The session itself is now the backend's
// HttpOnly refresh cookie (quick_money-backend's internal/auth/cookies.go): on load we trade it for
// a fresh access token, and if it already expired from inactivity the backend answers 401 and we
// show the login page.
const LEGACY_TOKEN_STORAGE_KEY = 'admin.authToken'
try {
  localStorage.removeItem(LEGACY_TOKEN_STORAGE_KEY)
} catch {
  // storage blocked -- nothing to clean up
}

// All timestamps are on the browser's clock: they're derived from durations the backend reports,
// never from comparing its absolute timestamps with Date.now(), so clock skew can't cut a session
// short or stretch it.
export interface Session {
  accessToken: string
  accessExpiresAt: number
  sessionExpiresAt: number
  idleTimeoutMs: number
}

interface TokenResponse {
  access_token: string
  expires_at: string
  session_expires_at: string
  idle_timeout_seconds: number
}

let session: Session | null = null
let refreshInFlight: Promise<Session | null> | null = null
const expiredListeners = new Set<() => void>()

export function getSession(): Session | null {
  return session
}

export function setSessionFromResponse(body: TokenResponse): Session {
  const now = Date.now()
  const idleTimeoutMs = body.idle_timeout_seconds * 1000
  // Both are server timestamps, so their difference is skew-free.
  const accessLeadMs = Date.parse(body.session_expires_at) - Date.parse(body.expires_at)
  session = {
    accessToken: body.access_token,
    accessExpiresAt: now + idleTimeoutMs - accessLeadMs,
    sessionExpiresAt: now + idleTimeoutMs,
    idleTimeoutMs,
  }
  return session
}

export function clearSession(): void {
  session = null
}

// Fired when an API call hits a 401 that a silent refresh can't fix (the cookie expired or was
// revoked), so AuthContext can send the user back to /login.
export function onSessionExpired(listener: () => void): () => void {
  expiredListeners.add(listener)
  return () => {
    expiredListeners.delete(listener)
  }
}

function postRefresh(): Promise<Response> {
  return fetch('/api/auth/refresh', { method: 'POST', credentials: 'same-origin' })
}

// Deduplicated on purpose: the refresh token rotates on every call, so two concurrent refreshes
// (StrictMode's double-mounted effect, or a burst of 401s) would make the second one present an
// already-revoked token and end the session.
export function refreshSession(): Promise<Session | null> {
  if (!refreshInFlight) {
    refreshInFlight = (async () => {
      try {
        let res = await postRefresh()
        if (res.status === 401 && session) {
          // Another tab may have rotated the shared cookie a moment ago; the browser now holds
          // the new one, so a single retry succeeds in that case and fails for a truly dead session.
          await new Promise((resolve) => setTimeout(resolve, 500))
          res = await postRefresh()
        }
        if (!res.ok) {
          session = null
          return null
        }
        return setSessionFromResponse(await res.json())
      } catch {
        // fetch threw -- backend unreachable; keep what we have instead of logging the user out
        return session
      } finally {
        refreshInFlight = null
      }
    })()
  }
  return refreshInFlight
}

function send(path: string, init: RequestInit): Promise<Response> {
  const headers = new Headers(init.headers)
  if (session) headers.set('Authorization', `Bearer ${session.accessToken}`)
  return fetch(`/api${path}`, { credentials: 'same-origin', ...init, headers })
}

export async function apiFetch(path: string, init: RequestInit = {}): Promise<Response> {
  const res = await send(path, init)
  if (res.status !== 401 || path.startsWith('/auth/')) return res

  // Access token expired: try one silent refresh with the cookie, then retry the call once.
  if (await refreshSession()) return send(path, init)

  expiredListeners.forEach((listener) => listener())
  return res
}
