import { useState, useCallback, useEffect, useRef } from 'react'
import { getLobbySocket } from './useLobbySocket'
import { sounds } from '../lib/sounds'

export interface DMMessage {
  id: string
  senderId: string
  receiverId: string
  content: string
  readAt: string | null
  createdAt: string
  sender: { id: string; username: string; avatarUrl: string | null }
  receiver?: { id: string; username: string; avatarUrl: string | null }
}

export interface DMConversation {
  userId: string
  username: string
  avatarUrl: string | null
  lastMessage: DMMessage | null
  unreadCount: number
  messages: DMMessage[]
  loaded: boolean
  hasMore?: boolean
}

const API = import.meta.env.VITE_SERVER_URL ?? 'http://localhost:3001'

async function apiFetch(path: string, token: string) {
  const res = await fetch(`${API}${path}`, {
    headers: { 'Authorization': `Bearer ${token}` },
  })
  return res.json()
}

// ── Helpers ──────────────────────────────────────────────────────────────────
function dedup(msgs: DMMessage[]): DMMessage[] {
  const seen = new Set<string>()
  return msgs.filter(m => { if (seen.has(m.id)) return false; seen.add(m.id); return true })
}

// ── State global partagé ─────────────────────────────────────────────────────
let globalConvs: Map<string, DMConversation> = new Map()
let openWindows: string[] = []
let listeners: Set<() => void> = new Set()
let windowListeners: Set<() => void> = new Set()

function notify() { listeners.forEach(l => l()) }
function notifyWindows() { windowListeners.forEach(l => l()) }

// ── Hook ─────────────────────────────────────────────────────────────────────
export function useDMs(token: string, myId: string) {
  const [convs, setConvs] = useState<Map<string, DMConversation>>(new Map(globalConvs))
  const [windows, setWindows] = useState<string[]>(openWindows)
  const [totalUnread, setTotalUnread] = useState(0)
  const attachedRef = useRef(false)

  // Abonnement aux changements globaux
  useEffect(() => {
    const update = () => {
      setConvs(new Map(globalConvs))
      setTotalUnread(Array.from(globalConvs.values()).reduce((s, c) => s + c.unreadCount, 0))
    }
    const winUpdate = () => setWindows([...openWindows])
    listeners.add(update)
    windowListeners.add(winUpdate)
    return () => { listeners.delete(update); windowListeners.delete(winUpdate) }
  }, [])

  // Charger les conversations au montage
  useEffect(() => {
    if (!token) return
    apiFetch('/api/dm/conversations', token).then(({ conversations }) => {
      if (!conversations) return
      for (const conv of conversations) {
        if (!globalConvs.has(conv.userId)) {
          globalConvs.set(conv.userId, { ...conv, messages: [], loaded: false })
        }
      }
      notify()
    })
  }, [token])

  // Attacher le listener dm:receive au socket
  useEffect(() => {
    if (!token || !myId || attachedRef.current) return

    const tryAttach = () => {
      const socket = getLobbySocket(token)
      if (!socket) return false

      const onReceive = ({ message }: { message: DMMessage }) => {
        const isMine = message.senderId === myId
        const otherId = isMine ? message.receiverId : message.senderId
        const other = isMine ? message.receiver : message.sender
        // Ne pas jouer le son si l'utilisateur est dans une room ou une partie
        const path = window.location.pathname
        const inGame = /\/(room|game)\//.test(path)
        if (!isMine && !inGame) sounds.dmNotif()
        const existing = globalConvs.get(otherId)
        const isWindowOpen = openWindows.includes(otherId)

        globalConvs.set(otherId, {
          userId: otherId,
          username: other?.username ?? existing?.username ?? '',
          avatarUrl: other?.avatarUrl ?? existing?.avatarUrl ?? null,
          unreadCount: (!isMine && !isWindowOpen)
            ? (existing?.unreadCount ?? 0) + 1
            : (existing?.unreadCount ?? 0),
          loaded: existing?.loaded ?? false, // false = pas encore chargé via API
          hasMore: existing?.hasMore ?? false,
          lastMessage: message,
          messages: dedup([...(existing?.messages ?? []), message]),
        })
        notify()
      }

      socket.on('dm:receive' as any, onReceive)
      attachedRef.current = true
      return true
    }

    if (!tryAttach()) {
      const interval = setInterval(() => {
        if (tryAttach()) clearInterval(interval)
      }, 300)
      return () => clearInterval(interval)
    }
  }, [token, myId])

  // Envoyer un message
  const sendMessage = useCallback((receiverId: string, content: string) => {
    const socket = getLobbySocket(token)
    socket?.emit('dm:send' as any, { receiverId, content })
  }, [token])

  // Charger l'historique d'une conversation (15 messages par page)
  const loadConversation = useCallback(async (userId: string, before?: string) => {
    const existing = globalConvs.get(userId)
    // Ne pas recharger si déjà chargé ET qu'on ne pagine pas ET qu'il n'y a pas de nouveaux messages potentiels
    // On force toujours le rechargement initial pour avoir les derniers messages
    if (!before && existing?.loaded) return

    const url = `/api/dm/${userId}?limit=15${before ? `&before=${before}` : ''}`
    const { messages } = await apiFetch(url, token)
    const conv = globalConvs.get(userId)
    const newMsgs: DMMessage[] = messages ?? []

    globalConvs.set(userId, {
      ...(conv ?? { userId, username: '', avatarUrl: null, lastMessage: null }),
      // Prepend pour les anciens messages (pagination), append pour les nouveaux
      messages: dedup(before ? [...newMsgs, ...(conv?.messages ?? [])] : newMsgs),
      unreadCount: 0,
      loaded: true,
      hasMore: newMsgs.length === 15, // s'il y a 15 msgs, il peut y en avoir plus
    } as any)
    notify()
    if (!before) getLobbySocket(token)?.emit('dm:read' as any, { senderId: userId })
  }, [token])

  // Ouvrir une fenêtre DM
  const openDM = useCallback((userId: string, friendInfo?: { username: string; avatarUrl: string | null }) => {
    if (!openWindows.includes(userId)) {
      openWindows = [...openWindows.slice(-2), userId]
      notifyWindows()
    }
    // Initialiser la conv si inconnue
    if (friendInfo && !globalConvs.has(userId)) {
      globalConvs.set(userId, {
        userId,
        username: friendInfo.username,
        avatarUrl: friendInfo.avatarUrl,
        lastMessage: null,
        unreadCount: 0,
        messages: [],
        loaded: false,
      })
      notify()
    }
    // Effacer les non-lus immédiatement
    const conv = globalConvs.get(userId)
    if (conv?.unreadCount) {
      globalConvs.set(userId, { ...conv, unreadCount: 0 })
      notify()
      getLobbySocket(token)?.emit('dm:read' as any, { senderId: userId })
    }
    loadConversation(userId)
  }, [token, loadConversation])

  const closeDM = useCallback((userId: string) => {
    openWindows = openWindows.filter(id => id !== userId)
    notifyWindows()
  }, [])

  const markRead = useCallback((userId: string) => {
    const conv = globalConvs.get(userId)
    if (conv?.unreadCount) {
      globalConvs.set(userId, { ...conv, unreadCount: 0 })
      notify()
      getLobbySocket(token)?.emit('dm:read' as any, { senderId: userId })
    }
  }, [token])

  return { convs, windows, totalUnread, openDM, closeDM, sendMessage, loadConversation, markRead }
}
