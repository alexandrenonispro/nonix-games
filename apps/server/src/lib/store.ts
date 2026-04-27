import type { GameId, GameSettings, RoomStatus } from '@game-platform/shared'

// ─── Types internes serveur ───────────────────────────────────────────────────

export interface ServerPlayer {
  id: string
  username: string
  avatarUrl: string | null
  level: number
  rank: string
  socketId: string
}

export interface ServerMember extends ServerPlayer {
  isReady: boolean
  joinedAt: string
}

export interface ServerRoom {
  id: string
  code: string
  hostId: string
  hostUsername: string
  gameId: GameId
  status: RoomStatus
  maxPlayers: number
  settings: GameSettings
  members: Map<string, ServerMember>
  messages: ChatMessage[]
  createdAt: string
}

export interface ChatMessage {
  id: string
  author: { id: string; username: string; avatarUrl: string | null; level: number; rank: string } | null
  content: string
  type: 'text' | 'system'
  sentAt: string
}

// ─── Store singleton ──────────────────────────────────────────────────────────

class RoomStore {
  // code → room
  private rooms = new Map<string, ServerRoom>()
  // socketId → roomCode
  private socketToRoom = new Map<string, string>()
  // userId → socketId (lobby)
  private lobbyPlayers = new Map<string, ServerPlayer>()

  // ── Rooms ──

  create(room: ServerRoom): void {
    this.rooms.set(room.code, room)
  }

  get(code: string): ServerRoom | undefined {
    return this.rooms.get(code)
  }

  delete(code: string): void {
    const room = this.rooms.get(code)
    if (room) {
      room.members.forEach((m) => this.socketToRoom.delete(m.socketId))
      this.rooms.delete(code)
    }
  }

  getAll(): ServerRoom[] {
    return Array.from(this.rooms.values())
  }

  // ── Members ──

  addMember(code: string, member: ServerMember): boolean {
    const room = this.rooms.get(code)
    if (!room) return false
    room.members.set(member.id, member)
    this.socketToRoom.set(member.socketId, code)
    return true
  }

  removeMember(socketId: string): { room: ServerRoom; member: ServerMember } | null {
    const code = this.socketToRoom.get(socketId)
    if (!code) return null
    const room = this.rooms.get(code)
    if (!room) return null
    const member = Array.from(room.members.values()).find((m) => m.socketId === socketId)
    if (!member) return null
    room.members.delete(member.id)
    this.socketToRoom.delete(socketId)
    // Ne pas supprimer la room ici — le handler décide
    return { room, member }
  }



  updateSocketId(userId: string, roomCode: string, newSocketId: string): void {
    const room = this.rooms.get(roomCode)
    const member = room?.members.get(userId)
    if (!member) return
    this.socketToRoom.delete(member.socketId)
    member.socketId = newSocketId
    if (newSocketId) this.socketToRoom.set(newSocketId, roomCode)
  }

  removeMemberById(userId: string, roomCode: string): ServerMember | null {
    const room = this.rooms.get(roomCode)
    if (!room) return null
    const member = room.members.get(userId)
    if (!member) return null
    room.members.delete(userId)
    this.socketToRoom.delete(member.socketId)
    // Ne pas supprimer la room ici — le handler décide
    return member
  }

  getRoomBySocket(socketId: string): ServerRoom | null {
    const code = this.socketToRoom.get(socketId)
    return code ? (this.rooms.get(code) ?? null) : null
  }

  setMemberReady(code: string, userId: string, isReady: boolean): void {
    const room = this.rooms.get(code)
    const member = room?.members.get(userId)
    if (member) member.isReady = isReady
  }

  // ── Lobby players ──

  addLobbyPlayer(player: ServerPlayer): void {
    this.lobbyPlayers.set(player.id, player)
  }

  removeLobbyPlayer(userId: string): void {
    this.lobbyPlayers.delete(userId)
  }

  getLobbyPlayers(): ServerPlayer[] {
    return Array.from(this.lobbyPlayers.values())
  }



  addMessage(code: string, message: ChatMessage): void {
    const room = this.rooms.get(code)
    if (!room) return
    room.messages.push(message)
    // Garder les 200 derniers messages max
    if (room.messages.length > 200) room.messages.shift()
  }

  getMessages(code: string): ChatMessage[] {
    return this.rooms.get(code)?.messages ?? []
  }

  updateAvatarUrl(userId: string, avatarUrl: string): void {
    // Mettre à jour dans toutes les rooms où le joueur est membre
    for (const room of this.rooms.values()) {
      const member = room.members.get(userId)
      if (member) member.avatarUrl = avatarUrl
    }
    // Mettre à jour dans le lobby
    const lobbyPlayer = this.lobbyPlayers.get(userId)
    if (lobbyPlayer) lobbyPlayer.avatarUrl = avatarUrl
  }

  findLobbySocketId(userId: string): string | null {
    return this.lobbyPlayers.get(userId)?.socketId ?? null
  }
}

export const store = new RoomStore()
