import type {
  Player,
  Room,
  RoomMember,
  RoomSummary,
  Message,
  Achievement,
  Score,
  Ranking,
  RoundResult,
  GameId,
  GameSettings,
} from '../types/index.js'

import type { DrawStroke, GameAction, GamePayload } from '../types/game-payloads.js'

// ─── Error codes ──────────────────────────────────────────────────────────────

export type RoomErrorCode =
  | 'ROOM_NOT_FOUND'
  | 'ROOM_FULL'
  | 'ROOM_IN_PROGRESS'
  | 'INVALID_CODE'
  | 'NOT_HOST'
  | 'NOT_ALL_READY'
  | 'UNAUTHORIZED'

export interface SocketError {
  code: RoomErrorCode
  message: string
}

// ─── /lobby namespace ─────────────────────────────────────────────────────────

export interface LobbyClientToServer {
  'lobby:join': (data: { userId: string }) => void
  'lobby:invite-send': (data: { toUserId: string; roomCode: string }) => void
  'lobby:invite-respond': (data: { roomCode: string; accepted: boolean }) => void
}

export interface LobbyServerToClient {
  'lobby:state': (data: { onlinePlayers: Player[]; openRooms: RoomSummary[] }) => void
  'lobby:player-joined': (data: { player: Player }) => void
  'lobby:player-left': (data: { userId: string }) => void
  'lobby:invite-receive': (data: {
    fromPlayer: Player
    roomCode: string
    gameName: string
  }) => void
}

// ─── /room namespace ─────────────────────────────────────────────────────────

export interface RoomClientToServer {
  // Room lifecycle
  'room:create': (data: { gameId: GameId; maxPlayers: number; settings: GameSettings }) => void
  'room:join': (data: { roomCode: string }) => void
  'room:leave': () => void
  'room:player-ready': (data: { isReady: boolean }) => void
  'room:change-game': (data: { gameId: GameId; settings: GameSettings }) => void

  // Chat
  'chat:send': (data: { content: string }) => void

  // Game
  'game:start': () => void
  'game:action': (data: GameAction) => void

  // Skribble
  'skribble:draw': (data: DrawStroke) => void
  'skribble:clear': () => void
  'skribble:guess': (data: { guess: string }) => void
}

export interface RoomServerToClient {
  // Room lifecycle
  'room:created': (data: { room: Room }) => void
  'room:state': (data: { room: Room; members: RoomMember[]; chat: Message[] }) => void
  'room:player-joined': (data: { player: RoomMember }) => void
  'room:player-left': (data: { userId: string; newHostId: string | null }) => void
  'room:player-ready': (data: { userId: string; isReady: boolean }) => void
  'room:game-changed': (data: { gameId: GameId; settings: GameSettings }) => void
  'room:error': (data: SocketError) => void

  // Chat
  'chat:message': (data: Message) => void

  // Game lifecycle
  'game:starting': (data: { sessionId: string; countdown: number }) => void
  'game:state': (data: {
    phase: string
    round: number
    scores: Score[]
    payload: GamePayload
  }) => void
  'game:tick': (data: { timeLeft: number }) => void
  'game:round-end': (data: { round: number; results: RoundResult[]; scores: Score[] }) => void
  'game:end': (data: { sessionId: string; rankings: Ranking[]; achievements: Achievement[] }) => void

  // Skribble
  'skribble:stroke': (data: DrawStroke) => void
  'skribble:clear': () => void
  'skribble:correct': (data: { userId: string; pointsGained: number }) => void
  'skribble:hint': (data: { word: string[] }) => void

  // Achievements & XP
  'achievement:unlocked': (data: { achievement: Achievement; unlockedAt: string }) => void
  'xp:gained': (data: {
    xpGained: number
    totalXp: number
    newLevel: number | null
    newRank: string | null
  }) => void
}
