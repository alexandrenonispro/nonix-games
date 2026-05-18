import { DrawnixGame } from '../../games/drawnix/DrawnixGame.js'
import { handleSmileLife, cleanupSmileLife, clearAllSmileLifeGames } from '../../games/smilelife/handlers.js'
import { handleUndercover, cleanupUndercover, setUndercoverGame, getUndercoverGame } from '../../games/undercover/handlers.js'
import { UndercoverGame } from '../../games/undercover/UndercoverGame.js'
import type { Namespace, Socket } from 'socket.io'
import { store } from '../../lib/store.js'
import { generateRoomCode } from '../../lib/room-code.js'
import type { GameId, GameSettings } from '@game-platform/shared'

function defaultSettings(gameId: GameId): GameSettings {
  if (gameId === 'quiz')       return { gameId, rounds: 10, timePerQuestion: 20, theme: null }
  if (gameId === 'skribble')   return { gameId, rounds: 3, timePerRound: 60, wordCount: 4, language: 'fr' }
  if (gameId === 'loup_garou') return { gameId, dayDuration: 120, nightDuration: 30, roles: ['werewolf', 'seer'] }
  if (gameId === 'blind_test') return { gameId, rounds: 10, timePerTrack: 30, genres: [] }
  return { gameId: 'undercover', rounds: 5, timePerVote: 60 }
}

function roomToDTO(room: ReturnType<typeof store.get>) {
  if (!room) return null
  return {
    id: room.id, code: room.code, hostId: room.hostId, gameId: room.gameId,
    status: room.status, maxPlayers: room.maxPlayers,
    settings: room.settings, createdAt: room.createdAt,
  }
}

// Ensemble des joueurs en cours de reconnexion
const reconnecting = new Set<string>()
// Instances de jeu actives par room
const gameInstances = new Map<string, DrawnixGame>()
const undercoverInstances = new Map<string, UndercoverGame>()

// Appelé au démarrage du serveur pour nettoyer les parties en cours
export function clearAllGames() {
  gameInstances.clear()
  clearAllSmileLifeGames()
}

