import { useState, useEffect, useRef, useCallback } from 'react'
import { getRoomSocket } from '../../socket/useRoomSocket'
import { sounds } from '../../lib/sounds'
import { startAmbient, stopAmbient, setAmbientVolume, isAmbientPlaying } from '../../lib/ambient'
import { useAuth } from '../../auth/AuthContext'
import { Avatar } from '../../components/Avatar'
import { DrawingCanvas } from './DrawingCanvas'
import { WordChoiceModal } from './WordChoiceModal'
import { DrawnixPodium } from './DrawnixPodium'
import { RoundRecap } from './RoundRecap'
import styles from './DrawnixGame.module.css'

interface PlayerState {
  id: string; username: string; avatarUrl: string | null
  score: number; hasGuessed: boolean; guessRank: number
}

interface TurnState {
  drawerId: string; word: string | null; mask: string[]
  timeLeft: number; players: PlayerState[]
  round: number; totalRounds: number
}

interface ChatLine {
  id: string; type: 'guess' | 'system' | 'correct' | 'close'
  author?: string; content: string
}

interface RankingPlayer extends PlayerState { rank: number }

function TimerRing({ timeLeft, total }: { timeLeft: number; total: number }) {
  const r = 22, circ = 2 * Math.PI * r, urgent = timeLeft <= 10
  return (
    <div className={styles.timerWrap}>
      <svg width="56" height="56" viewBox="0 0 56 56">
        <circle cx="28" cy="28" r={r} fill="none" stroke="var(--border)" strokeWidth="3" />
        <circle cx="28" cy="28" r={r} fill="none"
          stroke={urgent ? '#ef4444' : 'var(--accent)'}
          strokeWidth="3" strokeLinecap="round"
          strokeDasharray={circ}
          strokeDashoffset={circ * (1 - Math.max(0, timeLeft) / total)}
          transform="rotate(-90 28 28)"
          style={{ transition: 'stroke-dashoffset 1s linear, stroke .3s' }}
        />
      </svg>
      <span className={styles.timerNum} style={{ color: urgent ? '#ef4444' : 'var(--text-primary)' }}>
        {Math.max(0, timeLeft)}
      </span>
    </div>
  )
}

function PlayerList({ players, drawerId, myId, disconnectedPlayers }: { players: PlayerState[]; drawerId: string; myId: string; disconnectedPlayers: Set<string> }) {
  const sorted = [...players].sort((a, b) => b.score - a.score)
  return (
    <div className={styles.playerList}>
      {sorted.map((p, i) => {
        const isDrawer = p.id === drawerId, isMe = p.id === myId
        return (
          <div key={p.id} className={`${styles.playerRow} ${isDrawer ? styles.playerRowDrawer : ''} ${isMe ? styles.playerRowMe : ''}`}
             style={{ opacity: disconnectedPlayers.has(p.id) ? 0.35 : 1 }}>
            <span className={styles.playerRank}>#{i + 1}</span>
            <Avatar username={p.username} avatarUrl={p.avatarUrl} size={28} />
            <div className={styles.playerInfo}>
              <span className={styles.playerName}>
                {p.username}
                {isDrawer && <span className={styles.drawerTag}>✏️</span>}
                {isMe && <span className={styles.meTag}>vous</span>}
                {disconnectedPlayers.has(p.id) && <span className={styles.disconnectedTag}>📶</span>}
              </span>
              <span className={styles.playerScore}>{p.score} pts</span>
            </div>
            {p.hasGuessed && !isDrawer && <span className={styles.guessedCheck}>✓</span>}
          </div>
        )
      })}
    </div>
  )
}

function WordDisplay({ mask, word }: { mask: string | string[]; word: string | null }) {
  const chars = Array.isArray(mask) ? mask : mask.split('')
  if (word) return (
    <div className={styles.wordDisplay}>
      <span className={styles.wordLabel}>Mot à faire deviner</span>
      <span className={styles.wordFull}>{word}</span>
    </div>
  )
  return (
    <div className={styles.wordDisplay}>
      <span className={styles.wordLabel}>Devinez le mot</span>
      <div className={styles.wordMask}>
        {chars.map((c, i) => (
          <span key={i} className={c === ' ' || c === '-' ? styles.maskSep : c === '_' ? styles.maskBlank : styles.maskLetter}>
            {c === '_' ? '' : c}
          </span>
        ))}
      </div>
    </div>
  )
}

