import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext'
import styles from './AdminPage.module.css'

interface CardConfig {
  cardType: string
  label: string
  category: string
  defaultQty: number
  enabled: boolean
  quantity: number
}

const API = import.meta.env.VITE_API_URL ?? 'http://localhost:3001'

export function AdminPage() {
  const { token, user } = useAuth()
  const navigate = useNavigate()
  const [cards, setCards] = useState<CardConfig[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [activeGame, setActiveGame] = useState<'smilelife'>('smilelife')

  // Redirect non-admins
  useEffect(() => {
    if (user && (user as any).role !== 'ADMIN') navigate('/')
  }, [user, navigate])

  const fetchCards = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch(`${API}/api/admin/smilelife/cards`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      const data = await res.json()
      setCards(data.cards ?? [])
    } catch {
      setError('Impossible de charger les cartes.')
    } finally {
      setLoading(false)
    }
  }, [token])

  useEffect(() => { fetchCards() }, [fetchCards])

  const updateCard = (cardType: string, field: 'enabled' | 'quantity', value: boolean | number) => {
    setCards(prev => prev.map(c => c.cardType === cardType ? { ...c, [field]: value } : c))
    setSaved(false)
  }

  const resetAll = () => {
    setCards(prev => prev.map(c => ({ ...c, enabled: true, quantity: c.defaultQty })))
    setSaved(false)
  }

  const save = async () => {
    setSaving(true)
    setError(null)
    try {
      const res = await fetch(`${API}/api/admin/smilelife/cards`, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ cards: cards.map(c => ({ cardType: c.cardType, enabled: c.enabled, quantity: c.quantity })) }),
      })
      if (!res.ok) throw new Error()
      setSaved(true)
      setTimeout(() => setSaved(false), 2500)
    } catch {
      setError('Erreur lors de la sauvegarde.')
    } finally {
      setSaving(false)
    }
  }

  // Group by category
  const categories = [...new Set(cards.map(c => c.category))]

  const totalCards = cards.filter(c => c.enabled).reduce((sum, c) => sum + c.quantity, 0)

  return (
    <div className={styles.page}>
      {/* Sidebar */}
      <aside className={styles.sidebar}>
        <button className={styles.backBtn} onClick={() => navigate('/')}>← Retour</button>
        <div className={styles.sidebarTitle}>Administration</div>
        <button className={`${styles.gameBtn} ${activeGame === 'smilelife' ? styles.gameBtnActive : ''}`}
          onClick={() => setActiveGame('smilelife')}>
          😊 Smile Life
        </button>
      </aside>

      {/* Main */}
      <main className={styles.main}>
        <div className={styles.header}>
          <div>
            <h1 className={styles.title}>😊 Smile Life — Configuration des cartes</h1>
            <p className={styles.subtitle}>
              {totalCards} cartes dans le deck · {cards.filter(c => !c.enabled).length} types désactivés
            </p>
          </div>
          <div className={styles.headerActions}>
            <button className={styles.resetBtn} onClick={resetAll}>↺ Réinitialiser</button>
            <button className={`${styles.saveBtn} ${saved ? styles.saveBtnSuccess : ''}`}
              onClick={save} disabled={saving}>
              {saving ? 'Sauvegarde...' : saved ? '✓ Sauvegardé !' : '💾 Sauvegarder'}
            </button>
          </div>
        </div>

        {error && <div className={styles.errorBanner}>{error}</div>}

        {loading ? (
          <div className={styles.loading}>Chargement...</div>
        ) : (
          <div className={styles.categories}>
            {categories.map(cat => (
              <div key={cat} className={styles.category}>
                <div className={styles.categoryHeader}>
                  <span className={styles.categoryName}>{cat}</span>
                  <span className={styles.categoryCount}>
                    {cards.filter(c => c.category === cat && c.enabled).reduce((s, c) => s + c.quantity, 0)} cartes
                  </span>
                </div>
                <div className={styles.cardsList}>
                  {/* Header */}
                  <div className={styles.cardsListHeader}>
                    <span>Carte</span>
                    <span>Activée</span>
                    <span>Quantité</span>
                    <span>Défaut</span>
                  </div>
                  {cards.filter(c => c.category === cat).map(card => (
                    <div key={card.cardType} className={`${styles.cardRow} ${!card.enabled ? styles.cardRowDisabled : ''}`}>
                      <span className={styles.cardLabel}>{card.label}</span>
                      <label className={styles.toggle}>
                        <input
                          type="checkbox"
                          checked={card.enabled}
                          onChange={e => updateCard(card.cardType, 'enabled', e.target.checked)}
                        />
                        <span className={styles.toggleSlider} />
                      </label>
                      <input
                        type="number"
                        min={0}
                        max={99}
                        value={card.quantity}
                        disabled={!card.enabled}
                        className={styles.qtyInput}
                        onChange={e => updateCard(card.cardType, 'quantity', Math.max(0, parseInt(e.target.value) || 0))}
                      />
                      <span className={styles.defaultQty}>({card.defaultQty})</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  )
}
