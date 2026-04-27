const API = import.meta.env.VITE_SERVER_URL ?? 'http://localhost:3001'

export interface AuthUser {
  id: string
  username: string
  email: string
  level: number
  rank: string
  avatarUrl: string | null
  xp?: number
}

export interface AuthResponse {
  token: string
  user: AuthUser
}

async function post(path: string, body: unknown): Promise<AuthResponse> {
  const res = await fetch(`${API}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  const data = await res.json()
  if (!res.ok) throw new Error(data.error ?? 'Erreur réseau')
  return data
}

export const authApi = {
  register: (username: string, password: string) =>
    post('/api/auth/register', { username, password }),

  login: (username: string, password: string) =>
    post('/api/auth/login', { username, password }),

  me: async (token: string): Promise<AuthUser> => {
    const res = await fetch(`${API}/api/auth/me`, {
      headers: { Authorization: `Bearer ${token}` },
    })
    const data = await res.json()
    if (!res.ok) throw new Error(data.error ?? 'Erreur réseau')
    return data.user
  },
}