function ChatArea({ lines, onGuess, isDrawer }: { lines: ChatLine[]; onGuess: (g: string) => void; isDrawer: boolean }) {
  const [input, setInput] = useState('')
  const endRef = useRef<HTMLDivElement>(null)
  useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [lines])

  const submit = () => {
    if (!input.trim() || isDrawer) return
    onGuess(input.trim())
    setInput('')
  }

  return (
    <div className={styles.chatArea}>
      <div className={styles.chatLines}>
        {lines.map((l) => (
          <div key={l.id} className={`${styles.chatLine} ${styles[`chatLine_${l.type}`]}`}>
            {l.author && <span className={styles.chatAuthor}>{l.author} : </span>}
            {l.content}
          </div>
        ))}
        <div ref={endRef} />
      </div>
      <div className={styles.chatInput}>
        <input value={input} onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && submit()}
          placeholder={isDrawer ? 'Vous dessinez…' : 'Devinez le mot…'}
          disabled={isDrawer} maxLength={60} />
        {!isDrawer && <button onClick={submit} disabled={!input.trim()}>↵</button>}
      </div>
    </div>
  )
}

interface DrawnixGameProps {
  token: string
  roomCode: string
  settings: { rounds: number; timePerRound: number }
  onLeave: () => void
  isHost?: boolean
}