export function registerRoomHandlers(roomNS: Namespace, socket: Socket) {
  const user = socket.data.user

  // ── Create room ────────────────────────────────────────────────────────────

  socket.on('room:create', async ({ gameId, maxPlayers, settings }) => {
    const code = generateRoomCode()
    const room = {
      id: crypto.randomUUID(),
      code,
      hostId: user.id,
      hostUsername: user.username,
      gameId,
      status: 'waiting' as const,
      maxPlayers,
      settings: settings ?? defaultSettings(gameId),
      members: new Map(),
      messages: [],
      createdAt: new Date().toISOString(),
    }

    store.create(room)
    store.addMember(code, { ...user, isReady: false, joinedAt: new Date().toISOString() })
    await socket.join(code)

    socket.emit('room:state', {
      room: roomToDTO(store.get(code))!,
      members: [{ ...user, isReady: false, joinedAt: room.createdAt }],
      chat: [],
    })


    // Notifier le lobby de la nouvelle room
    roomNS.server.of('/lobby').to('lobby-general').emit('lobby:room-opened' as any, {
      code, gameId, playerCount: 1, maxPlayers, status: 'waiting', hostName: user.username,
    })
    console.log(`[room] ${user.username} created room ${code} (${gameId})`)
  })

  // ── Join room ──────────────────────────────────────────────────────────────

  socket.on('room:join', async ({ roomCode }) => {
    const room = store.get(roomCode)

    if (!room) {
      socket.emit('room:error', { code: 'ROOM_NOT_FOUND', message: 'Room introuvable.' })
      return
    }
    const existing = room.members.get(user.id)
    const isReconnect = existing !== undefined || reconnecting.has(user.id)

    if (room.status !== 'waiting' && !isReconnect) {
      socket.emit('room:error', { code: 'ROOM_IN_PROGRESS', message: 'La partie est déjà commencée.' })
      return
    }

    // Si la room est pleine et que ce n'est PAS une reconnexion, refuser
    if (!isReconnect && room.members.size >= room.maxPlayers) {
      socket.emit('room:error', { code: 'ROOM_FULL', message: 'La room est pleine.' })
      return
    }

    // Marquer comme plus en train de se reconnecter
    reconnecting.delete(user.id)

    // Mettre à jour le socketId (important pour le kick et le store)
    if (existing) {
      store.removeMemberById(user.id, roomCode)
    }

    const member = {
      ...user,
      isReady: existing?.isReady ?? false,
      joinedAt: existing?.joinedAt ?? new Date().toISOString(),
    }
    store.addMember(roomCode, member)
    await socket.join(roomCode)

    socket.emit('room:state', {
      room: roomToDTO(room)!,
      members: Array.from(room.members.values()).map((m) => ({
        id: m.id, username: m.username, avatarUrl: m.avatarUrl,
        level: m.level, rank: m.rank, isReady: m.isReady, joinedAt: m.joinedAt,
      })),
      chat: store.getMessages(roomCode),
    })

    // Notifier les autres de la reconnexion
    if (room.status === 'in_game' && isReconnect) {
      roomNS.to(roomCode).except(socket.id).emit('drawnix:player-reconnected' as any, { userId: user.id, username: user.username })
      gameInstances.get(roomCode)?.addChatMessage({ authorId: '', author: '', content: '✅ ' + user.username + ' s’est reconnecté !', type: 'system' })
    }

    // Si une partie est en cours → envoyer l'état du jeu au reconnectant
    if (room.status === 'in_game') {
      const game = gameInstances.get(roomCode)
      if (game) {
        const gameState = game.getState()
        if (gameState) {
          const word = game.getDrawerWord(user.id)
          socket.emit('drawnix:reconnect-state' as any, {
            ...gameState,
            word,
          })
          console.log(`[room] sent game state to reconnecting player ${user.username}`)

          // Demander au dessinateur un snapshot frais si ce n'est pas lui qui revient
          if (gameState.drawerId !== user.id) {
            // Enregistrer ce socket comme en attente de snapshot
            game.addPendingSnapshotSocket(socket.id)
            const drawerMember = room.members.get(gameState.drawerId)
            if (drawerMember?.socketId) {
              const drawerSocket = roomNS.sockets.get(drawerMember.socketId)
              drawerSocket?.emit('drawnix:request-canvas-snapshot' as any)
              console.log(`[room] requested fresh canvas snapshot from drawer`)
            }
          }
        }
      }
    }

    // Broadcaster uniquement si c'est un vrai nouveau joueur (pas une reconnexion)
    if (!isReconnect) {
      socket.to(roomCode).emit('room:player-joined', {
        player: { ...user, isReady: false, joinedAt: member.joinedAt },
      })
    }

    console.log(`[room] ${user.username} ${isReconnect ? 'reconnected to' : 'joined'} room ${roomCode}`)
  })

  // ── Leave room ─────────────────────────────────────────────────────────────

  socket.on('room:leave', () => handleLeave(socket, roomNS, false))

  socket.on('disconnect', () => handleLeave(socket, roomNS, true))

  // ── Kick player (host only) ────────────────────────────────────────────────

  socket.on('room:kick', ({ userId: targetId }: { userId: string }) => {
    const room = store.getRoomBySocket(socket.id)
    if (!room) return
    if (room.hostId !== user.id) {
      socket.emit('room:error', { code: 'NOT_HOST', message: "Seul l'hôte peut kicker." })
      return
    }
    if (targetId === user.id) return

    const target = room.members.get(targetId)
    if (!target) return

    const targetSocket = roomNS.sockets.get(target.socketId)

    // Retirer du store AVANT de déconnecter le socket
    // pour que le handler disconnect ne le re-traite pas
    store.removeMemberById(targetId, room.code)

    // Notifier tout le monde
    roomNS.to(room.code).emit('room:player-left', { userId: targetId, newHostId: null })

    // Notifier + déconnecter le joueur kické
    if (targetSocket) {
      targetSocket.emit('room:kicked' as any, { reason: "Vous avez été expulsé par l'hôte." })
      targetSocket.leave(room.code)
      // On marque ce socket comme "kicked" pour ignorer son disconnect
      ;(targetSocket as any).__kicked = true
    }

    console.log(`[room] ${user.username} kicked ${target.username} from ${room.code}`)
  })

  // ── Ready toggle ───────────────────────────────────────────────────────────

  socket.on('room:player-ready', ({ isReady }) => {
    const room = store.getRoomBySocket(socket.id)
    if (!room) return
    store.setMemberReady(room.code, user.id, isReady)
    roomNS.to(room.code).emit('room:player-ready', { userId: user.id, isReady })
  })

  // ── Change game ────────────────────────────────────────────────────────────

  socket.on('room:change-game', ({ gameId, settings }) => {
    const room = store.getRoomBySocket(socket.id)
    if (!room || room.hostId !== user.id) {
      socket.emit('room:error', { code: 'NOT_HOST', message: "Seul l'hôte peut changer le jeu." })
      return
    }
    room.gameId = gameId
    room.settings = settings ?? defaultSettings(gameId)
    roomNS.to(room.code).emit('room:game-changed', { gameId, settings: room.settings })
  })

  // ── Chat ───────────────────────────────────────────────────────────────────

  socket.on('chat:send', ({ content }) => {
    const room = store.getRoomBySocket(socket.id)
    if (!room || !content.trim()) return
    const msg = {
      id: crypto.randomUUID(),
      author: { id: user.id, username: user.username, avatarUrl: user.avatarUrl, level: user.level, rank: user.rank },
      content: content.trim().slice(0, 200),
      type: 'text' as const,
      sentAt: new Date().toISOString(),
    }
    store.addMessage(room.code, msg)
    roomNS.to(room.code).emit('chat:message', msg)
  })

  // ── Start game ─────────────────────────────────────────────────────────────

  socket.on('game:start', () => {
    const room = store.getRoomBySocket(socket.id)
    if (!room) return
    if (room.hostId !== user.id) {
      socket.emit('room:error', { code: 'NOT_HOST', message: "Seul l'hôte peut lancer la partie." })
      return
    }
    const nonHostMembers = Array.from(room.members.values()).filter((m) => m.id !== room.hostId)
    if (nonHostMembers.some((m) => !m.isReady)) {
      socket.emit('room:error', { code: 'NOT_ALL_READY', message: 'Tous les joueurs ne sont pas prêts.' })
      return
    }
    if (room.gameId === 'undercover' && room.members.size < 4) {
      socket.emit('room:error', { code: 'NOT_ENOUGH_PLAYERS', message: 'Undercover nécessite au moins 4 joueurs.' })
      return
    }

    room.status = 'starting'
    let count = 3
    roomNS.to(room.code).emit('game:starting', { sessionId: crypto.randomUUID(), countdown: count })

    const interval = setInterval(() => {
      count--
      if (count > 0) {
        roomNS.to(room.code).emit('game:starting', { sessionId: '', countdown: count })
      } else {
        clearInterval(interval)
        room.status = 'in_game'

        // Signaler countdown=0 pour que les clients naviguent vers le jeu
        roomNS.to(room.code).emit('game:starting', { sessionId: '', countdown: 0 })

        if (room.gameId === 'skribble') {
          const settings = room.settings as any
          const members = Array.from(room.members.values())
          const game = new DrawnixGame(room.code, roomNS, members, {
            rounds: settings.rounds ?? 3,
            timePerRound: settings.timePerRound ?? 60,
            wordCount: settings.wordCount ?? 4,
          })
          gameInstances.set(room.code, game)
          game.start()
        }

        console.log(`[room] game started in room ${room.code} (${room.gameId})`)
      }
    }, 1000)
  })

  // ── SmileLife handlers ────────────────────────────────────────────────────────
  handleSmileLife(roomNS.server, socket, roomNS, user)

  // ── Undercover handlers ───────────────────────────────────────────────────────
  handleUndercover(roomNS, socket, user)

  // Renvoyer l'état undercover si le joueur rejoint une partie en cours
  socket.on('undercover:request-state', ({ roomCode }: { roomCode?: string } = {}) => {
    const room = store.getRoomBySocket(socket.id) ?? (roomCode ? store.get(roomCode) : null)
    if (!room) { console.log('[undercover] request-state: room not found for', socket.id, roomCode); return }
    const game = undercoverInstances.get(room.code)
    console.log('[undercover] request-state roomCode:', room.code, 'game found:', !!game)
    if (game) socket.emit('undercover:state', game.state)
  })

  // ── Game actions ──────────────────────────────────────────────────────────────

  socket.on('game:action' as any, (action: { type: string; data: any }) => {
    const room = store.getRoomBySocket(socket.id)
    if (!room) return
    const game = gameInstances.get(room.code)
    if (!game) return

    console.log(`[room] game:action ${action.type} from ${user.username}`)

    if (action.type === 'drawnix:choose-word') {
      game.chooseWord(user.id, (action.data as any).word)
    }
    if (action.type === 'drawnix:snapshot') {
      game.receiveSnapshot((action.data as any).turnIndex, (action.data as any).canvasData)
    }
    if (action.type === 'drawnix:close-game' || action.type === 'smilelife:close-game' || action.type === 'undercover:close') {
      // Seul l'hôte peut fermer la partie
      if (room.hostId !== user.id) return
      game.cleanup()
      gameInstances.delete(room.code)
      cleanupSmileLife(room.code)
      cleanupUndercover(room.code)
      undercoverInstances.delete(room.code)
      // Kicker tout le monde
      for (const m of Array.from(room.members.values())) {
        const s = roomNS.sockets.get(m.socketId)
        if (s) {
          s.emit('room:kicked' as any, { reason: "L'hôte a fermé la partie." })
          s.leave(room.code)
          ;(s as any).__kicked = true
        }
        store.removeMemberById(m.id, room.code)
      }
      socket.emit('room:room-closed' as any)
      store.delete(room.code)
      roomNS.server.of('/lobby').to('lobby-general').emit('lobby:room-closed' as any, { code: room.code })
      // Nettoyer localStorage côté client via l'event kicked
      console.log('[room] host closed game in room', room.code)
      return
    }

    if (action.type === 'drawnix:reaction') {
      // Relayer la réaction à tous les autres joueurs
      roomNS.to(room.code).except(socket.id).emit('drawnix:reaction' as any, {
        emoji: (action.data as any).emoji,
        username: (action.data as any).username,
      })
      return
    }

    if (action.type === 'drawnix:canvas-update') {
      const canvasData = (action.data as any).canvasData
      game.updateCanvasSnapshot(canvasData)
      // Relayer le canvas à tous les spectateurs (pour undo en temps réel)
      socket.to(room.code).emit('drawnix:canvas-live' as any, { canvasData })
      // Envoyer aux joueurs qui attendent le snapshot (reconnectants)
      const pendingSockets = game.getPendingSnapshotSockets()
      for (const sid of pendingSockets) {
        const s = roomNS.sockets.get(sid)
        s?.emit('drawnix:canvas-snapshot' as any, { canvasData })
      }
      game.clearPendingSnapshotSockets()
    }
    if (action.type === 'drawnix:guess') {
      const guess = (action.data as any).guess
      const result = game.handleGuess(user.id, guess)
      if (result === 'close') {
        socket.emit('drawnix:close' as any, { guess })
        game.addChatMessage({ authorId: user.id, author: user.username, content: '"' + guess + '" est tres proche !', type: 'close' })
      } else if (result === 'wrong') {
        const msg = { authorId: user.id, author: user.username, content: guess, type: 'guess' as const }
        game.addChatMessage(msg)
        roomNS.to(room.code).emit('drawnix:chat' as any, msg)
      }
    }
  })

  // ── Drawnix drawing ───────────────────────────────────────────────────────────

  socket.on('skribble:draw' as any, (stroke: any) => {
    const room = store.getRoomBySocket(socket.id)
    if (!room) return
    gameInstances.get(room.code)?.relayStroke(user.id, stroke)
  })

  socket.on('skribble:clear' as any, () => {
    const room = store.getRoomBySocket(socket.id)
    if (!room) return
    gameInstances.get(room.code)?.relayClear(user.id)
  })
}

