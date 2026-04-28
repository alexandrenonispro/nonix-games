import { Router } from 'express'
import { prisma } from '../lib/prisma.js'
import { verifyToken } from '../lib/jwt.js'

export const dmRouter = Router()

// Auth middleware
function auth(req: any, res: any, next: any) {
  const token = req.headers.authorization?.slice(7)
  const payload = verifyToken(token ?? '')
  if (!payload) return res.status(401).json({ error: 'Non autorisé' })
  req.userId = payload.userId
  next()
}

// ─── GET /api/dm/conversations ─────────────────────────────────────────────────
// Liste des conversations avec le dernier message + nb non lus

dmRouter.get('/conversations', auth, async (req: any, res) => {
  const userId = req.userId

  // Récupérer tous les messages impliquant l'user, groupés par conversation
  const messages = await prisma.directMessage.findMany({
    where: { OR: [{ senderId: userId }, { receiverId: userId }] },
    orderBy: { createdAt: 'desc' },
    include: {
      sender:   { select: { id: true, username: true, avatarUrl: true } },
      receiver: { select: { id: true, username: true, avatarUrl: true } },
    },
  })

  // Grouper par interlocuteur
  const convMap = new Map<string, any>()
  for (const msg of messages) {
    const otherId = msg.senderId === userId ? msg.receiverId : msg.senderId
    const other   = msg.senderId === userId ? msg.receiver  : msg.sender
    if (!convMap.has(otherId)) {
      convMap.set(otherId, {
        userId:    other.id,
        username:  other.username,
        avatarUrl: other.avatarUrl,
        lastMessage: msg,
        unreadCount: 0,
      })
    }
    // Compter les non lus (reçus par moi, pas encore lus)
    if (msg.receiverId === userId && !msg.readAt) {
      convMap.get(otherId).unreadCount++
    }
  }

  res.json({ conversations: Array.from(convMap.values()) })
})

// ─── GET /api/dm/:userId ────────────────────────────────────────────────────────
// Historique d'une conversation + marque comme lu

dmRouter.get('/:userId', auth, async (req: any, res) => {
  const myId    = req.userId
  const otherId = req.params.userId
  const limit   = parseInt(req.query.limit as string) || 50
  const before  = req.query.before as string | undefined

  // Fetch les N derniers messages (ou N avant le curseur), puis re-inverser en asc
  const messages = await prisma.directMessage.findMany({
    where: {
      OR: [
        { senderId: myId,    receiverId: otherId },
        { senderId: otherId, receiverId: myId    },
      ],
      ...(before ? { createdAt: { lt: new Date(before) } } : {}),
    },
    orderBy: { createdAt: 'desc' }, // desc pour avoir les plus récents
    take: limit,
    include: {
      sender:   { select: { id: true, username: true, avatarUrl: true } },
      receiver: { select: { id: true, username: true, avatarUrl: true } },
    },
  })
  // Remettre en ordre chronologique
  messages.reverse()

  // Marquer les messages reçus comme lus
  await prisma.directMessage.updateMany({
    where: { senderId: otherId, receiverId: myId, readAt: null },
    data:  { readAt: new Date() },
  })

  res.json({ messages })
})

// ─── POST /api/dm/:userId ───────────────────────────────────────────────────────
// Envoyer un message (fallback HTTP si socket pas dispo)

dmRouter.post('/:userId', auth, async (req: any, res) => {
  const senderId   = req.userId
  const receiverId = req.params.userId
  const { content } = req.body

  if (!content?.trim()) return res.status(400).json({ error: 'Message vide' })

  const msg = await prisma.directMessage.create({
    data: { senderId, receiverId, content: content.trim() },
    include: {
      sender: { select: { id: true, username: true, avatarUrl: true } },
    },
  })

  res.status(201).json({ message: msg })
})
