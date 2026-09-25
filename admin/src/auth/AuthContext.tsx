import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { onSessionExpired, refreshSession } from '../api/client'
import { login as loginRequest, logout as logoutRequest } from '../api/auth'
import { useInactivityTimer } from './useInactivityTimer'

// 'checking' covers the moment on page load while we ask the backend whether the session cookie is
// still alive -- nothing is rendered yet, so the dashboard never flashes for an expired session.
type AuthStatus = 'checking' | 'authenticated' | 'anonymous'
export type LogoutReason = 'idle' | 'expired' | null

interface AuthContextValue {
  status: AuthStatus
  isAuthenticated: boolean
  logoutReason: LogoutReason
  login: (username: string, password: string) => Promise<void>
  logout: () => void
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<AuthStatus>('checking')
  const [logoutReason, setLogoutReason] = useState<LogoutReason>(null)

  useEffect(() => {
    let cancelled = false
    void refreshSession().then((session) => {
      if (!cancelled) setStatus(session ? 'authenticated' : 'anonymous')
    })
    return () => {
      cancelled = true
    }
  }, [])

  const endSession = useCallback((reason: LogoutReason) => {
    void logoutRequest()
    setLogoutReason(reason)
    setStatus('anonymous')
  }, [])

  useEffect(() => onSessionExpired(() => endSession('expired')), [endSession])
  useInactivityTimer(status === 'authenticated', () => endSession('idle'))

  const value = useMemo<AuthContextValue>(
    () => ({
      status,
      isAuthenticated: status === 'authenticated',
      logoutReason,
      login: async (username, password) => {
        await loginRequest(username, password)
        setLogoutReason(null)
        setStatus('authenticated')
      },
      logout: () => endSession(null),
    }),
    [status, logoutReason, endSession]
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
