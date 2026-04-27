// ─── Enums ────────────────────────────────────────────────────────────────────

export type GameId = 'quiz' | 'skribble' | 'loup_garou' | 'blind_test' | 'undercover'

export type RoomStatus = 'waiting' | 'starting' | 'in_game' | 'finished'

export type FriendshipStatus = 'pending' | 'accepted' | 'declined' | 'blocked'

export type AchievementRarity = 'common' | 'rare' | 'epic' | 'legendary'

export type MessageType = 'text' | 'system' | 'guess'

export type GamePhase = 'waiting' | 'playing' | 'round_end' | 'game_end'

// ─── Core entities ────────────────────────────────────────────────────────────

export interface Player {
  id: string
  username: string
  avatarUrl: string | null
  level: number
  rank: string
}

export interface Room {
  id: string
  code: string
  hostId: string
  gameId: GameId
  status: RoomStatus
  maxPlayers: number
  settings: GameSettings
  createdAt: string
}

export interface RoomSummary {
  code: string
  gameId: GameId
  playerCount: number
  maxPlayers: number
  status: RoomStatus
  hostName?: string
}

export interface RoomMember extends Player {
  isReady: boolean
  joinedAt: string
}

export interface Message {
  id: string
  author: Player | null
  content: string
  type: MessageType
  sentAt: string
}

export interface Achievement {
  id: string
  key: string
  name: string
  description: string
  iconUrl: string
  rarity: AchievementRarity
  gameId: GameId | null
  isGlobal: boolean
}

export interface Score {
  userId: string
  username: string
  avatarUrl: string | null
  score: number
}

export interface Ranking extends Score {
  rank: number
  xpGained: number
}

export interface RoundResult {
  round: number
  scores: Score[]
  highlight?: string
}

// ─── Game settings (per game) ─────────────────────────────────────────────────

export type GameSettings =
  | QuizSettings
  | SkribbleSettings
  | LoupGarouSettings
  | BlindTestSettings
  | UndercoverSettings

export interface QuizSettings {
  gameId: 'quiz'
  rounds: number
  timePerQuestion: number
  theme: string | null
}

export interface SkribbleSettings {
  gameId: 'skribble'
  rounds: number
  timePerRound: number
  wordCount: number
  language: string
}

export interface LoupGarouSettings {
  gameId: 'loup_garou'
  dayDuration: number
  nightDuration: number
  roles: string[]
}

export interface BlindTestSettings {
  gameId: 'blind_test'
  rounds: number
  timePerTrack: number
  genres: string[]
}

export interface UndercoverSettings {
  gameId: 'undercover'
  rounds: number
  timePerVote: number
}
