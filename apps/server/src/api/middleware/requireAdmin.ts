import type { Request, Response, NextFunction } from 'express'
import { prisma } from '../../lib/prisma.js'

export async function requireAdmin(req: Request, res: Response, next: NextFunction) {
  const userId = (req as any).userId
  if (!userId) return res.status(401).json({ error: 'Non authentifié' })

  const user = await prisma.user.findUnique({ where: { id: userId }, select: { role: true } })
  if (!user || user.role !== 'ADMIN') {
    return res.status(403).json({ error: 'Accès refusé — rôle Admin requis' })
  }
  next()
}
