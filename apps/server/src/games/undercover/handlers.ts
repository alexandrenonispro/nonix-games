import type { Namespace } from 'socket.io'
import { UndercoverGame } from './UndercoverGame.js'
import { store } from '../../lib/store.js'

// ─── Map partagée — déclarée ici, utilisée partout ───────────────────────────
const games = new Map<string, UndercoverGame>()
const discussionTimers = new Map<string, NodeJS.Timeout>()

// ─── Exports pour socket/handlers.ts ─────────────────────────────────────────
export function setUndercoverGame(roomCode: string, game: UndercoverGame) {
  games.set(roomCode, game)
}
export function getUndercoverGame(roomCode: string) {
  return games.get(roomCode)
}
export function cleanupUndercover(roomCode: string) {
  games.delete(roomCode)
  const t = discussionTimers.get(roomCode)
  if (t) { clearInterval(t); discussionTimers.delete(roomCode) }
}

// ─── Handlers socket ──────────────────────────────────────────────────────────
export function handleUndercover(
  roomNS: Namespace,
  socket: any,
  user: { id: string; username: string; avatarUrl: string | null }
) {
  function getRoomCode(): string | null {
    const room = store.getRoomBySocket(socket.id)
    return room ? room.code : null
  }

  function broadcastState(roomCode: string, game: UndercoverGame) {
    roomNS.to(roomCode).emit('undercover:state', game.state)
    // Nettoyer après fin de partie
    if (game.state.phase === 'ended') {
      setTimeout(() => { games.delete(roomCode) }, 30000) // garde 30s pour le podium
    }
  }

  // Lancer la partie — le serveur récupère les membres depuis le store
  socket.on('undercover:start', (_data: any) => {
    const roomCode = getRoomCode()
    if (!roomCode) { console.log('[undercover] start: roomCode not found for socket', socket.id); return }
    if (games.has(roomCode)) { console.log('[undercover] start: game already exists for', roomCode); broadcastState(roomCode, games.get(roomCode)!); return }

    const room = store.get(roomCode)
    if (!room) { console.log('[undercover] start: room not found', roomCode); return }

    const members = Array.from((room as any).members.values()) as any[]
    const players = members.map(m => ({ id: m.id, username: m.username, avatarUrl: m.avatarUrl ?? null }))
    console.log('[undercover] starting game in', roomCode, 'with', players.length, 'players:', players.map(p => p.username))

    if (players.length < 4) { socket.emit('undercover:error', { reason: 'Il faut au moins 4 joueurs.' }); return }

    const game = new UndercoverGame(roomCode, players, roomNS)
    games.set(roomCode, game)
    broadcastState(roomCode, game)
  })

  socket.on('undercover:get-state', () => {
    const roomCode = getRoomCode()
    if (!roomCode) return
    const game = games.get(roomCode)
    if (!game) return
    socket.emit('undercover:state', game.state)
  })

  socket.on('undercover:describe', ({ description }: { description: string }) => {
    const roomCode = getRoomCode(); if (!roomCode) return
    const game = games.get(roomCode); if (!game) return
    const result = game.describe(user.id, description)
    if (!result.ok) { socket.emit('undercover:error', { reason: result.reason }); return }
    broadcastState(roomCode, game)
  })

  socket.on('undercover:start-vote', () => {
    const roomCode = getRoomCode(); if (!roomCode) return
    const game = games.get(roomCode); if (!game) return
    const timer = discussionTimers.get(roomCode)
    if (timer) { clearInterval(timer); discussionTimers.delete(roomCode) }
    game.startVote()
    broadcastState(roomCode, game)
  })

  socket.on('undercover:vote', ({ targetId }: { targetId: string }) => {
    const roomCode = getRoomCode(); if (!roomCode) return
    const game = games.get(roomCode); if (!game) return
    const result = game.vote(user.id, targetId)
    if (!result.ok) { socket.emit('undercover:error', { reason: result.reason }); return }
    broadcastState(roomCode, game)
  })

  socket.on('undercover:mrwhite-guess', ({ guess }: { guess: string }) => {
    const roomCode = getRoomCode(); if (!roomCode) return
    const game = games.get(roomCode); if (!game) return
    const result = game.mrWhiteGuess(user.id, guess)
    if (!result.ok) return
    broadcastState(roomCode, game)
  })

  socket.on('undercover:next-round', () => {
    const roomCode = getRoomCode(); if (!roomCode) return
    const game = games.get(roomCode); if (!game) return
    game.nextRound()
    broadcastState(roomCode, game)
  })

  socket.on('undercover:discussion-tick', () => {
    const roomCode = getRoomCode(); if (!roomCode) return
    const game = games.get(roomCode); if (!game || game.state.phase !== 'discussion') return
    game.state.discussionTimeLeft = Math.max(0, game.state.discussionTimeLeft - 1)
    roomNS.to(roomCode).emit('undercover:timer', { timeLeft: game.state.discussionTimeLeft })
    if (game.state.discussionTimeLeft <= 0) { game.startVote(); broadcastState(roomCode, game) }
  })
}
