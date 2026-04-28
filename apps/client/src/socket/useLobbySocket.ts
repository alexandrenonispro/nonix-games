import { useEffect, useRef, useCallback } from 'react'
import { io, type Socket } from 'socket.io-client'
import type {
  LobbyServerToClient, LobbyClientToServer,
  Player, RoomSummary,
} from '@game-platform/shared'

type LobbySocket = Socket<LobbyServerToClient, LobbyClientToServer>
const SERVER_URL = import.meta.env.VITE_SERVER_URL ?? 'http://localhost:3001'

// ─── Singleton + dispatcher ───────────────────────────────────────────────────
let _socket: LobbySocket | null = null
let _currentToken: string | null = null

type LobbyEvent = 'lobby:state' | 'lobby:player-joined' | 'lobby:player-left' | 'lobby:invite-receive' | 'lobby:room-opened' | 'lobby:room-closed'
const _subscribers = new Map<LobbyEvent, Set<(d: any) => void>>()

export function getLobbySocket(token?: string): LobbySocket | null {
  if (token && (!_socket || _currentToken !== token)) _initSocket(token)
  return _socket
}

function _initSocket(token: string): LobbySocket {
  if (_socket && _currentToken === token) return _socket
  _socket?.disconnect()
  _socket = io(`${SERVER_URL}/lobby`, { auth: { token } }) as LobbySocket
  _currentToken = token

  const events: LobbyEvent[] = ['lobby:state', 'lobby:player-joined', 'lobby:player-left', 'lobby:invite-receive', 'lobby:room-opened', 'lobby:room-closed']
  for (const event of events) {
    _subscribers.set(event, new Set())
    _socket.on(event as any, (data: any) => {
      _subscribers.get(event)?.forEach((cb) => cb(data))
    })
  }
  _socket.on('connect_error', (err) => console.error('[lobby] error:', err.message))
  console.log('[lobby] socket created')
  return _socket
}

function _subscribe(event: LobbyEvent, cb: (d: any) => void) {
  _subscribers.get(event)?.add(cb)
  return () => _subscribers.get(event)?.delete(cb)
}

// ─── Types ────────────────────────────────────────────────────────────────────

interface UseLobbySocketOptions {
  token: string
  userId: string
  onState:          (data: { onlinePlayers: Player[]; openRooms: RoomSummary[] }) => void
  onPlayerJoined:   (data: { player: Player }) => void
  onPlayerLeft:     (data: { userId: string }) => void
  onInviteReceived: (data: { fromPlayer: Player; roomCode: string; gameName: string }) => void
  onRoomOpened?:    (data: { code: string; gameId: string; playerCount: number; maxPlayers: number; status: string }) => void
  onRoomClosed?:    (data: { code: string }) => void
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useLobbySocket({ token, userId, ...callbacks }: UseLobbySocketOptions) {
  const cbRef = useRef(callbacks)
  useEffect(() => { cbRef.current = callbacks })

  useEffect(() => {
    const socket = _initSocket(token)

    // Émettre lobby:join une seule fois à la connexion
    const doJoin = () => {
      console.log('[lobby] joining as', userId)
      socket.emit('lobby:join', { userId })
    }

    if (socket.connected) doJoin()
    else socket.once('connect', doJoin)

    const unsubs = [
      _subscribe('lobby:state',          (d) => cbRef.current.onState(d)),
      _subscribe('lobby:player-joined',  (d) => cbRef.current.onPlayerJoined(d)),
      _subscribe('lobby:player-left',    (d) => cbRef.current.onPlayerLeft(d)),
      _subscribe('lobby:invite-receive', (d) => cbRef.current.onInviteReceived(d)),
      _subscribe('lobby:room-opened',    (d) => cbRef.current.onRoomOpened?.(d)),
      _subscribe('lobby:room-closed',    (d) => cbRef.current.onRoomClosed?.(d)),
    ]

    return () => {
      // Retirer les abonnements mais garder le socket connecté (singleton)
      socket.off('connect', doJoin)
      unsubs.forEach((u) => u())
    }
  }, [token, userId])

  const sendInvite = useCallback((toUserId: string, roomCode: string) => {
    _socket?.emit('lobby:invite-send', { toUserId, roomCode })
  }, [])

  return { sendInvite }
}
