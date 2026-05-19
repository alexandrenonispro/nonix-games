import { prisma } from '../../lib/prisma.js'
import { updatePlayerStats } from '../../lib/updateStats.js'
import { store } from '../../lib/store.js'
import type { Namespace } from 'socket.io'
import type { ServerMember } from '../../lib/store.js'
import { WORDS, pickWords, wordToMask, revealLetter } from './words.js'
import { guesserPoints, drawerPoints } from './scoring.js'

export interface DrawnixSettings {
  rounds: number
  timePerRound: number
  wordCount: number
}

export interface PlayerState {
  id: string
  username: string
  avatarUrl: string | null
  score: number
  hasGuessed: boolean
  guessRank: number // 0 = pas encore deviné
  socketId?: string
}

interface RoundState {
  round: number          // 1-based
  drawerId: string
  word: string
  mask: string
  timeLeft: number
  guessCount: number
  scores: Record<string, number>
  startedAt: number
}

export class DrawnixGame {
  private roomCode: string
  private ns: Namespace
  private settings: DrawnixSettings
  private players: PlayerState[]
  private drawerOrder: string[] = []  // userId[] pour ce round
  private currentRound = 0
  private roundState: RoundState | null = null
  private roundScores: Record<string, number> = {}
  private startedAt: Date = new Date()
  private turnHistory: {
    round: number
    turnIndex: number
    drawerId: string
    drawerName: string
    word: string
    canvasData: string // base64 PNG
    guessers: { userId: string; username: string; points: number; rank: number }[]
  }[] = []
  private currentTurnIndex = 0
  private lastDrawerId: string | null = null
  private usedWords = new Set<string>()
  private currentGuessers: { userId: string; username: string; points: number; rank: number }[] = []
  private pendingTurns = new Map<number, Omit<typeof this.turnHistory[0], 'canvasData'>>()
  private currentCanvasData: string = ''
  private pendingSnapshotSockets: Set<string> = new Set()
  private chatHistory: { authorId: string; author: string; content: string; type: 'guess' | 'system' | 'correct' | 'close' }[] = []
  private timer: ReturnType<typeof setInterval> | null = null
  private hintTimer: ReturnType<typeof setInterval> | null = null
  private wordChoiceTimers = new Map<string, ReturnType<typeof setTimeout>>()
  // Suivi inter-rounds
  private totalScores: Record<string, number> = {}
  private drawnInRounds: Set<string>[] = []

  constructor(roomCode: string, ns: Namespace, members: ServerMember[], settings: DrawnixSettings) {
    this.roomCode = roomCode
    this.ns = ns
    this.settings = settings
    this.players = members.map((m) => ({
      id: m.id, username: m.username, avatarUrl: m.avatarUrl,
      score: 0, hasGuessed: false, guessRank: 0,
    }))
    this.players.forEach((p) => { this.totalScores[p.id] = 0 })
    for (let i = 0; i < settings.rounds; i++) this.drawnInRounds.push(new Set())
  }

  // ── Start game ──────────────────────────────────────────────────────────────

  start() {
    this.currentRound = 0
    this.startedAt = new Date()
    this.turnHistory = []
    this.currentTurnIndex = 0
    this.usedWords.clear()
    setTimeout(() => this.startRound(), 800)
  }

  // ── Start round ─────────────────────────────────────────────────────────────

  private startRound() {
    this.currentRound++
    const round = this.currentRound
    this.roundScores = {}

    if (round > this.settings.rounds) {
      this.endGame()
      return
    }

    // Choisir l'ordre des dessinateurs — le dernier dessinateur ne peut pas commencer
    let order = this.players.map((p) => p.id).sort(() => Math.random() - 0.5)
    // Si le premier est le dernier dessinateur du round précédent, on le déplace en dernier
    if (this.lastDrawerId && order[0] === this.lastDrawerId && order.length > 1) {
      order = [...order.slice(1), order[0]]
    }
    this.drawerOrder = order
    this.drawnInRounds[round - 1] = new Set()

    console.log(`[drawnix] emitting drawnix:round-start to room ${this.roomCode}`)
    this.chatHistory.push({ authorId: '', author: '', content: `— Round ${round} / ${this.settings.rounds} —`, type: 'system' })
    this.ns.to(this.roomCode).emit('drawnix:round-start' as any, {
      round,
      totalRounds: this.settings.rounds,
      players: this.getPlayerStates(),
    })

    this.nextDrawer()
  }

