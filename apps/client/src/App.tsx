import './styles/globals.css'
import { useState, useCallback, useEffect, useRef } from 'react'
import { BrowserRouter, Routes, Route, useNavigate, useParams, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './auth/AuthContext'
import { LoadingScreen } from './components/LoadingScreen'
import { NotFoundPage } from './components/NotFoundPage'
import { MessagesPage } from './dm/MessagesPage'
import { SmileLifeGame } from './games/smilelife/SmileLifeGame'
import { RulesPage } from './rules/RulesPage'
import { AuthPage } from './auth/AuthPage'
import { LobbyPage } from './lobby/LobbyPage'
import { RoomPage } from './room/RoomPage'
import { QuizGame } from './games/quiz/QuizGame'
import { DrawnixGame } from './games/drawnix/DrawnixGame'
import { ProfilePage } from './profile/ProfilePage'
import { useRoomSocket, getRoomSocket } from './socket/useRoomSocket'
import { getLobbySocket } from './socket/useLobbySocket'
import type { Room, RoomMember, Message } from '@game-platform/shared'

const ROOM_KEY = 'gp_room_code'
const GAME_KEY = 'gp_game_code'

interface InitialRoomState { room: Room; members: RoomMember[]; chat: Message[] }

// ─── Routes protégées ──────────────────────────────────────────────────────────

function RequireAuth({ children }: { children: React.ReactNode }) {
  const { token, isLoading } = useAuth()
  if (isLoading) return (
    <LoadingScreen />
  )
  if (!token) return <Navigate to="/login" replace />
  return <>{children}</>
}

// ─── Shell connecté (gère le socket room) ────────────────────────────────────

function AppShell() {
  const { token, logout, user } = useAuth()
  const navigate = useNavigate()
  const [initialRoomState, setInitialRoomState] = useState<InitialRoomState | null>(null)
  const [kickedMessage, setKickedMessage] = useState<string | null>(null)
  const [reconnecting, setReconnecting] = useState(() => {
    // Seulement si l'URL contient /room/ ou /game/
    return /\/(room|game)\/[A-Z0-9]+/.test(window.location.pathname)
  })
  const [gameInfo, setGameInfo] = useState<{ gameId: string; settings: any; code: string } | null>(null)
  const gameInfoRef = useRef<{ gameId: string; settings: any; code: string } | null>(null)
  const inGameRef = useRef(false)

  // Maintenir la connexion lobby active sur toutes les pages
  useEffect(() => {
    if (!token) return
    getLobbySocket(token) // init socket sans émettre lobby:join (géré par useLobbySocket)
  }, [token])

  const { joinRoom, createRoom, leaveRoom, setReady, changeGame, sendMessage, startGame, kickPlayer } =
    useRoomSocket(token!, {
      onRoomState: ({ room, members, chat }) => {
        setReconnecting(false)
        sessionStorage.setItem(ROOM_KEY, room.code)
        setInitialRoomState({ room, members, chat })
        const info = { gameId: room.gameId, settings: room.settings, code: room.code }
        setGameInfo(info)
        gameInfoRef.current = info
        if (inGameRef.current) return
        if ((room as any).status === 'in_game') {
          localStorage.setItem(GAME_KEY, room.code)
          inGameRef.current = true
          navigate(`/game/${room.code}`, { replace: true })
        } else {
          navigate(`/room/${room.code}`, { replace: true })
        }
      },
      onGameStarting: ({ countdown }) => {
        if (countdown === 0) {
          const code = sessionStorage.getItem(ROOM_KEY) ?? gameInfoRef.current?.code
          if (code) localStorage.setItem(GAME_KEY, code)
        }
      },
      onKicked: ({ reason }) => {
        setReconnecting(false)
        sessionStorage.removeItem(ROOM_KEY)
        sessionStorage.setItem('gp_kicked', '1')
        localStorage.removeItem(GAME_KEY)
        inGameRef.current = false
        setInitialRoomState(null)
        setKickedMessage(reason)
        navigate('/', { replace: true })
        setTimeout(() => setKickedMessage(null), 5000)
      },
      onRoomClosed: () => {
        setReconnecting(false)
        sessionStorage.removeItem(ROOM_KEY)
        localStorage.removeItem(GAME_KEY)
        inGameRef.current = false
        setInitialRoomState(null)
        setKickedMessage('Vous avez fermé la room.')
        navigate('/', { replace: true })
        setTimeout(() => setKickedMessage(null), 5000)
      },
    })

  const handleLeaveRoom = useCallback(() => {
    if (inGameRef.current) {
      inGameRef.current = false
      navigate('/', { replace: true })
      return
    }
    leaveRoom()
    sessionStorage.removeItem(ROOM_KEY)
    localStorage.removeItem(GAME_KEY)
    setInitialRoomState(null)
    navigate('/', { replace: true })
  }, [leaveRoom, navigate])

  const handleGameStart = useCallback(() => {
    const code = gameInfoRef.current?.code ?? sessionStorage.getItem(ROOM_KEY)
    if (!code) return
    inGameRef.current = true
    navigate(`/game/${code}`, { replace: true })
  }, [navigate])

  // Clear reconnecting after 4s max si le socket ne répond pas
  useEffect(() => {
    if (!reconnecting) return
    const t = setTimeout(() => setReconnecting(false), 4000)
    return () => clearTimeout(t)
  }, [])

  // Reconnexion après refresh — utilise aussi l'URL courante
  useEffect(() => {
    const wasKicked = sessionStorage.getItem('gp_kicked')
    if (wasKicked) { sessionStorage.removeItem('gp_kicked'); return }
    const gameCode = localStorage.getItem(GAME_KEY)
    const roomCode = sessionStorage.getItem(ROOM_KEY)
    // Extraire le code depuis l'URL si présent (/room/CODE ou /game/CODE)
    const urlMatch = window.location.pathname.match(/\/(room|game)\/([A-Z0-9]+)/)
    const urlCode = urlMatch ? urlMatch[2] : null
    const code = gameCode ?? urlCode ?? roomCode
    if (!code) return
    const socket = getRoomSocket(token!)
    if (!socket) return
    const doJoin = () => joinRoom(code)
    if (socket.connected) doJoin()
    else socket.once('connect', doJoin)
  }, [token])

  return (
    <>
      {kickedMessage && (
        <div style={{
          position: 'fixed', top: 16, left: '50%', transform: 'translateX(-50%)',
          zIndex: 9999, background: '#fee2e2', border: '1px solid #fca5a5',
          borderRadius: 8, padding: '10px 20px', fontSize: 13, color: '#dc2626',
          display: 'flex', alignItems: 'center', gap: 10,
        }}>
          {kickedMessage}
          <button onClick={() => setKickedMessage(null)}
            style={{ background: 'none', border: 'none', color: '#dc2626', cursor: 'pointer', fontWeight: 700 }}>✕</button>
        </div>
      )}

      <Routes>
        {/* Lobby */}
        <Route path="/" element={
          reconnecting ? <LoadingScreen /> : <LobbyPage
            onJoinRoom={joinRoom}
            onCreateRoom={createRoom}
            onLogout={logout}
            onViewProfile={(uid) => navigate(`/profile/${uid}`)}
          />
        } />

        {/* Profil */}
        <Route path="/profile/:userId" element={<ProfileRoute />} />

        {/* Room */}
        <Route path="/room/:code" element={
          initialRoomState
            ? <RoomPage
                token={token!}
                initialState={initialRoomState}
                onLeave={handleLeaveRoom}
                onGameStart={handleGameStart}
                setReady={setReady}
                changeGame={changeGame}
                sendMessage={sendMessage}
                startGame={startGame}
                kickPlayer={kickPlayer}
              />
            : <Navigate to="/" replace />
        } />

        {/* Jeu */}
        <Route path="/game/:code" element={
          gameInfoRef.current || gameInfo
            ? <GameRoute
                token={token!}
                gameInfo={gameInfoRef.current ?? gameInfo!}
                onLeave={handleLeaveRoom}
                isHost={initialRoomState?.room.hostId === user?.id}
              />
            : <Navigate to="/" replace />
        } />

        {/* Messages */}
        <Route path="/messages" element={<MessagesPage />} />
          <Route path="/rules" element={<RulesPage />} />
        {/* Messages avec conversation ouverte */}
        <Route path="/messages/:userId" element={<MessagesPage />} />

        {/* 404 */}
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </>
  )
}

function ProfileRoute() {
  const { userId } = useParams<{ userId: string }>()
  const navigate = useNavigate()
  if (!userId) return <Navigate to="/" replace />
  return <ProfilePage userId={userId} onBack={() => navigate(-1)} />
}

function GameRoute({ token, gameInfo, onLeave, isHost }: {
  token: string
  gameInfo: { gameId: string; settings: any; code: string }
  onLeave: () => void
  isHost?: boolean
}) {
  if (gameInfo.gameId === 'skribble') {
    return (
      <DrawnixGame
        token={token}
        roomCode={gameInfo.code}
        settings={gameInfo.settings ?? { rounds: 3, timePerRound: 60 }}
        onLeave={onLeave}
        isHost={isHost}
      />
    )
  }
  if (gameInfo.gameId === 'quiz') {
    return <QuizGame onLeave={onLeave} />
  }
  if (gameInfo.gameId === 'smilelife') {
    return (
      <SmileLifeGame
        roomCode={gameInfo.code}
        isHost={!!isHost}
        onLeave={onLeave}
      />
    )
  }
  return <Navigate to="/" replace />
}

// ─── Root ─────────────────────────────────────────────────────────────────────

function AppInner() {
  const { token, isLoading } = useAuth()
  if (isLoading) return (
    <LoadingScreen />
  )
  if (!token) return <AuthPage />
  return (
    <RequireAuth>
      <AppShell />
    </RequireAuth>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppInner />
      </AuthProvider>
    </BrowserRouter>
  )
}
