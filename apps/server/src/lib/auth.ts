import { verifyToken } from './jwt.js'
import { prisma } from './prisma.js'
import type { ServerPlayer } from './store.js'

export async function parseToken(token: string, socketId: string): Promise<ServerPlayer | null> {
  const payload = verifyToken(token)
  if (!payload) return null

  try {
    const user = await prisma.user.findUnique({
      where: { id: payload.userId },
      select: { id: true, username: true, avatarUrl: true, level: true, rank: true },
    })
    if (!user) return null
    return { ...user, socketId }
  } catch {
    return null
  }
}
