import { useEffect, useRef, useState, useCallback } from 'react'
import { Avatar } from '../components/Avatar'
import type { DMConversation } from '../socket/useDMs'
import styles from './DMWindow.module.css'

interface DMWindowProps {
  conv: DMConversation
  myId: string
  onClose: () => void
  onSend: (receiverId: string, content: string) => void
  onLoadMore: (userId: string, before: string) => Promise<void>
  index: number
}

export function DMWindow({ conv, myId, onClose, onSend, onLoadMore, index }: DMWindowProps) {
  const [input, setInput] = useState('')
  const [minimized, setMinimized] = useState(false)
  const [unreadWhileMin, setUnreadWhileMin] = useState(0)
  const [loadingMore, setLoadingMore] = useState(false)
  const convRef = useRef(conv)
  useEffect(() => { convRef.current = conv }, [conv])
  const loadingMoreRef = useRef(false)
  useEffect(() => { loadingMoreRef.current = loadingMore }, [loadingMore])
  const messagesRef = useRef<HTMLDivElement>(null)
  const bottomRef = useRef<HTMLDivElement>(null)
  const isFirstLoad = useRef(true)
  const prevScrollHeight = useRef(0)

  // Compter les messages reçus pendant la réduction
  useEffect(() => {
    if (!minimized) return
    setUnreadWhileMin(u => u + 1)
  }, [conv.messages.length])

  // Scroll en bas à l'ouverture et nouveaux messages
  useEffect(() => {
    if (!conv.loaded || minimized) return
    const el = messagesRef.current
    if (!el) return
    if (isFirstLoad.current) {
      el.scrollTop = el.scrollHeight
      isFirstLoad.current = false
    } else if (el.scrollHeight - el.scrollTop - el.clientHeight < 100) {
      bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
    }
  }, [conv.messages.length, conv.loaded, minimized])

  // Restaurer position scroll après chargement
  useEffect(() => {
    if (!loadingMore) return
    const el = messagesRef.current
    if (el) el.scrollTop = el.scrollHeight - prevScrollHeight.current
  }, [conv.messages.length])

  // Scroll infini
  const handleScroll = useCallback(async () => {
    const el = messagesRef.current
    const c = convRef.current
    if (!el || loadingMoreRef.current) return
    if (el.scrollTop > 40) return
    if (c.hasMore === false) return
    const oldest = c.messages[0]
    if (!oldest) return
    setLoadingMore(true)
    prevScrollHeight.current = el.scrollHeight
    await onLoadMore(c.userId, oldest.createdAt)
    setLoadingMore(false)
  }, [onLoadMore])

  const handleToggleMinimize = (e: React.MouseEvent) => {
    e.stopPropagation()
    const next = !minimized
    setMinimized(next)
    if (!next) {
      // On ouvre — effacer les notifs et scroller en bas
      setUnreadWhileMin(0)
      isFirstLoad.current = true
    }
  }

  const handleSend = () => {
    const text = input.trim()
    if (!text) return
    onSend(conv.userId, text)
    setInput('')
    setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 50)
  }

  const right = 16 + index * 340

  return (
    <div className={styles.window} style={{ right }}>
      <div className={styles.header} onClick={handleToggleMinimize}>
        <div className={styles.headerLeft}>
          <Avatar username={conv.username} avatarUrl={conv.avatarUrl} size={28} />
          <span className={styles.headerName}>{conv.username}</span>
          {minimized && unreadWhileMin > 0 && (
            <span className={styles.headerBadge}>{unreadWhileMin}</span>
          )}
        </div>
        <div className={styles.headerActions}>
          <button className={styles.iconBtn} onClick={handleToggleMinimize}>
            {minimized ? '▲' : '▼'}
          </button>
          <button className={styles.iconBtn} onClick={e => { e.stopPropagation(); onClose() }}>✕</button>
        </div>
      </div>

      {!minimized && (
        <>
          <div className={styles.messages} ref={messagesRef} onScroll={handleScroll}>
            {loadingMore && <div className={styles.loadingMore}>Chargement…</div>}
            {conv.messages.length === 0 && !loadingMore && (
              <div className={styles.empty}>Aucun message. Dites bonjour ! 👋</div>
            )}
            {conv.messages.map((msg, i) => {
              const isMe = msg.senderId === myId
              const prevMsg = conv.messages[i - 1]
              const showAvatar = !isMe && (!prevMsg || prevMsg.senderId !== msg.senderId)
              return (
                <div key={msg.id} className={`${styles.msgRow} ${isMe ? styles.msgRowMe : ''}`}>
                  {!isMe && (
                    <div className={styles.msgAvatar}>
                      {showAvatar
                        ? <Avatar username={conv.username} avatarUrl={conv.avatarUrl} size={22} />
                        : <div style={{ width: 22 }} />}
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
              onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend() } }}
              placeholder="Écrire un message..." autoFocus />
            <button className={styles.sendBtn} onClick={handleSend} disabled={!input.trim()}>
              <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path d="M22 2L11 13M22 2L15 22l-4-9-9-4 20-7z" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </button>
          </div>
        </>
      )}
    </div>
  )
}
