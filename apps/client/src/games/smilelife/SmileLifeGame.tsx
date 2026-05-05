import React, { useEffect, useState, useCallback, useRef } from 'react'
import { sounds } from '../../lib/sounds'
import { getRoomSocket } from '../../socket/useRoomSocket'
import { useAuth } from '../../auth/AuthContext'
import { PlayerBoard } from './PlayerBoard'
import { CardFace, HiddenCard } from './CardFace'
import type { CardData } from './CardFace'
import { HandCard, ActionModal } from './HandCard'
import styles from './SmileLifeGame.module.css'

interface Card {
  id: string
  category: string
  name: string
  smiles: number
  level?: number
  isDouble?: boolean
  studiesRequired?: number
  maxSalary?: number
  statut?: string | null
  metierEffect?: string
  salaryLevel?: number
  lieu?: string
  allowsChild?: boolean
  gender?: string
  childName?: string
  cost?: number
  malusType?: string
  specialType?: string
}

interface PlayerState {
  id: string
  username: string
  avatarUrl: string | null
  hand: Card[]
  board: any
  skippedTurns: number
  prisonTurns: number
  hasDrawn: boolean
  hasActed: boolean
  hasDismissed: boolean
}

interface GameState {
  phase: 'waiting' | 'playing' | 'ended'
  players: PlayerState[]
  currentPlayerIndex: number
  deck: Card[]
  discard: Card[]
  log: string[]
  winner: string | null
  pendingAction: any
}

