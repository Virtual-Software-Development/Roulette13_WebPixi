import { createContext, useContext, useMemo, useState, type ReactNode } from 'react'
import { getAuthToken } from '../api/client'
import { login as loginRequest, logout as logoutRequest } from '../api/auth'

interface AuthContextValue {
  isAuthenticated: boolean
  login: (username: string, password: string) => Promise<void>
  logout: () => void
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState(() => getAuthToken() !== null)

  const value = useMemo<AuthContextValue>(
    () => ({
      isAuthenticated,
      login: async (username, password) => {
        await loginRequest(username, password)
        setIsAuthenticated(true)
      },
      logout: () => {
        logoutRequest()
        setIsAuthenticated(false)
      },
    }),
    [isAuthenticated]
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
