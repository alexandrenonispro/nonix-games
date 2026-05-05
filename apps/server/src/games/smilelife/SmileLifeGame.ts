import { buildDeck, shuffle, type Card, type MalusType } from './cards.js'

// ─── Types ────────────────────────────────────────────────────────────────────

export interface PlayerBoard {
  etudes: Card[]         // cartes études posées
  metier: Card | null    // métier actuel
  salaires: Card[]       // salaires posés (actifs = non retournés)
  salairesInvestis: Card[] // salaires retournés (pour acquisitions)
  flirts: Card[]         // flirts officiels (max 5 sauf cas précis)
  flirtsAdultere: Card[] // flirts pendant adultère
  mariage: Card | null
  adultere: Card | null
  enfants: Card[]
  enfantsAdultere: Card[] // enfants issus de l'adultère
  animaux: Card[]
  voyages: Card[]
  maisons: Card[]
  malus: Card[]          // malus reçus et conservés
  speciales: Card[]      // cartes spéciales utilisées
  heritage: number       // liasses d'héritage disponibles
}

export interface PlayerState {
  id: string
  username: string
  avatarUrl: string | null
  hand: Card[]           // visible uniquement par le joueur concerné
  board: PlayerBoard
  skippedTurns: number   // tours à passer (accident/burn-out/maladie)
  prisonTurns: number    // tours de prison restants
  hasDrawn: boolean      // a déjà pioché ce tour
  hasActed: boolean      // a déjà joué/défaussé ce tour
  hasDismissed: boolean  // a démissionné/divorcé ce tour (passe son tour)
}

export type ActionType =
  | 'skip-turn'         // passer son tour (malus)
  | 'arc-en-ciel-play'  // jouer une carte pendant arc-en-ciel
  | 'arc-en-ciel-done'  // terminer arc-en-ciel et repiocher
  | 'draw'              // piocher dans la pioche
  | 'take-discard'      // prendre la dernière carte de la défausse
  | 'play-card'         // jouer une carte devant soi
  | 'play-malus'        // infliger un malus à un autre joueur
  | 'discard-card'      // défausser une carte de sa main
  | 'resign'            // démissionner (sans piocher, passe son tour)
  | 'divorce-voluntary' // divorcer volontairement (sans piocher, passe son tour)
  | 'buy-acquisition'   // retourner salaires pour acheter maison/voyage
  | 'special-action'    // action d'une carte spéciale

export interface GameAction {
  type: ActionType
  cardId?: string        // carte à jouer
  targetPlayerId?: string // cible (malus, troc, etc.)
  targetCardId?: string  // carte ciblée (troc, vengeance, etc.)
  payload?: any          // données supplémentaires
}

export type GamePhase = 'waiting' | 'playing' | 'ended'

export interface SmileLifeState {
  phase: GamePhase
  players: PlayerState[]
  currentPlayerIndex: number
  deck: Card[]           // pioche (face cachée)
  discard: Card[]        // défausse (face visible)
  log: string[]          // historique des actions
  winner: string | null
  pendingAction: PendingAction | null // action en attente d'interaction
}

export interface PendingAction {
  type: 'pick-from-discard' | 'troc' | 'anniversaire' | 'arc-en-ciel' | 'chance' | 'tsunami' | 'vengeance' | 'astronaute' | 'chef-ventes' | 'journaliste' | 'medium' | 'piston' | 'buy-choice' | 'casino-bet-a' | 'casino-bet-b' | 'casino-reveal' | 'chercheur-discard'
  initiatorId: string
  data?: any
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function emptyBoard(): PlayerBoard {
  return {
    etudes: [], metier: null, salaires: [], salairesInvestis: [],
    flirts: [], flirtsAdultere: [], mariage: null, adultere: null,
    enfants: [], enfantsAdultere: [], animaux: [], voyages: [], maisons: [],
    malus: [], speciales: [], heritage: 0,
  }
}

function studyLevel(board: PlayerBoard): number {
  return board.etudes.reduce((sum, c) => sum + (c.isDouble ? 2 : 1), 0)
}

function salaryLiasses(board: PlayerBoard): number {
  // Somme des valeurs en liasses des salaires non investis
  const investedIds = new Set(board.salairesInvestis.map(s => s.id))
  return board.salaires
    .filter(s => !investedIds.has(s.id))
    .reduce((sum, s) => sum + (s.salaryLevel ?? 1), 0)
}

function isMarried(board: PlayerBoard): boolean {
  return board.mariage !== null
}

function hasMetier(board: PlayerBoard): boolean {
  return board.metier !== null
}

function isStudent(board: PlayerBoard): boolean {
  return board.etudes.length > 0 && !hasMetier(board)
}

function isWorker(board: PlayerBoard): boolean {
  return hasMetier(board)
}

// ─── SmileLifeGame ────────────────────────────────────────────────────────────

export class SmileLifeGame {
  private state: SmileLifeState