function FanCard({ card, angle, yLift, zIndex, isPlayable, isHoverable, isSelected, onClick }: {
  card: CardData; angle: number; yLift: number; zIndex: number
  isPlayable: boolean; isHoverable?: boolean; isSelected: boolean; onClick: () => void
}) {
  const [hovered, setHovered] = React.useState(false)
  const lifted = isSelected || ((isPlayable || isHoverable) && hovered)
  return (
    <div
      style={{
        position: 'relative',
        margin: '0 -14px',
        flexShrink: 0,
        zIndex: hovered ? 99 : zIndex,
        transform: lifted
          ? 'rotate(0deg) translateY(-72px) scale(1.14)'
          : `rotate(${angle}deg) translateY(${yLift}px)`,
        transformOrigin: 'bottom center',
        transition: 'transform .25s cubic-bezier(.22,.68,0,1.2), filter .2s ease',
        transitionDelay: hovered ? '.04s' : '0s',
        filter: isSelected
          ? 'drop-shadow(0 0 14px var(--accent))'
          : hovered ? 'drop-shadow(0 16px 32px rgba(0,0,0,0.45))' : 'none',
        willChange: 'transform',
        cursor: 'pointer',
        pointerEvents: 'all',
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onClick={onClick}
    >
      <CardFace card={card} size="hand" selected={isSelected} playable={isPlayable} />
    </div>
  )
}

interface Props {
  roomCode: string
  isHost: boolean
  onLeave: () => void
}

export function SmileLifeGame({ roomCode, isHost, onLeave }: Props) {
  const { token, user } = useAuth()
  const myId = user?.id ?? ''
  const [gameState, setGameState] = useState<GameState | null>(null)
  const [selectedCard, setSelectedCard] = useState<Card | null>(null)
  const [log, setLog] = useState<string[]>([])
  const [error, setError] = useState<string | null>(null)
  const logRef = useRef<HTMLDivElement>(null)

  const [turnAnim, setTurnAnim] = React.useState<{ username: string; avatarUrl: string | null; isMe: boolean } | null>(null)
  const prevPlayerIndexRef = React.useRef<number | null>(null)

  const socket = getRoomSocket(token)

  useEffect(() => {
    if (!socket) return
    socket.emit('smilelife:get-state' as any)

    const onState = (state: GameState) => {
      // Son début de partie
      if (state.phase === 'playing' && !gameState) {
        sounds.slGameStart()
      }
      // Détecter changement de tour
      const prevIdx = prevPlayerIndexRef.current
      const newIdx = state.currentPlayerIndex
      const isFirstLoad = prevIdx === null
      const isTurnChange = !isFirstLoad && prevIdx !== newIdx && state.phase === 'playing'
      if (isTurnChange) {
        const p = state.players[newIdx]
        if (p) {
          setTurnAnim({ username: p.username, avatarUrl: p.avatarUrl, isMe: p.id === myId })
          setTimeout(() => setTurnAnim(null), 2200)
          if (p.id === myId) sounds.slYourTurn()
          else sounds.slOtherTurn()
        }
      }
      prevPlayerIndexRef.current = newIdx
      setGameState(state)
      setError(null)
      if (state.log?.length) {
        setLog(prev => state.log.length >= prev.length ? state.log : prev)
      }
    }
    const onLog = ({ events }: { events: string[] }) => {
      setLog(prev => [...prev, ...events])
      if (events.some(e => e.includes('💥') || e.includes('inflige'))) sounds.slMalus()
      if (events.some(e =>
        e.includes('Casino') || e.includes('Arc-en-ciel') || e.includes('Tsunami') ||
        e.includes('(Chance)') || e.includes('joue Chance') || e.includes('Étoile filante') ||
        e.includes('Anniversaire') || e.includes('Troc') || e.includes('Vengeance') ||
        e.includes('héritage') || e.includes('Héritage !') || e.includes('Piston !')
      )) sounds.slSpecial()
    }
    const onError = ({ message }: { message: string }) => {
      setError(message)
      setTimeout(() => setError(null), 3000)
    }

    socket.on('smilelife:state' as any, onState)
    socket.on('smilelife:log' as any, onLog)
    socket.on('smilelife:error' as any, onError)
    return () => {
      socket.off('smilelife:state' as any, onState)
      socket.off('smilelife:log' as any, onLog)
      socket.off('smilelife:error' as any, onError)
    }
  }, [socket])

  // Scroll log en bas
  useEffect(() => {
    if (logRef.current) logRef.current.scrollTop = logRef.current.scrollHeight
  }, [log])

  const emit = useCallback((type: string, data?: any) => {
    socket?.emit('smilelife:action' as any, { type, ...data })
  }, [socket])

  const handleCloseGame = useCallback(() => {
    if (!window.confirm('Fermer la partie pour tout le monde ?')) return
    getRoomSocket(token)?.emit('game:action' as any, { type: 'smilelife:close-game', data: {} })
  }, [token])

  const me = gameState?.players.find(p => p.id === myId)
  const isMyTurn = gameState && gameState.players[gameState.currentPlayerIndex]?.id === myId
  const currentPlayer = gameState?.players[gameState.currentPlayerIndex]

  const handleStart = () => socket?.emit('smilelife:start' as any)

  const handleDraw = () => emit('draw')
  const handleTakeDiscard = () => emit('take-discard')

  const isArcEnCiel = gameState?.pendingAction?.type === 'arc-en-ciel' && gameState?.pendingAction?.initiatorId === myId
  const arcEnCielPhase = gameState?.pendingAction?.data?.phase
  const arcEnCielRemaining = gameState?.pendingAction?.data?.remaining ?? 0

  const handleCardClick = (card: Card) => {
    // Toujours permettre d'ouvrir le modal pour voir la carte
    if (isArcEnCiel && arcEnCielPhase !== 'redraw') {
      setSelectedCard(card)
      return
    }
    setSelectedCard(card)
  }

  const handleAction = (type: string, payload?: any) => {
    if (!selectedCard) return
    if (isArcEnCiel && arcEnCielPhase !== 'redraw') {
      if (type === 'discard-card') {
        emit('arc-en-ciel-play', { cardId: selectedCard.id, payload: { discard: true } })
      } else if (type === 'play-malus') {
        emit('arc-en-ciel-play', { cardId: selectedCard.id, targetPlayerId: payload?.targetPlayerId })
      } else {
        emit('arc-en-ciel-play', { cardId: selectedCard.id })
      }
    } else {
      emit(type, { cardId: selectedCard.id, ...payload })
    }
    setSelectedCard(null)
  }

  if (!gameState) {
    return (
      <div className={styles.loading}>
        <div className={styles.loadingSpinner} />
        <p>Chargement...</p>
        {isHost && (
          <button className={styles.startBtn} onClick={handleStart}>
            ▶ Lancer Smile Life
          </button>
        )}
      </div>
    )
  }

  if (gameState.phase === 'waiting' || gameState.players.length === 0) {
    return (
      <div className={styles.loading}>
        <h2>Smile Life</h2>
        <p>En attente du lancement...</p>
        {isHost && (
          <button className={styles.startBtn} onClick={handleStart}>
            ▶ Lancer la partie
          </button>
        )}
      </div>
    )
  }

  if (gameState.phase === 'ended') {
    const scores = [...gameState.players].map(p => ({
      ...p,
      score: calcScore(p.board),
    })).sort((a, b) => b.score - a.score)
    return (
      <div className={styles.podium}>
        <h2 className={styles.podiumTitle}>🏁 Fin de partie !</h2>
        <div className={styles.podiumList}>
          {scores.map((p, i) => (
            <div key={p.id} className={`${styles.podiumRow} ${p.id === myId ? styles.podiumMe : ''}`}>
              <span className={styles.podiumRank}>{i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `#${i + 1}`}</span>
              <span className={styles.podiumName}>{p.username}</span>
              <span className={styles.podiumScore}>{p.score} 😊</span>
            </div>
          ))}
        </div>
        <button className={styles.leaveBtn} onClick={() => {
                getRoomSocket(token)?.emit('game:action' as any, { type: 'smilelife:close-game', data: {} })
                setTimeout(onLeave, 100)
              }}>
                Retour au lobby
              </button>
      </div>
    )
  }

  const topDiscard = gameState.discard[gameState.discard.length - 1]
  const others = gameState.players.filter(p => p.id !== myId)

  return (
    <div className={styles.root}>
      {/* ── Header ── */}
      <div className={styles.header}>
        {isHost
          ? <button className={styles.leaveBtn} style={{ color: 'var(--red)', borderColor: 'var(--red)' }} onClick={handleCloseGame}>✕ Fermer la partie</button>
          : <button className={styles.leaveBtn} onClick={onLeave}>← Quitter</button>
        }
        <div className={styles.headerCenter}>
          <span className={styles.gameName}>😊 Smile Life</span>
          {isMyTurn
            ? <span className={styles.turnBadge}>C'est votre tour !</span>
            : <span className={styles.turnLabel}>Tour de <strong>{currentPlayer?.username}</strong></span>
          }
        </div>
        <span className={styles.deckCount}>🃏 {gameState.deck.length} cartes</span>
      </div>

      {/* ── Erreur ── */}
      {error && <div className={styles.errorBanner}>{error}</div>}

      {/* ── Arc-en-ciel banner ── */}
      {isArcEnCiel && (
        <div className={styles.arcBanner}>
          <span>🌈 Arc-en-ciel actif !</span>
          {arcEnCielPhase !== 'redraw' ? (
            <>
              <span style={{ fontSize: 13 }}>
                Cliquez une carte pour la <strong>jouer</strong> ou la <strong>défausser</strong> — encore <strong>{arcEnCielRemaining}</strong> carte(s)
              </span>
              <button className={styles.actionBtn} style={{ fontSize: 12, padding: '3px 12px', flexShrink: 0 }}
                onClick={() => emit('arc-en-ciel-done')}>
                ⏭ Passer
              </button>
            </>
          ) : (
            <>
              <span style={{ fontSize: 13 }}>Repioche pour compléter ta main</span>
              <button className={styles.startBtn} style={{ padding: '5px 16px', fontSize: 13, flexShrink: 0 }}
                onClick={() => emit('arc-en-ciel-done')}>
                ✅ Terminer
              </button>
            </>
          )}
        </div>
      )}

      {/* ── Action en attente ── */}
      {gameState.pendingAction?.initiatorId === myId && (
        <div className={styles.pendingBanner}>
          ⏳ Action en attente — voir ci-dessous
        </div>
      )}

      <div className={styles.body}>
        {/* ── Plateaux adversaires ── */}
        <div className={styles.othersArea}>
          {others.map(p => (
            <PlayerBoard key={p.id} player={p} isMe={false}
              isCurrentTurn={gameState.players[gameState.currentPlayerIndex]?.id === p.id}
              onTarget={isMyTurn && me?.hasDrawn && selectedCard?.category === 'malus'
                ? () => handleAction('play-malus', { targetPlayerId: p.id })
                : undefined}
            />
          ))}
        </div>

        {/* ── Zone centrale : pioche + défausse + log ── */}
        <div className={styles.centerArea}>
          <div className={styles.piles}>
            {/* Pioche */}
            <div className={styles.pileWrap}>
              <button
                className={`${styles.pile} ${styles.pileDeck} ${isMyTurn && !me?.hasDrawn && !me?.hasDismissed ? styles.pileActive : ''}`} style={{ position: 'relative', overflow: 'visible', background: 'transparent', border: 'none', padding: 0 }}
                onClick={isMyTurn && !me?.hasDrawn && !me?.hasDismissed ? handleDraw : undefined}
                disabled={!isMyTurn || me?.hasDrawn || me?.hasDismissed || (me?.skippedTurns ?? 0) > 0 || (me?.prisonTurns ?? 0) > 0}
              >
                <HiddenCard size="mini" />
                <span className={styles.pileCount} style={{ position: 'absolute', bottom: 4, right: 6, fontSize: 11, fontWeight: 700, color: '#7eb8f7', fontFamily: 'monospace' }}>{gameState.deck.length}</span>
              </button>
              <span className={styles.pileLabel}>Pioche</span>
            </div>

            {/* Défausse */}
            <div className={styles.pileWrap}>
              <button
                className={`${styles.pile} ${styles.pileDiscard} ${isMyTurn && !me?.hasDrawn && topDiscard ? styles.pileActive : ''}`}
                onClick={isMyTurn && !me?.hasDrawn && topDiscard ? handleTakeDiscard : undefined}
                disabled={!isMyTurn || me?.hasDrawn || !topDiscard}
              >
                {topDiscard
                  ? <CardFace card={topDiscard as CardData} size="mini" />
                  : <span className={styles.pileEmpty}>vide</span>
                }
              </button>
              <span className={styles.pileLabel}>Défausse</span>
            </div>
          </div>

          {/* Actions spéciales */}
          {isMyTurn && (
            <div className={styles.specialActions}>
              {isMyTurn && (me?.skippedTurns ?? 0) > 0 && (
                <button className={`${styles.actionBtn} ${styles.actionBtnSkip}`} onClick={() => emit('skip-turn')}>
                  ⏭ Passer mon tour ({me?.skippedTurns} restant{(me?.skippedTurns ?? 0) > 1 ? 's' : ''})
                </button>
              )}
              {isMyTurn && (me?.prisonTurns ?? 0) > 0 && (
                <button className={`${styles.actionBtn} ${styles.actionBtnSkip}`} style={{ background: '#e5e7eb', borderColor: '#6b7280', color: '#374151' }} onClick={() => emit('skip-turn')}>
                  🔒 En prison — passer mon tour ({me?.prisonTurns} tour{(me?.prisonTurns ?? 0) > 1 ? 's' : ''} restant{(me?.prisonTurns ?? 0) > 1 ? 's' : ''})
                </button>
              )}
              {me?.board.metier && !me?.hasDismissed && !me?.hasDrawn && (
                <button className={styles.actionBtn} onClick={() => emit('resign')}>
                  📤 Démissionner
                </button>
              )}
              {me?.board.mariage && !me?.hasDismissed && !me?.hasDrawn && (
                <button className={styles.actionBtn} onClick={() => emit('divorce-voluntary')}>
                  💔 Divorcer
                </button>
              )}
            </div>
          )}

          {/* Log */}
          <div className={styles.log} ref={logRef}>
            {log.map((l, i) => <div key={i} className={styles.logLine}>{l}</div>)}
          </div>
        </div>

        {/* ── Mon plateau ── */}
        {me && (
          <div className={styles.myArea}>
            <PlayerBoard player={me} isMe={true}
              isCurrentTurn={!!isMyTurn}
              onTarget={undefined}
            />
          </div>
        )}
      </div>

      {/* ── Ma main — éventail style Slay the Spire ── */}
      {me && (
        <div className={styles.hand}>
          <div className={styles.handFan}>
            {me.hand.map((card, i) => {
              const total = me.hand.length
              const mid = (total - 1) / 2
              const offset = i - mid
              const angle = offset * (total > 4 ? 6 : 8)
              const yLift = Math.abs(offset) * (total > 4 ? 8 : 10)
              const isPlayable = !!(isMyTurn && me.hasDrawn && !me.hasActed && (me.skippedTurns ?? 0) === 0) || !!(isArcEnCiel && arcEnCielPhase !== 'redraw')
              const isHoverable = true // hover et modal toujours accessibles
              const isSelected = selectedCard?.id === card.id
              return (
                <FanCard
                  key={card.id}
                  card={card as CardData}
                  angle={angle}
                  yLift={isSelected ? -60 : yLift}
                  zIndex={isSelected ? 100 : i}
                  isPlayable={isPlayable}
                  isHoverable={true}
                  isSelected={isSelected}
                  onClick={() => handleCardClick(card)}
                />
              )
            })}
          </div>
        </div>
      )}

      {/* ── Modal action ── */}
      {selectedCard && (
        <ActionModal
          card={selectedCard}
          players={gameState.players.filter(p => p.id !== myId)}
          myBoard={me?.board}
          pendingAction={gameState.pendingAction}
          onPlaySelf={() => handleAction('play-card')}
          onPlayMalus={(targetId) => handleAction('play-malus', { targetPlayerId: targetId })}
          onDiscard={() => handleAction('discard-card')}
          onClose={() => setSelectedCard(null)}
        />
      )}

      {/* ── Pending action modal (pas pour arc-en-ciel, géré par le banner) ── */}
      {gameState.pendingAction?.initiatorId === myId && !selectedCard && gameState.pendingAction?.type !== 'arc-en-ciel' && (
        <ActionModal
          card={null}
          players={gameState.players.filter(p => p.id !== myId)}
          myBoard={{ ...me?.board, hand: me?.hand }}
          pendingAction={gameState.pendingAction}
          discard={gameState.discard}
          onPlaySelf={() => {}}
          onPlayMalus={() => {}}
          onDiscard={() => {}}
          onClose={() => {}}
          onPendingResolve={(data) => socket?.emit('smilelife:pending-resolve' as any, data)}
        />
      )}
      {/* ── Animation de tour ── */}
      {turnAnim && (
        <div className={styles.turnAnimOverlay}>
          <div className={styles.turnAnimCard}>
            <div className={styles.turnAnimAvatar}>
              {turnAnim.avatarUrl
                ? <img src={turnAnim.avatarUrl} alt="" />
                : <span>{turnAnim.username[0]?.toUpperCase()}</span>}
            </div>
            <div className={styles.turnAnimText}>
              {turnAnim.isMe ? "⚡ C'est votre tour !" : `Tour de ${turnAnim.username}`}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function calcScore(board: any): number {
  if (!board) return 0
  const allCards = [
    ...(board.etudes ?? []), board.metier,
    ...(board.salaires ?? []), ...(board.salairesInvestis ?? []),
    ...(board.flirts ?? []), ...(board.flirtsAdultere ?? []),
    board.mariage, board.adultere,
    ...(board.enfants ?? []), ...(board.enfantsAdultere ?? []),
    ...(board.animaux ?? []), ...(board.voyages ?? []), ...(board.maisons ?? []),
    ...(board.speciales ?? []),
  ].filter(Boolean)
  return allCards.reduce((sum: number, c: any) => sum + (c?.smiles ?? 0), 0)
}



export function categoryIcon(cat: string): string {
  const icons: Record<string, string> = {
    etude: '🎓', metier: '💼', salaire: '💵', flirt: '💕', mariage: '💍',
    enfant: '👶', adultere: '🙊', animal: '🐾', voyage: '✈️', maison: '🏠',
    malus: '💥', special: '⭐', hidden: '🃏',
  }
  return icons[cat] ?? '🃏'
}