// ─── Leave helper ─────────────────────────────────────────────────────────────

function handleLeave(socket: Socket, roomNS: Namespace, isDisconnect: boolean) {
  // Ignorer si ce socket vient d'être kické (déjà traité)
  if ((socket as any).__kicked) return

  const room = store.getRoomBySocket(socket.id)
  if (!room) return

  const member = Array.from(room.members.values()).find((m) => m.socketId === socket.id)
  if (!member) return

  if (isDisconnect) {
    // Marquer comme en reconnexion SANS retirer du store
    // Le membre reste dans la room pendant 8s
    reconnecting.add(member.id)

    // Mettre à jour le socketId à vide pour libérer l'ancien
    store.updateSocketId(member.id, room.code, '')

    // Notifier les autres de la déconnexion
    if (room.status === 'in_game') {
      roomNS.to(room.code).emit('drawnix:player-disconnected' as any, { userId: member.id, username: member.username })
      gameInstances.get(room.code)?.addChatMessage({ authorId: '', author: '', content: '⚠️ ' + member.username + ' s’est déconnecté…', type: 'system' })
    }

    // Timeout plus long si partie en cours (60s), sinon 8s
    const timeoutMs = room.status === 'in_game' ? 60000 : 8000
    console.log(`[room] ${member.username} disconnected, waiting ${timeoutMs/1000}s for reconnect`)

    setTimeout(() => {
      if (reconnecting.has(member.id)) {
        reconnecting.delete(member.id)
        store.removeMemberById(member.id, room.code)

        const currentRoom = store.get(room.code)
        if (currentRoom) {
          broadcastLeave(roomNS, currentRoom, member, true)
        }

        // Nettoyer le jeu si plus de joueurs
        if (!store.get(room.code)) {
          gameInstances.get(room.code)?.cleanup()
          gameInstances.delete(room.code)
        }

        console.log(`[room] ${member.username} timed out from room ${room.code}`)
      }
    }, timeoutMs)
  } else {
    // Quitter volontaire
    store.removeMember(socket.id)
    const currentRoom = store.get(room.code)

    // Si c'est l'hôte qui quitte et qu'il reste des joueurs → tous kickés
    if (room.hostId === member.id && currentRoom && currentRoom.members.size > 0) {
      // Envoyer room:kicked aux autres joueurs, room:room-closed à l'hôte
      for (const m of Array.from(currentRoom.members.values())) {
        const s = roomNS.sockets.get(m.socketId)
        if (s) {
          s.emit('room:kicked' as any, { reason: "L'hôte a quitté la room." })
          s.leave(room.code)
          ;(s as any).__kicked = true
        }
        store.removeMemberById(m.id, room.code)
      }
      // Notifier l'hôte lui-même avec un event distinct
      socket.emit('room:room-closed' as any)
      store.delete(room.code)
      roomNS.server.of('/lobby').to('lobby-general').emit('lobby:room-closed' as any, { code: room.code })
      console.log(`[room] host ${member.username} left — room ${room.code} closed, all players kicked`)
    } else {
      broadcastLeave(roomNS, currentRoom ?? room, member, true)
    }
  }
}

// ─── Broadcast leave helper ───────────────────────────────────────────────────

function broadcastLeave(
  roomNS: Namespace,
  room: { code: string; hostId: string; members: Map<string, any> },
  member: { id: string; username: string },
  deleteIfEmpty = false,
) {
  let newHostId: string | null = null
  if (room.hostId === member.id && room.members.size > 0) {
    newHostId = Array.from(room.members.values())[0]!.id
    room.hostId = newHostId
  }
  if (deleteIfEmpty && room.members.size === 0) {
    store.delete(room.code)
    // Notifier le lobby que la room a fermé
    roomNS.server.of('/lobby').to('lobby-general').emit('lobby:room-closed' as any, { code: room.code })
    console.log(`[room] room ${room.code} deleted (empty)`)
    return
  }
  roomNS.to(room.code).emit('room:player-left', { userId: member.id, newHostId })
  console.log(`[room] ${member.username} left room ${room.code}`)
}
