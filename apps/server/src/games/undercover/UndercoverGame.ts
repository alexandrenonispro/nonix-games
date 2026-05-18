import { WORD_PAIRS } from './words.js'

export type Role = 'civil' | 'undercover' | 'mrwhite'
export type Phase = 'description' | 'discussion' | 'vote' | 'mrwhite-guess' | 'ended'

export interface UndercoverPlayer {
  id: string
  username: string
  avatarUrl: string | null
  role: Role
  word: string | null        // null pour Mr. White
  description: string | null // mot décrit pendant la phase description
  isEliminated: boolean
  votes: number
  hasVoted: boolean
  hasDescribed: boolean
}

export interface UndercoverState {
  phase: Phase
  players: UndercoverPlayer[]
  civilWord: string
  undercoverWord: string
  currentDescriberId: string | null   // qui décrit actuellement
  describeOrder: string[]             // ordre de description
  discussionTimeLeft: number
  round: number
  winner: 'civils' | 'undercover' | 'mrwhite' | null
  winnerIds: string[]
  eliminatedThisRound: UndercoverPlayer | null
  log: string[]
  mrWhiteGuessPlayerId: string | null
  allDescriptions: { round: number; playerId: string; username: string; description: string }[] // Mr. White éliminé qui doit deviner
}

export class UndercoverGame {
  state: UndercoverState

  constructor(players: { id: string; username: string; avatarUrl: string | null }[]) {
    const n = players.length
    // Nombre d'undercovers et Mr. Whites selon le nombre de joueurs
    const numUndercover = n >= 10 ? 2 : 1
    const numMrWhite = n >= 15 ? 2 : 1

    // Choisir une paire de mots aléatoire
    const pair = WORD_PAIRS[Math.floor(Math.random() * WORD_PAIRS.length)]!
    const [civilWord, undercoverWord] = Math.random() < 0.5 ? pair : [pair[1], pair[0]]

    // Assigner les rôles
    const shuffled = [...players].sort(() => Math.random() - 0.5)
    const gamePlayers: UndercoverPlayer[] = shuffled.map((p, i) => {
      let role: Role = 'civil'
      if (i < numUndercover) role = 'undercover'
      else if (i < numUndercover + numMrWhite) role = 'mrwhite'
      return {
        id: p.id,
        username: p.username,
        avatarUrl: p.avatarUrl,
        role,
        word: role === 'civil' ? civilWord : role === 'undercover' ? undercoverWord : null,
        description: null,
        isEliminated: false,
        votes: 0,
        hasVoted: false,
        hasDescribed: false,
      }
    })

    // Ordre de description aléatoire (joueurs actifs)
    const describeOrder = gamePlayers.map(p => p.id).sort(() => Math.random() - 0.5)

    this.state = {
      phase: 'description',
      players: gamePlayers,
      civilWord,
      undercoverWord,
      currentDescriberId: describeOrder[0] ?? null,
      describeOrder,
      discussionTimeLeft: 120,
      round: 1,
      winner: null,
      winnerIds: [],
      eliminatedThisRound: null,
      log: ['La partie commence ! Phase de description.'],
      mrWhiteGuessPlayerId: null,
      allDescriptions: [],
    }
  }

  getActivePlayers() {
    return this.state.players.filter(p => !p.isEliminated)
  }

  getStateForPlayer(playerId: string): UndercoverState {
    const s = this.state
    // Cacher les mots et rôles des autres joueurs jusqu'à la fin
    const isEnded = s.phase === 'ended'
    return {
      ...s,
      players: s.players.map(p => ({
        ...p,
        word: p.id === playerId || isEnded ? p.word : undefined as any,
        role: p.id === playerId || isEnded ? p.role : undefined as any,
      })),
      civilWord: isEnded ? s.civilWord : undefined as any,
      undercoverWord: isEnded ? s.undercoverWord : undefined as any,
    }
  }

  describe(playerId: string, description: string): { ok: boolean; reason?: string } {
    const s = this.state
    if (s.phase !== 'description') return { ok: false, reason: 'Pas en phase de description.' }
    if (s.currentDescriberId !== playerId) return { ok: false, reason: "Ce n'est pas votre tour de décrire." }
    const player = s.players.find(p => p.id === playerId)
    if (!player || player.isEliminated) return { ok: false, reason: 'Joueur invalide.' }
    if (description.trim().length === 0) return { ok: false, reason: 'Description vide.' }
    if (description.trim().split(/\s+/).length > 3) return { ok: false, reason: 'Maximum 3 mots.' }

    player.description = description.trim()
    player.hasDescribed = true
    s.log.push(`${player.username} : "${description.trim()}"`)
    s.allDescriptions.push({ round: s.round, playerId: player.id, username: player.username, description: description.trim() })

    // Passer au joueur suivant
    const activeIds = this.getActivePlayers().map(p => p.id)
    const currentIndex = s.describeOrder.findIndex(id => id === playerId)
    let nextId: string | null = null
    for (let i = currentIndex + 1; i < s.describeOrder.length; i++) {
      if (activeIds.includes(s.describeOrder[i]!)) { nextId = s.describeOrder[i]!; break }
    }

    if (!nextId) {
      // Tous ont décrit → phase discussion
      s.phase = 'discussion'
      s.currentDescriberId = null
      s.discussionTimeLeft = 120
      s.log.push('Phase de discussion ! Débattez et trouvez les infiltrés.')
    } else {
      s.currentDescriberId = nextId
    }
    return { ok: true }
  }

