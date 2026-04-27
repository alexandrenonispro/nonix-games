import type { Namespace } from 'socket.io'
import type { GameId, GameSettings, Player, Ranking, GamePayload } from '@game-platform/shared'

export interface GameContext {
  roomCode: string
  ns: Namespace
  players: Player[]
  settings: GameSettings
}

export interface MiniGame {
  readonly id: GameId
  readonly name: string
  readonly minPlayers: number
  readonly maxPlayers: number

  /** Appelé au démarrage — initialise l'état, envoie le premier game:state */
  onStart(ctx: GameContext): Promise<void>

  /** Appelé à chaque action joueur — retourne le nouvel état ou null si action ignorée */
  onAction(
    ctx: GameContext,
    playerId: string,
    action: { type: string; data: unknown },
  ): Promise<GamePayload | null>

  /** Appelé à la fin — retourne le classement final */
  onEnd(ctx: GameContext): Promise<Ranking[]>

  /** Nettoyage (timers, etc.) */
  cleanup(): void
}
