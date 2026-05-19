import { useState, useEffect, useRef, useCallback } from 'react'
import styles from './UndercoverGame.module.css'

type Role = 'civil' | 'undercover' | 'mrwhite'
type Phase = 'description' | 'discussion' | 'vote' | 'mrwhite-guess' | 'ended'

interface UPlayer {
  id: string; username: string; avatarUrl: string | null
  role?: Role; word?: string | null
  description: string | null
  isEliminated: boolean; votes: number; hasVoted: boolean; hasDescribed: boolean
}

interface UState {
  phase: Phase; players: UPlayer[]
  civilWord?: string; undercoverWord?: string
  currentDescriberId: string | null; describeOrder: string[]
  discussionTimeLeft: number; round: number
  winner: 'civils' | 'undercover' | 'mrwhite' | null; winnerIds: string[]
  eliminatedThisRound: UPlayer | null; log: string[]
  mrWhiteGuessPlayerId: string | null
  allDescriptions?: { round: number; playerId: string; username: string; description: string }[]
}

interface Props {
  roomCode: string; myId: string; token: string
  players: { id: string; username: string; avatarUrl: string | null }[]
  isHost: boolean; onLeave: () => void; socket: any
}

const ROLE_LABELS: Record<Role, string> = { civil: 'Civil', undercover: 'Undercover', mrwhite: 'Mr. White' }
const ROLE_COLORS: Record<Role, string> = { civil: '#16a34a', undercover: '#dc2626', mrwhite: '#7c3aed' }
const ROLE_ICONS: Record<Role, string> = { civil: '👤', undercover: '🕵️', mrwhite: '👻' }

function Avatar({ player, size = 36 }: { player: { username: string; avatarUrl: string | null }; size?: number }) {
  return player.avatarUrl
    ? <img src={player.avatarUrl} alt="" style={{ width: size, height: size, borderRadius: '50%', objectFit: 'cover' }} />
    : <div style={{ width: size, height: size, borderRadius: '50%', background: 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 700, fontSize: size * 0.4 }}>{player.username[0]?.toUpperCase()}</div>
}

