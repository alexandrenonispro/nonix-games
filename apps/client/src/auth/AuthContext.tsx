import { createContext, useContext, useState, useEffect, type ReactNode } from 'react'
import { authApi, type AuthUser } from './api'

const TOKEN_KEY = 'gp_token'

interface AuthCtx {
  token: string | null
  user: AuthUser | null
  isLoading: boolean
  login: (email: string, password: string) => Promise<void>
  register: (username: string, email: string, password: string) => Promise<void>
  logout: () => void
  refreshUser: () => Promise<void>
}

const AuthContext = createContext<AuthCtx | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(() => localStorage.getItem(TOKEN_KEY))
  const [user, setUser] = useState<AuthUser | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  // Restore session on mount
  // Délai uniquement si c'est la première visite de la session (login ou nouvel onglet)
  useEffect(() => {
    const stored = localStorage.getItem(TOKEN_KEY)
    const isFirstVisit = !sessionStorage.getItem('gp_loaded')
    sessionStorage.setItem('gp_loaded', '1')
    const minDelay = isFirstVisit
      ? new Promise(r => setTimeout(r, 2500))
      : Promise.resolve()

    if (!stored) {
      minDelay.then(() => setIsLoading(false))
      return
    }

    Promise.all([
      authApi.me(stored)
        .then((u) => { setUser(u); setToken(stored) })
        .catch(() => { localStorage.removeItem(TOKEN_KEY); setToken(null) }),
      minDelay,
    ]).finally(() => setIsLoading(false))
  }, [])

  const login = async (email: string, password: string) => {
    const { token: t, user: u } = await authApi.login(email, password)
    localStorage.setItem(TOKEN_KEY, t)
    // Marquer comme nouvelle session pour afficher l'animation au prochain montage
    sessionStorage.removeItem('gp_loaded')
    setIsLoading(true)
    await new Promise(r => setTimeout(r, 2500))
    setToken(t)
    setUser(u)
    setIsLoading(false)
  }

  const register = async (username: string, email: string, password: string) => {
    const { token: t, user: u } = await authApi.register(username, email, password)
    localStorage.setItem(TOKEN_KEY, t)
    sessionStorage.removeItem('gp_loaded')
    setIsLoading(true)
    await new Promise(r => setTimeout(r, 2500))
    setToken(t)
    setUser(u)
    setIsLoading(false)
  }

  const logout = () => {
    localStorage.removeItem(TOKEN_KEY)
    setToken(null)
    setUser(null)
  }

  const refreshUser = async () => {
    const stored = localStorage.getItem(TOKEN_KEY)
    if (!stored) return
    try {
      const u = await authApi.me(stored)
      setUser(u)
    } catch {}
  }

  return (
    <AuthContext.Provider value={{ token, user, isLoading, login, register, logout, refreshUser }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider')
  return ctx
}