  // ── Pick next drawer in this round ──────────────────────────────────────────

  private nextDrawer() {
    const round = this.currentRound
    const drawnSet = this.drawnInRounds[round - 1]!

    const nextDrawerId = this.drawerOrder.find((id) => !drawnSet.has(id))
    console.log(`[drawnix] nextDrawer - round ${round}, drawnSet:`, [...drawnSet], 'nextDrawerId:', nextDrawerId)

    if (!nextDrawerId) {
      // Tout le monde a dessiné ce round — ne rien faire ici
      // endTurn() gère le recap et appelle startRound()
      return
    }

    drawnSet.add(nextDrawerId)
    // Exclure les mots déjà utilisés dans cette partie
    const available = WORDS.filter(w => !this.usedWords.has(w))
    const pool = available.length >= (this.settings.wordCount ?? 4) ? available : WORDS
    const words = [...pool].sort(() => Math.random() - 0.5).slice(0, this.settings.wordCount ?? 4)

    const drawerName = this.players.find(p => p.id === nextDrawerId)?.username ?? ''
    this.chatHistory.push({ authorId: '', author: '', content: `C'est au tour de ${drawerName} de dessiner !`, type: 'system' })

    // 1. waiting-choice d'abord
    this.ns.to(this.roomCode).emit('drawnix:waiting-choice' as any, {
      drawerId: nextDrawerId,
      drawerName: this.players.find((p) => p.id === nextDrawerId)?.username ?? '',
    })
    // 2. choose-word ensuite (une seule fois)
    this.ns.to(this.roomCode).emit('drawnix:choose-word' as any, { words, drawerId: nextDrawerId })

    // Si le dessinateur ne choisit pas dans 15s → choisir aléatoirement
    const t = setTimeout(() => {
      this.beginTurn(nextDrawerId, words[0]!)
    }, 15000)
    this.wordChoiceTimers.set(nextDrawerId, t)
  }

  // ── Player chose a word ──────────────────────────────────────────────────────

  chooseWord(drawerId: string, word: string) {
    const t = this.wordChoiceTimers.get(drawerId)
    if (t) { clearTimeout(t); this.wordChoiceTimers.delete(drawerId) }
    this.beginTurn(drawerId, word)
  }

  // ── Begin drawing turn ──────────────────────────────────────────────────────

  private beginTurn(drawerId: string, word: string) {
    this.clearTimers()

    const mask = wordToMask(word)
    this.roundState = {
      round: this.currentRound,
      drawerId,
      word,
      mask: mask,
      timeLeft: this.settings.timePerRound,
      guessCount: 0,
      scores: {},
      startedAt: Date.now(),
    }

    this.currentCanvasData = ''
    this.roundScores = {} // Reset scores du tour courant
    this.currentGuessers = []
    // Reset hasGuessed pour tous
    this.players.forEach((p) => { p.hasGuessed = false; p.guessRank = 0 })

    // Envoyer à toute la room — word est null pour les non-dessinateurs
    // Le serveur inclut le word chiffré : chaque client reçoit le même event
    // mais word est null sauf pour le dessinateur (filtré côté client via drawerId)
    // Pour la sécurité on envoie deux events séparés via le store
    const payload = {
      drawerId, mask,
      timeLeft: this.settings.timePerRound,
      players: this.getPlayerStates(),
      round: this.currentRound,
      totalRounds: this.settings.rounds,
    }
    // Envoyer avec word=null à tous d'abord
    this.ns.to(this.roomCode).emit('drawnix:turn-start' as any, { ...payload, word: null })
    // Puis envoyer avec le vrai mot uniquement au dessinateur via son socketId
    // Utiliser le store pour avoir le socketId live
    const room = store.get(this.roomCode)
    const drawerMember = room?.members.get(drawerId)
    if (drawerMember?.socketId) {
      const drawerSocket = this.ns.sockets.get(drawerMember.socketId)
      console.log(`[drawnix] sending word-reveal to drawer ${drawerId}, socket: ${drawerMember.socketId}, found: ${!!drawerSocket}`)
      drawerSocket?.emit('drawnix:word-reveal' as any, { word })
    } else {
      console.log(`[drawnix] drawer ${drawerId} socket not found in store`)
    }

    // Timer principal
    this.timer = setInterval(() => this.tick(), 1000)

    // Hints : révéler une lettre à 40s et 20s restantes
    this.scheduleHints()
  }

  // ── Tick ────────────────────────────────────────────────────────────────────