  constructor(players: { id: string; username: string; avatarUrl: string | null }[]) {
    const deck = shuffle(buildDeck())
    const hand5 = (d: Card[]) => d.splice(0, 5)


    const playerStates: PlayerState[] = players.map(p => ({
      id: p.id,
      username: p.username,
      avatarUrl: p.avatarUrl,
      hand: hand5(deck),
      board: emptyBoard(),
      skippedTurns: 0,
      prisonTurns: 0,
      hasDrawn: false,
      hasActed: false,
      hasDismissed: false,
    }))

    // Celui avec le plus de smiles en main commence (à égalité = le moins)
    const sortedBySmiles = [...playerStates].sort((a, b) => {
      const sa = a.hand.reduce((s, c) => s + c.smiles, 0)
      const sb = b.hand.reduce((s, c) => s + c.smiles, 0)
      return sb !== sa ? sb - sa : sa - sb
    })
    const firstId = sortedBySmiles[0]?.id ?? playerStates[0]!.id
    const firstIndex = playerStates.findIndex(p => p.id === firstId)

    this.state = {
      phase: 'playing',
      players: playerStates,
      currentPlayerIndex: firstIndex,
      deck,
      discard: [],
      log: [`La partie commence ! C'est à ${playerStates[firstIndex]!.username} de jouer.`],
      winner: null,
      pendingAction: null,
    }
  }

  // ── Getters ─────────────────────────────────────────────────────────────────

  getState(): SmileLifeState { return this.state }

  // Taille de main maximale (6 pour chercheur, 5 sinon)
  handSize(player: PlayerState): number {
    return player.board.metier?.metierEffect === 'chercheur' ? 6 : 5
  }

  getPublicState(forPlayerId: string) {
    const pending = this.state.pendingAction
    // Masquer la mise de A au joueur B (casino)
    let maskedPending = pending
    if (pending?.type === 'casino-bet-b' && pending.data?.betA && forPlayerId !== pending.data?.playerAId) {
      maskedPending = { ...pending, data: { ...pending.data, betA: { id: 'hidden', name: '?', salaryLevel: '?' } } }
    }
    return {
      ...this.state,
      pendingAction: maskedPending,
      deck: this.state.deck.map(() => ({ id: 'hidden', category: 'hidden', name: '?', smiles: 0 })),
      players: this.state.players.map(p => ({
        ...p,
        hand: p.id === forPlayerId ? p.hand : p.hand.map(() => ({ id: 'hidden', category: 'hidden', name: '?', smiles: 0 })),
      })),
    }
  }

  getCurrentPlayer(): PlayerState {
    return this.state.players[this.state.currentPlayerIndex]!
  }

  // ── Validation ──────────────────────────────────────────────────────────────

