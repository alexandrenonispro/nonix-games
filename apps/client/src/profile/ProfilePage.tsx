import { useEffect, useState, useRef } from 'react'
import { useAuth } from '../auth/AuthContext'
import { usersApi, uploadApi } from '../lib/usersApi'
import { GameHistory } from './GameHistory'
import { GAME_META } from '../lobby/mock'
import styles from './ProfilePage.module.css'
import { Avatar } from '../components/Avatar'

interface ProfileData {
  id: string
  username: string
  avatarUrl: string | null
  level: number
  rank: string
  xp: number
  createdAt: string
  lastLoginAt: string | null
  userStats: { gameId: string; gamesPlayed: number; gamesWon: number; totalScore: number; bestScore: number }[]
  userAchievements: {
    unlockedAt: string
    achievement: { id: string; name: string; description: string; iconUrl: string; rarity: string; isGlobal: boolean }
  }[]
}

// Formule XP option A : niveau N requiert N×200 XP cumulatif
// totalXpForLevel(L) = 100 * L * (L-1)
function totalXpForLevel(level: number): number {
  if (level <= 1) return 0
  return 100 * level * (level - 1)
}
const RARITY_COLORS: Record<string, string> = {
  COMMON: '#a8a29e', RARE: '#60a5fa', EPIC: '#a78bfa', LEGENDARY: '#fbbf24',
}
const RARITY_BG: Record<string, string> = {
  COMMON: '#f5f5f4', RARE: '#eff6ff', EPIC: '#f5f3ff', LEGENDARY: '#fffbeb',
}


function StatCard({ label, value }: { label: string; value: string | number }) {
  return (
    <div className={styles.statCard}>
      <span className={styles.statValue}>{value}</span>
      <span className={styles.statLabel}>{label}</span>

    </div>
  )
}

