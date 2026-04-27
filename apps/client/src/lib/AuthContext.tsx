import { createContext, useContext, useState, type ReactNode } from 'react'

interface AuthCtx {
  token: string
  userId: string
  username: string
}

const AuthContext = createContext<AuthCtx | null>(null)

// Mock tokens matching server auth.ts
const MOCK_ACCOUNTS = [
  { token: 'token-zerox',  userId: 'user-1', username: 'Zerox'  },
  { token: 'token-noxie',  userId: 'user-2', username: 'Noxie'  },
  { token: 'token-krypt',  userId: 'user-3', username: 'Krypt'  },
  { token: 'token-torken', userId: 'user-4', username: 'Torken' },
]

export function AuthProvider({ children }: { children: ReactNode }) {
  const [account, setAccount] = useState(MOCK_ACCOUNTS[0]!)

  return (
    <AuthContext.Provider value={account}>
      {/* Dev account switcher */}
      <div style={{
        position: 'fixed', top: 12, right: 12, zIndex: 9999,
        display: 'flex', gap: 4, background: '#1a1a1a',
        border: '1px solid #333', borderRadius: 8, padding: 4,
      }}>
        {MOCK_ACCOUNTS.map((a) => (
          <button key={a.token} onClick={() => setAccount(a)} style={{
            padding: '3px 10px', borderRadius: 5, fontSize: 11, fontWeight: 600,
            border: 'none', cursor: 'pointer', fontFamily: 'inherit',
            background: account.token === a.token ? '#b3f542' : 'transparent',
            color: account.token === a.token ? '#0a0a0a' : '#666',
          }}>
            {a.username}
          </button>
        ))}
      </div>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider')
  return ctx
}