function formatTime(s: number) { return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}` }

export function UndercoverGame({ myId, socket, isHost, onLeave }: Props) {
  const [state, setState] = useState<UState | null>(null)
  const [description, setDescription] = useState('')
  const [guess, setGuess] = useState('')
  const [error, setError] = useState<string | null>(null)
  const logRef = useRef<HTMLDivElement>(null)
  const [confirmClose, setConfirmClose] = useState(false)
  const startedRef = useRef(false)
  const [isRefreshing, setIsRefreshing] = useState(true)

  // Après 1.5s sans état reçu → c'est un vrai début de partie (pas un refresh)
  useEffect(() => {
    const t = setTimeout(() => setIsRefreshing(false), 1500)
    return () => clearTimeout(t)
  }, [])

  const emit = useCallback((event: string, data?: any) => {
    socket?.emit(event as any, data ?? {})
  }, [socket])

  useEffect(() => {
    if (!socket) return
    const onState = (s: UState) => { setState(s); setError(null) }
    const onError = ({ reason }: { reason: string }) => setError(reason)
    const onTimer = ({ timeLeft }: { timeLeft: number }) => setState(prev => prev ? { ...prev, discussionTimeLeft: timeLeft } : prev)
    socket.on('undercover:state', onState)
    socket.on('undercover:error', onError)
    socket.on('undercover:timer', onTimer)

    // Demander l'état au serveur (reconnexion / refresh)
    socket.emit('undercover:get-state' as any)

    return () => {
      socket.off('undercover:state', onState)
      socket.off('undercover:error', onError)
      socket.off('undercover:timer', onTimer)
    }
  }, [socket])

  useEffect(() => {
    if (logRef.current) logRef.current.scrollTop = logRef.current.scrollHeight
  }, [state?.log])

  useEffect(() => {
    if (!state || state.phase !== 'discussion' || !isHost) return
    const interval = setInterval(() => emit('undercover:discussion-tick'), 1000)
    return () => clearInterval(interval)
  }, [state?.phase, isHost])

  // ── Loading / Start ─────────────────────────────────────────────────────────
  if (!state) return (
    <div className={styles.loading}>
      <div className={styles.loadingIcon}>🕵️</div>
      <div className={styles.loadingTitle}>Undercover</div>
      {isRefreshing ? (
        // En attente de la réponse du serveur (refresh)
        <div className={styles.loadingSubtitle}>Reconnexion en cours...</div>
      ) : isHost ? (
        <>
          <div className={styles.loadingSubtitle}>Tous les joueurs sont dans la room !</div>
          <div className={styles.loadingSubtitle} style={{ fontSize: 12 }}>Lancez la partie quand vous êtes prêt.</div>
          <button className={styles.startBtn}
            onClick={() => {
              if (startedRef.current) return
              startedRef.current = true
              emit('undercover:start')
            }}>
            ▶ Lancer la partie
          </button>
          <button className={styles.leaveBtn} style={{ marginTop: 8 }} onClick={() => { emit('game:action' as any, { type: 'undercover:close' }); onLeave() }}>
            ← Quitter
          </button>
        </>
      ) : (
        <>
          <div className={styles.loadingSubtitle}>En attente que l'hôte lance la partie...</div>
          <button className={styles.leaveBtn} style={{ marginTop: 16 }} onClick={() => { emit('game:action' as any, { type: 'undercover:close' }); onLeave() }}>
            ← Quitter
          </button>
        </>
      )}
    </div>
  )

  const me = state.players.find(p => p.id === myId)
  const myWord = me?.word
  const isMyTurnToDescribe = state.currentDescriberId === myId && state.phase === 'description'
  const activePlayers = state.players.filter(p => !p.isEliminated)
  const canVote = state.phase === 'vote' && me && !me.isEliminated && !me.hasVoted

  // ── Fin de partie ───────────────────────────────────────────────────────────
  if (state.phase === 'ended') {
    // Grouper allDescriptions par round
    const byRound = new Map<number, { playerId: string; username: string; description: string }[]>()
    ;(state.allDescriptions ?? []).forEach(d => {
      if (!byRound.has(d.round)) byRound.set(d.round, [])
      byRound.get(d.round)!.push(d)
    })
    const rounds = Array.from(byRound.keys()).sort()

    return (
      <div className={styles.root} style={{ overflowY: 'auto' }}>
        <div className={styles.endScreen}>
          <div className={styles.endTitle}>
            {state.winner === 'civils' && '🏆 Les Civils gagnent !'}
            {state.winner === 'undercover' && '🕵️ Les Undercovers gagnent !'}
            {state.winner === 'mrwhite' && '👻 Mr. White gagne !'}
          </div>

          {/* Mots révélés */}
          <div className={styles.wordsReveal}>
            <div className={styles.wordCard} style={{ borderColor: ROLE_COLORS.civil }}>
              <div className={styles.wordLabel}>Mot des civils</div>
              <div className={styles.wordValue}>{state.civilWord}</div>
            </div>
            <div className={styles.wordCard} style={{ borderColor: ROLE_COLORS.undercover }}>
              <div className={styles.wordLabel}>Mot des undercovers</div>
              <div className={styles.wordValue}>{state.undercoverWord}</div>
            </div>
          </div>

          {/* Joueurs */}
          <div className={styles.endPlayers}>
            {state.players.map(p => {
              const isWinner = state.winnerIds.includes(p.id)
              return (
                <div key={p.id} className={`${styles.endPlayer} ${isWinner ? styles.endPlayerWinner : ''}`}>
                  <Avatar player={p} size={40} />
                  <div className={styles.endPlayerInfo}>
                    <div className={styles.endPlayerName}>{p.username}{isWinner ? ' 🏆' : ''}{p.isEliminated ? ' 💀' : ''}</div>
                    <div className={styles.endPlayerDetails}>
                      {p.role && <span style={{ color: ROLE_COLORS[p.role] }}>{ROLE_ICONS[p.role]} {ROLE_LABELS[p.role]}</span>}
                      {p.word ? <span className={styles.endPlayerWord}>— "{p.word}"</span> : p.role === 'mrwhite' ? <span className={styles.endPlayerWord}>— Pas de mot</span> : null}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>

          {/* Historique complet des descriptions */}
          {rounds.length > 0 && (
            <div className={styles.endHistory}>
              <div className={styles.endHistoryTitle}>📋 Historique des descriptions</div>
              {rounds.map(r => (
                <div key={r} className={styles.endHistoryRound}>
                  <div className={styles.endHistoryRoundLabel}>Tour {r}</div>
                  {byRound.get(r)!.map((d, i) => (
                    <div key={i} className={styles.endHistoryItem}>
                      <span className={styles.endHistoryAuthor}>{d.username}</span>
                      <span className={styles.endHistoryDesc}>"{d.description}"</span>
                    </div>
                  ))}
                </div>
              ))}
            </div>
          )}

          <button className={styles.leaveBtn} onClick={() => { emit('game:action' as any, { type: 'undercover:close' }); onLeave() }}>
            ← Retour au lobby
          </button>
        </div>
      </div>
    )
  }

  // ── En jeu ──────────────────────────────────────────────────────────────────
  return (
    <div className={styles.root}>
      <header className={styles.header}>
        <div className={styles.headerLeft}>
          <span className={styles.gameTitle}>🕵️ Undercover</span>
          <span className={styles.roundBadge}>Tour {state.round}</span>
          <span className={`${styles.phaseBadge} ${styles['phase_' + state.phase.replace(/-/g, '_')]}`}>
            {state.phase === 'description' && '📝 Description'}
            {state.phase === 'discussion' && `💬 Discussion — ${formatTime(state.discussionTimeLeft)}`}
            {state.phase === 'vote' && '🗳️ Vote'}
            {state.phase === 'mrwhite-guess' && '👻 Mr. White devine'}
          </span>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          {isHost && (
            <button className={styles.closeBtn} onClick={() => setConfirmClose(true)}>
              ✕ Fermer la partie
            </button>
          )}
          <button className={styles.leaveBtn} onClick={() => { emit('game:action' as any, { type: 'undercover:close' }); onLeave() }}>← Quitter</button>
        </div>
      </header>

      <div className={styles.body}>
        {/* Sidebar */}
        <aside className={styles.sidebar}>
          {me && (
            <div className={styles.myRole} style={{ borderColor: 'var(--accent)' }}>
              <div className={styles.myRoleIcon}>🎴</div>
              <div>
                <div className={styles.myRoleLabel}>Mon mot secret</div>
                <div className={styles.myRoleValue}>
                  {myWord !== undefined
                    ? (myWord ? <strong>{myWord}</strong> : <em style={{ color: 'var(--text-muted)' }}>Pas de mot (Mr. White)</em>)
                    : '...'}
                </div>
                {me.isEliminated && <div className={styles.eliminatedBadge}>💀 Éliminé — mode spectateur</div>}
              </div>
            </div>
          )}
          <div className={styles.playersList}>
            {state.players.map(p => (
              <div key={p.id} className={`${styles.playerItem} ${p.isEliminated ? styles.playerEliminated : ''} ${state.currentDescriberId === p.id ? styles.playerDescribing : ''}`}>
                <Avatar player={p} size={28} />
                <div className={styles.playerItemInfo}>
                  <span className={styles.playerItemName}>{p.username}{p.id === myId ? ' (moi)' : ''}</span>
                  {p.hasDescribed && p.description && <span className={styles.playerItemDesc}>"{p.description}"</span>}
                </div>
                {state.phase === 'vote' && !p.isEliminated && p.votes > 0 && <span className={styles.playerVotes}>{p.votes} 🗳</span>}
                {state.currentDescriberId === p.id && <span className={styles.speakingIcon}>🎙️</span>}
                {p.isEliminated && <span>💀</span>}
              </div>
            ))}
          </div>
        </aside>

        {/* Center */}
        <main className={styles.center}>
          {error && <div className={styles.errorBanner}>{error}</div>}

          {state.phase === 'description' && (
            <div className={styles.actionCard}>
              <h2 className={styles.actionTitle}>📝 Phase de description</h2>
              {isMyTurnToDescribe ? (
                <>
                  <p className={styles.actionDesc}>C'est votre tour ! Décrivez votre mot en 1 à 3 mots.</p>
                  <div className={styles.inputRow}>
                    <input className={styles.textInput} placeholder="Votre description..." value={description}
                      onChange={e => setDescription(e.target.value)}
                      onKeyDown={e => e.key === 'Enter' && description.trim() && (emit('undercover:describe', { description }), setDescription(''))}
                      maxLength={40} autoFocus />
                    <button className={styles.primaryBtn} disabled={!description.trim()}
                      onClick={() => { emit('undercover:describe', { description }); setDescription('') }}>Valider</button>
                  </div>
                </>
              ) : (
                <p className={styles.actionDesc}>
                  {state.currentDescriberId
                    ? `En attente de ${state.players.find(p => p.id === state.currentDescriberId)?.username}...`
                    : 'Tous ont décrit !'}
                </p>
              )}
              <div className={styles.descriptions}>
                {state.players.filter(p => p.description).map(p => (
                  <div key={p.id} className={styles.descriptionItem}>
                    <Avatar player={p} size={24} />
                    <span className={styles.descriptionAuthor}>{p.username}</span>
                    <span className={styles.descriptionText}>"{p.description}"</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {state.phase === 'discussion' && (
            <div className={styles.actionCard}>
              <h2 className={styles.actionTitle}>💬 Phase de discussion</h2>
              <div className={styles.timer} style={{ color: state.discussionTimeLeft < 30 ? '#dc2626' : 'var(--accent)' }}>
                {formatTime(state.discussionTimeLeft)}
              </div>
              <p className={styles.actionDesc}>Débattez ! Qui est l'undercover ? Qui est Mr. White ?</p>
              <div className={styles.descriptions}>
                {state.players.filter(p => p.description).map(p => (
                  <div key={p.id} className={styles.descriptionItem}>
                    <Avatar player={p} size={24} />
                    <span className={styles.descriptionAuthor}>{p.username}</span>
                    <span className={styles.descriptionText}>"{p.description}"</span>
                  </div>
                ))}
              </div>
              {isHost && <button className={styles.secondaryBtn} onClick={() => emit('undercover:start-vote')}>⏭ Passer au vote</button>}
            </div>
          )}

          {state.phase === 'vote' && (
            <div className={styles.actionCard}>
              <h2 className={styles.actionTitle}>🗳️ Phase de vote</h2>
              <p className={styles.actionDesc}>
                {canVote ? 'Votez pour éliminer un joueur.' : me?.hasVoted ? 'Vote enregistré, en attente des autres...' : 'Vous êtes éliminé — vous ne pouvez pas voter.'}
              </p>
              <div className={styles.voteGrid}>
                {activePlayers.filter(p => p.id !== myId).map(p => (
                  <button key={p.id} className={`${styles.voteBtn} ${!canVote ? styles.voteBtnDisabled : ''}`}
                    disabled={!canVote} onClick={() => emit('undercover:vote', { targetId: p.id })}>
                    <Avatar player={p} size={32} />
                    <span>{p.username}</span>
                    {p.votes > 0 && <span className={styles.voteBadge}>{p.votes}</span>}
                  </button>
                ))}
              </div>
            </div>
          )}

          {state.phase === 'mrwhite-guess' && (
            <div className={styles.actionCard}>
              <h2 className={styles.actionTitle}>👻 Mr. White peut deviner !</h2>
              {state.eliminatedThisRound && (
                <p className={styles.actionDesc}><strong>{state.eliminatedThisRound.username}</strong> était Mr. White ! Il peut tenter de deviner le mot des civils.</p>
              )}
              {state.mrWhiteGuessPlayerId === myId ? (
                <div className={styles.inputRow}>
                  <input className={styles.textInput} placeholder="Devinez le mot des civils..." value={guess}
                    onChange={e => setGuess(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && guess.trim() && (emit('undercover:mrwhite-guess', { guess }), setGuess(''))}
                    autoFocus />
                  <button className={styles.primaryBtn} disabled={!guess.trim()}
                    onClick={() => { emit('undercover:mrwhite-guess', { guess }); setGuess('') }}>Deviner</button>
                </div>
              ) : (
                <p className={styles.actionDesc}>{state.players.find(p => p.id === state.mrWhiteGuessPlayerId)?.username} est en train de deviner...</p>
              )}
              {isHost && (
                <button className={styles.secondaryBtn} style={{ marginTop: 12 }} onClick={() => emit('undercover:next-round')}>
                  Passer (Mr. White renonce)
                </button>
              )}
            </div>
          )}

          {state.eliminatedThisRound && state.phase !== 'mrwhite-guess' && state.phase !== 'ended' && (
            <div className={styles.eliminatedCard}>
              <div className={styles.eliminatedTitle}>💀 {state.eliminatedThisRound.username} a été éliminé</div>
              {isHost && <button className={styles.primaryBtn} onClick={() => emit('undercover:next-round')}>▶ Tour suivant</button>}
            </div>
          )}
        </main>

        {/* Log */}
        <aside className={styles.logPanel}>
          <div className={styles.logTitle}>📋 Journal</div>
          <div className={styles.log} ref={logRef}>
            {state.log.map((line, i) => <div key={i} className={styles.logLine}>{line}</div>)}
          </div>
        </aside>
      </div>

      {/* Modal confirmation fermeture */}
      {confirmClose && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}
          onClick={() => setConfirmClose(false)}>
          <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: '28px 32px', maxWidth: 360, width: '90%', display: 'flex', flexDirection: 'column', gap: 16 }}
            onClick={e => e.stopPropagation()}>
            <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--text-primary)' }}>Fermer la partie ?</div>
            <p style={{ fontSize: 14, color: 'var(--text-secondary)', margin: 0, lineHeight: 1.5 }}>
              Tous les joueurs seront renvoyés au lobby. Cette action est irréversible.
            </p>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
              <button style={{ padding: '8px 16px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)', background: 'none', cursor: 'pointer', fontSize: 13, color: 'var(--text-secondary)', fontFamily: 'var(--font-body)' }}
                onClick={() => setConfirmClose(false)}>
                Annuler
              </button>
              <button style={{ padding: '8px 18px', borderRadius: 'var(--radius-sm)', border: 'none', background: '#dc2626', color: 'white', cursor: 'pointer', fontSize: 13, fontWeight: 600, fontFamily: 'var(--font-body)' }}
                onClick={() => { emit('game:action' as any, { type: 'undercover:close' }); onLeave() }}>
                Fermer la partie
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
