import { Router } from 'express'
import { prisma } from '../lib/prisma.js'
import { verifyToken } from '../lib/jwt.js'

export const usersRouter = Router()

// ─── Auth middleware ──────────────────────────────────────────────────────────

function requireAuth(req: any, res: any, next: any) {
  const token = req.headers.authorization?.slice(7)
  if (!token) return res.status(401).json({ error: 'Non authentifié' })
  const payload = verifyToken(token)
  if (!payload) return res.status(401).json({ error: 'Token invalide' })
  req.userId = payload.userId
  next()
}

// ─── GET /api/users/search?q=xxx ─────────────────────────────────────────────

usersRouter.get('/search', requireAuth, async (req: any, res) => {
  const q = (req.query.q as string ?? '').trim()
  if (q.length < 2) return res.json({ users: [] })

  const users = await prisma.user.findMany({
    where: {
      username: { contains: q, mode: 'insensitive' },
      id: { not: req.userId },
    },
    select: { id: true, username: true, avatarUrl: true, level: true, rank: true },
    take: 10,
  })
  return res.json({ users })
})

// ─── POST /api/users/friends/request ─────────────────────────────────────────

usersRouter.post('/friends/request', requireAuth, async (req: any, res) => {
  const { targetId } = req.body
  if (!targetId || targetId === req.userId)
    return res.status(400).json({ error: 'ID invalide' })

  const existing = await prisma.friendship.findFirst({
    where: {
      OR: [
        { requesterId: req.userId, receiverId: targetId },
        { requesterId: targetId, receiverId: req.userId },
      ],
    },
  })
  if (existing) return res.status(409).json({ error: 'Relation déjà existante' })

  const [friendship, sender] = await Promise.all([
    prisma.friendship.create({
      data: { requesterId: req.userId, receiverId: targetId },
    }),
    prisma.user.findUnique({
      where: { id: req.userId },
      select: { id: true, username: true, avatarUrl: true, level: true, rank: true },
    }),
  ])

  // Créer la notification en BDD
  await prisma.notification.create({
    data: {
      receiverId: targetId,
      senderId: req.userId,
      type: 'FRIEND_REQUEST',
      data: { friendshipId: friendship.id, sender },
    },
  })

  return res.status(201).json({ friendship })
})

// ─── POST /api/users/friends/respond ─────────────────────────────────────────

usersRouter.post('/friends/respond', requireAuth, async (req: any, res) => {
  const { friendshipId, accept } = req.body

  const friendship = await prisma.friendship.findUnique({ where: { id: friendshipId } })
  if (!friendship || friendship.receiverId !== req.userId)
    return res.status(403).json({ error: 'Non autorisé' })

  const updated = await prisma.friendship.update({
    where: { id: friendshipId },
    data: { status: accept ? 'ACCEPTED' : 'DECLINED' },
  })

  if (accept) {
    const [receiver] = await Promise.all([
      prisma.user.findUnique({
        where: { id: req.userId },
        select: { id: true, username: true, avatarUrl: true, level: true, rank: true },
      }),
    ])
    // Notifier celui qui avait envoyé la demande
    await prisma.notification.create({
      data: {
        receiverId: friendship.requesterId,
        senderId: req.userId,
        type: 'FRIEND_ACCEPTED',
        data: { friendshipId, accepter: receiver },
      },
    })
    // Marquer la notif de demande comme lue
    await prisma.notification.updateMany({
      where: { receiverId: req.userId, senderId: friendship.requesterId, type: 'FRIEND_REQUEST', read: false },
      data: { read: true },
    })
  }

  return res.json({ friendship: updated })
})

// ─── GET /api/users/friends/list ─────────────────────────────────────────────

usersRouter.get('/friends/list', requireAuth, async (req: any, res) => {
  const friendships = await prisma.friendship.findMany({
    where: {
      OR: [
        { requesterId: req.userId, status: 'ACCEPTED' },
        { receiverId: req.userId, status: 'ACCEPTED' },
      ],
    },
    include: {
      requester: { select: { id: true, username: true, avatarUrl: true, level: true, rank: true } },
      receiver:  { select: { id: true, username: true, avatarUrl: true, level: true, rank: true } },
    },
  })

  const friends = friendships.map((f) =>
    f.requesterId === req.userId ? f.receiver : f.requester
  )

  return res.json({ friends })
})

// ─── GET /api/users/notifications ────────────────────────────────────────────

