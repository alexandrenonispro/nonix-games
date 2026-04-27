// Points pour les devineurs — dégressif selon l'ordre de réponse
// 1er → 500pts, 2ème → 400pts, etc. (min 100)
export function guesserPoints(rank: number, timeLeft: number, totalTime: number): number {
  const baseByRank = Math.max(100, 500 - (rank - 1) * 100)
  const timeBonus = Math.floor((timeLeft / totalTime) * 100)
  return baseByRank + timeBonus
}

// Points pour le dessinateur — proportionnel au nombre de joueurs qui ont deviné
export function drawerPoints(guessedCount: number, totalGuessers: number): number {
  if (totalGuessers === 0) return 0
  const ratio = guessedCount / totalGuessers
  return Math.floor(ratio * 300)
}