  canPlayCard(player: PlayerState, card: Card): { ok: boolean; reason?: string } {
    const b = player.board

    switch (card.category) {
      case 'etude': {
        if (hasMetier(b) && b.metier?.metierEffect !== 'chirurgien' && b.metier?.metierEffect !== 'medecin') {
          return { ok: false, reason: 'Vous avez déjà un métier.' }
        }
        if (studyLevel(b) >= 6) return { ok: false, reason: 'Niveau d\'études maximum atteint.' }
        return { ok: true }
      }

      case 'metier': {
        if (hasMetier(b)) return { ok: false, reason: 'Vous avez déjà un métier. Démissionnez d\'abord.' }
        const required = card.studiesRequired ?? 0
        if (studyLevel(b) < required) {
          return { ok: false, reason: `Niveau d'études insuffisant (requis : ${required}).` }
        }
        // Cas Grand Prof
        if (card.metierEffect === 'grand-prof') {
          const isProf = b.metier && b.metier.name.toLowerCase().startsWith('prof')
          if (!isProf) return { ok: false, reason: 'Grand Prof requiert d\'être Professeur.' }
          // Grand Prof remplace directement le prof (pas besoin de démissionner)
          return { ok: true }
        }
        return { ok: true }
      }

      case 'salaire': {
        if (!hasMetier(b)) return { ok: false, reason: 'Vous avez besoin d\'un métier.' }
        const maxLevel = b.metier!.maxSalary ?? 0
        const lvl = card.salaryLevel ?? 1
        if (lvl > maxLevel) return { ok: false, reason: `Votre métier ne permet que des salaires jusqu\'au niveau ${maxLevel}.` }
        return { ok: true }
      }

      case 'flirt': {
        if (isMarried(b) && !b.adultere) return { ok: false, reason: 'Vous êtes marié(e). Commettez un adultère pour flirter.' }
        const maxFlirts = b.metier?.metierEffect === 'barman' ? 999 : 5
        const currentFlirts = isMarried(b) ? b.flirtsAdultere.length : b.flirts.length
        if (currentFlirts >= maxFlirts && !isMarried(b)) return { ok: false, reason: `Maximum ${maxFlirts} flirts.` }
        return { ok: true }
      }

      case 'mariage': {
        if (b.flirts.length === 0) return { ok: false, reason: 'Flirtez d\'abord !' }
        if (isMarried(b)) return { ok: false, reason: 'Vous êtes déjà marié(e).' }
        return { ok: true }
      }

      case 'enfant': {
        if (!isMarried(b) && !b.adultere) {
          // Un enfant possible si au moins un flirt camping/hôtel dans les flirts posés
          const hasChildFlirt = b.flirts.some(f => f.allowsChild)
          if (!hasChildFlirt) return { ok: false, reason: 'Mariez-vous ou ayez un flirt camping/hôtel.' }
          if (b.enfants.length >= 1) return { ok: false, reason: 'Un seul enfant sans mariage.' }
        }
        return { ok: true }
      }

      case 'adultere': {
        if (!isMarried(b)) return { ok: false, reason: 'L\'adultère requiert le mariage.' }
        if (b.adultere) return { ok: false, reason: 'Vous commettez déjà un adultère.' }
        return { ok: true }
      }

      case 'animal':
        return { ok: true } // toujours jouable

      case 'voyage':
      case 'maison': {
        const cost = card.cost ?? 0
        const effectiveCost = (card.category === 'maison' && isMarried(b)) ? (card.costMarried ?? Math.ceil(cost / 2)) : cost
        const available = salaryLiasses(b) + b.heritage
        if (available < effectiveCost) return { ok: false, reason: `Salaires insuffisants (besoin : ${effectiveCost} liasses).` }
        return { ok: true }
      }

      case 'malus':
        return { ok: true } // validé côté infliger

      case 'special': {
        if (card.specialType === 'casino') {
          // Joueur A doit avoir un salaire en main
          const hasSalaire = player.hand.some(c => c.category === 'salaire')
          if (!hasSalaire) return { ok: false, reason: 'Vous devez avoir un salaire en main pour jouer le Casino.' }
          // Au moins un adversaire doit avoir un salaire en main
          const others = this.state.players.filter(p => p.id !== player.id)
          const hasOpponent = others.some(p => p.hand.some(c => c.category === 'salaire'))
          if (!hasOpponent) return { ok: false, reason: "Aucun adversaire n'a de salaire en main." }
        }
        if (card.specialType === 'vengeance') {
          const b = player.board
          if (b.malus.length === 0) {
            return { ok: false, reason: 'Vous n\'avez reçu aucun malus à renvoyer.' }
          }
          // Vérifier qu'au moins un malus (hors attentat) peut être infligé à un autre joueur
          const others = this.state.players.filter(p => p.id !== player.id)
          const applicableMalus = b.malus.filter(m => {
            if (m.malusType === 'attentat') return false
            // Vérifier que ce malus peut s'appliquer à au moins un joueur
            return others.some(target => {
              const tb = target.board
              if (m.malusType === 'maladie' && (tb.metier?.metierEffect === 'chirurgien' || tb.metier?.metierEffect === 'medecin' || tb.metier?.metierEffect === 'pharmacien')) return false
              if (m.malusType === 'accident' && tb.metier?.metierEffect === 'garagiste') return false
              if (m.malusType === 'divorce' && !tb.mariage) return false
              if (m.malusType === 'divorce' && tb.metier?.metierEffect === 'avocat') return false
              if (m.malusType === 'licenciement' && (tb.metier?.isFonctionnaire || tb.metier?.metierEffect === 'bandit')) return false
              if (m.malusType === 'licenciement' && !tb.metier) return false
              if (m.malusType === 'impot' && (!tb.metier || tb.salaires.length === 0 || tb.metier?.metierEffect === 'bandit')) return false
              if (m.malusType === 'burnout' && !tb.metier) return false
              if (m.malusType === 'redoublement' && tb.etudes.length === 0) return false
              if (m.malusType === 'prison' && tb.metier?.metierEffect !== 'bandit') return false
              return true
            })
          })
          if (applicableMalus.length === 0) {
            return { ok: false, reason: 'Aucun de vos malus ne peut être infligé à un autre joueur.' }
          }
        }
        return { ok: true }
      }

      default:
        return { ok: false, reason: 'Carte inconnue.' }
    }
  }

  // ── Actions principales ──────────────────────────────────────────────────────

