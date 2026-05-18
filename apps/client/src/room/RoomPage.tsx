import { useState, useRef, useEffect, useCallback } from 'react'
import { GAME_META } from '../lobby/mock'
import type { Room, RoomMember, Message, GameId, GameSettings as SharedGameSettings } from '@game-platform/shared'
import { useAuth } from '../auth/AuthContext'
import { useRoomSocket } from '../socket/useRoomSocket'
import styles from './RoomPage.module.css'
import { RulesPanel } from '../rules/RulesPanel'
import { sounds } from '../lib/sounds'
import { GameSettings } from './GameSettings'
import { Avatar } from '../components/Avatar'


function MemberCard({ member, isHost, isMe, canKick, onKick }: { member: RoomMember; isHost: boolean; isMe: boolean; canKick: boolean; onKick: () => void }) {
  return (
    <div className={`${styles.memberCard} ${isMe ? styles.memberCardMe : ''}`}>
      <div className={styles.memberAvatarWrap}>
        <Avatar username={member.username} avatarUrl={member.avatarUrl} size={32} />
        {isHost && <span className={styles.hostCrown}>👑</span>}
      </div>
      <div className={styles.memberInfo}>
        <span className={styles.memberName}>
          {member.username}
          {isMe && <span className={styles.meTag}>vous</span>}
        </span>
        <span className={styles.memberRank}>Niv.{member.level} · {member.rank}</span>
      </div>
      {canKick && (
        <button className={styles.kickBtn} onClick={onKick} title="Expulser">
          <svg width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path d="M18 6L6 18M6 6l12 12"/></svg>
        </button>
      )}
      <div className={`${styles.readyBadge} ${member.isReady ? styles.readyBadgeOn : styles.readyBadgeOff}`}>
        {member.isReady ? (
          <><svg width="10" height="10" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M2 6l3 3 5-5"/></svg>Prêt</>
        ) : 'Attente'}
      </div>
    </div>
  )
}

function ChatMsg({ msg, myId }: { msg: Message; myId: string }) {
  if (msg.type === 'system') return <div className={styles.systemMsg}>{msg.content}</div>
  const isMe = msg.author?.id === myId
  const time = new Date(msg.sentAt).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
  return (
    <>
      {/* Desktop — bulles */}
      <div className={`${styles.chatMsg} ${isMe ? styles.chatMsgMe : ''}`}>
        {!isMe && <Avatar username={msg.author?.username ?? '?'} avatarUrl={msg.author?.avatarUrl} size={26} />}
        <div className={styles.chatBubbleWrap}>
          {!isMe && <span className={styles.chatAuthor}>{msg.author?.username}</span>}
          <div className={`${styles.chatBubble} ${isMe ? styles.chatBubbleMe : ''}`}>{msg.content}</div>
          <span className={styles.chatTime}>{time}</span>
        </div>
      </div>
      {/* Mobile — flat */}
      <div className={styles.chatLineMobile}>
        <span className={`${styles.chatAuthorMobile} ${isMe ? styles.chatAuthorMobileMe : ''}`}>
          {msg.author?.username}
        </span>
        <span className={styles.chatContentMobile}>{msg.content}</span>
      </div>
    </>
  )
}

interface InitialRoomState {
  room: Room
  members: RoomMember[]
  chat: Message[]
}

interface RoomPageProps {
  token: string
  initialState: InitialRoomState
  onLeave: () => void
  onGameStart: () => void
  setReady: (isReady: boolean) => void
  changeGame: (gameId: GameId, settings: SharedGameSettings) => void
  sendMessage: (content: string) => void
  startGame: () => void
  kickPlayer: (userId: string) => void
}

