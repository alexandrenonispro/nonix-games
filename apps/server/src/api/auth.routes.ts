import { Router } from 'express'
import bcrypt from 'bcryptjs'
import { z } from 'zod'
import { prisma } from '../lib/prisma.js'
import { signToken } from '../lib/jwt.js'

export const authRouter = Router()

const registerSchema = z.object({
  username: z
    .string()
    .min(3, 'Minimum 3 caractères')
    .max(20, 'Maximum 20 caractères')
    .regex(/^[a-zA-Z0-9_-]+$/, 'Lettres, chiffres, _ et - uniquement'),
  email: z.string().email().optional(),   // gardé en BDD mais optionnel
  password: z.string().min(6, 'Minimum 6 caractères'),
})

const loginSchema = z.object({
  username: z.string().min(1),
  password: z.string().min(1),
})

// ─── POST /api/auth/register ──────────────────────────────────────────────────

authRouter.post('/register', async (req, res) => {
  const parsed = registerSchema.safeParse(req.body)
  if (!parsed.success) {
    return res.status(400).json({
      error: parsed.error.errors[0]?.message ?? 'Données invalides',
    })
  }

  const { username, email, password } = parsed.data

  try {
    const existing = await prisma.user.findFirst({
      where: { username },
    })

    if (existing) {
      return res.status(409).json({
        error: 'Ce pseudo est déjà pris',
        field: 'username',
      })
    }

    const hashedPassword = await bcrypt.hash(password, 10)

    // Email stocké en BDD (fourni par le client ou auto-généré)
    const finalEmail = email ?? `${username.toLowerCase()}@nonix.local`

    const user = await prisma.user.create({
      data: { username, email: finalEmail, password: hashedPassword },
      select: { id: true, username: true, email: true, level: true, rank: true, avatarUrl: true },
    })

    const token = signToken({ userId: user.id, username: user.username })

    return res.status(201).json({ token, user })
  } catch (err) {
    console.error('[auth] register error:', err)
    return res.status(500).json({ error: 'Erreur serveur' })
  }
})

// ─── POST /api/auth/login ─────────────────────────────────────────────────────

authRouter.post('/login', async (req, res) => {
  const parsed = loginSchema.safeParse(req.body)
  if (!parsed.success) {
    return res.status(400).json({ error: 'Données invalides' })
  }

  const { username, password } = parsed.data

  try {
    const user = await prisma.user.findUnique({
      where: { username },
      select: { id: true, username: true, email: true, password: true, level: true, rank: true, avatarUrl: true },
    })

    if (!user) {
      return res.status(401).json({ error: 'Pseudo ou mot de passe incorrect' })
    }

    const valid = await bcrypt.compare(password, user.password)
    if (!valid) {
      return res.status(401).json({ error: 'Pseudo ou mot de passe incorrect' })
    }

    const { password: _, ...userWithoutPassword } = user
    const token = signToken({ userId: user.id, username: user.username })
    await prisma.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } })

    return res.json({ token, user: userWithoutPassword })
  } catch (err) {
    console.error('[auth] login error:', err)
    return res.status(500).json({ error: 'Erreur serveur' })
  }
})

// ─── GET /api/auth/me ─────────────────────────────────────────────────────────

authRouter.get('/me', async (req, res) => {
  const authHeader = req.headers.authorization
  if (!authHeader?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Token manquant' })
  }

  const token = authHeader.slice(7)
  const { verifyToken } = await import('../lib/jwt.js')
  const payload = verifyToken(token)

  if (!payload) {
    return res.status(401).json({ error: 'Token invalide' })
  }

  try {
    const user = await prisma.user.findUnique({
      where: { id: payload.userId },
      select: { id: true, username: true, email: true, level: true, rank: true, avatarUrl: true, xp: true },
    })

    if (!user) return res.status(404).json({ error: 'Utilisateur introuvable' })
    return res.json({ user })
  } catch (err) {
    return res.status(500).json({ error: 'Erreur serveur' })
  }
})