  processAction(playerId: string, action: GameAction): { ok: boolean; reason?: string | undefined; events?: string[] | undefined } {
    const s = this.state
    const playerIndex = s.players.findIndex(p => p.id === playerId)
    const player = s.players[playerIndex]!

    // Vérif tour
    if (s.phase !== 'playing') return { ok: false, reason: 'La partie est terminée.' }
    if (playerIndex !== s.currentPlayerIndex) return { ok: false, reason: 'Ce n\'est pas votre tour.' }

    const events: string[] = []

    // ── PASSER SON TOUR ─────────────────────────────────────────────────────
    if (action.type === 'skip-turn') {
      if (player.skippedTurns === 0 && player.prisonTurns === 0) return { ok: false, reason: 'Vous n\'avez pas de tour à passer.' }
      return this.skipTurn(player, playerIndex, events)
    }

    // ── ARC-EN-CIEL ─────────────────────────────────────────────────────────
    if (action.type === 'arc-en-ciel-play') {
      const pending = s.pendingAction
      if (!pending || pending.type !== 'arc-en-ciel' || pending.initiatorId !== playerId) {
        return { ok: false, reason: "Pas d'Arc-en-ciel en cours." }
      }
      const remaining = pending.data?.remaining ?? 0
      if (remaining <= 0) return { ok: false, reason: 'Plus de cartes à jouer.' }
      const card = player.hand.find(c => c.id === action.cardId)
      if (!card) return { ok: false, reason: 'Carte introuvable.' }

      // Retirer la carte de la main
      player.hand = player.hand.filter(c => c.id !== action.cardId)

      if (action.payload?.discard) {
        // Défausser
        s.discard.push(card)
        events.push(`${player.username} défausse ${card.name} (Arc-en-ciel).`)
      } else if (card.category === 'malus') {
        // Malus : cibler un adversaire
        const target = s.players.find(p => p.id === action.targetPlayerId)
        if (target) this.applyMalus(target, card, player, events)
        else { player.hand.push(card); return { ok: false, reason: 'Cible invalide.' } }
      } else {
        // Jouer la carte normalement
        this.applyCard(player, card, events, action.payload)
      }

      pending.data.remaining -= 1
      if (pending.data.remaining === 0) {
        // Passer en phase redraw
        pending.data.phase = 'redraw'
        events.push(`${player.username} a joué ses 3 cartes — repioche maintenant.`)
      } else {
        events.push(`Arc-en-ciel : encore ${pending.data.remaining} carte(s) jouable(s).`)
      }
      return { ok: true, events }
    }

    if (action.type === 'arc-en-ciel-done') {
      const pending = s.pendingAction
      if (!pending || pending.type !== 'arc-en-ciel') return { ok: false, reason: "Pas d'Arc-en-ciel en cours." }
      // Repiocher jusqu'à la main max (5 ou 6 pour chercheur)
      const maxHand = this.handSize(player)
      while (player.hand.length < maxHand && s.deck.length > 0) {
        player.hand.push(s.deck.shift()!)
      }
      s.pendingAction = null
      player.hasActed = true
      events.push(`${player.username} repioche (${player.hand.length} cartes) et termine l'Arc-en-ciel.`)
      this.nextTurn(events)
      return { ok: true, events }
    }

    // ── PIOCHER ─────────────────────────────────────────────────────────────
    if (action.type === 'draw') {
      if (player.hasDrawn || player.hasDismissed) return { ok: false, reason: 'Vous avez déjà pioché.' }
      if (player.skippedTurns > 0 || player.prisonTurns > 0) {
        return this.skipTurn(player, playerIndex, events)
      }
      const drawn = s.deck.shift()
      if (!drawn) return this.endGame(events)
      player.hand.push(drawn)
      player.hasDrawn = true
      events.push(`${player.username} a pioché.`)
      if (s.deck.length === 0) this.log(`⚠️ La pioche est vide !`)
      return { ok: true, events }
    }

    // ── PRENDRE DÉFAUSSE ────────────────────────────────────────────────────
    if (action.type === 'take-discard') {
      if (player.hasDrawn || player.hasDismissed) return { ok: false, reason: 'Vous avez déjà pioché.' }
      if (s.players.length < 3) return { ok: false, reason: 'Option disponible dès 3 joueurs.' }
      if (s.discard.length === 0) return { ok: false, reason: 'La défausse est vide.' }
      const topCard = s.discard[s.discard.length - 1]!
      const valid = this.canPlayCard(player, topCard)
      if (!valid.ok) return { ok: false, reason: `Vous devez pouvoir jouer cette carte immédiatement. ${valid.reason}` }
      s.discard.pop()
      player.hand.push(topCard)
      player.hasDrawn = true
      events.push(`${player.username} a pris la défausse (${topCard.name}).`)
      return { ok: true, events }
    }

    // ── DÉMISSION ───────────────────────────────────────────────────────────
    if (action.type === 'resign') {
      if (!player.board.metier) return { ok: false, reason: 'Vous n\'avez pas de métier.' }
      const isInterim = player.board.metier.statut === 'interimaire'
      // Non-intérimaire : doit démissionner AVANT de piocher et passe son tour
      if (!isInterim && player.hasDrawn) return { ok: false, reason: 'Démissionnez avant de piocher.' }
      const wasChercheur = player.board.metier.metierEffect === 'chercheur'
      s.discard.push(player.board.metier)
      events.push(`${player.username} a démissionné de ${player.board.metier.name}.`)
      player.board.metier = null
      // Les salaires sont conservés après démission
      // Si était chercheur et a 6 cartes, doit en défausser une
      if (wasChercheur && player.hand.length > 5) {
        s.pendingAction = { type: 'chercheur-discard', initiatorId: player.id }
        events.push(`${player.username} doit défausser une carte (retour à 5 cartes max).`)
      }
      if (!isInterim) {
        player.hasDismissed = true
        if (!s.pendingAction) this.nextTurn(events)
      }
      // Intérimaire : peut démissionner avant ou après avoir pioché, joue normalement
      return { ok: true, events }
    }

    // ── DIVORCE VOLONTAIRE ──────────────────────────────────────────────────
    if (action.type === 'divorce-voluntary') {
      if (!player.board.mariage) return { ok: false, reason: 'Vous n\'êtes pas marié(e).' }
      if (player.hasDrawn) return { ok: false, reason: 'Divorcez avant de piocher.' }
      if (player.board.adultere) {
        s.discard.push(player.board.adultere)
        player.board.adultere = null
        // Les flirts adultère sont conservés à part
      }
      s.discard.push(player.board.mariage)
      player.board.mariage = null
      player.hasDismissed = true
      events.push(`${player.username} a divorcé volontairement.`)
      this.nextTurn(events)
      return { ok: true, events }
    }

    // ── JOUER UNE CARTE ─────────────────────────────────────────────────────
    if (action.type === 'play-card') {
      if (!player.hasDrawn) return { ok: false, reason: 'Piochez d\'abord.' }
      if (player.hasActed) return { ok: false, reason: 'Vous avez déjà joué une carte ce tour.' }
      const card = player.hand.find(c => c.id === action.cardId)
      if (!card) return { ok: false, reason: 'Carte introuvable dans votre main.' }
      const valid = this.canPlayCard(player, card)
      if (!valid.ok) return { ok: false as const, reason: valid.reason }

      player.hand = player.hand.filter(c => c.id !== action.cardId)
      this.applyCard(player, card, events, action.payload)
      player.hasActed = true

      // Fin de tour si main = 5 cartes
      if (player.hand.length >= this.handSize(player)) this.nextTurn(events)
      return { ok: true, events }
    }

    // ── INFLIGER UN MALUS ───────────────────────────────────────────────────
    if (action.type === 'play-malus') {
      if (!player.hasDrawn) return { ok: false, reason: 'Piochez d\'abord.' }
      if (player.hasActed) return { ok: false, reason: 'Vous avez déjà joué une carte.' }
      const card = player.hand.find(c => c.id === action.cardId)
      if (!card || card.category !== 'malus') return { ok: false, reason: 'Carte malus introuvable.' }
      const target = s.players.find(p => p.id === action.targetPlayerId)
      if (!target || target.id === playerId) return { ok: false, reason: 'Cible invalide.' }

      player.hand = player.hand.filter(c => c.id !== action.cardId)
      const result = this.applyMalus(target, card, player, events)
      if (!result.ok) {
        player.hand.push(card) // remettre la carte si malus inapplicable
        return result
      }
      player.hasActed = true
      if (player.hand.length >= this.handSize(player)) this.nextTurn(events)
      return { ok: true, events }
    }

    // ── DÉFAUSSER ───────────────────────────────────────────────────────────
    if (action.type === 'discard-card') {
      if (!player.hasDrawn) return { ok: false, reason: 'Piochez d\'abord.' }
      if (player.hasActed) return { ok: false, reason: 'Vous avez déjà joué une carte.' }
      const card = player.hand.find(c => c.id === action.cardId)
      if (!card) return { ok: false, reason: 'Carte introuvable.' }
      player.hand = player.hand.filter(c => c.id !== action.cardId)
      s.discard.push(card)
      player.hasActed = true
      events.push(`${player.username} a défaussé ${card.name}.`)
      this.nextTurn(events)
      return { ok: true, events }
    }

    return { ok: false, reason: 'Action inconnue.' }
  }

