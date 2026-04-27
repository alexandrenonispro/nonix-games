import { io, Socket } from 'socket.io-client'
import type {
  LobbyClientToServer,
  LobbyServerToClient,
  RoomClientToServer,
  RoomServerToClient,
} from '@game-platform/shared'

const SERVER_URL = import.meta.env.VITE_SERVER_URL ?? 'http://localhost:3001'

// ─── Typed socket instances ───────────────────────────────────────────────────

export type LobbySocket = Socket<LobbyServerToClient, LobbyClientToServer>
export type RoomSocket = Socket<RoomServerToClient, RoomClientToServer>

let lobbySocket: LobbySocket | null = null
let roomSocket: RoomSocket | null = null

export function getLobbySocket(token: string): LobbySocket {
  if (!lobbySocket) {
    lobbySocket = io(`${SERVER_URL}/lobby`, {
      auth: { token },
      autoConnect: false,
    }) as LobbySocket
  }
  return lobbySocket
}

export function getRoomSocket(token: string): RoomSocket {
  if (!roomSocket) {
    roomSocket = io(`${SERVER_URL}/room`, {
      auth: { token },
      autoConnect: false,
    }) as RoomSocket
  }
  return roomSocket
}

export function disconnectAll() {
  lobbySocket?.disconnect()
  roomSocket?.disconnect()
  lobbySocket = null
  roomSocket = null
}