export function DrawnixGame({ token, settings, onLeave, isHost }: DrawnixGameProps) {
  const { user } = useAuth()
  const myId = user?.id ?? ''
  const myIdRef = useRef(myId)
  useEffect(() => { myIdRef.current = myId }, [myId])

  const [phase, setPhase] = useState<'waiting' | 'choosing' | 'drawing' | 'turn-end' | 'game-end'>('waiting')
  const [turnState, setTurnState] = useState<TurnState | null>(null)
  const [chatLines, setChatLines] = useState<ChatLine[]>([])
  const [wordChoices, setWordChoices] = useState<string[] | null>(null)
  const [rankings, setRankings] = useState<RankingPlayer[]>([])
  const [waitingName, setWaitingName] = useState('')
  const currentDrawerIdRef = useRef<string | null>(null)
  const [turnEndWord, setTurnEndWord] = useState<string | null>(null)
  const [roundRecap, setRoundRecap] = useState<{ round: number; totalRounds: number; scores: any[]; isLastTurn?: boolean; word?: string } | null>(null)
  const pendingWordChoices = useRef<string[] | null>(null)
  const roundRecapRef = useRef(false)
  const pendingWordRef = useRef<string | null>(null)
  const [disconnectedPlayers, setDisconnectedPlayers] = useState<Set<string>>(new Set())
  const [restoreCanvasData, setRestoreCanvasData] = useState<string | null>(null)
  const [ambientOn, setAmbientOn] = useState(false)
  const [mobilePlayersOpen, setMobilePlayersOpen] = useState(false)
  const [ambientVolume, setAmbientVolumeState] = useState(0.3)

  const toggleAmbient = useCallback(() => {
    if (ambientOn) {
      stopAmbient()
      setAmbientOn(false)
    } else {
      startAmbient(ambientVolume)
      setAmbientOn(true)
    }
  }, [ambientOn, ambientVolume])

  const handleVolumeChange = useCallback((v: number) => {
    setAmbientVolumeState(v)
    setAmbientVolume(v)
    if (v > 0 && !ambientOn) { startAmbient(v); setAmbientOn(true) }
    if (v === 0 && ambientOn) { stopAmbient(); setAmbientOn(false) }
  }, [ambientOn])

  // Stopper la musique quand on quitte
  useEffect(() => () => stopAmbient(), [])

  const [floatingReactions, setFloatingReactions] = useState<{ id: number; emoji: string; x: number; username: string }[]>([])
  const reactionIdRef = useRef(0)

  const addChat = useCallback((line: Omit<ChatLine, 'id'>) => {
    setChatLines((ls) => [...ls, { ...line, id: `${Date.now()}-${Math.random()}` }])
  }, [])

  // ── Connexion directe au socket ───────────────────────────────────────────
  // Plus de buffer/window — on s'abonne directement

  useEffect(() => {
    let cancelled = false

    const socket = getRoomSocket(token)
    if (!socket) { console.error('[drawnix] no socket!'); return }


    const connect = () => {
      if (cancelled) return

      const on = (ev: string, cb: (d: any) => void) => socket.on(ev as any, cb)
      const off = (ev: string, cb: (d: any) => void) => socket.off(ev as any, cb)
      void off // used in cleanup

      const onRoundStart = (d: any) => {
        addChat({ type: 'system', content: `— Round ${d.round} / ${d.totalRounds} —` })
      }

      const onWaiting = (d: any) => {
        currentDrawerIdRef.current = d.drawerId
        setPhase('choosing')
        setWaitingName(d.drawerName)
        setTurnEndWord(null)
      }

      const onChooseWord = (d: any) => {
        if (d.drawerId !== myIdRef.current) return
        // Si le recap est encore visible, bufferiser
        if (roundRecapRef.current) {
          pendingWordChoices.current = d.words
        } else {
          setWordChoices(d.words)
        }
      }

      const onTurnStart = (d: any) => {
        // Effacer le canvas pour tous
        setRestoreCanvasData(null)
        window.dispatchEvent(new CustomEvent('drawnix-clear'))
        setWordChoices(null)
        setPhase('drawing')
        setTurnEndWord(null)
        const word = d.word ?? pendingWordRef.current
        pendingWordRef.current = null
        setWordChoices(null) // fermer le modal
        setTurnState({
          drawerId: d.drawerId, word, mask: d.mask,
          timeLeft: d.timeLeft, players: d.players,
          round: d.round, totalRounds: d.totalRounds,
        })
        const drawerName = d.players.find((p: any) => p.id === d.drawerId)?.username ?? '?'
        addChat({ type: 'system', content: `C'est au tour de ${drawerName} de dessiner !` })
      }

      const onTick = (d: any) => {
        if (d.timeLeft <= 10 && d.timeLeft > 0) sounds.timerTick(d.timeLeft)
        setTurnState((ts) => ts ? { ...ts, timeLeft: d.timeLeft } : ts)
      }

      const onGuessed = (d: any) => {
        setTurnState((ts) => {
          if (!ts) return ts
          const updated = { ...ts, players: d.players }
          // Vérifier si tout le monde a deviné
          const guessers = d.players.filter((p: any) => p.id !== ts.drawerId)
          const allDone = guessers.length > 0 && guessers.every((p: any) => p.hasGuessed)
          if (allDone) sounds.allGuessed()
          else sounds.playerGuessed()
          return updated
        })
        addChat({ type: 'correct', content: `✓ ${d.playerName} a trouvé ! (+${d.points} pts)` })
      }

      const onHint = (d: any) => {
        sounds.hint()
        setTurnState((ts) => ts ? { ...ts, mask: d.mask } : ts)
        addChat({ type: 'system', content: '💡 Indice révélé !' })
      }

      const onClose = (d: any) => {
        addChat({ type: 'close', content: `"${d.guess}" est très proche !` })
      }

      const onTurnEnd = (d: any) => {
        setTurnEndWord(d.word)
        setTurnState((ts) => ts ? { ...ts, players: d.players } : ts)
        setPhase('turn-end')
        addChat({ type: 'system', content: `Le mot était : "${d.word}"` })
      }

      const onGameEnd = (d: any) => {
        // Nettoyer localStorage — la partie est terminée
        localStorage.removeItem('gp_game_code')
        sessionStorage.removeItem('gp_room_code')
        setRankings(d.rankings)
        setPhase('game-end')
      }

      const onStroke = (d: any) => {
        window.dispatchEvent(new CustomEvent('drawnix-stroke', { detail: d }))
      }

      const onRoundRecap = (d: any) => {
        roundRecapRef.current = true
        // Son lose si personne n'a marqué de point ce tour
        const totalPoints = (d.scores as any[]).reduce((sum: number, s: any) => sum + (s.roundScore ?? 0), 0)
        if (totalPoints === 0) sounds.noPoints()
        setRoundRecap({ round: d.round, totalRounds: d.totalRounds, scores: d.scores, isLastTurn: d.isLastTurn, word: d.word })
      }

      const onClear = () => {
        window.dispatchEvent(new CustomEvent('drawnix-clear'))
      }

      const onChat = (d: any) => {
        // Ne pas afficher ses propres messages (déjà ajoutés localement)
        if (d.authorId === myIdRef.current) return
        addChat({ type: 'guess', author: d.author, content: d.content })
      }

      const onWordReveal = (d: any) => {
        // Utiliser le setter fonctionnel — si turnState est null on crée un state minimal
        setTurnState((ts) => {
          if (ts) return { ...ts, word: d.word }
          // turnState pas encore set — stocker dans pendingWord
          pendingWordRef.current = d.word
          return ts
        })
      }

      const onReaction = (d: any) => {
        sounds.reactionPop()
        const id = ++reactionIdRef.current
        const x = 20 + Math.random() * 60
        setFloatingReactions(r => [...r, { id, emoji: d.emoji, x, username: d.username }])
        setTimeout(() => setFloatingReactions(r => r.filter(f => f.id !== id)), 2800)
      }

      const onPlayerDisconnected = (d: any) => {
        setDisconnectedPlayers((s) => new Set([...s, d.userId]))
        addChat({ type: 'system', content: `⚠️ ${d.username} s'est déconnecté…` })
      }

      const onPlayerReconnected = (d: any) => {
        setDisconnectedPlayers((s) => { const n = new Set(s); n.delete(d.userId); return n })
        addChat({ type: 'system', content: `✅ ${d.username} s'est reconnecté !` })
      }

      const onReconnectState = (d: any) => {
        setPhase('drawing')
        setTurnState({
          drawerId: d.drawerId,
          word: d.word,
          mask: d.mask,
          timeLeft: d.timeLeft,
          players: d.players,
          round: d.round,
          totalRounds: d.totalRounds,
        })
        // Restaurer le canvas
        if (d.canvasData) setRestoreCanvasData(d.canvasData)
        // Restaurer le chat
        if (d.chatHistory?.length) {
          setChatLines(d.chatHistory.map((m: any) => ({
            id: `${Date.now()}-${Math.random()}`,
            type: m.type,
            author: m.authorId ? m.author : undefined,
            content: m.content,
          })))
        }
      }

      // Demande de snapshot frais (quand un joueur rejoint)
      const onRequestCanvasSnapshot = () => {
        const canvas = document.querySelector('canvas') as HTMLCanvasElement | null
        if (!canvas) return
        const canvasData = canvas.toDataURL('image/png', 0.5)
        getRoomSocket(token)?.emit('game:action' as any, {
          type: 'drawnix:canvas-update',
          data: { canvasData },
        })
      }

      // Snapshot reçu depuis le serveur (pour les reconnectants)
      const onCanvasSnapshot = (d: any) => {
        if (d.canvasData) setRestoreCanvasData(d.canvasData)
      }

      const onRequestSnapshot = (d: any) => {
        const canvas = document.querySelector('canvas') as HTMLCanvasElement | null
        if (!canvas) return
        const canvasData = canvas.toDataURL('image/png', 0.6)
        getRoomSocket(token)?.emit('game:action' as any, {
          type: 'drawnix:snapshot',
          data: { turnIndex: d.turnIndex, canvasData },
        })
      }

      on('drawnix:round-start',    onRoundStart)
      on('drawnix:waiting-choice', onWaiting)
      on('drawnix:choose-word',    onChooseWord)
      on('drawnix:turn-start',     onTurnStart)
      on('drawnix:tick',           onTick)
      on('drawnix:guessed',        onGuessed)
      on('drawnix:hint',           onHint)
      on('drawnix:close',          onClose)
      on('drawnix:turn-end',       onTurnEnd)
      on('drawnix:game-end',       onGameEnd)
      on('drawnix:stroke',         onStroke)
      on('drawnix:clear',          onClear)
      on('drawnix:word-reveal' as any, onWordReveal)
      on('drawnix:chat' as any,      onChat)
      on('drawnix:round-recap' as any,     onRoundRecap)
      on('drawnix:request-snapshot' as any, onRequestSnapshot)
      on('drawnix:reconnect-state' as any,        onReconnectState)
      on('drawnix:request-canvas-snapshot' as any, onRequestCanvasSnapshot)
      on('drawnix:canvas-snapshot' as any,         onCanvasSnapshot)
      on('drawnix:canvas-live' as any, (d: any) => {
        if (d.canvasData && !isDrawer) setRestoreCanvasData(d.canvasData)
      })
      on('drawnix:player-disconnected' as any, onPlayerDisconnected)
      on('drawnix:reaction' as any,           onReaction)
      on('drawnix:player-reconnected' as any,  onPlayerReconnected)

      cleanup = () => {
        cancelled = true
        off('drawnix:round-start',    onRoundStart)
        off('drawnix:waiting-choice', onWaiting)
        off('drawnix:choose-word',    onChooseWord)
        off('drawnix:turn-start',     onTurnStart)
        off('drawnix:tick',           onTick)
        off('drawnix:guessed',        onGuessed)
        off('drawnix:hint',           onHint)
        off('drawnix:close',          onClose)
        off('drawnix:turn-end',       onTurnEnd)
        off('drawnix:game-end',       onGameEnd)
        off('drawnix:stroke',         onStroke)
        off('drawnix:clear',          onClear)
      off('drawnix:word-reveal' as any, onWordReveal)
      off('drawnix:chat' as any,      onChat)
      off('drawnix:round-recap' as any,     onRoundRecap)
      off('drawnix:request-snapshot' as any, onRequestSnapshot)
      off('drawnix:reconnect-state' as any,        onReconnectState)
      off('drawnix:request-canvas-snapshot' as any, onRequestCanvasSnapshot)
      off('drawnix:canvas-snapshot' as any,         onCanvasSnapshot)
      off('drawnix:canvas-live' as any, () => {})
      off('drawnix:player-disconnected' as any, onPlayerDisconnected)
      off('drawnix:reaction' as any,           onReaction)
      off('drawnix:player-reconnected' as any,  onPlayerReconnected)
      }
    }

    let cleanup = () => {}
    connect()
    return () => { cancelled = true; cleanup() }
  }, [token, addChat])

  const emit = useCallback((type: string, data: any) => {
    getRoomSocket(token)?.emit('game:action' as any, { type, data })
  }, [token])

  const handleChooseWord = (word: string) => {
    emit('drawnix:choose-word', { word })
    setWordChoices(null)
  }

  const handleGuess = (guess: string) => {
    addChat({ type: 'guess', author: user?.username, content: guess })
    emit('drawnix:guess', { guess })
  }

  const handleDraw = useCallback((stroke: any) => {
    getRoomSocket(token)?.emit('skribble:draw' as any, stroke)
  }, [token])

  const handleClear = useCallback(() => {
    getRoomSocket(token)?.emit('skribble:clear' as any)
  }, [token])

  const handleCloseGame = useCallback(() => {
    if (!window.confirm('Fermer la partie pour tout le monde ?')) return
    getRoomSocket(token)?.emit('game:action' as any, { type: 'drawnix:close-game', data: {} })
  }, [token])

  const REACTION_EMOJIS = ['🔥', '😂', '🤯', '👏', '😍', '💀', '🎨', '🤔']

  const sendReaction = useCallback((emoji: string) => {
    sounds.reactionPop()
    getRoomSocket(token)?.emit('game:action' as any, {
      type: 'drawnix:reaction',
      data: { emoji, username: user?.username ?? '' },
    })
    // Afficher localement aussi
    const id = ++reactionIdRef.current
    const x = 20 + Math.random() * 60
    setFloatingReactions(r => [...r, { id, emoji, x, username: user?.username ?? '' }])
    setTimeout(() => setFloatingReactions(r => r.filter(f => f.id !== id)), 2800)
  }, [token, user])

  const handleCanvasUpdate = useCallback((data: string) => {
    getRoomSocket(token)?.emit('game:action' as any, {
      type: 'drawnix:canvas-update',
      data: { canvasData: data },
    })
  }, [token])

  // Dessinateur = soit pendant le tour, soit pendant la phase de choix
  const isDrawer = turnState?.drawerId === myId || (phase === 'choosing' && currentDrawerIdRef.current === myId)

  if (phase === 'game-end') return <DrawnixPodium rankings={rankings} onLeave={onLeave} />

  // Overlay de choix de mot — visible pour les non-dessinateurs par-dessus le jeu
  const showChoosingOverlay = phase === 'choosing' && currentDrawerIdRef.current !== myId

  return (
    <div className={styles.root}>
      {wordChoices && <WordChoiceModal words={wordChoices} onChoose={handleChooseWord} />}
      {roundRecap && (
<RoundRecap
          round={roundRecap.round}
          totalRounds={roundRecap.totalRounds}
          scores={roundRecap.scores}
          isLastTurn={roundRecap.isLastTurn}
          word={roundRecap.word ?? turnEndWord}
          onClose={() => {
            roundRecapRef.current = false
            setRoundRecap(null)
            if (pendingWordChoices.current) {
              setWordChoices(pendingWordChoices.current)
              pendingWordChoices.current = null
            }
          }}
        />
      )}

      {/* Overlay choix de mot pour les spectateurs */}
      {showChoosingOverlay && (
        <div className={styles.choosingOverlay}>
          <style>{`@keyframes spin{to{transform:rotate(360deg)}}@keyframes pulse{0%,100%{opacity:.6}50%{opacity:1}}`}</style>
          <div className={styles.choosingCard}>
            <div className={styles.choosingSpinner} />
            <div className={styles.choosingText}>
              <span className={styles.choosingName}>{waitingName}</span>
              <span className={styles.choosingLabel}>choisit son mot…</span>
            </div>
          </div>
        </div>
      )}

      {/* ── Topbar desktop ── */}
      <div className={styles.topBar}>
        {isHost
          ? <button className={styles.leaveBtn} style={{ color: 'var(--red)', borderColor: 'var(--red)' }} onClick={handleCloseGame}>✕ Fermer la partie</button>
          : <button className={styles.leaveBtn} onClick={onLeave}>← Quitter</button>
        }
        <div className={styles.topCenter}>
          {turnState && <span className={styles.roundBadge}>Round {turnState.round}/{turnState.totalRounds}</span>}
          {phase === 'choosing' && (
            <span className={styles.waitingText}>
              {waitingName === user?.username ? 'Choisissez un mot…' : `${waitingName} choisit un mot…`}
            </span>
          )}
          {phase === 'drawing' && turnState && <WordDisplay mask={turnState.mask} word={turnState.word} />}
          {phase === 'turn-end' && turnEndWord && (
            <span className={styles.revealWord}>Le mot était : <strong>{turnEndWord}</strong></span>
          )}
          {phase === 'waiting' && <span className={styles.waitingText}>La partie commence…</span>}
        </div>
        {turnState && <TimerRing timeLeft={turnState.timeLeft} total={settings.timePerRound} />}
        <div className={styles.ambientControl}>
          <button className={`${styles.ambientBtn} ${ambientOn ? styles.ambientBtnOn : ''}`} onClick={toggleAmbient} title={ambientOn ? 'Couper la musique' : 'Musique ambiante'}>
            {ambientOn ? '🎵' : '🔇'}
          </button>
          <input type="range" min={0} max={1} step={0.05}
            value={ambientVolume}
            onChange={e => handleVolumeChange(Number(e.target.value))}
            className={styles.ambientSlider}
            title={`Volume : ${Math.round(ambientVolume * 100)}%`}
          />
        </div>
      </div>

      {/* ── Topbar mobile ── */}
      <div className={styles.mobileTopBar}>
        {/* Ligne 1 : quitter | round | son */}
        <div className={styles.mobileTopRow}>
          {isHost
            ? <button className={styles.mobileLeaveBtnRed} onClick={handleCloseGame}>✕</button>
            : <button className={styles.mobileLeaveBtn} onClick={onLeave}>←</button>
          }
          <div className={styles.mobileTopCenter}>
            {turnState && <span className={styles.mobileRoundBadge}>Round {turnState.round}/{turnState.totalRounds}</span>}
            {phase === 'choosing' && <span className={styles.mobileWaitingText}>{waitingName === user?.username ? 'Choisissez…' : `${waitingName} choisit…`}</span>}
            {phase === 'drawing' && turnState && <WordDisplay mask={turnState.mask} word={turnState.word} />}
            {phase === 'turn-end' && turnEndWord && <span className={styles.mobileRevealWord}>«&nbsp;{turnEndWord}&nbsp;»</span>}
            {phase === 'waiting' && <span className={styles.mobileWaitingText}>La partie commence…</span>}
          </div>
          <div className={styles.mobileTopRight}>
            {/* Bouton joueurs */}
            <button className={styles.mobilePlayersBtn} onClick={() => setMobilePlayersOpen(o => !o)}>
              👥 {turnState?.players?.length ?? 0}
            </button>
            {/* Son — icône uniquement */}
            <button className={`${styles.mobileAmbientBtn} ${ambientOn ? styles.ambientBtnOn : ''}`} onClick={toggleAmbient}>
              {ambientOn ? '🎵' : '🔇'}
            </button>
          </div>
        </div>

        {/* Ligne 2 : barre de progression timer */}
        {turnState && phase === 'drawing' && (
          <div className={styles.mobileTimerBar}>
            <div
              className={`${styles.mobileTimerFill} ${turnState.timeLeft <= 10 ? styles.mobileTimerUrgent : ''}`}
              style={{ width: `${(turnState.timeLeft / settings.timePerRound) * 100}%` }}
            />
          </div>
        )}
      </div>

      {/* ── Drawer joueurs mobile ── */}
      {mobilePlayersOpen && (
        <div className={styles.mobilePlayersOverlay} onClick={() => setMobilePlayersOpen(false)} />
      )}
      <div className={`${styles.mobilePlayersDrawer} ${mobilePlayersOpen ? styles.mobilePlayersDrawerOpen : ''}`}>
        <div className={styles.mobilePlayersHeader}>
          <span>Joueurs</span>
          <button onClick={() => setMobilePlayersOpen(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 18 }}>✕</button>
        </div>
        {(turnState?.players ?? []).map((p) => (
          <div key={p.id} className={styles.mobilePlayerRow}>
            <span className={styles.mobilePlayerName}>{p.username}{p.id === myId ? ' (moi)' : ''}{p.id === turnState?.drawerId ? ' ✏️' : ''}</span>
            <span className={styles.mobilePlayerScore}>{p.score} pts</span>
          </div>
        ))}
      </div>

      {/* Emojis flottants */}
      {floatingReactions.map(r => (
        <div key={r.id} className={styles.floatingReaction} style={{ left: `${r.x}%` }}>
          <span className={styles.floatingEmoji}>{r.emoji}</span>
          <span className={styles.floatingName}>{r.username}</span>
        </div>
      ))}

      {/* Barre de réactions — uniquement pour les non-dessinateurs */}
      <div className={styles.reactionBar}>
        {REACTION_EMOJIS.map(emoji => (
          <button key={emoji} className={styles.reactionBtn}
            onClick={() => !isDrawer && sendReaction(emoji)}
            disabled={isDrawer}
            title={isDrawer ? 'Vous dessinez !' : undefined}>
            {emoji}
          </button>
        ))}
      </div>

      <div className={styles.mainArea}>
        <aside className={styles.sidebar}>
          <div className={styles.sidebarTitle}>Joueurs</div>
          {turnState && <PlayerList players={turnState.players} drawerId={turnState.drawerId} myId={myId} disconnectedPlayers={disconnectedPlayers} />}
        </aside>
        <div className={`${styles.canvasWrap} ${turnState && turnState.timeLeft <= 10 && turnState.timeLeft > 0 && phase === 'drawing' ? styles.canvasUrgent : ''}`}>
          <DrawingCanvas isDrawer={isDrawer && phase === 'drawing'} onDraw={handleDraw} onClear={handleClear}
            onCanvasUpdate={isDrawer ? handleCanvasUpdate : undefined}
            restoreData={restoreCanvasData} />
        </div>
        <ChatArea lines={chatLines} onGuess={handleGuess} isDrawer={isDrawer} />
      </div>
    </div>
  )
}