  // ── Application des cartes ──────────────────────────────────────────────────

  private applyCard(player: PlayerState, card: Card, events: string[], payload?: any) {
    const b = player.board

    switch (card.category) {
      case 'etude':
        b.etudes.push(card)
        events.push(`${player.username} a posé : ${card.name} (niveau ${card.isDouble ? '+2' : '+1'}).`)
        break

      case 'metier':
        if (card.metierEffect === 'grand-prof') {
          if (b.metier) {
            events.push(`${player.username} upgrade ${b.metier.name} → Grand Prof !`)
            this.state.discard.push(b.metier)
            // Les salaires déjà posés sont conservés
          }
        }
        b.metier = card
        events.push(`${player.username} est maintenant ${card.name} !`)
        this.applyMetierEffect(player, card, events, payload)

        // Policier : retire gourou et bandits
        if (card.metierEffect === 'policier') {
          this.state.players.forEach(p => {
            if (p.id !== player.id && (p.board.metier?.metierEffect === 'gourou' || p.board.metier?.metierEffect === 'bandit')) {
              events.push(`${p.username} doit défausser son ${p.board.metier!.name} à cause du Policier !`)
              this.state.discard.push(p.board.metier!)
              p.board.metier = null
            }
          })
        }
        break

      case 'salaire':
        b.salaires.push(card)
        events.push(`${player.username} a encaissé un salaire niveau ${card.salaryLevel}.`)
        break

      case 'flirt': {
        const targetFlirts = isMarried(b) ? b.flirtsAdultere : b.flirts
        // Voler le flirt d'un autre joueur au même lieu
        this.state.players.forEach(p => {
          if (p.id === player.id) return
          const theirFlirts = p.board.flirts
          const topFlirt = theirFlirts[theirFlirts.length - 1]
          if (topFlirt?.lieu === card.lieu) {
            p.board.flirts = theirFlirts.slice(0, -1)
            targetFlirts.push(topFlirt!)
            events.push(`${player.username} a volé le flirt de ${p.username} (${card.lieu}) !`)
          }
        })
        targetFlirts.push(card)
        events.push(`${player.username} a flirté ${card.lieu}.`)
        if (card.allowsChild && !isMarried(b)) {
          events.push(`💡 ${player.username} peut avoir un enfant grâce à ce flirt (${card.lieu}) !`)
        }
        break
      }

      case 'mariage':
        b.mariage = card
        events.push(`${player.username} s'est marié(e) ! 💍`)
        break

      case 'enfant':
        if (b.adultere) b.enfantsAdultere.push(card)
        else b.enfants.push(card)
        events.push(`${player.username} a un nouvel enfant : ${card.childName} !`)
        break

      case 'adultere':
        b.adultere = card
        events.push(`${player.username} commet un adultère... 🙊`)
        break

      case 'animal':
        b.animaux.push(card)
        events.push(`${player.username} a adopté : ${card.name} !`)
        break

      case 'voyage':
      case 'maison': {
        const cost = card.cost ?? 0
        const effectiveCost = (card.category === 'maison' && isMarried(b)) ? (card.costMarried ?? Math.ceil(cost / 2)) : cost
        let remaining = effectiveCost
        // Dépenser l'héritage en premier
        const heritageUsed = Math.min(b.heritage, remaining)
        b.heritage -= heritageUsed
        remaining -= heritageUsed
        // Consommer des salaires par valeur (salaryLevel) jusqu'à couvrir le coût
        // Trier du plus grand au plus petit pour minimiser les cartes utilisées
        const salairesDisponibles = [...b.salaires].sort((a, b) => (b.salaryLevel ?? 1) - (a.salaryLevel ?? 1))
        const toInvest: Card[] = []
        for (const sal of salairesDisponibles) {
          if (remaining <= 0) break
          toInvest.push(sal)
          remaining -= (sal.salaryLevel ?? 1)
        }
        // Retirer les cartes investies de la main
        const investedIds = new Set(toInvest.map(s => s.id))
        b.salaires = b.salaires.filter(s => !investedIds.has(s.id))
        b.salairesInvestis.push(...toInvest)
        if (card.category === 'voyage') b.voyages.push(card)
        else b.maisons.push(card)
        events.push(`${player.username} a acheté : ${card.name} ! (${toInvest.length} salaire(s) investis)`)
        break
      }

      case 'special':
        this.applySpecial(player, card, events, payload)
        break
    }
  }

