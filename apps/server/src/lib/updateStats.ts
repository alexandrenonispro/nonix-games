import { prisma } from './prisma.js'
import { computeXpGain, XpResult } from './xp.js'
import { store } from './store.js'
import type { Namespace } from 'socket.io'

interface PlayerResult {
  userId: string
  rank: number
  isWinner: boolean
  totalPlayers: number
  isInfiltreWin?: boolean
}

export async function updatePlayerStats(
  gameId: string,
  players: PlayerResult[],
  roomNS?: Namespace,
  roomCode?: string,
) {
  for (const p of players) {
    try {
      const user = await prisma.user.findUnique({
        where: { id: p.userId },
        select: { xp: true, level: true }
      })
      if (!user) { console.warn(`[stats] user not found: ${p.userId}`); continue }

      const xpResult = computeXpGain({
        currentXp: user.xp,
        isWinner: p.isWinner,
        rank: p.rank,
        totalPlayers: p.totalPlayers,
        isInfiltreWin: p.isInfiltreWin,
      })

      // Récupérer stats existantes
      const existing = await prisma.userStat.findUnique({
        where: { userId_gameId: { userId: p.userId, gameId } }
      })

      const newGamesPlayed = (existing?.gamesPlayed ?? 0) + 1
      const newGamesWon    = (existing?.gamesWon ?? 0) + (p.isWinner ? 1 : 0)
      const newWinRate     = Math.round((newGamesWon / newGamesPlayed) * 100)

      await prisma.userStat.upsert({
        where: { userId_gameId: { userId: p.userId, gameId } },
        create: {
          userId: p.userId, gameId,
          gamesPlayed: 1, gamesWon: p.isWinner ? 1 : 0,
          winRate: p.isWinner ? 100 : 0, totalScore: 0, bestScore: 0,
        },
        update: { gamesPlayed: newGamesPlayed, gamesWon: newGamesWon, winRate: newWinRate },
      })

      await prisma.user.update({
        where: { id: p.userId },
        data: { xp: xpResult.newXp, level: xpResult.newLevel, rank: xpResult.newRank },
      })

      console.log(`[stats] ${p.userId} — +${xpResult.xpGained} XP lv.${xpResult.newLevel} ${xpResult.newRank}${xpResult.leveledUp ? ' 🎉 LEVEL UP!' : ''}`)

      // Envoyer notification XP au joueur via son socket
      if (roomNS && roomCode) {
        const room = store.get(roomCode)
        const member = room ? Array.from((room as any).members.values()).find((m: any) => m.id === p.userId) as any : null
        if (member?.socketId) {
          const socket = roomNS.sockets.get(member.socketId)
          if (socket) {
            socket.emit('user:xp-update', {
              xpGained: xpResult.xpGained,
              newXp: xpResult.newXp,
              newLevel: xpResult.newLevel,
              newRank: xpResult.newRank,
              leveledUp: xpResult.leveledUp,
              oldLevel: xpResult.newLevel - (xpResult.leveledUp ? 1 : 0),
            })
          }
        }
      }

    } catch (err) {
      console.error(`[stats] failed to update stats for ${p.userId}:`, err)
    }
  }
}
