import type { Namespace, Socket } from 'socket.io'
import { store } from '../../lib/store.js'

export function registerLobbyHandlers(lobby: Namespace, socket: Socket) {
  const user = socket.data.user

  // Join lobby general room
  socket.on('lobby:join', async () => {
    await socket.join('lobby-general')
    store.addLobbyPlayer(user)

    // Send current state to the joining player
    const openRooms = store.getAll()
      .filter((r) => r.status === 'waiting')
      .map((r) => ({
        code: r.code,
        gameId: r.gameId,
        playerCount: r.members.size,
        maxPlayers: r.maxPlayers,
        status: r.status,
        hostName: r.hostUsername ?? r.members.get(r.hostId)?.username ?? '?',
      }))

    const onlinePlayers = store.getLobbyPlayers().map((p) => ({
      id: p.id,
      username: p.username,
      avatarUrl: p.avatarUrl,
      level: p.level,
      rank: p.rank,
    }))

    socket.emit('lobby:state', { onlinePlayers, openRooms })

    // Broadcast new player to others
    socket.to('lobby-general').emit('lobby:player-joined', {
      player: {
        id: user.id,
        username: user.username,
        avatarUrl: user.avatarUrl,
        level: user.level,
        rank: user.rank,
      },
    })

    console.log(`[lobby] ${user.username} joined`)
  })

  socket.on('lobby:invite-send', ({ toUserId, roomCode }) => {
    const targetSocketId = store.findLobbySocketId(toUserId)
    if (!targetSocketId) return

    const room = store.get(roomCode)
    if (!room) return

    lobby.to(targetSocketId).emit('lobby:invite-receive', {
      fromPlayer: {
        id: user.id,
        username: user.username,
        avatarUrl: user.avatarUrl,
        level: user.level,
        rank: user.rank,
      },
      roomCode,
      gameName: room.gameId,
    })
  })

  socket.on('lobby:invite-respond', ({ roomCode, accepted }) => {
    if (!accepted) return
    // Client will emit room:join himself after accepting
  })


  // ── Direct Messages ──────────────────────────────────────────────────────────

  socket.on('dm:send' as any, async ({ receiverId, content }: { receiverId: string; content: string }) => {
    if (!content?.trim()) return
    const { prisma } = await import('../../lib/prisma.js')

    const msg = await prisma.directMessage.create({
      data: { senderId: user.id, receiverId, content: content.trim() },
      include: {
        sender:   { select: { id: true, username: true, avatarUrl: true } },
        receiver: { select: { id: true, username: true, avatarUrl: true } },
      },
    })

    // Confirmer à l'expéditeur
    socket.emit('dm:receive' as any, { message: msg })

    // Envoyer au destinataire s'il est connecté au lobby
    const lobbyNS = socket.nsp
    for (const [, s] of lobbyNS.sockets) {
      if ((s as any).data?.user?.id === receiverId) {
        s.emit('dm:receive' as any, { message: msg })
        break
      }
    }
  })

  socket.on('dm:read' as any, async ({ senderId }: { senderId: string }) => {
    const { prisma } = await import('../../lib/prisma.js')
    await prisma.directMessage.updateMany({
      where: { senderId, receiverId: user.id, readAt: null },
      data:  { readAt: new Date() },
    })
    const lobbyNS = socket.nsp
    for (const [, s] of lobbyNS.sockets) {
      if ((s as any).data?.user?.id === senderId) {
        s.emit('dm:read-ack' as any, { readerId: user.id })
        break
      }
    }
  })

  socket.on('disconnect', () => {
    store.removeLobbyPlayer(user.id)
    socket.to('lobby-general').emit('lobby:player-left', { userId: user.id })
    console.log(`[lobby] ${user.username} disconnected`)
  })
}
