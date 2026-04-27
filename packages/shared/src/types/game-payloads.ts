import type { Player } from './index.js'

// ─── Generic action type ──────────────────────────────────────────────────────

export type ActionType =
  | 'quiz:answer'
  | 'skribble:guess'
  | 'loup_garou:vote'
  | 'loup_garou:kill'
  | 'blind_test:guess'
  | 'undercover:vote'
  | 'undercover:reveal'

export interface GameAction {
  type: ActionType
  data: unknown
}

// ─── Quiz ─────────────────────────────────────────────────────────────────────

export interface QuizPayload {
  gameId: 'quiz'
  question: string
  choices: string[]
  questionIndex: number
  totalQuestions: number
}

export interface QuizActionAnswer {
  choiceIndex: number
}

// ─── Skribble ─────────────────────────────────────────────────────────────────

export interface SkribblePayload {
  gameId: 'skribble'
  drawer: Player
  word: string[] // tableau de lettres : ['_', 'a', '_', '_'] — révélation progressive
  hintsGiven: number
}

export interface Point {
  x: number
  y: number
}

export interface DrawStroke {
  points: Point[]
  color: string
  size: number
  tool: 'pen' | 'eraser'
}

// ─── Loup-garou ───────────────────────────────────────────────────────────────

export type LoupGarouPhase = 'day_discussion' | 'day_vote' | 'night' | 'reveal'

export type LoupGarouRole = 'villager' | 'werewolf' | 'seer' | 'witch' | 'hunter'

export interface LoupGarouPayload {
  gameId: 'loup_garou'
  phase: LoupGarouPhase
  dayNumber: number
  alivePlayers: Player[]
  eliminatedThisRound: Player | null
  role: LoupGarouRole // role du joueur courant uniquement
}

export interface LoupGarouActionVote {
  targetUserId: string
}

// ─── Blind test ───────────────────────────────────────────────────────────────

export interface BlindTestPayload {
  gameId: 'blind_test'
  trackIndex: number
  totalTracks: number
  previewUrl: string // 30s audio preview
  foundBy: string[]  // userIds qui ont trouvé
}

export interface BlindTestActionGuess {
  guess: string
}

// ─── Undercover ───────────────────────────────────────────────────────────────

export type UndercoverPhase = 'description' | 'vote' | 'reveal'

export interface UndercoverPayload {
  gameId: 'undercover'
  phase: UndercoverPhase
  round: number
  word: string        // mot du joueur courant uniquement
  alivePlayers: Player[]
  eliminatedThisRound: Player | null
}

// ─── Union payload ────────────────────────────────────────────────────────────

export type GamePayload =
  | QuizPayload
  | SkribblePayload
  | LoupGarouPayload
  | BlindTestPayload
  | UndercoverPayload
