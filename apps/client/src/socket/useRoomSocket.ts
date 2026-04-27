import { useEffect, useRef, useCallback } from 'react'
import { io, type Socket } from 'socket.io-client'
import type {
  RoomServerToClient, RoomClientToServer,
  Room, RoomMember, Message, GameId, GameSettings,
} from '@game-platform/shared'

type RoomSocket = Socket<RoomServerToClient, RoomClientToServer>
const SERVER_URL = import.meta.env.VITE_SERVER_URL ?? 'http://localhost:3001'

// ─── Events gérés par le dispatcher ──────────────────────────────────────────

type EventName =
  | 'room:state' | 'room:player-joined' | 'room:player-left'
  | 'room:player-ready' | 'room:game-changed' | 'chat:message'
  | 'game:starting' | 'room:error' | 'room:kicked' | 'room:room-closed'

const ALL_EVENTS: EventName[] = [
  'room:state', 'room:player-joined', 'room:player-left',
  'room:player-ready', 'room:game-changed', 'chat:message',
  'game:starting', 'room:error', 'room:kicked', 'room:room-closed',
]

// ─── Subscribers — initialisés une seule fois ─────────────────────────────────
// Important : on NE recrée PAS ces Sets quand le socket change

const _subscribers = new Map<EventName, Set<(data: any) => void>>(
  ALL_EVENTS.map((ev) => [ev, new Set()])
)

// ─── Singleton socket ─────────────────────────────────────────────────────────

let _socket: RoomSocket | null = null
let _currentToken: string | null = null

export function getRoomSocket(token: string): RoomSocket | null {
  if (!token) return null
  if (_socket && _currentToken === token) return _socket
  _socket?.disconnect()
  _socket = io(`${SERVER_URL}/room`, { auth: { token } }) as RoomSocket
  _currentToken = token
  _socket.on('connect', () => console.log('[room] connected:', _socket?.id))
  _socket.on('connect_error', (err) => console.error('[room] error:', err.message))

  // Enregistrer UN listener par event — dispatch vers les subscribers existants
  // On ne recrée PAS les Sets (ils sont déjà peuplés par useRoomSocket)
  for (const event of ALL_EVENTS) {
    _socket.on(event as any, (data: any) => {
      _subscribers.get(event)?.forEach((cb) => cb(data))
    })
  }

  return _socket
}

function _subscribe(event: EventName, cb: (data: any) => void) {
  _subscribers.get(event)?.add(cb)
  return () => _subscribers.get(event)?.delete(cb)
}

// ─── Types ────────────────────────────────────────────────────────────────────

export interface RoomSocketCallbacks {
  onRoomState?:    (data: { room: Room; members: RoomMember[]; chat: Message[] }) => void
  onPlayerJoined?: (data: { player: RoomMember }) => void
  onPlayerLeft?:   (data: { userId: string; newHostId: string | null }) => void
  onPlayerReady?:  (data: { userId: string; isReady: boolean }) => void
  onGameChanged?:  (data: { gameId: GameId; settings: GameSettings }) => void
  onChatMessage?:  (msg: Message) => void
  onGameStarting?: (data: { sessionId: string; countdown: number }) => void
  onError?:        (data: { code: string; message: string }) => void
  onKicked?:       (data: { reason: string }) => void
  onRoomClosed?:   () => void
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useRoomSocket(token: string, callbacks: RoomSocketCallbacks) {
  const cbRef = useRef(callbacks)
  useEffect(() => { cbRef.current = callbacks })

  // Initialiser le socket
  useEffect(() => { getRoomSocket(token) }, [token])

  useEffect(() => {
    const map: [EventName, keyof RoomSocketCallbacks][] = [
      ['room:state',        'onRoomState'],
      ['room:player-joined','onPlayerJoined'],
      ['room:player-left',  'onPlayerLeft'],
      ['room:player-ready', 'onPlayerReady'],
      ['room:game-changed', 'onGameChanged'],
      ['chat:message',      'onChatMessage'],
      ['game:starting',     'onGameStarting'],
      ['room:error',        'onError'],
      ['room:kicked',       'onKicked'],
      ['room:room-closed',  'onRoomClosed'],
    ]

    // S'abonner pour TOUS les events (même si callback non fourni — cbRef le gérera)
    const unsubs = map.map(([event, cbKey]) => {
      const handler = (data: any) => (cbRef.current[cbKey] as any)?.(data)
      return _subscribe(event, handler)
    })

    return () => unsubs.forEach((u) => u())
  }, [token])

  return {
    createRoom:  useCallback((gameId: GameId, maxPlayers: number, settings: GameSettings) =>
      getRoomSocket(token)?.emit('room:create', { gameId, maxPlayers, settings }), [token]),
    joinRoom:    useCallback((roomCode: string) =>
      getRoomSocket(token)?.emit('room:join', { roomCode }), [token]),
    leaveRoom:   useCallback(() =>
      getRoomSocket(token)?.emit('room:leave'), [token]),
    setReady:    useCallback((isReady: boolean) =>
      getRoomSocket(token)?.emit('room:player-ready', { isReady }), [token]),
    changeGame:  useCallback((gameId: GameId, settings: GameSettings) =>
      getRoomSocket(token)?.emit('room:change-game', { gameId, settings }), [token]),
    sendMessage: useCallback((content: string) =>
      getRoomSocket(token)?.emit('chat:send', { content }), [token]),
    startGame:   useCallback(() =>
      getRoomSocket(token)?.emit('game:start'), [token]),
    kickPlayer:  useCallback((userId: string) =>
      getRoomSocket(token)?.emit('room:kick' as any, { userId }), [token]),
  }
}
