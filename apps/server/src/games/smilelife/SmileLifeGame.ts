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
  type: 'pick-from-discard' | 'troc' | 'anniversaire' | 'arc-en-ciel' | 'chance' | 'tsunami' | 'vengeance' | 'astronaute' | 'chef-ventes' | 'journaliste' | 'medium' | 'piston' | 'buy-choice'
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
  return board.salaires.filter(s => !board.salairesInvestis.includes(s)).length
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
  private roomCode: string
  private roomNS: Namespace
  private state: SmileLifeState

  constructor(roomCode: string, roomNS: Namespace, players: { id: string; username: string; avatarUrl: string | null }[]) {
    this.roomCode = roomCode
    this.roomNS = roomNS
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

  getPublicState(forPlayerId: string) {
    return {
      ...this.state,
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
          const isProf = b.metier?.name.toLowerCase().includes('prof')
          if (!isProf) return { ok: false, reason: 'Grand Prof requiert d\'être déjà Professeur.' }
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
          // Enfant possible si flirt camping/hôtel non recouvert
          const topFlirt = b.flirts[b.flirts.length - 1]
          if (!topFlirt?.allowsChild) return { ok: false, reason: 'Mariez-vous ou ayez un flirt camping/hôtel.' }
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
        const effectiveCost = (card.category === 'maison' && isMarried(b)) ? Math.ceil(cost / 2) : cost
        const available = salaryLiasses(b) + b.heritage
        if (available < effectiveCost) return { ok: false, reason: `Salaires insuffisants (besoin : ${effectiveCost} liasses).` }
        return { ok: true }
      }

      case 'malus':
        return { ok: true } // validé côté infliger

      case 'special':
        return { ok: true }

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
      if (!isInterim && player.hasDrawn) return { ok: false, reason: 'Démissionnez avant de piocher.' }
      s.discard.push(player.board.metier)
      events.push(`${player.username} a démissionné de ${player.board.metier.name}.`)
      player.board.metier = null
      player.board.salaires = [] // perd ses salaires
      if (!isInterim) {
        player.hasDismissed = true
        this.nextTurn(events)
      } else {
        player.hasDrawn = true // intérimaire peut continuer
      }
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
      if (player.hand.length === 5) this.nextTurn(events)
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
      if (player.hand.length === 5) this.nextTurn(events)
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

    // ── PASSER SON TOUR (malus en cours) ────────────────────────────────────
    if (action.type === 'skip-turn') {
      return this.skipTurn(player, playerIndex, events)
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
          if (b.metier) this.state.discard.push(b.metier)
        }
        b.metier = card
        b.salaires = []
        events.push(`${player.username} est maintenant ${card.name} !`)
        this.applyMetierEffect(player, card, events, payload)

        // Policier : retire gourou et bandits
        if (card.metierEffect === 'policier') {
          this.state.players.forEach(p => {
            if (p.id !== player.id && (p.board.metier?.metierEffect === 'gourou' || p.board.metier?.metierEffect === 'bandit')) {
              events.push(`${p.username} doit défausser son ${p.board.metier!.name} à cause du Policier !`)
              this.state.discard.push(p.board.metier!)
              p.board.metier = null
              p.board.salaires = []
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
        const effectiveCost = (card.category === 'maison' && isMarried(b)) ? Math.ceil(cost / 2) : cost
        let remaining = effectiveCost
        // Dépenser l'héritage en premier
        const heritageUsed = Math.min(b.heritage, remaining)
        b.heritage -= heritageUsed
        remaining -= heritageUsed
        // Retourner les salaires
        const toInvest = b.salaires.slice(-remaining)
        b.salairesInvestis.push(...toInvest)
        b.salaires = b.salaires.slice(0, -remaining)
        if (card.category === 'voyage') b.voyages.push(card)
        else b.maisons.push(card)
        events.push(`${player.username} a acheté : ${card.name} !`)
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
      case 'medium':
        this.state.pendingAction = { type: 'medium', initiatorId: player.id }
        events.push(`${player.username} (Médium) peut voir les 13 prochaines cartes !`)
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

      case 'piston':
        // Poser n'importe quel métier
        s.pendingAction = { type: 'piston', initiatorId: player.id }
        events.push(`${player.username} joue Piston ! Choisissez un métier.`)
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
        // Placer casino avec un salaire par dessus
        s.pendingAction = { type: 'pick-from-discard', initiatorId: player.id, data: { casino: true } }
        events.push(`${player.username} ouvre un Casino ! Misez un salaire.`)
        break
    }
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
    if (type === 'divorce' && b.metier?.metierEffect === 'avocat') {
      return { ok: false, reason: `${target.username} ne peut pas subir de divorce forcé.` }
    }
    if (type === 'licenciement' && b.metier?.isFonctionnaire) {
      return { ok: false, reason: `${target.username} est fonctionnaire, il ne peut pas être licencié.` }
    }
    if (type === 'licenciement' && b.metier?.metierEffect === 'bandit') {
      return { ok: false, reason: `${target.username} (Bandit) ne peut pas être licencié.` }
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
      if (hasMilitaire) return { ok: false, reason: `Un Militaire est en jeu. L'attentat est bloqué.` }
    }

    // Appliquer
    target.board.malus.push(card)
    events.push(`💥 ${attacker.username} inflige un ${card.name} à ${target.username} !`)

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
            this.state.discard.push(b.adultere)
            b.adultere = null
            b.enfants.push(...b.enfantsAdultere)
            b.enfantsAdultere = []
          }
          this.state.discard.push(b.mariage)
          b.mariage = null
          b.enfants.forEach(e => this.state.discard.push(e))
          b.enfants = []
          events.push(`${target.username} divorce ! Mariage et enfants perdus.`)
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
          this.state.discard.push(b.metier)
          b.metier = null
          b.salaires = []
          events.push(`${target.username} est licencié(e) !`)
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
    updatePlayerStats('smilelife', scores.map((p, i) => ({
      userId: p.id, rank: i + 1, isWinner: i === 0, totalPlayers: scores.length,
    })), this.roomNS, this.roomCode).catch((e: any) => console.error('[smilelife] stats error:', e))
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
    if (this.state.log.length > 100) this.state.log.shift()
  }
}
