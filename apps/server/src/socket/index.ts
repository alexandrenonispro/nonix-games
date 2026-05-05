import { Server } from 'socket.io'
import type { Server as HttpServer } from 'http'
import { registerLobbyHandlers } from './lobby/handlers.js'
import { registerRoomHandlers, clearAllGames } from './room/handlers.js'
clearAllGames() // Nettoyer les parties en cours au démarrage
import { parseToken } from '../lib/auth.js'

export function initSocketIO(httpServer: HttpServer) {
  const io = new Server(httpServer, {
    cors: {
      origin: ['http://localhost:5173', 'http://192.168.1.176:5173', process.env.CLIENT_URL].filter(Boolean) as string[],
      methods: ['GET', 'POST'],
      credentials: true,
    },
  })

  async function authMiddleware(socket: any, next: (err?: Error) => void) {
    const token = socket.handshake.auth.token as string | undefined
    if (!token) return next(new Error('Authentication required'))
    const user = await parseToken(token, socket.id)
    if (!user) return next(new Error('Invalid or expired token'))
    socket.data.user = user
    next()
  }

  const lobbyNS = io.of('/lobby')
  lobbyNS.use(authMiddleware)
  lobbyNS.on('connection', (socket) => {
    registerLobbyHandlers(lobbyNS, socket)
  })

  const roomNS = io.of('/room')
  roomNS.use(authMiddleware)
  roomNS.on('connection', (socket) => {
    registerRoomHandlers(roomNS, socket)
  })

  console.log('⚡ Socket.IO ready — /lobby + /room')
  return io
}