  private applyMetierEffect(player: PlayerState, card: Card, events: string[], payload?: any) {
    switch (card.metierEffect) {
      case 'chirurgien':
      case 'medecin':
        events.push(`${player.username} ne peut plus tomber malade.`)
        break
      case 'chercheur':
        // pioche une carte supplémentaire
        if (this.state.deck.length > 0) {
          player.hand.push(this.state.deck.shift()!)
          events.push(`${player.username} (Chercheur) pioche une carte supplémentaire.`)
        }
        break
      case 'astronaute':
        // Choisir une carte dans la défausse → géré via pendingAction
        this.state.pendingAction = { type: 'astronaute', initiatorId: player.id }
        events.push(`${player.username} (Astronaute) peut choisir une carte dans la défausse !`)
        break
      case 'journaliste':
        this.state.pendingAction = { type: 'journaliste', initiatorId: player.id }
        events.push(`${player.username} (Journaliste) peut voir les mains des autres !`)
        break
      case 'medium': {
        const next13 = this.state.deck.slice(0, 13)
        this.state.pendingAction = { type: 'medium', initiatorId: player.id, data: { cards: next13 } }
        events.push(`${player.username} (Médium) consulte les 13 prochaines cartes de la pioche !`)
        break
      }
        break
    }
  }

  private applySpecial(player: PlayerState, card: Card, events: string[], payload?: any) {
    const s = this.state
    player.board.speciales.push(card)

    switch (card.specialType) {
      case 'anniversaire':
        // Chaque joueur donne un salaire
        s.players.forEach(p => {
          if (p.id === player.id) return
          if (p.board.salaires.length === 0) return
          const given = p.board.salaires.pop()!
          player.board.salaires.push(given)
          events.push(`${p.username} offre un salaire à ${player.username} pour son anniversaire !`)
        })
        break

      case 'arc-en-ciel':
        // Jouer jusqu'à 3 cartes d'affilée → géré côté client avec pendingAction
        s.pendingAction = { type: 'arc-en-ciel', initiatorId: player.id, data: { remaining: 3 } }
        events.push(`${player.username} joue un Arc-en-ciel ! (jusqu'à 3 cartes)`)
        break

      case 'chance':
        // Piocher 3, garder 1
        const drawn3 = s.deck.splice(0, 3)
        s.pendingAction = { type: 'chance', initiatorId: player.id, data: { cards: drawn3 } }
        events.push(`${player.username} joue Chance ! Choisissez 1 carte parmi 3.`)
        break

      case 'etoile-filante':
        // Choisir une carte dans la défausse
        s.pendingAction = { type: 'pick-from-discard', initiatorId: player.id }
        events.push(`${player.username} joue Étoile filante ! Choisissez dans la défausse.`)
        break

      case 'heritage':
        player.board.heritage += 3
        events.push(`${player.username} reçoit un héritage (3 liasses disponibles) !`)
        break

      case 'piston': {
        // Chercher les métiers dans la main du joueur
        const metiersInHand = player.hand.filter(c => c.category === 'metier' && c.metierEffect !== 'grand-prof')
        if (metiersInHand.length === 0) {
          events.push(`${player.username} joue Piston mais n'a aucun métier en main !`)
        } else {
          s.pendingAction = { type: 'piston', initiatorId: player.id, data: { metiers: metiersInHand } }
          events.push(`${player.username} joue Piston ! Choisissez un métier de votre main.`)
        }
        break
      }
        break

      case 'troc':
        s.pendingAction = { type: 'troc', initiatorId: player.id }
        events.push(`${player.username} joue Troc ! Choisissez un joueur.`)
        break

      case 'tsunami':
        // Toutes les mains mélangées et redistribuées
        const allCards = s.players.flatMap(p => p.hand)
        const shuffled = shuffle(allCards)
        s.players.forEach(p => {
          p.hand = shuffled.splice(0, 5)
        })
        events.push(`🌊 Tsunami ! Toutes les mains ont été redistribuées !`)
        break

      case 'vengeance':
        s.pendingAction = { type: 'vengeance', initiatorId: player.id }
        events.push(`${player.username} joue Vengeance ! Choisissez un malus à renvoyer.`)
        break

      case 'casino':
        s.pendingAction = {
          type: 'casino-bet-a',
          initiatorId: player.id,
          data: {
            playerAId: player.id,
            // Salaires disponibles en main pour A
            salaireOptions: player.hand.filter(c => c.category === 'salaire'),
            // Adversaires ayant au moins 1 salaire en main
            eligibleOpponents: s.players
              .filter(p => p.id !== player.id && p.hand.some(c => c.category === 'salaire'))
              .map(p => ({ id: p.id, username: p.username, avatarUrl: p.avatarUrl })),
          }
        }
        events.push(`${player.username} joue Casino ! Choisissez un salaire et un adversaire.`)
        break
    }
  }