  private tick() {
    if (!this.roundState) return
    this.roundState.timeLeft--
    this.ns.to(this.roomCode).emit('drawnix:tick' as any, {
      timeLeft: this.roundState.timeLeft,
    })
    if (this.roundState.timeLeft <= 0) this.endTurn()
  }

  // ── Hints ───────────────────────────────────────────────────────────────────

  private scheduleHints() {
    const { timePerRound } = this.settings
    const hint1At = timePerRound - Math.floor(timePerRound * 0.4)
    const hint2At = timePerRound - Math.floor(timePerRound * 0.7)

    this.hintTimer = setInterval(() => {
      if (!this.roundState) return
      const tl = this.roundState.timeLeft
      if (tl === hint1At || tl === hint2At) {
        this.roundState.mask = revealLetter(this.roundState.mask, this.roundState.word)
        const liveRoom = store.get(this.roomCode)
        const exceptId = liveRoom?.members.get(this.roundState!.drawerId)?.socketId ?? ''
        if (exceptId) {
          this.ns.to(this.roomCode).except(exceptId).emit('drawnix:hint' as any, { mask: this.roundState.mask })
        } else {
          this.ns.to(this.roomCode).emit('drawnix:hint' as any, { mask: this.roundState.mask })
        }
      }
    }, 1000)
  }

  // ── Handle guess ─────────────────────────────────────────────────────────────

  handleGuess(playerId: string, guess: string): 'correct' | 'close' | 'wrong' {
    if (!this.roundState) return 'wrong'
    const state = this.roundState

    if (playerId === state.drawerId) return 'wrong'

    const player = this.players.find((p) => p.id === playerId)
    if (!player || player.hasGuessed) return 'wrong'

    const normalise = (s: string) => s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim()
    const guessNorm = normalise(guess)
    const wordNorm  = normalise(state.word)

    if (guessNorm === wordNorm) {
      // Bonne réponse !
      player.hasGuessed = true
      state.guessCount++
      player.guessRank = state.guessCount

      const pts = guesserPoints(state.guessCount, state.timeLeft, this.settings.timePerRound)
      player.score += pts
      state.scores[playerId] = (state.scores[playerId] ?? 0) + pts
      this.totalScores[playerId] = (this.totalScores[playerId] ?? 0) + pts
      this.roundScores[playerId] = (this.roundScores[playerId] ?? 0) + pts
      this.currentGuessers.push({ userId: playerId, username: player.username, points: pts, rank: state.guessCount })

      this.chatHistory.push({ authorId: playerId, author: player.username, content: `✓ ${player.username} a trouvé ! (+${pts} pts)`, type: 'correct' })
      // Notifier tout le monde
      this.ns.to(this.roomCode).emit('drawnix:guessed' as any, {
        playerId,
        playerName: player.username,
        points: pts,
        players: this.getPlayerStates(),
      })

      // Si tout le monde a deviné → fin du tour
      const guessers = this.players.filter((p) => p.id !== state.drawerId)
      if (guessers.every((p) => p.hasGuessed)) {
        this.endTurn()
      }

      return 'correct'
    }

    // Proche (1 lettre de différence)
    if (this.levenshtein(guessNorm, wordNorm) <= 1) return 'close'

    return 'wrong'
  }

  // ── End turn ────────────────────────────────────────────────────────────────