  startVote(): { ok: boolean } {
    const s = this.state
    if (s.phase !== 'discussion') return { ok: false }
    s.phase = 'vote'
    s.players.forEach(p => { p.votes = 0; p.hasVoted = false })
    s.log.push('Phase de vote ! Éliminez un joueur.')
    return { ok: true }
  }

  vote(voterId: string, targetId: string): { ok: boolean; reason?: string; eliminated?: UndercoverPlayer } {
    const s = this.state
    if (s.phase !== 'vote') return { ok: false, reason: 'Pas en phase de vote.' }
    const voter = s.players.find(p => p.id === voterId)
    if (!voter || voter.isEliminated) return { ok: false, reason: 'Votant invalide.' }
    if (voter.hasVoted) return { ok: false, reason: 'Vous avez déjà voté.' }
    const target = s.players.find(p => p.id === targetId)
    if (!target || target.isEliminated) return { ok: false, reason: 'Cible invalide.' }

    voter.hasVoted = true
    target.votes++
    s.log.push(`${voter.username} vote contre ${target.username}.`)

    // Vérifier si tout le monde a voté
    const activePlayers = this.getActivePlayers()
    const allVoted = activePlayers.every(p => p.hasVoted)
    if (!allVoted) return { ok: true }

    // Trouver le joueur le plus voté
    const maxVotes = Math.max(...activePlayers.map(p => p.votes))
    const candidates = activePlayers.filter(p => p.votes === maxVotes)
    // En cas d'égalité, tirage au sort
    const eliminated = candidates[Math.floor(Math.random() * candidates.length)]!
    eliminated.isEliminated = true
    s.eliminatedThisRound = { ...eliminated }
    s.log.push(`${eliminated.username} est éliminé avec ${eliminated.votes} vote(s) !`)

    // Mr. White éliminé → chance de deviner
    if (eliminated.role === 'mrwhite') {
      s.phase = 'mrwhite-guess'
      s.mrWhiteGuessPlayerId = eliminated.id
      s.log.push(`${eliminated.username} est Mr. White ! Il peut tenter de deviner le mot des civils.`)
      return { ok: true, eliminated }
    }

    this.checkWinCondition()
    return { ok: true, eliminated }
  }

  mrWhiteGuess(playerId: string, guess: string): { ok: boolean; correct: boolean } {
    const s = this.state
    if (s.phase !== 'mrwhite-guess') return { ok: false, correct: false }
    if (s.mrWhiteGuessPlayerId !== playerId) return { ok: false, correct: false }

    const correct = guess.trim().toLowerCase() === s.civilWord.toLowerCase()
    s.log.push(`Mr. White devine : "${guess.trim()}" — ${correct ? '✅ CORRECT !' : '❌ Raté.'}`)

    if (correct) {
      s.phase = 'ended'
      s.winner = 'mrwhite'
      s.winnerIds = s.players.filter(p => p.role === 'mrwhite').map(p => p.id)
      s.log.push('Mr. White a deviné le mot ! Les Mr. Whites gagnent !')
    } else {
      s.mrWhiteGuessPlayerId = null
      if (!this.checkWinCondition()) {
        this.nextRound()
      }
    }
    return { ok: true, correct }
  }

  checkWinCondition(): boolean {
    const s = this.state
    const active = this.getActivePlayers()
    const activeCivils = active.filter(p => p.role === 'civil')
    const activeUndercovers = active.filter(p => p.role === 'undercover')
    const activeMrWhites = active.filter(p => p.role === 'mrwhite')

    // Civils gagnent si tous undercovers + mrwhites éliminés
    if (activeUndercovers.length === 0 && activeMrWhites.length === 0) {
      s.phase = 'ended'
      s.winner = 'civils'
      s.winnerIds = s.players.filter(p => p.role === 'civil').map(p => p.id)
      s.log.push('Tous les infiltrés sont éliminés ! Les civils gagnent !')
      return true
    }

    // Undercovers/MrWhites gagnent si ≤ 1 civil restant
    if (activeCivils.length <= 1) {
      s.phase = 'ended'
      const infiltres = s.players.filter(p => p.role !== 'civil')
      s.winner = activeUndercovers.length > 0 ? 'undercover' : 'mrwhite'
      s.winnerIds = infiltres.map(p => p.id)
      s.log.push('Les infiltrés ont survécu ! Ils gagnent !')
      return true
    }

    return false
  }

  nextRound(): { ok: boolean } {
    const s = this.state
    if (s.phase !== 'vote' && s.phase !== 'mrwhite-guess') return { ok: false }
    if (this.checkWinCondition()) return { ok: true }

    s.round++
    s.phase = 'description'
    s.eliminatedThisRound = null
    s.mrWhiteGuessPlayerId = null
    s.log.push(`--- Tour ${s.round} ---`)

    // Réinitialiser descriptions et votes
    s.players.forEach(p => { p.description = null; p.hasDescribed = false; p.votes = 0; p.hasVoted = false })
    // Nouvel ordre de description (actifs uniquement)
    const active = this.getActivePlayers()
    s.describeOrder = active.map(p => p.id).sort(() => Math.random() - 0.5)
    s.currentDescriberId = s.describeOrder[0] ?? null
    s.log.push('Phase de description ! À votre tour de décrire votre mot.')
    return { ok: true }
  }
}