  // Wrapper public pour canPlayCard (utilisé dans handlers)
  canPlayCardPublic(player: PlayerState, card: Card) {
    return this.canPlayCard(player, card)
  }

  // Wrapper public pour applyCard (Chance, Étoile filante, Astronaute)
  applyCardPublic(player: PlayerState, card: Card, events: string[], payload?: any) {
    this.applyCard(player, card, events, payload)
    player.hasActed = true
    // nextTurn appelé uniquement si la main est pleine (flow normal)
    // Sinon le joueur voit hasActed=true mais peut encore jouer via les cartes
    // Le nextTurn sera déclenché par le prochain state broadcast
  }

  // Wrapper public pour vengeance/astronaute
  applyMalusPublic(target: PlayerState, card: Card, attacker: PlayerState, events: string[]) {
    return this.applyMalus(target, card, attacker, events)
  }

  // ── Application des malus ───────────────────────────────────────────────────

  private applyMalus(target: PlayerState, card: Card, attacker: PlayerState, events: string[]): { ok: boolean; reason?: string } {
    const b = target.board
    const type = card.malusType!

    // Immunités
    if (type === 'maladie' && (b.metier?.metierEffect === 'chirurgien' || b.metier?.metierEffect === 'medecin' || b.metier?.metierEffect === 'pharmacien')) {
      return { ok: false, reason: `${target.username} est immunisé contre les maladies.` }
    }
    if (type === 'accident' && b.metier?.metierEffect === 'garagiste') {
      return { ok: false, reason: `${target.username} est immunisé contre les accidents.` }
    }
    if (type === 'divorce' && !b.mariage) {
      return { ok: false, reason: `${target.username} n'est pas marié(e).` }
    }
    if (type === 'divorce' && b.metier?.metierEffect === 'avocat') {
      return { ok: false, reason: `${target.username} ne peut pas subir de divorce forcé.` }
    }
    if (type === 'licenciement' && b.metier?.isFonctionnaire) {
      return { ok: false, reason: `${target.username} est fonctionnaire, il ne peut pas être licencié.` }
    }
    if (type === 'licenciement' && b.metier?.metierEffect === 'bandit') {
      return { ok: false, reason: `${target.username} (Bandit) ne peut pas être licencié.` }
    }
    if (type === 'impot' && !isWorker(b)) {
      return { ok: false, reason: `${target.username} ne travaille pas (Impôt inapplicable).` }
    }
    if (type === 'impot' && b.salaires.length === 0) {
      return { ok: false, reason: `${target.username} n'a aucun salaire posé.` }
    }
    if (type === 'impot' && b.metier?.metierEffect === 'bandit') {
      return { ok: false, reason: `${target.username} (Bandit) ne paie pas d'impôts.` }
    }
    if (type === 'burnout' && !isWorker(b)) {
      return { ok: false, reason: `${target.username} n'a pas de métier (Burn-out inapplicable).` }
    }
    if (type === 'redoublement' && !isStudent(b)) {
      return { ok: false, reason: `${target.username} n'est pas étudiant(e).` }
    }
    if (type === 'prison' && b.metier?.metierEffect !== 'bandit') {
      return { ok: false, reason: `La Prison ne s'applique qu'au Bandit.` }
    }
    if (type === 'attentat') {
      const hasMilitaire = this.state.players.some(p => p.board.metier?.metierEffect === 'militaire')
      if (hasMilitaire) return { ok: false, reason: `Un Militaire est en jeu. L\'attentat est bloqué.` }
      const totalChildren = this.state.players.reduce((sum, p) => sum + p.board.enfants.length + p.board.enfantsAdultere.length, 0)
      if (totalChildren === 0) return { ok: false, reason: 'L\'attentat nécessite au moins un enfant en jeu.' }
    }

    // Appliquer
    target.board.malus.push(card)
    const malusMsg = `💥 ${attacker.username} inflige ${card.name} à ${target.username} !`
    events.push(malusMsg)
    this.log(malusMsg)

    switch (type) {
      case 'accident':
      case 'maladie':
        target.skippedTurns += 1
        events.push(`${target.username} passe son prochain tour.`)
        break

      case 'burnout':
        target.skippedTurns += 1
        events.push(`${target.username} passe son prochain tour (burn-out).`)
        break

      case 'redoublement':
        if (b.etudes.length > 0) {
          const lost = b.etudes.pop()!
          this.state.discard.push(lost)
          events.push(`${target.username} perd une carte études (${lost.name}).`)
        }
        break

      case 'divorce':
        if (b.mariage) {
          if (b.adultere) {
            // Perd adultère + enfants adultère + flirts adultère
            this.state.discard.push(b.adultere)
            b.adultere = null
            b.enfantsAdultere.forEach(e => this.state.discard.push(e))
            b.enfantsAdultere = []
            b.flirtsAdultere.forEach(f => this.state.discard.push(f))
            b.flirtsAdultere = []
            events.push(`${target.username} perd son adultère, ses enfants et flirts d'adultère.`)
          }
          this.state.discard.push(b.mariage)
          b.mariage = null
          // Les flirts officiels (avant mariage) sont conservés
          events.push(`${target.username} divorce (forcé) ! Mariage perdu.`)
        }
        break

      case 'impot':
        if (b.salaires.length > 0) {
          const lost = b.salaires.pop()!
          this.state.discard.push(lost)
          events.push(`${target.username} perd son dernier salaire (impôts).`)
        }
        break

      case 'licenciement':
        if (b.metier) {
          const wasChercheurl = b.metier.metierEffect === 'chercheur'
          this.state.discard.push(b.metier)
          b.metier = null
          // Les salaires sont conservés après licenciement
          events.push(`${target.username} est licencié(e) !`)
          if (wasChercheurl && target.hand.length > 5) {
            this.state.pendingAction = { type: 'chercheur-discard', initiatorId: target.id }
            events.push(`${target.username} doit défausser une carte (retour à 5 cartes max).`)
          }
        }
        break

      case 'prison':
        target.prisonTurns = 3
        events.push(`${target.username} va en prison pour 3 tours !`)
        break

      case 'attentat':
        const allChildren = this.state.players.flatMap(p => [...p.board.enfants, ...p.board.enfantsAdultere])
        this.state.players.forEach(p => { p.board.enfants = []; p.board.enfantsAdultere = [] })
        events.push(`💣 Attentat ! Tous les enfants sont hors-jeu. (${allChildren.length} enfants)`)
        break
    }

    return { ok: true }
  }

