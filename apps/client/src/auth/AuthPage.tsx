import { useState } from 'react'
import { useAuth } from './AuthContext'
import styles from './AuthPage.module.css'
import { DiceLogo } from '../components/DiceLogo'

type Tab = 'login' | 'register'

export function AuthPage() {
  const { login, register } = useAuth()
  const [tab, setTab] = useState<Tab>('login')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  // Login fields — pseudo uniquement
  const [loginUsername, setLoginUsername] = useState('')
  const [loginPassword, setLoginPassword] = useState('')

  // Register fields — pseudo + mot de passe (email auto-généré côté serveur)
  const [regUsername, setRegUsername] = useState('')
  const [regPassword, setRegPassword] = useState('')
  const [regConfirm, setRegConfirm] = useState('')

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)
    try {
      await login(loginUsername, loginPassword)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    if (regPassword !== regConfirm) {
      setError('Les mots de passe ne correspondent pas')
      return
    }
    setLoading(true)
    try {
      // Email auto-généré — pas saisi par l'utilisateur
      await register(regUsername, regPassword)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className={styles.root}>
      <div className={styles.card}>
        {/* Logo */}
        <div className={styles.logo}>
          <DiceLogo size={36} />
          <span className={styles.logoText}>Nonix Games</span>
        </div>

        {/* Tabs */}
        <div className={styles.tabs}>
          <button
            className={`${styles.tab} ${tab === 'login' ? styles.tabActive : ''}`}
            onClick={() => { setTab('login'); setError(null) }}
          >
            Connexion
          </button>
          <button
            className={`${styles.tab} ${tab === 'register' ? styles.tabActive : ''}`}
            onClick={() => { setTab('register'); setError(null) }}
          >
            Inscription
          </button>
        </div>

        {/* Error */}
        {error && (
          <div className={styles.error}>
            <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <circle cx="12" cy="12" r="10"/><path d="M12 8v4m0 4h.01"/>
            </svg>
            {error}
          </div>
        )}

        {/* Login form */}
        {tab === 'login' && (
          <form className={styles.form} onSubmit={handleLogin}>
            <div className={styles.field}>
              <label className={styles.label}>Pseudo</label>
              <input
                className={styles.input}
                type="text"
                placeholder="MonPseudo"
                value={loginUsername}
                onChange={(e) => setLoginUsername(e.target.value)}
                required
                autoFocus
              />
            </div>
            <div className={styles.field}>
              <label className={styles.label}>Mot de passe</label>
              <input
                className={styles.input}
                type="password"
                placeholder="••••••••"
                value={loginPassword}
                onChange={(e) => setLoginPassword(e.target.value)}
                required
              />
            </div>
            <button className={styles.submitBtn} type="submit" disabled={loading}>
              {loading ? <span className={styles.spinner} /> : 'Se connecter'}
            </button>
          </form>
        )}

        {/* Register form */}
        {tab === 'register' && (
          <form className={styles.form} onSubmit={handleRegister}>
            <div className={styles.field}>
              <label className={styles.label}>Pseudo</label>
              <input
                className={styles.input}
                type="text"
                placeholder="MonPseudo"
                value={regUsername}
                onChange={(e) => setRegUsername(e.target.value)}
                required
                minLength={3}
                maxLength={20}
                autoFocus
              />
            </div>
            <div className={styles.field}>
              <label className={styles.label}>Mot de passe</label>
              <input
                className={styles.input}
                type="password"
                placeholder="Minimum 6 caractères"
                value={regPassword}
                onChange={(e) => setRegPassword(e.target.value)}
                required
                minLength={6}
              />
            </div>
            <div className={styles.field}>
              <label className={styles.label}>Confirmer le mot de passe</label>
              <input
                className={styles.input}
                type="password"
                placeholder="••••••••"
                value={regConfirm}
                onChange={(e) => setRegConfirm(e.target.value)}
                required
              />
            </div>
            <button className={styles.submitBtn} type="submit" disabled={loading}>
              {loading ? <span className={styles.spinner} /> : 'Créer mon compte'}
            </button>
          </form>
        )}

        <p className={styles.switchHint}>
          {tab === 'login' ? (
            <>Pas encore de compte ? <button className={styles.switchBtn} onClick={() => setTab('register')}>S'inscrire</button></>
          ) : (
            <>Déjà un compte ? <button className={styles.switchBtn} onClick={() => setTab('login')}>Se connecter</button></>
          )}
        </p>
      </div>
    </div>
  )
}