  private endTurn() {
    if (!this.roundState) return
    this.clearTimers()

    const state = this.roundState
    const totalGuessers = this.players.filter((p) => p.id !== state.drawerId).length
    const drawerPts = drawerPoints(state.guessCount, totalGuessers)

    const drawer = this.players.find((p) => p.id === state.drawerId)
    if (drawer) {
      drawer.score += drawerPts
      this.totalScores[state.drawerId] = (this.totalScores[state.drawerId] ?? 0) + drawerPts
      this.roundScores[state.drawerId] = (this.roundScores[state.drawerId] ?? 0) + drawerPts
    }

    // Stocker le turn AVANT d'incrémenter
    const snapTurnIndex = this.currentTurnIndex
    this.pendingTurns.set(snapTurnIndex, {
      round: this.currentRound,
      turnIndex: snapTurnIndex,
      drawerId: state.drawerId,
      drawerName: this.players.find(p => p.id === state.drawerId)?.username ?? '',
      word: state.word,
      guessers: [...this.currentGuessers],
    })
    this.currentTurnIndex++

    // Demander un snapshot (avec l'index avant incrément)
    // (déjà stocké dans snapTurnIndex)
    const drawerRoom = store.get(this.roomCode)
    const drawerMember = drawerRoom?.members.get(state.drawerId)
    if (drawerMember?.socketId) {
      const drawerSocket = this.ns.sockets.get(drawerMember.socketId)
      console.log(`[drawnix] requesting snapshot for turn ${snapTurnIndex} from ${state.drawerId}`)
      drawerSocket?.emit('drawnix:request-snapshot' as any, {
        turnIndex: snapTurnIndex,
        word: state.word,
        round: this.currentRound,
      })
    }

    this.ns.to(this.roomCode).emit('drawnix:turn-end' as any, {
      word: state.word,
      drawerPoints: drawerPts,
      players: this.getPlayerStates(),
    })

    // Mémoriser le dernier dessinateur
    this.lastDrawerId = state.drawerId

    // Récap après chaque tour de dessin
    const drawnSet = this.drawnInRounds[this.currentRound - 1]!
    const allDrawn = this.drawerOrder.every((id) => drawnSet.has(id))

    const turnScoresSummary = this.players.map((p) => ({
      id: p.id,
      username: p.username,
      avatarUrl: p.avatarUrl,
      totalScore: p.score,
      roundScore: this.roundScores[p.id] ?? 0,
    }))

    this.chatHistory.push({ authorId: '', author: '', content: `Le mot était : "${state.word}"`, type: 'system' })

    this.ns.to(this.roomCode).emit('drawnix:round-recap' as any, {
      round: this.currentRound,
      totalRounds: this.settings.rounds,
      scores: turnScoresSummary,
      isLastTurn: allDrawn,
      word: state.word,
    })

    // Après 5s : tour suivant ou nouveau round
    setTimeout(() => {
      if (allDrawn) {
        this.startRound()
      } else {
        this.nextDrawer()
      }
    }, 5000)
  }

  // ── End game ─────────────────────────────────────────────────────────────────

  private endGame() {
    const rankings = [...this.players]
      .sort((a, b) => b.score - a.score)
      .map((p, i) => ({ ...p, rank: i + 1 }))

    this.ns.to(this.roomCode).emit('drawnix:game-end' as any, { rankings })

    console.log('[drawnix] game ended, saving history in 3s...')
    // Sauvegarder l'historique après 5s (laisser les snapshots arriver)
    setTimeout(() => this.saveHistory(rankings), 5000)
  }

  private async saveHistory(rankings: any[]) {
    console.log('[drawnix] saving history, turns:', this.turnHistory.length, 'rankings:', rankings.length)
    try {
      const endedAt = new Date()
      const durationMs = endedAt.getTime() - this.startedAt.getTime()

      await prisma.drawnixHistory.create({
        data: {
          roomCode: this.roomCode,
          startedAt: this.startedAt,
          endedAt,
          settings: {
            rounds: this.settings.rounds,
            timePerRound: this.settings.timePerRound,
            wordCount: this.settings.wordCount,
            durationMs,
          },
          rankings: rankings.map(r => ({
            userId: r.id,
            username: r.username,
            avatarUrl: r.avatarUrl,
            score: r.score,
            rank: r.rank,
          })),
          turns: {
            create: this.turnHistory.map(t => ({
              round: t.round,
              turnIndex: t.turnIndex,
              drawerId: t.drawerId,
              drawerName: t.drawerName,
              word: t.word,
              canvasData: t.canvasData || '',
              guessers: t.guessers,
            })),
          },
        },
      })
      console.log(`[drawnix] history saved for room ${this.roomCode}`)
      // Mise à jour des stats
      await updatePlayerStats('skribble', rankings.map((r, i) => ({
        userId: r.id,
        rank: r.rank,
        isWinner: r.rank === 1,
        totalPlayers: rankings.length,
      })))
    } catch (err) {
      console.error('[drawnix] failed to save history:', err)
    }
  }

  // ── Relay draw strokes ───────────────────────────────────────────────────────

  relayStroke(drawerId: string, action: any) {
    if (this.roundState?.drawerId !== drawerId) return
    const room = store.get(this.roomCode)
    const exceptId = room?.members.get(drawerId)?.socketId ?? ''
    if (exceptId) {
      this.ns.to(this.roomCode).except(exceptId).emit('drawnix:stroke' as any, action)
    } else {
      this.ns.to(this.roomCode).emit('drawnix:stroke' as any, action)
    }
  }

