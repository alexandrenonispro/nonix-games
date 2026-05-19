// ─── Système XP & Rangs ──────────────────────────────────────────────────────

// Option A — linéaire douce : niveau N requiert N×200 XP cumulatif
// Total Lv.150 = 150×200 = 30 000 XP

export function xpForLevel(level: number): number {
  return level * 200
}

// XP total cumulé nécessaire pour atteindre un niveau donné
export function totalXpForLevel(level: number): number {
  // Somme de 1 à (level-1) : on est au niveau `level` quand on a cumulé les niveaux précédents
  // xpForLevel(1) + xpForLevel(2) + ... + xpForLevel(level-1)
  // = 200 * (1 + 2 + ... + (level-1)) = 200 * (level-1)*level/2
  if (level <= 1) return 0
  return 200 * ((level - 1) * level) / 2
}

// Calculer le niveau à partir de l'XP total
export function levelFromXp(totalXp: number): number {
  // On cherche le plus grand level tel que totalXpForLevel(level) <= totalXp
  // totalXpForLevel(level) = 200*(level-1)*level/2 = 100*level*(level-1)
  // 100*L*(L-1) <= totalXp  =>  L^2 - L - totalXp/100 <= 0
  // L = floor((1 + sqrt(1 + 4*totalXp/100)) / 2)
  const level = Math.floor((1 + Math.sqrt(1 + 4 * totalXp / 100)) / 2)
  return Math.min(Math.max(1, level), 150)
}

// ─── Rangs ───────────────────────────────────────────────────────────────────

export const RANKS: { minLevel: number; maxLevel: number; name: string; tier: string }[] = [
  // Débutant
  { minLevel: 1,   maxLevel: 1,   name: 'Rookie',          tier: 'Débutant' },
  { minLevel: 2,   maxLevel: 3,   name: 'Débutant',        tier: 'Débutant' },
  { minLevel: 4,   maxLevel: 5,   name: 'Apprenti',        tier: 'Débutant' },
  // Bronze
  { minLevel: 6,   maxLevel: 8,   name: 'Novice Bronze',   tier: 'Bronze' },
  { minLevel: 9,   maxLevel: 12,  name: 'Bronze',          tier: 'Bronze' },
  { minLevel: 13,  maxLevel: 16,  name: 'Bronze Confirmé', tier: 'Bronze' },
  { minLevel: 17,  maxLevel: 20,  name: 'Expert Bronze',   tier: 'Bronze' },
  // Argent
  { minLevel: 21,  maxLevel: 25,  name: 'Argent',          tier: 'Argent' },
  { minLevel: 26,  maxLevel: 30,  name: 'Argent Confirmé', tier: 'Argent' },
  { minLevel: 31,  maxLevel: 35,  name: 'Expert Argent',   tier: 'Argent' },
  { minLevel: 36,  maxLevel: 40,  name: 'Maître Argent',   tier: 'Argent' },
  // Or
  { minLevel: 41,  maxLevel: 46,  name: 'Or',              tier: 'Or' },
  { minLevel: 47,  maxLevel: 52,  name: 'Or Confirmé',     tier: 'Or' },
  { minLevel: 53,  maxLevel: 58,  name: 'Expert Or',       tier: 'Or' },
  { minLevel: 59,  maxLevel: 65,  name: 'Grand Maître Or', tier: 'Or' },
  // Diamant
  { minLevel: 66,  maxLevel: 72,  name: 'Diamant',         tier: 'Diamant' },
  { minLevel: 73,  maxLevel: 79,  name: 'Diamant Brillant',tier: 'Diamant' },
  { minLevel: 80,  maxLevel: 85,  name: 'Diamant Expert',  tier: 'Diamant' },
  { minLevel: 86,  maxLevel: 90,  name: 'Diamant Royal',   tier: 'Diamant' },
  // Maître
  { minLevel: 91,  maxLevel: 97,  name: 'Maître',          tier: 'Maître' },
  { minLevel: 98,  maxLevel: 104, name: 'Maître Confirmé', tier: 'Maître' },
  { minLevel: 105, maxLevel: 110, name: 'Grand Maître',    tier: 'Maître' },
  { minLevel: 111, maxLevel: 115, name: 'Élite Maître',    tier: 'Maître' },
  // Challenger
  { minLevel: 116, maxLevel: 120, name: 'Challenger',      tier: 'Challenger' },
  { minLevel: 121, maxLevel: 125, name: 'Challenger Expert',tier: 'Challenger' },
  { minLevel: 126, maxLevel: 130, name: 'Challenger Élite',tier: 'Challenger' },
  { minLevel: 131, maxLevel: 135, name: 'Élite',           tier: 'Challenger' },
  // Légendaire
  { minLevel: 136, maxLevel: 140, name: 'Légende',         tier: 'Légendaire' },
  { minLevel: 141, maxLevel: 145, name: 'Légende Immortelle', tier: 'Légendaire' },
  { minLevel: 146, maxLevel: 149, name: 'Ascendant',       tier: 'Légendaire' },
  { minLevel: 150, maxLevel: 150, name: 'Divinité',        tier: 'Légendaire' },
]

export function rankFromLevel(level: number): string {
  const entry = RANKS.find(r => level >= r.minLevel && level <= r.maxLevel)
  return entry?.name ?? 'Rookie'
}

// ─── XP par partie ───────────────────────────────────────────────────────────

export const XP_PARTICIPATION = 50
export const XP_WIN           = 150
export const XP_TOP_HALF      = 75
export const XP_INFILTRE_WIN  = 200 // Undercover: undercover ou mrwhite gagnant

export interface XpResult {
  xpGained: number
  newXp: number
  newLevel: number
  newRank: string
  leveledUp: boolean
}

export function computeXpGain(opts: {
  currentXp: number
  isWinner: boolean
  rank: number        // position (1 = premier)
  totalPlayers: number
  isInfiltreWin?: boolean
}): XpResult {
  let gained = XP_PARTICIPATION
  if (opts.isWinner) gained += XP_WIN
  else if (opts.rank <= Math.ceil(opts.totalPlayers / 2)) gained += XP_TOP_HALF
  if (opts.isInfiltreWin) gained += XP_INFILTRE_WIN

  const newXp    = opts.currentXp + gained
  const newLevel = levelFromXp(newXp)
  const oldLevel = levelFromXp(opts.currentXp)
  const newRank  = rankFromLevel(newLevel)

  return { xpGained: gained, newXp, newLevel, newRank, leveledUp: newLevel > oldLevel }
}