  // ── Tour / Fin ───────────────────────────────────────────────────────────────

  private skipTurn(player: PlayerState, index: number, events: string[]): { ok: boolean; events: string[] } {
    if (player.prisonTurns > 0) {
      player.prisonTurns--
      events.push(`${player.username} est en prison. (${player.prisonTurns} tours restants)`)
      if (player.prisonTurns === 0) {
        // Défausser le bandit
        if (player.board.metier?.metierEffect === 'bandit') {
          this.state.discard.push(player.board.metier)
          player.board.metier = null
          events.push(`${player.username} sort de prison et abandonne le métier de Bandit.`)
        }
      }
    } else if (player.skippedTurns > 0) {
      player.skippedTurns--
      events.push(`${player.username} passe son tour.`)
    }
    player.hasDismissed = true
    this.nextTurn(events)
    return { ok: true, events }
  }

  private nextTurn(events: string[]): void {
    const s = this.state
    const current = s.players[s.currentPlayerIndex]!
    current.hasDrawn = false
    current.hasActed = false
    current.hasDismissed = false

    // Vérifier fin de partie
    if (s.deck.length === 0) {
      this.endGame(events)
      return
    }

    s.currentPlayerIndex = (s.currentPlayerIndex + 1) % s.players.length
    const next = s.players[s.currentPlayerIndex]!
    this.log(`C'est au tour de ${next.username}.`)
    events.push(`Tour de ${next.username}.`)
  }

  private endGame(events: string[]): { ok: true; events: string[] } {
    const s = this.state
    s.phase = 'ended'

    const scores = s.players.map(p => ({
      id: p.id,
      username: p.username,
      score: this.calculateScore(p),
    })).sort((a, b) => b.score - a.score)

    s.winner = scores[0]!.id
    const scoreStr = scores.map(p => `${p.username}: ${p.score} smiles`).join(' | ')
    events.push(`🏁 Fin de partie ! ${scoreStr}`)
    this.log(`Fin de partie ! Gagnant : ${scores[0]!.username} avec ${scores[0]!.score} smiles.`)
    return { ok: true as const, events }
  }

  calculateScore(player: PlayerState): number {
    const b = player.board
    let score = 0
    const cards = [
      ...b.etudes, b.metier,
      ...b.salaires, ...b.salairesInvestis,
      ...b.flirts, ...b.flirtsAdultere,
      b.mariage, b.adultere,
      ...b.enfants, ...b.enfantsAdultere,
      ...b.animaux, ...b.voyages, ...b.maisons,
      ...b.speciales,
    ].filter(Boolean) as Card[]
    cards.forEach(c => score += c.smiles)
    return score
  }

  getScores() {
    return this.state.players.map(p => ({
      id: p.id,
      username: p.username,
      avatarUrl: p.avatarUrl,
      score: this.calculateScore(p),
    })).sort((a, b) => b.score - a.score)
  }

  private log(msg: string) {
    this.state.log.push(msg)
    if (this.state.log.length > 500) this.state.log.shift()
  }
}
