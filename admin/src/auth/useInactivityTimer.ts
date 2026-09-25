import { useEffect, useRef } from 'react'
import { getSession, refreshSession } from '../api/client'

const ACTIVITY_EVENTS = ['pointerdown', 'pointermove', 'keydown', 'wheel', 'touchstart'] as const
const TICK_MS = 10_000
// Shared across tabs so an idle background tab doesn't log out (and revoke the cookie of) a tab
// the user is actively working in.
const LAST_ACTIVITY_KEY = 'admin.lastActivity'
const STORAGE_WRITE_THROTTLE_MS = 5_000

function readSharedActivity(): number {
  try {
    return Number(localStorage.getItem(LAST_ACTIVITY_KEY)) || 0
  } catch {
    return 0
  }
}

function writeSharedActivity(at: number): void {
  try {
    localStorage.setItem(LAST_ACTIVITY_KEY, String(at))
  } catch {
    // storage blocked -- this tab just tracks its own activity
  }
}

// While `enabled`, watches for user activity and:
//  - keeps the session alive by refreshing it shortly before it lapses, but only if the user did
//    something since the last refresh (background polling doesn't count as activity);
//  - calls onIdle once nobody has touched the panel for the backend's idle window
//    (AUTH_IDLE_TIMEOUT, 30 min by default), or when the session can no longer be refreshed.
export function useInactivityTimer(enabled: boolean, onIdle: () => void): void {
  const onIdleRef = useRef(onIdle)
  onIdleRef.current = onIdle

  useEffect(() => {
    if (!enabled) return

    let lastActivity = Date.now()
    let lastRefresh = Date.now()
    let lastStorageWrite = 0
    let stopped = false
    writeSharedActivity(lastActivity)

    const markActive = () => {
      lastActivity = Date.now()
      if (lastActivity - lastStorageWrite > STORAGE_WRITE_THROTTLE_MS) {
        lastStorageWrite = lastActivity
        writeSharedActivity(lastActivity)
      }
    }

    const idle = () => {
      if (stopped) return
      stopped = true
      onIdleRef.current()
    }

    const tick = async () => {
      if (stopped) return
      const session = getSession()
      if (!session) return idle()

      const now = Date.now()
      const lastSeen = Math.max(lastActivity, readSharedActivity())
      if (now - lastSeen >= session.idleTimeoutMs) return idle()

      const lapsesAt = Math.min(session.accessExpiresAt, session.sessionExpiresAt)
      const margin = Math.min(60_000, session.idleTimeoutMs / 4)
      if (lastSeen > lastRefresh && lapsesAt - now < margin) {
        lastRefresh = now
        if (!(await refreshSession())) idle()
      }
    }

    const onVisible = () => {
      if (document.visibilityState === 'visible') void tick()
    }

    ACTIVITY_EVENTS.forEach((event) => window.addEventListener(event, markActive, { passive: true }))
    document.addEventListener('visibilitychange', onVisible)
    const interval = window.setInterval(() => void tick(), TICK_MS)

    return () => {
      stopped = true
      ACTIVITY_EVENTS.forEach((event) => window.removeEventListener(event, markActive))
      document.removeEventListener('visibilitychange', onVisible)
      window.clearInterval(interval)
    }
  }, [enabled])
}
