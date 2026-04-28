import { useState, useEffect, useRef, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { Avatar } from '../components/Avatar'
import { useDMs, type DMConversation } from '../socket/useDMs'
import { useAuth } from '../auth/AuthContext'
import styles from './MessagesPage.module.css'

function ConvItem({ conv, active, onClick }: { conv: DMConversation; active: boolean; onClick: () => void }) {
  const last = conv.lastMessage
  const preview = last?.content ?? 'Aucun message'
  const time = last ? new Date(last.createdAt).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }) : ''
  return (
    <div className={`${styles.convItem} ${active ? styles.convItemActive : ''}`} onClick={onClick}>
      <div className={styles.convAvatar}>
        <Avatar username={conv.username} avatarUrl={conv.avatarUrl} size={42} />
        {conv.unreadCount > 0 && <span className={styles.unreadBadge}>{conv.unreadCount}</span>}
      </div>
      <div className={styles.convInfo}>
        <div className={styles.convTop}>
          <span className={styles.convName}>{conv.username}</span>
          {time && <span className={styles.convTime}>{time}</span>}
        </div>
        <span className={`${styles.convPreview} ${conv.unreadCount > 0 ? styles.convPreviewUnread : ''}`}>
          {preview.length > 40 ? preview.slice(0, 40) + '…' : preview}
        </span>
      </div>
    </div>
  )
}

export function MessagesPage() {
  const navigate = useNavigate()
  const { token, user } = useAuth()
  const myId = user?.id ?? ''
  const { convs, sendMessage, loadConversation, markRead } = useDMs(token ?? '', myId)
  const [activeId, setActiveId] = useState<string | null>(null)
  const [input, setInput] = useState('')
  const [loadingMore, setLoadingMore] = useState(false)
  const messagesRef = useRef<HTMLDivElement>(null)
  const bottomRef = useRef<HTMLDivElement>(null)
  const prevScrollHeight = useRef(0)
  const isFirstLoad = useRef(true)

  const convList = Array.from(convs.values()).sort((a, b) =>
    (b.lastMessage?.createdAt ?? '').localeCompare(a.lastMessage?.createdAt ?? '')
  )
  const activeConv = activeId ? convs.get(activeId) : null

  // Scroll en bas à l'ouverture et nouveaux messages
  useEffect(() => {
    if (!activeConv?.loaded) return
    const el = messagesRef.current
    if (!el) return

    if (isFirstLoad.current) {
      // Première ouverture — scroll direct en bas sans animation
      el.scrollTop = el.scrollHeight
      isFirstLoad.current = false
    } else if (el.scrollHeight - el.scrollTop - el.clientHeight < 120) {
      // Déjà en bas — suivre les nouveaux messages
      bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
    }
  }, [activeConv?.messages.length, activeConv?.loaded])

  // Restaurer la position de scroll après chargement de messages anciens
  useEffect(() => {
    if (!loadingMore) return
    const el = messagesRef.current
    if (!el) return
    el.scrollTop = el.scrollHeight - prevScrollHeight.current
  }, [activeConv?.messages.length])

  const selectConv = (userId: string) => {
    setActiveId(userId)
    isFirstLoad.current = true
    loadConversation(userId)
    markRead(userId)
  }

  // Ref pour avoir toujours la valeur à jour dans le scroll handler
  const activeConvRef = useRef(activeConv)
  useEffect(() => { activeConvRef.current = activeConv }, [activeConv])
  const loadingMoreRef = useRef(loadingMore)
  useEffect(() => { loadingMoreRef.current = loadingMore }, [loadingMore])

  // Scroll infini — charger les anciens messages en remontant
  const handleScroll = useCallback(async () => {
    const el = messagesRef.current
    const conv = activeConvRef.current
    if (!el || loadingMoreRef.current || !activeId || !conv) return
    if (el.scrollTop > 60) return

    // Déclencher si on est en haut ET qu'il peut y avoir plus de messages
    const oldest = conv.messages[0]
    if (!oldest) return
    // hasMore undefined = on a pas encore essayé, on tente quand même
    if (conv.hasMore === false) return

    setLoadingMore(true)
    prevScrollHeight.current = el.scrollHeight
    await loadConversation(activeId, oldest.createdAt)
    setLoadingMore(false)
  }, [activeId, loadConversation])

  const handleSend = () => {
    const text = input.trim()
    if (!text || !activeId) return
    sendMessage(activeId, text)
    setInput('')
    // Scroll en bas après envoi
    setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 50)
  }

  return (
    <div className={styles.root}>
      {/* Sidebar conversations */}
      <div className={`${styles.sidebar} ${activeId ? styles.sidebarHidden : ''}`}>
        <div className={styles.sidebarHeader}>
          <button className={styles.backBtn} onClick={() => navigate('/')}>← Lobby</button>
          <h2 className={styles.sidebarTitle}>Messages</h2>
        </div>
        <div className={styles.convList}>
          {convList.length === 0 && (
            <div className={styles.empty}>
              <span>💬</span>
              <p>Aucune conversation</p>
              <p className={styles.emptyHint}>Envoie un message à un ami depuis le lobby !</p>
            </div>
          )}
          {convList.map(conv => (
            <ConvItem key={conv.userId} conv={conv} active={activeId === conv.userId}
              onClick={() => selectConv(conv.userId)} />
          ))}
        </div>
      </div>

      {/* Zone conversation */}
      <div className={`${styles.chat} ${!activeId ? styles.chatHidden : ''}`}>
        {activeConv ? (
          <>
            <div className={styles.chatHeader}>
              <button className={styles.backBtn} onClick={() => setActiveId(null)}>←</button>
              <Avatar username={activeConv.username} avatarUrl={activeConv.avatarUrl} size={32} />
              <span className={styles.chatName}>{activeConv.username}</span>
            </div>

            <div className={styles.messages} ref={messagesRef} onScroll={handleScroll}>
              {loadingMore && <div className={styles.loadingMore}>Chargement…</div>}
              {activeConv.hasMore && !loadingMore && (
                <div className={styles.loadMoreHint}>↑ Remontez pour charger plus</div>
              )}
              {activeConv.messages.length === 0 && !loadingMore && (
                <div className={styles.emptyChat}>Dites bonjour ! 👋</div>
              )}
              {activeConv.messages.map((msg, i) => {
                const isMe = msg.senderId === myId
                const showAvatar = !isMe && (i === 0 || activeConv.messages[i-1]?.senderId !== msg.senderId)
                return (
                  <div key={msg.id} className={`${styles.msgWrap} ${isMe ? styles.msgWrapMe : ''}`}>
                    {!isMe && (
                      <div className={styles.msgAvatar}>
                        {showAvatar
                          ? <Avatar username={activeConv.username} avatarUrl={activeConv.avatarUrl} size={28} />
                          : <div style={{ width: 28 }} />}
                      </div>
                    )}
                    <div className={`${styles.bubble} ${isMe ? styles.bubbleMe : ''}`}>{msg.content}</div>
                  </div>
                )
              })}
              <div ref={bottomRef} />
            </div>

            <div className={styles.inputRow}>
              <input className={styles.input} value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && !e.shiftKey && (e.preventDefault(), handleSend())}
                placeholder={`Message à ${activeConv.username}…`} autoFocus />
              <button className={styles.sendBtn} onClick={handleSend} disabled={!input.trim()}>
                <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path d="M22 2L11 13M22 2L15 22l-4-9-9-4 20-7z" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </button>
            </div>
          </>
        ) : (
          <div className={styles.noConv}><span>💬</span><p>Sélectionne une conversation</p></div>
        )}
      </div>
    </div>
  )
}