usersRouter.get('/notifications', requireAuth, async (req: any, res) => {
  const notifications = await prisma.notification.findMany({
    where: { receiverId: req.userId, read: false },
    include: { sender: { select: { id: true, username: true, avatarUrl: true } } },
    orderBy: { createdAt: 'desc' },
    take: 20,
  })
  return res.json({ notifications })
})

// ─── POST /api/users/notifications/read ──────────────────────────────────────

usersRouter.post('/notifications/read', requireAuth, async (req: any, res) => {
  const { id } = req.body
  await prisma.notification.update({ where: { id }, data: { read: true } })
  return res.json({ ok: true })
})
// ─── GET /api/users/:id — profil public ──────────────────────────────────────

usersRouter.get('/:id', requireAuth, async (req: any, res) => {
  const { id } = req.params

  const user = await prisma.user.findUnique({
    where: { id },
    select: {
      id: true, username: true, avatarUrl: true, level: true, rank: true,
      xp: true, createdAt: true, lastLoginAt: true,
      userStats: true,
      userAchievements: {
        include: { achievement: true },
        orderBy: { unlockedAt: 'desc' },
      },
    },
  })

  if (!user) return res.status(404).json({ error: 'Utilisateur introuvable' })

  // Relation amis avec le viewer
  const friendship = await prisma.friendship.findFirst({
    where: {
      OR: [
        { requesterId: req.userId, receiverId: id },
        { requesterId: id, receiverId: req.userId },
      ],
    },
  })

  return res.json({ user, friendship })
})


// ─── GET /api/users/:id/history ──────────────────────────────────────────────

usersRouter.get('/:id/history', requireAuth, async (req: any, res) => {
  const { id } = req.params

  try {
    // Utiliser une raw query pour filtrer les rankings JSON
    const histories = await prisma.$queryRaw`
      SELECT h.id, h.room_code as "roomCode", h.started_at as "startedAt",
             h.ended_at as "endedAt", h.settings, h.rankings
      FROM drawnix_history h
      WHERE h.rankings::jsonb @> ${JSON.stringify([{ userId: id }])}::jsonb
      ORDER BY h.ended_at DESC
      LIMIT 20
    `

    // Récupérer les turns pour chaque partie
    const historiesWithTurns = await Promise.all(
      (histories as any[]).map(async (h: any) => {
        const turns = await prisma.drawnixTurn.findMany({
          where: { historyId: h.id },
          orderBy: [{ round: 'asc' }, { turnIndex: 'asc' }],
        })
        return { ...h, turns }
      })
    )
    const histories2 = historiesWithTurns

    // Récupérer aussi l'historique Undercover
    const undercoverHistories = await prisma.$queryRaw`
      SELECT id, room_code as "roomCode", started_at as "startedAt",
             ended_at as "endedAt", winner, civil_word as "civilWord",
             undercover_word as "undercoverWord", players, rounds
      FROM undercover_history
      WHERE players::jsonb @> ${JSON.stringify([{ userId: id }])}::jsonb
      ORDER BY ended_at DESC
      LIMIT 20
    `

    // Normaliser le format Undercover pour GameHistory
    const undercoverFormatted = (undercoverHistories as any[]).map((h: any) => ({
      id: h.id,
      roomCode: h.roomCode,
      startedAt: h.startedAt,
      endedAt: h.endedAt,
      gameId: 'undercover',
      settings: {
        durationMs: new Date(h.endedAt).getTime() - new Date(h.startedAt).getTime(),
      },
      winner: h.winner,
      civilWord: h.civilWord,
      undercoverWord: h.undercoverWord,
      rounds: h.rounds,
      players: h.players,
      rankings: (h.players as any[]).map((p: any, i: number) => ({
        userId: p.userId,
        username: p.username,
        avatarUrl: p.avatarUrl,
        role: p.role,
        isWinner: p.isWinner,
        rank: p.isWinner ? 1 : 2,
        score: 0,
      })),
      turns: [],
    }))

    // Fusionner et trier par date
    const allHistories = [...histories2, ...undercoverFormatted]
      .sort((a: any, b: any) => new Date(b.endedAt).getTime() - new Date(a.endedAt).getTime())

    return res.json({ histories: allHistories })
  } catch (err) {
    console.error('[history] error:', err)
    return res.status(500).json({ error: 'Erreur serveur' })
  }
})
