import { useState, useCallback, useEffect, useMemo } from 'react'
import { GAME_META } from './mock'
import type { GameId, Player, RoomSummary, GameSettings } from '@game-platform/shared'
import { useLobbySocket } from '../socket/useLobbySocket'
import { usersApi, type FriendUser } from '../lib/usersApi'
import { NotifBell } from '../components/NotifBell'
import { useAuth } from '../auth/AuthContext'
import styles from './LobbyPage.module.css'
import { DiceLogo } from '../components/DiceLogo'
import { Avatar } from '../components/Avatar'

// ─── Join modal ───────────────────────────────────────────────────────────────

function JoinModal({ onClose, onJoin }: { onClose: () => void; onJoin: (code: string) => void }) {
  const [code, setCode] = useState('')
  return (
    <div className={styles.modalOverlay} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <p className={styles.modalTitle}>Rejoindre une room</p>
        <input
          className={styles.codeInput}
          placeholder="XXXXXX"
          value={code}
          onChange={(e) => setCode(e.target.value.toUpperCase().slice(0, 6))}
          maxLength={6}
          autoFocus
        />
        <div className={styles.modalActions}>
          <button className={styles.btnSecondary} onClick={onClose}>Annuler</button>
          <button className={styles.btnPrimary} disabled={code.length < 4}
            onClick={() => { onJoin(code); onClose() }}>
            Rejoindre
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Create modal ─────────────────────────────────────────────────────────────

const GAMES: GameId[] = ['quiz', 'skribble', 'loup_garou', 'blind_test', 'undercover']

function CreateModal({ onClose, onCreate }: {
  onClose: () => void
  onCreate: (gameId: GameId, maxPlayers: number) => void
}) {
  const [selectedGame, setSelectedGame] = useState<GameId>('skribble')
  const [maxPlayers, setMaxPlayers] = useState(8)
  return (
    <div className={styles.modalOverlay} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <p className={styles.modalTitle}>Nouvelle room</p>
        <p className={styles.modalLabel}>Mini-jeu</p>
        <div className={styles.gameGrid}>
          {GAMES.map((gid) => {
            const meta = GAME_META[gid]!
            const available = gid === 'skribble'
            return (
              <button key={gid}
                className={`${styles.gameOption} ${selectedGame === gid ? styles.gameOptionActive : ''}`}
                onClick={() => available && setSelectedGame(gid)}
                disabled={!available}
                title={!available ? 'Bientôt disponible' : undefined}
                style={{ opacity: available ? 1 : 0.35, cursor: available ? 'pointer' : 'not-allowed', position: 'relative' }}>
                <span className={styles.gameEmoji}>{meta.emoji}</span>
                <span className={styles.gameLabel}>{meta.label}</span>
                {!available && (
                  <span style={{ position: 'absolute', bottom: 4, right: 4, fontSize: 9, fontWeight: 700, color: 'var(--text-muted)', letterSpacing: '.04em', textTransform: 'uppercase' }}>
                    Bientôt
                  </span>
                )}
              </button>
            )
          })}
        </div>
        <p className={styles.modalLabel}>
          Joueurs max — <span style={{ color: 'var(--accent)', fontFamily: 'var(--font-mono)' }}>{maxPlayers}</span>
        </p>
        <input type="range" min={2} max={15} value={maxPlayers}
          onChange={(e) => setMaxPlayers(Number(e.target.value))} className={styles.slider} />
        <div className={styles.modalActions}>
          <button className={styles.btnSecondary} onClick={onClose}>Annuler</button>
          <button className={styles.btnPrimary} onClick={() => { onCreate(selectedGame, maxPlayers); onClose() }}>
            Créer
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Main ─────────────────────────────────────────────────────────────────────

interface LobbyPageProps {
  onJoinRoom:    (code: string) => void
  onCreateRoom:  (gameId: GameId, maxPlayers: number, settings: GameSettings) => void
  onLogout:      () => void
  onViewProfile: (userId: string) => void
}

export function LobbyPage({ onJoinRoom, onCreateRoom, onLogout, onViewProfile }: LobbyPageProps) {
  const { user, token } = useAuth()
  const userId = user?.id ?? ''
  const username = user?.username ?? ''

  const [modal, setModal] = useState<'join' | 'create' | 'addFriend' | null>(null)
  const [pendingGameCode, setPendingGameCode] = useState<string | null>(() => localStorage.getItem('gp_game_code'))
  const [mobileDrawer, setMobileDrawer] = useState(false)
  const isMobile = typeof window !== 'undefined' && window.innerWidth <= 480

  const [onlinePlayers, setOnlinePlayers] = useState<Player[]>([])
  const [openRooms, setOpenRooms] = useState<RoomSummary[]>([])
  const [friends, setFriends] = useState<FriendUser[]>([])
  const [error, setError] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<FriendUser[]>([])
  const [searchLoading, setSearchLoading] = useState(false)

  // Charger les amis
  const loadFriends = useCallback(async () => {
    if (!token) return
    try {
      const { friends: f } = await usersApi.getFriends(token)
      setFriends(f)
    } catch {}
  }, [token])

  useEffect(() => { loadFriends() }, [loadFriends])

  // Recherche de joueur
  useEffect(() => {
    if (!searchQuery.trim() || !token) { setSearchResults([]); return }
    const t = setTimeout(async () => {
      setSearchLoading(true)
      try {
        const { users } = await usersApi.search(searchQuery, token)
        setSearchResults(users)
      } catch {} finally { setSearchLoading(false) }
    }, 300)
    return () => clearTimeout(t)
  }, [searchQuery, token])

  const handleAddFriend = async (targetId: string) => {
    if (!token) return
    try {
      await usersApi.sendFriendRequest(targetId, token)
      setSearchResults((rs) => rs.filter((r) => r.id !== targetId))
      alert("Demande d'ami envoyée !")
    } catch (e: any) { alert(e.message) }
  }

  useLobbySocket({
    token, userId,
    onState: ({ onlinePlayers, openRooms }) => {
      setOnlinePlayers(onlinePlayers)
      setOpenRooms(openRooms)
    },
    onPlayerJoined: ({ player }) =>
      setOnlinePlayers((ps) => [...ps.filter((p) => p.id !== player.id), player]),
    onPlayerLeft: ({ userId: uid }) =>
      setOnlinePlayers((ps) => ps.filter((p) => p.id !== uid)),
    onInviteReceived: ({ fromPlayer, roomCode }) => {
      if (window.confirm(`${fromPlayer.username} t'invite dans la room ${roomCode}. Rejoindre ?`))
        onJoinRoom(roomCode)
    },
    onRoomOpened: (room) =>
      setOpenRooms((rs) => [...rs.filter((r) => r.code !== room.code), room as any]),
    onRoomClosed: ({ code }) =>
      setOpenRooms((rs) => rs.filter((r) => r.code !== code)),
  })

  const handleCreate = useCallback((gameId: GameId, maxPlayers: number) => {
    const settings: GameSettings = gameId === 'quiz'
      ? { gameId, rounds: 10, timePerQuestion: 20, theme: null }
      : gameId === 'skribble' ? { gameId, rounds: 3, timePerRound: 60, wordCount: 4, language: 'fr' }
      : gameId === 'loup_garou' ? { gameId, dayDuration: 120, nightDuration: 30, roles: ['werewolf', 'seer'] }
      : gameId === 'blind_test' ? { gameId, rounds: 10, timePerTrack: 30, genres: [] }
      : { gameId: 'undercover', rounds: 5, timePerVote: 60 }
    onCreateRoom(gameId, maxPlayers, settings)
  }, [onCreateRoom])

  const others = onlinePlayers.filter((p) => p.id !== userId)

  return (
    <div className={styles.layout}>

      {/* ── Mobile drawer amis ── */}
      {isMobile && mobileDrawer && (
        <div className={styles.mobileOverlay} onClick={() => setMobileDrawer(false)} />
      )}
      <div className={styles.mobileDrawer} style={{ transform: isMobile && mobileDrawer ? 'translateX(0)' : 'translateX(-100%)' }}>
        <div className={styles.mobileDrawerHeader}>
          <span className={styles.sectionLabel}>Amis</span>
          <div style={{ display: 'flex', gap: 8 }}>
            <button className={styles.addFriendIconBtn} onClick={() => { setMobileDrawer(false); setModal('addFriend') }}>
              <svg width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path d="M12 5v14M5 12h14"/></svg>
            </button>
            <button onClick={() => setMobileDrawer(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 18, color: 'var(--text-muted)' }}>✕</button>
          </div>
        </div>
        <div className={styles.friendsList}>
          {friends.filter((f) => onlinePlayers.some((p) => p.id === f.id)).map((f) => (
            <div key={f.id} className={styles.friendRow} onClick={() => { setMobileDrawer(false); onViewProfile(f.id) }}>
              <div className={styles.friendAvatarWrap}>
                <Avatar username={f.username} avatarUrl={f.avatarUrl} size={30} />
                <span className={styles.onlineDot} />
              </div>
              <div className={styles.friendInfo}>
                <span className={styles.friendName}>{f.username}</span>
                <span className={styles.friendStatus} style={{ color: 'var(--green)' }}>En ligne</span>
              </div>
            </div>
          ))}
          {friends.filter((f) => !onlinePlayers.some((p) => p.id === f.id)).map((f) => (
            <div key={f.id} className={`${styles.friendRow} ${styles.friendRowOffline}`} onClick={() => { setMobileDrawer(false); onViewProfile(f.id) }}>
              <Avatar username={f.username} avatarUrl={f.avatarUrl} size={30} />
              <div className={styles.friendInfo}>
                <span className={styles.friendName}>{f.username}</span>
                <span className={styles.friendStatus}>Hors ligne</span>
              </div>
            </div>
          ))}
          {friends.length === 0 && (
            <div style={{ padding: '16px 12px', fontSize: 12, color: 'var(--text-muted)', textAlign: 'center' }}>
              Aucun ami pour l'instant.
            </div>
          )}
        </div>
        <div className={styles.sidebarBottom}>
          <button className={styles.logoutBtn} onClick={onLogout}>
            <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
              <path d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h6a2 2 0 012 2v1"/>
            </svg>
            Déconnexion
          </button>
        </div>
      </div>

      {/* ── Navbar ── */}
      <nav className={styles.navbar}>
        <div className={styles.navBrand}>
          <DiceLogo size={28} />
          <span>Nonix Games</span>
        </div>
        <div className={styles.navRight}>
          <NotifBell onFriendRequestHandled={loadFriends} />
          <div className={styles.navUser} onClick={() => onViewProfile(userId)} style={{ cursor: 'pointer' }}>
            <div className={styles.navUserInfo}>
              <span className={styles.navUsername}>{username}</span>
              <span className={styles.navLevel}>Niv. {user?.level ?? 1} · {user?.rank ?? 'Rookie'}</span>
            </div>
            <Avatar username={username} avatarUrl={user?.avatarUrl} size={34} />
          </div>
        </div>
      </nav>

      {/* ── Sidebar ── */}
      <aside className={styles.sidebar}>

        {/* Amis */}
        <div className={styles.sectionHeader}>
          <span className={styles.sectionLabel}>Amis</span>
          <button className={styles.addFriendIconBtn} onClick={() => setModal('addFriend')} title="Ajouter un ami">
            <svg width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
              <path d="M12 5v14M5 12h14"/>
            </svg>
          </button>
        </div>

        <div className={styles.friendsList}>
          {/* Amis en ligne */}
          {friends.filter((f) => onlinePlayers.some((p) => p.id === f.id)).map((f) => (
            <div key={f.id} className={styles.friendRow} onClick={() => onViewProfile(f.id)}>
              <div className={styles.friendAvatarWrap}>
                <Avatar username={f.username} avatarUrl={f.avatarUrl} size={30} />
                <span className={styles.onlineDot} />
              </div>
              <div className={styles.friendInfo}>
                <span className={styles.friendName}>{f.username}</span>
                <span className={styles.friendStatus} style={{ color: 'var(--green)' }}>En ligne</span>
              </div>
            </div>
          ))}
          {/* Amis hors ligne */}
          {friends.filter((f) => !onlinePlayers.some((p) => p.id === f.id)).map((f) => (
            <div key={f.id} className={`${styles.friendRow} ${styles.friendRowOffline}`} onClick={() => onViewProfile(f.id)}>
              <Avatar username={f.username} avatarUrl={f.avatarUrl} size={30} />
              <div className={styles.friendInfo}>
                <span className={styles.friendName}>{f.username}</span>
                <span className={styles.friendStatus}>Hors ligne</span>
              </div>
            </div>
          ))}
          {friends.length === 0 && (
            <div style={{ padding: '16px 12px', fontSize: 12, color: 'var(--text-muted)', textAlign: 'center', lineHeight: 1.5 }}>
              Aucun ami pour l'instant.<br/>
              <button className={styles.addFriendTextBtn} onClick={() => setModal('addFriend')}>Ajouter des amis</button>
            </div>
          )}
        </div>

        {/* Bottom — logout */}
        <div className={styles.sidebarBottom}>
          <button className={styles.logoutBtn} onClick={onLogout}>
            <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
              <path d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h6a2 2 0 012 2v1"/>
            </svg>
            Déconnexion
          </button>
        </div>
      </aside>

      {/* ── Main ── */}
      <main className={styles.main}>

        {/* Banneau partie en cours */}
        {pendingGameCode && (
          <div style={{
            background: 'var(--accent-light)', border: '1px solid var(--accent-border)',
            borderRadius: 'var(--radius-md)', padding: '12px 16px',
            display: 'flex', alignItems: 'center', gap: 12, flexShrink: 0,
          }}>
            <span style={{ fontSize: 20 }}>🎮</span>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--accent)' }}>Partie en cours</div>
              <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>Tu étais dans une partie — rejoins-la !</div>
            </div>
            <button
              className={styles.btnPrimary}
              onClick={() => onJoinRoom(pendingGameCode)}
            >
              Rejoindre
            </button>
            <button
              onClick={() => { localStorage.removeItem('gp_game_code'); setPendingGameCode(null) }}
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', fontSize: 18, lineHeight: 1 }}
            >✕</button>
          </div>
        )}

        {error && (
          <div className={styles.errorBanner}>
            <svg width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <circle cx="12" cy="12" r="10"/><path d="M12 8v4m0 4h.01"/>
            </svg>
            {error}
            <button onClick={() => setError(null)} style={{ marginLeft: 'auto', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--red)', fontWeight: 700 }}>✕</button>
          </div>
        )}

        <div className={styles.mainHeader}>
          <div className={styles.mainTitleGroup}>
            <h1 className={styles.mainTitle}>Lobby</h1>
            <p className={styles.mainSub}>
              {openRooms.length > 0
                ? `${openRooms.length} room${openRooms.length > 1 ? 's' : ''} ouverte${openRooms.length > 1 ? 's' : ''}`
                : 'Aucune room ouverte'}
            </p>
          </div>
          <div className={styles.headerActions}>
            <button className={styles.btnSecondary} onClick={() => setModal('join')}>
              <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path d="M15 3h6v6M10 14L21 3M9 21H3v-6"/>
              </svg>
              Rejoindre
            </button>
            <button className={styles.btnPrimary} onClick={() => setModal('create')}>
              <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path d="M12 5v14M5 12h14"/>
              </svg>
              Nouvelle room
            </button>
          </div>
        </div>

        <div className={styles.roomsGrid}>
          {openRooms.map((room) => {
            const meta = GAME_META[room.gameId]!
            const isFull = room.playerCount >= room.maxPlayers
            const colors: Record<string, string> = {
              quiz: '#ede9fe', skribble: '#fce7f3', loup_garou: '#ede9fe',
              blind_test: '#ffedd5', undercover: '#d1fae5',
            }
            return (
              <div key={room.code} className={styles.roomCard}>
                <div className={styles.roomCardTop}>
                  <div className={styles.roomGameIcon}
                    style={{ background: colors[room.gameId] ?? '#f3f4f6' }}>
                    {meta.emoji}
                  </div>
                  <div className={styles.roomMeta}>
                    <span className={styles.roomGame}>{meta.label}</span>
                    <span className={styles.roomHost}>par {room.hostName ?? '?'}</span>
                  </div>
                </div>
                <div className={styles.roomCardBottom}>
                  <div className={styles.playerBar}>
                    <div className={styles.playerBarFill}
                      style={{ width: `${(room.playerCount / room.maxPlayers) * 100}%`, background: 'var(--accent)' }} />
                  </div>
                  <span className={styles.playerCount}>{room.playerCount}/{room.maxPlayers}</span>
                  <button className={styles.btnSmall} disabled={isFull}
                    onClick={() => onJoinRoom(room.code)}>
                    Rejoindre
                  </button>
                </div>
              </div>
            )
          })}
          {openRooms.length === 0 && (
            <div className={styles.emptyState}>
              <span>Aucune room ouverte</span>
              <p>Crée-en une et invite tes amis !</p>
            </div>
          )}
        </div>
      </main>

      {modal === 'join'   && <JoinModal   onClose={() => setModal(null)} onJoin={onJoinRoom} />}
      {modal === 'create' && <CreateModal onClose={() => setModal(null)} onCreate={handleCreate} />}

      {modal === 'addFriend' && (
        <div className={styles.modalOverlay} onClick={() => { setModal(null); setSearchQuery(''); setSearchResults([]) }}>
          <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
            <p className={styles.modalTitle}>Ajouter un ami</p>
            <input
              className={styles.codeInput}
              style={{ fontSize: 14, letterSpacing: 0, textAlign: 'left', padding: '10px 14px' }}
              placeholder="Rechercher un joueur…"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              autoFocus
            />
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6, minHeight: 60 }}>
              {searchLoading && <div style={{ textAlign: 'center', fontSize: 12, color: 'var(--text-muted)', padding: 12 }}>Recherche…</div>}
              {!searchLoading && searchQuery.length > 1 && searchResults.length === 0 && (
                <div style={{ textAlign: 'center', fontSize: 12, color: 'var(--text-muted)', padding: 12 }}>Aucun joueur trouvé</div>
              )}
              {searchResults.map((u) => (
                <div key={u.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 4px' }}>
                  <Avatar username={u.username} avatarUrl={u.avatarUrl} size={32} />
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 13, fontWeight: 600 }}>{u.username}</div>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>Niv. {u.level}</div>
                  </div>
                  <button className={styles.btnSmall} onClick={() => handleAddFriend(u.id)}>Inviter</button>
                </div>
              ))}
            </div>
            <div className={styles.modalActions}>
              <button className={styles.btnSecondary} onClick={() => { setModal(null); setSearchQuery(''); setSearchResults([]) }}>Fermer</button>
            </div>
          </div>
        </div>
      )}

      {/* ── Mobile bottom bar ── */}
      <div className={styles.mobileBottomBar}>
        <button className={styles.mobileBottomBtn} onClick={() => setMobileDrawer(true)}>
          <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
            <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/>
            <path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75"/>
          </svg>
          <span>Amis</span>
          {friends.filter(f => onlinePlayers.some(p => p.id === f.id)).length > 0 && (
            <span className={styles.mobileBottomBadge}>{friends.filter(f => onlinePlayers.some(p => p.id === f.id)).length}</span>
          )}
        </button>
        <button className={styles.mobileBottomBtnPrimary} onClick={() => setModal('create')}>
          <svg width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <path d="M12 5v14M5 12h14"/>
          </svg>
        </button>
        <button className={styles.mobileBottomBtn} onClick={() => onViewProfile(userId)}>
          <Avatar username={username} avatarUrl={user?.avatarUrl} size={24} />
          <span>Profil</span>
        </button>
      </div>

    </div>
  )
}