export function ProfilePage({ userId, onBack }: ProfilePageProps) {
  const [showRanks, setShowRanks] = useState(false)
  const { token, user: me, refreshUser } = useAuth()
  const [profile, setProfile] = useState<ProfileData | null>(null)
  const [friendship, setFriendship] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [histories, setHistories] = useState<any[]>([])
  const [friendLoading, setFriendLoading] = useState(false)
  const [uploadLoading, setUploadLoading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const isOwnProfile = userId === me?.id

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !token) return
    setUploadLoading(true)
    try {
      const { avatarUrl } = await uploadApi.avatar(file, token)
      setProfile((p) => p ? { ...p, avatarUrl } : p)
      await refreshUser() // met à jour l'avatar dans la navbar
    } catch (err: any) {
      alert(err.message)
    } finally {
      setUploadLoading(false)
      e.target.value = ''
    }
  }

  useEffect(() => {
    if (!token) return
    setLoading(true)
    Promise.all([
      usersApi.getProfile(userId, token),
      usersApi.getHistory(userId, token).catch(() => ({ histories: [] })),
    ]).then(([{ user, friendship }, { histories }]) => {
      setProfile(user)
      setFriendship(friendship)
      setHistories(histories)
    }).catch(console.error).finally(() => setLoading(false))
  }, [userId, token])

  const handleFriendRequest = async () => {
    if (!token || !profile) return
    setFriendLoading(true)
    try {
      const { friendship: f } = await usersApi.sendFriendRequest(profile.id, token)
      setFriendship(f)
    } catch (e: any) { alert(e.message) }
    finally { setFriendLoading(false) }
  }

  if (loading) return (
    <div className={styles.loading}>
      <div className={styles.spinner} />
    </div>
  )

  if (!profile) return (
    <div className={styles.loading}>Profil introuvable</div>
  )

  const totalGames = profile.userStats.reduce((s, g) => s + g.gamesPlayed, 0)
  const totalWins  = profile.userStats.reduce((s, g) => s + g.gamesWon, 0)
  const winRate    = totalGames > 0 ? Math.round((totalWins / totalGames) * 100) : 0
  const xpForCurrentLevel = totalXpForLevel(profile.level)
  const xpForNextLevel    = totalXpForLevel(profile.level + 1)
  const xpInLevel         = profile.xp - xpForCurrentLevel
  const xpNeeded          = xpForNextLevel - xpForCurrentLevel
  const xpPercent         = Math.min(100, Math.round((xpInLevel / xpNeeded) * 100))

  const friendStatus = friendship?.status
  const isFriend = friendStatus === 'ACCEPTED'
  const isPending = friendStatus === 'PENDING'

  return (
    <div className={styles.root}>
      {/* ── Header ── */}
      <div className={styles.header}>
        <button className={styles.backBtn} onClick={onBack}>
          <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <path d="M19 12H5M12 5l-7 7 7 7"/>
          </svg>
          Retour
        </button>
      </div>

      <div className={styles.content}>
        {/* ── Hero ── */}
        <div className={styles.hero}>
          <div className={styles.avatarWrap}>
            <Avatar username={profile.username} avatarUrl={profile.avatarUrl} size={88} />
            {isOwnProfile && (
              <>
                <button
                  className={styles.avatarEditBtn}
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploadLoading}
                  title="Changer la photo"
                >
                  {uploadLoading
                    ? <div className={styles.uploadSpinner} />
                    : <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                        <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M17 8l-5-5-5 5M12 3v12"/>
                      </svg>
                  }
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/gif"
                  style={{ display: 'none' }}
                  onChange={handleAvatarChange}
                />
              </>
            )}
          </div>
          <div className={styles.heroInfo}>
            <h1 className={styles.heroName}>{profile.username}</h1>
            <div className={styles.heroMeta}>
              <span className={styles.heroBadge} style={{ cursor: 'pointer' }} title="Voir tous les rangs" onClick={() => setShowRanks(true)}>{profile.rank} ▸</span>
              <span className={styles.heroSep}>·</span>
              <span className={styles.heroLevel}>Niveau {profile.level}</span>
            </div>
            {/* XP bar */}
            <div className={styles.xpRow}>
              <div className={styles.xpBar}>
                <div className={styles.xpFill} style={{ width: `${xpPercent}%` }} />
              </div>
              <span className={styles.xpLabel}>{xpInLevel} / {xpNeeded} XP</span>
            </div>
          </div>
          {/* Actions */}
          {!isOwnProfile && (
            <div className={styles.heroActions}>
              {isFriend ? (
                <span className={styles.friendTag}>✓ Amis</span>
              ) : isPending ? (
                <span className={styles.pendingTag}>En attente…</span>
              ) : (
                <button className={styles.addFriendBtn} onClick={handleFriendRequest} disabled={friendLoading}>
                  {friendLoading ? '…' : '+ Ajouter en ami'}
                </button>
              )}
            </div>
          )}
        </div>

        {/* ── Dates ── */}
        <div className={styles.datesRow}>
          <div className={styles.dateItem}>
            <span className={styles.dateLabel}>Membre depuis</span>
            <span className={styles.dateValue}>
              {new Date(profile.createdAt).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}
            </span>
          </div>
          {profile.lastLoginAt && (
            <div className={styles.dateItem}>
              <span className={styles.dateLabel}>Dernière connexion</span>
              <span className={styles.dateValue}>
                {new Date(profile.lastLoginAt).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}
              </span>
            </div>
          )}
        </div>

        {/* ── Global stats ── */}
        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>Statistiques globales</h2>
          <div className={styles.statsGrid}>
            <StatCard label="Parties jouées" value={totalGames} />
            <StatCard label="Victoires" value={totalWins} />
            <StatCard label="Taux de victoire" value={`${winRate}%`} />
            <StatCard label="XP total" value={profile.xp.toLocaleString()} />
          </div>
        </section>

        {/* ── Stats par jeu ── */}
        {profile.userStats.length > 0 && (
          <section className={styles.section}>
            <h2 className={styles.sectionTitle}>Par mini-jeu</h2>
            <div className={styles.gameStatsGrid}>
              {profile.userStats.map((s) => {
                const meta = GAME_META[s.gameId]
                if (!meta) return null
                const wr = s.gamesPlayed > 0 ? Math.round((s.gamesWon / s.gamesPlayed) * 100) : 0
                return (
                  <div key={s.gameId} className={styles.gameStatCard}>
                    <div className={styles.gameStatHeader}>
                      <span className={styles.gameStatEmoji}>{meta.emoji}</span>
                      <span className={styles.gameStatName}>{meta.label}</span>
                    </div>
                    <div className={styles.gameStatRows}>
                      <div className={styles.gameStatRow}><span>Parties</span><strong>{s.gamesPlayed}</strong></div>
                      <div className={styles.gameStatRow}><span>Victoires</span><strong>{s.gamesWon}</strong></div>
                      <div className={styles.gameStatRow}><span>Win rate</span><strong>{wr}%</strong></div>
                      <div className={styles.gameStatRow}><span>Meilleur score</span><strong>{s.bestScore.toLocaleString()}</strong></div>
                    </div>
                  </div>
                )
              })}
            </div>
          </section>
        )}

        {/* ── Succès ── */}
        {profile.userAchievements.length > 0 && (
          <section className={styles.section}>
            <h2 className={styles.sectionTitle}>
              Succès débloqués
              <span className={styles.achievementCount}>{profile.userAchievements.length}</span>
            </h2>
            <div className={styles.achievementsGrid}>
              {profile.userAchievements.map(({ achievement, unlockedAt }) => (
                <div key={achievement.id} className={styles.achievementCard}
                  style={{ background: RARITY_BG[achievement.rarity] ?? '#f5f5f4' }}>
                  <div className={styles.achievementIcon}>{achievement.iconUrl || '🏆'}</div>
                  <div className={styles.achievementInfo}>
                    <span className={styles.achievementName}>{achievement.name}</span>
                    <span className={styles.achievementDesc}>{achievement.description}</span>
                    <span className={styles.achievementRarity}
                      style={{ color: RARITY_COLORS[achievement.rarity] }}>
                      {achievement.rarity}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {profile.userAchievements.length === 0 && (
          <section className={styles.section}>
            <h2 className={styles.sectionTitle}>Succès débloqués</h2>
            <p className={styles.emptyText}>Aucun succès débloqué pour l'instant.</p>
          </section>
        )}

        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>
            Historique des parties
            <span className={styles.achievementCount}>{histories.length}</span>
          </h2>
          <GameHistory histories={histories} userId={userId} />
        </section>
      </div>

      {/* ── Modal Rangs ── */}
      {showRanks && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}
          onClick={() => setShowRanks(false)}>
          <div style={{ background: 'var(--bg-surface)', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border)', width: '100%', maxWidth: 520, maxHeight: '80vh', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}
            onClick={e => e.stopPropagation()}>
            <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0 }}>
              <div>
                <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-primary)' }}>🏅 Tableau des rangs</div>
                <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>XP requis = niveau × 200 cumulatif</div>
              </div>
              <button style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 18, color: 'var(--text-muted)' }} onClick={() => setShowRanks(false)}>✕</button>
            </div>
            <div style={{ overflowY: 'auto', flex: 1 }}>
              {[
                { tier: 'Débutant', color: '#888', icon: '⚪', ranks: [
                  { name: 'Rookie', minLevel: 1, maxLevel: 1 },
                  { name: 'Débutant', minLevel: 2, maxLevel: 3 },
                  { name: 'Apprenti', minLevel: 4, maxLevel: 5 },
                ]},
                { tier: 'Bronze', color: '#cd7f32', icon: '🟤', ranks: [
                  { name: 'Novice Bronze', minLevel: 6, maxLevel: 8 },
                  { name: 'Bronze', minLevel: 9, maxLevel: 12 },
                  { name: 'Bronze Confirmé', minLevel: 13, maxLevel: 16 },
                  { name: 'Expert Bronze', minLevel: 17, maxLevel: 20 },
                ]},
                { tier: 'Argent', color: '#a8a9ad', icon: '🔘', ranks: [
                  { name: 'Argent', minLevel: 21, maxLevel: 25 },
                  { name: 'Argent Confirmé', minLevel: 26, maxLevel: 30 },
                  { name: 'Expert Argent', minLevel: 31, maxLevel: 35 },
                  { name: 'Maître Argent', minLevel: 36, maxLevel: 40 },
                ]},
                { tier: 'Or', color: '#f59e0b', icon: '🟡', ranks: [
                  { name: 'Or', minLevel: 41, maxLevel: 46 },
                  { name: 'Or Confirmé', minLevel: 47, maxLevel: 52 },
                  { name: 'Expert Or', minLevel: 53, maxLevel: 58 },
                  { name: 'Grand Maître Or', minLevel: 59, maxLevel: 65 },
                ]},
                { tier: 'Diamant', color: '#06b6d4', icon: '💎', ranks: [
                  { name: 'Diamant', minLevel: 66, maxLevel: 72 },
                  { name: 'Diamant Brillant', minLevel: 73, maxLevel: 79 },
                  { name: 'Diamant Expert', minLevel: 80, maxLevel: 85 },
                  { name: 'Diamant Royal', minLevel: 86, maxLevel: 90 },
                ]},
                { tier: 'Maître', color: '#8b5cf6', icon: '🔮', ranks: [
                  { name: 'Maître', minLevel: 91, maxLevel: 97 },
                  { name: 'Maître Confirmé', minLevel: 98, maxLevel: 104 },
                  { name: 'Grand Maître', minLevel: 105, maxLevel: 110 },
                  { name: 'Élite Maître', minLevel: 111, maxLevel: 115 },
                ]},
                { tier: 'Challenger', color: '#ec4899', icon: '🌸', ranks: [
                  { name: 'Challenger', minLevel: 116, maxLevel: 120 },
                  { name: 'Challenger Expert', minLevel: 121, maxLevel: 125 },
                  { name: 'Challenger Élite', minLevel: 126, maxLevel: 130 },
                  { name: 'Élite', minLevel: 131, maxLevel: 135 },
                ]},
                { tier: 'Légendaire', color: '#f97316', icon: '🔥', ranks: [
                  { name: 'Légende', minLevel: 136, maxLevel: 140 },
                  { name: 'Légende Immortelle', minLevel: 141, maxLevel: 145 },
                  { name: 'Ascendant', minLevel: 146, maxLevel: 149 },
                  { name: 'Divinité', minLevel: 150, maxLevel: 150 },
                ]},
              ].map(tier => (
                <div key={tier.tier}>
                  <div style={{ padding: '8px 20px', background: 'var(--bg-elevated)', fontSize: 11, fontWeight: 700, color: tier.color, textTransform: 'uppercase', letterSpacing: '.08em', borderBottom: '1px solid var(--border)' }}>
                    {tier.icon} {tier.tier}
                  </div>
                  {tier.ranks.map(r => {
                    const xpNeeded = 100 * r.minLevel * (r.minLevel - 1)
                    const isCurrentRank = profile.rank === r.name
                    const isUnlocked = profile.level >= r.minLevel
                    return (
                      <div key={r.name} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 20px', borderBottom: '1px solid var(--border)', background: isCurrentRank ? 'var(--accent-dim)' : 'transparent' }}>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontSize: 13, fontWeight: isCurrentRank ? 700 : 500, color: isCurrentRank ? 'var(--accent)' : isUnlocked ? 'var(--text-primary)' : 'var(--text-muted)' }}>
                            {r.name}{isCurrentRank ? ' ← vous' : ''}
                          </div>
                          <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 1 }}>
                            Niv. {r.minLevel}{r.minLevel !== r.maxLevel ? ` – ${r.maxLevel}` : ''}
                          </div>
                        </div>
                        <div style={{ textAlign: 'right', fontSize: 12, color: isUnlocked ? tier.color : 'var(--text-muted)', fontFamily: 'monospace', fontWeight: 600 }}>
                          {xpNeeded === 0 ? 'Départ' : `${xpNeeded.toLocaleString()} XP`}
                          {!isUnlocked && <div style={{ fontSize: 10 }}>🔒</div>}
                          {isUnlocked && !isCurrentRank && <div style={{ fontSize: 10, color: '#16a34a' }}>✓</div>}
                        </div>
                      </div>
                    )
                  })}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