export function RoomPage({ token, initialState, onLeave, onGameStart, setReady, changeGame, sendMessage, startGame, kickPlayer }: RoomPageProps) {
  const { user } = useAuth()
  const userId = user?.id ?? ''
  // Initialisation directe depuis initialState — pas besoin d'attendre un event
  const [room, setRoom] = useState<Room | null>(initialState.room)
  const [members, setMembers] = useState<RoomMember[]>(initialState.members)
  const [chat, setChat] = useState<Message[]>(initialState.chat)
  const [input, setInput] = useState('')
  const [countdown, setCountdown] = useState<number | null>(null)
  const [error, setError] = useState<string | null>(null)
  const chatEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => { chatEndRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [chat])

  // RoomPage souscrit uniquement aux events qui affectent son state local.
  useRoomSocket(token, {
    onGameStarting: ({ countdown: cd }) => {
      setCountdown(cd)
      if (cd > 0) sounds.countdownBeep()
      else { sounds.countdownGo(); onGameStart() }
    },
    onPlayerJoined: ({ player }) => {
      setMembers((ms) => [...ms.filter((m) => m.id !== player.id), player])
      setChat((c) => [...c, { id: Date.now().toString(), author: null, content: `${player.username} a rejoint la room`, type: 'system', sentAt: new Date().toISOString() }])
    },
    onPlayerLeft: ({ userId: leftId, newHostId }) => {
      setMembers((ms) => {
        const left = ms.find((m) => m.id === leftId)
        if (left) setChat((c) => [...c, { id: Date.now().toString(), author: null, content: `${left.username} a quitté la room`, type: 'system', sentAt: new Date().toISOString() }])
        return ms.filter((m) => m.id !== leftId)
      })
      if (newHostId) setRoom((r) => r ? { ...r, hostId: newHostId } : r)
    },
    onPlayerReady: ({ userId: uid, isReady }) => {
      setMembers((ms) => ms.map((m) => m.id === uid ? { ...m, isReady } : m))
    },
    onGameChanged: ({ gameId, settings }) => {
      setRoom((r) => r ? { ...r, gameId: gameId as any, settings } : r)
    },
    onChatMessage: (msg) => setChat((c) => [...c, msg]),
    onError: ({ message }) => setError(message),
  })

  const isHost = room?.hostId === userId

  const handleSettingsChange = (newSettings: any) => {
    if (!room || !isHost) return
    changeGame(room.gameId as any, newSettings)
  }
  const isMe = (id: string) => id === userId
  const myMember = members.find((m) => m.id === userId)
  const nonHostMembers = members.filter((m) => m.id !== room?.hostId)
  // L'hôte est toujours considéré prêt
  const readyCount = nonHostMembers.filter((m) => m.isReady).length + 1
  const allReady = nonHostMembers.length > 0 && nonHostMembers.every((m) => m.isReady)

  const handleSend = useCallback(() => {
    if (!input.trim()) return
    sendMessage(input.trim())
    setInput('')
  }, [input, sendMessage])

  const handleLeave = useCallback(() => {
    onLeave()
  }, [onLeave])

  const meta = GAME_META[room?.gameId ?? 'quiz']!

  return (
    <div className={styles.layout}>
      {countdown !== null && countdown >= 0 && (
        <div className={styles.countdownOverlay}>
          <div className={styles.countdownNumber} key={countdown}>{countdown}</div>
          <p className={styles.countdownSub}>La partie commence…</p>
        </div>
      )}

      <aside className={styles.leftPanel}>
        <div className={styles.roomHeader}>
          <div className={styles.roomHeaderTop}>
            <button className={styles.backBtn} onClick={handleLeave}>
              <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M19 12H5M12 5l-7 7 7 7"/></svg>
            </button>
            <div className={styles.roomCodeWrap}>
              <span className={styles.roomCodeLabel}>Room</span>
              <span className={styles.roomCode}>{room?.code ?? initialState.room.code}</span>
            </div>
            <button className={styles.copyBtn} onClick={() => navigator.clipboard.writeText(room?.code ?? roomCode)}>
              <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
            </button>
          </div>
        </div>

        <div className={styles.panelSection}>
          <p className={styles.sectionLabel}>Mini-jeu</p>
          <div className={styles.gameCurrent} style={{ cursor: 'default' }}>
            <span className={styles.gameEmojiLg}>{meta.emoji}</span>
            <span className={styles.gameNameLg}>{meta.label}</span>
          </div>
        </div>

        {/* Settings — uniquement pour Drawnix */}
        {room?.gameId === 'skribble' && room?.settings && (
          <>
            <div className={styles.panelDivider} />
            <div className={styles.panelSection}>
              <GameSettings
                settings={room.settings as any}
                isHost={isHost}
                onChange={handleSettingsChange}
              />
            </div>
          </>
        )}

        <div className={styles.panelDivider} />

        {/* Desktop : liste complète */}
        <div className={`${styles.panelSection} ${styles.playersSection}`} style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
          <div className={styles.membersHeader}>
            <p className={styles.sectionLabel}>Joueurs</p>
            <span className={`${styles.memberCount} ${styles.memberCountDesktop}`}>{members.length}/{room?.maxPlayers ?? '?'}</span>
          </div>
          {error && (
            <div style={{ background: 'rgba(248,113,113,0.1)', border: '1px solid rgba(248,113,113,0.3)', borderRadius: 6, padding: '8px 12px', fontSize: 12, color: '#f87171', marginBottom: 8 }}>
              {error}
            </div>
          )}
          <div className={styles.membersList}>
            {members.map((m) => (
              <MemberCard key={m.id} member={m} isHost={m.id === room?.hostId} isMe={isMe(m.id)}
                canKick={isHost && !isMe(m.id) && m.id !== room?.hostId}
                onKick={() => kickPlayer(m.id)} />
            ))}
          </div>
        </div>

        {/* Mobile : strip avatars + ready count */}
        <div className={styles.mobileAvatarStrip}>
          <div className={styles.mobileAvatarRow}>
            {members.map((m) => (
              <div key={m.id} className={styles.mobileAvatarItem} title={m.username}
                style={{ opacity: (m.isReady || m.id === room?.hostId) ? 1 : 0.35, filter: (m.isReady || m.id === room?.hostId) ? 'none' : 'grayscale(1)' }}>
                <Avatar username={m.username} avatarUrl={m.avatarUrl} size={34} />
                {m.id === room?.hostId && <span className={styles.mobileHostDot}>👑</span>}
                {isMe(m.id) && <span className={styles.mobileMeDot} />}
              </div>
            ))}
          </div>
          <span className={styles.mobileReadyCount}>{readyCount}/{members.length} ✓</span>
        </div>

        <div className={styles.panelDivider} />

        <div className={styles.ctaSection}>
          {isHost ? (
            <div className={styles.hostCta}>
              <div className={`${styles.readyProgress} ${styles.readyProgressDesktop}`}>
                <div className={styles.readyProgressBar}>
                  <div className={styles.readyProgressFill} style={{ width: `${members.length ? (readyCount / members.length) * 100 : 0}%` }} />
                </div>
                <span className={styles.readyProgressLabel}><span className={styles.readyCountDesktop}>{readyCount}/{members.length} prêts</span><span className={styles.readyCountMobile}>{readyCount}/{members.length} ✓</span></span>
              </div>
              <button className={styles.launchBtn}
                disabled={!allReady || (room?.gameId === 'undercover' && members.length < 4)}
                style={(!allReady || (room?.gameId === 'undercover' && members.length < 4)) ? { opacity: 0.4, cursor: 'not-allowed' } : {}}
                title={room?.gameId === 'undercover' && members.length < 4 ? `Undercover nécessite 4 joueurs minimum (${members.length}/4)` : ''}
                onClick={startGame}>
                <svg width="16" height="16" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>
                {room?.gameId === 'undercover' && members.length < 4
                  ? `Undercover — ${members.length}/4 joueurs`
                  : 'Lancer la partie'}
              </button>
            </div>
          ) : (
            <button
              className={`${styles.readyBtn} ${myMember?.isReady ? styles.readyBtnOn : ''}`}
              onClick={() => setReady(!myMember?.isReady)}>
              {myMember?.isReady ? (
                <><svg width="16" height="16" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M2 6l3 3 5-5"/></svg>Je suis prêt</>
              ) : 'Je suis prêt ?'}
            </button>
          )}
        </div>
      </aside>

      <section className={styles.rulesPanel}>
        <RulesPanel gameId={room?.gameId ?? initialState.room.gameId} />
      </section>

      <section className={styles.chatPanel}>
        <div className={styles.chatHeader}>
          <span className={styles.chatTitle}>Chat</span>
          <span className={`${styles.chatOnline} ${styles.chatOnlineDesktop}`}>{members.length} en ligne</span>
        </div>
        <div className={styles.chatMessages}>
          {chat.map((msg) => <ChatMsg key={msg.id} msg={msg} myId={userId} />)}
          <div ref={chatEndRef} />
        </div>
        <div className={styles.chatInputWrap}>
          <input className={styles.chatInput} placeholder="Envoyer un message…"
            value={input} onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSend()} maxLength={200} />
          <button className={styles.sendBtn} onClick={handleSend} disabled={!input.trim()}>
            <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M22 2L11 13M22 2L15 22l-4-9-9-4 19-7z"/></svg>
          </button>
        </div>
      </section>
    </div>
  )
}