  relayClear(drawerId: string) {
    if (this.roundState?.drawerId !== drawerId) return
    const room = store.get(this.roomCode)
    const exceptId = room?.members.get(drawerId)?.socketId ?? ''
    if (exceptId) {
      this.ns.to(this.roomCode).except(exceptId).emit('drawnix:clear' as any)
    } else {
      this.ns.to(this.roomCode).emit('drawnix:clear' as any)
    }
  }

  // ── Helpers ──────────────────────────────────────────────────────────────────

  private getPlayerStates() {
    return this.players.map((p) => ({ ...p }))
  }

  private findSocket(userId: string) {
    const player = this.players.find((p) => p.id === userId)
    if (!player) { console.log(`[drawnix] findSocket: player ${userId} not found`); return null }
    // Chercher via socketId stocké dans les players
    const targetSocketId = player.socketId
    if (targetSocketId && this.ns.sockets.has(targetSocketId)) {
      return this.ns.sockets.get(targetSocketId)!
    }
    // Fallback: chercher par userId dans socket.data
    for (const [sid, socket] of this.ns.sockets) {
      if ((socket.data as any)?.user?.id === userId) {
        console.log(`[drawnix] findSocket: found ${userId} via data scan`)
        return socket
      }
    }
    console.log(`[drawnix] findSocket: socket not found for ${userId}, available sockets:`, [...this.ns.sockets.keys()])
    return null
  }

  private clearTimers() {
    if (this.timer) { clearInterval(this.timer); this.timer = null }
    if (this.hintTimer) { clearInterval(this.hintTimer); this.hintTimer = null }
  }

  private levenshtein(a: string, b: string): number {
    const dp = Array.from({ length: a.length + 1 }, (_, i) =>
      Array.from({ length: b.length + 1 }, (_, j) => (i === 0 ? j : j === 0 ? i : 0))
    )
    for (let i = 1; i <= a.length; i++)
      for (let j = 1; j <= b.length; j++)
        dp[i]![j] = a[i-1] === b[j-1]
          ? dp[i-1]![j-1]!
          : 1 + Math.min(dp[i-1]![j]!, dp[i]![j-1]!, dp[i-1]![j-1]!)
    return dp[a.length]![b.length]!
  }

  updateCanvasSnapshot(canvasData: string) {
    this.currentCanvasData = canvasData
  }

  addChatMessage(msg: { authorId: string; author: string; content: string; type: 'guess' | 'system' | 'correct' | 'close' }) {
    this.chatHistory.push(msg)
    // Garder les 200 derniers messages
    if (this.chatHistory.length > 200) this.chatHistory.shift()
  }

  getChatHistory() {
    return this.chatHistory
  }

  addPendingSnapshotSocket(socketId: string) {
    this.pendingSnapshotSockets.add(socketId)
  }

  getPendingSnapshotSockets(): string[] {
    return [...this.pendingSnapshotSockets]
  }

  clearPendingSnapshotSockets() {
    this.pendingSnapshotSockets.clear()
  }

  receiveSnapshot(turnIndex: number, canvasData: string) {
    console.log(`[drawnix] received snapshot for turn ${turnIndex}, size: ${canvasData.length}`)
    const pending = this.pendingTurns.get(turnIndex)
    if (pending) {
      this.turnHistory.push({ ...pending, canvasData })
      this.pendingTurns.delete(turnIndex)
      console.log(`[drawnix] turn ${turnIndex} saved, total turns: ${this.turnHistory.length}`)
    } else {
      console.log(`[drawnix] no pending turn for index ${turnIndex}, pending:`, [...this.pendingTurns.keys()])
    }
  }

  getState() {
    if (!this.roundState) return null
    console.log(`[drawnix] getState - canvasData size: ${this.currentCanvasData.length}`)
    return {
      round: this.currentRound,
      totalRounds: this.settings.rounds,
      drawerId: this.roundState.drawerId,
      mask: this.roundState.mask,
      word: null,
      timeLeft: this.roundState.timeLeft,
      players: this.getPlayerStates(),
      canvasData: this.currentCanvasData,
      chatHistory: this.chatHistory,
    }
  }

  getDrawerWord(userId: string): string | null {
    if (!this.roundState) return null
    if (this.roundState.drawerId !== userId) return null
    return this.roundState.word
  }

  cleanup() {
    this.clearTimers()
    this.wordChoiceTimers.forEach((t) => clearTimeout(t))
    this.wordChoiceTimers.clear()
  }
}
