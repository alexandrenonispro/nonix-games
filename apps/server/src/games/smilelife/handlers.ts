import { SmileLifeGame } from './SmileLifeGame.js'
import { store } from '../../lib/store.js'

const activeGames = new Map<string, SmileLifeGame>()
export function clearAllSmileLifeGames() { activeGames.clear() }

export function handleSmileLife(
  io: any,
  socket: any,
  roomNS: any,
  user: { id: string; username: string; avatarUrl: string | null },
) {

  function broadcast(game: SmileLifeGame) {
    // Envoyer l'état personnalisé à chaque joueur
    game.getState().players.forEach(p => {
      const publicState = game.getPublicState(p.id)
      roomNS.sockets.forEach((s: any) => {
        if ((s as any).data?.user?.id === p.id) {
          s.emit('smilelife:state' as any, publicState)
        }
      })
    })
  }

  function broadcastLog(code: string, events: string[]) {
    roomNS.to(code).emit('smilelife:log' as any, { events })
  }

  socket.on('smilelife:start' as any, () => {
    const room = store.getRoomBySocket(socket.id)
    if (!room) return
    if (room.hostId !== user.id) return
    const members = Array.from(room.members.values())
    if (members.length < 2) {
      socket.emit('smilelife:error' as any, { message: 'Il faut au moins 2 joueurs.' })
      return
    }
    const code = room.code
    const game = new SmileLifeGame(code, roomNS, members)
    activeGames.set(code, game)
    broadcast(game)
    broadcastLog(code, [`🃏 Smile Life commence !`])
  })

  socket.on('smilelife:action' as any, (data: any) => {
    const _room = store.getRoomBySocket(socket.id)
    if (!_room) return
    const game = activeGames.get(_room.code)
    if (!game) return

    const result = game.processAction(user.id, data)
    if (!result.ok) {
      socket.emit('smilelife:error' as any, { message: result.reason })
      return
    }

    broadcast(game)
    if (result.events?.length) broadcastLog(_room.code, result.events)
  })

  socket.on('smilelife:pending-resolve' as any, (data: any) => {
    const _room = store.getRoomBySocket(socket.id)
    if (!_room) return
    const game = activeGames.get(_room.code)
    if (!game) return

    const s = game.getState()
    if (!s.pendingAction || s.pendingAction.initiatorId !== user.id) return

    const player = s.players.find(p => p.id === user.id)!
    const events: string[] = []

    switch (s.pendingAction.type) {
      case 'chance': {
        // data.skip = true => ne rien choisir
        if (data.skip) {
          const { cards } = s.pendingAction.data as { cards: any[] }
          cards.forEach((c: any) => s.discard.push(c))
          events.push(`${player.username} ne prend aucune carte (Chance).`)
          s.pendingAction = null
          player.hasActed = true
          if (player.hand.length === 5) {
            player.hasDrawn = false; player.hasActed = false; player.hasDismissed = false
            s.currentPlayerIndex = (s.players.indexOf(player) + 1) % s.players.length
            events.push(`Tour de ${s.players[s.currentPlayerIndex]!.username}.`)
          }
          break
        }
        const { cards } = s.pendingAction.data as { cards: any[] }
        const chosen = cards.find((c: any) => c.id === data.cardId)
        if (!chosen) return
        // Défausser les 2 autres
        cards.filter((c: any) => c.id !== data.cardId).forEach((c: any) => s.discard.push(c))
        s.pendingAction = null
        // Vérifier si la carte est jouable AVANT de l'ajouter à la main
        const canPlay = game.canPlayCardPublic(player, chosen)
        if (!canPlay.ok) {
          s.discard.push(chosen)
          events.push(`${player.username} ne peut pas jouer ${chosen.name} (${canPlay.reason}) — défaussée (Chance).`)
        } else {
          events.push(`${player.username} joue ${chosen.name} (Chance) !`)
          game.applyCardPublic(player, chosen, events)
          // Fin de tour après Chance
          player.hasDrawn = false; player.hasActed = false; player.hasDismissed = false
          s.currentPlayerIndex = (s.players.indexOf(player) + 1) % s.players.length
          events.push(`Tour de ${s.players[s.currentPlayerIndex]!.username}.`)
        }
        break
      }

      case 'pick-from-discard': {
        // Option : ne rien prendre
        if (data.skip) {
          events.push(`${player.username} ne prend rien dans la défausse (Étoile filante).`)
          s.pendingAction = null
          break
        }
        const etoileCard = s.discard.find((c: any) => c.id === data.cardId)
        if (!etoileCard) return
        s.discard = s.discard.filter((c: any) => c.id !== etoileCard.id)
        s.pendingAction = null
        // Jouer la carte directement
        if (etoileCard.category === 'malus' && data.targetPlayerId) {
          const target = s.players.find((p: any) => p.id === data.targetPlayerId)
          if (target) game.applyMalusPublic(target, etoileCard, player, events)
        } else {
          // Vérifier la jouabilité AVANT d'ajouter à la main
          const canPlay = game.canPlayCardPublic(player, etoileCard)
          if (!canPlay.ok) {
            s.discard.push(etoileCard)
            events.push(`${player.username} ne peut pas jouer ${etoileCard.name} (${canPlay.reason}) — défaussée (Étoile filante).`)
          } else {
            events.push(`${player.username} joue ${etoileCard.name} (Étoile filante) !`)
            game.applyCardPublic(player, etoileCard, events)
            // Fin de tour après Étoile filante
            const s3 = game.getState()
            player.hasDrawn = false; player.hasActed = false; player.hasDismissed = false
            s3.currentPlayerIndex = (s3.players.indexOf(player) + 1) % s3.players.length
            events.push(`Tour de ${s3.players[s3.currentPlayerIndex]!.username}.`)
          }
        }
        break
      }

      case 'troc': {
        const target = s.players.find(p => p.id === data.targetPlayerId)
        if (!target) return
        // Échange aléatoire
        if (player.hand.length === 0 || target.hand.length === 0) return
        const myIdx = Math.floor(Math.random() * player.hand.length)
        const theirIdx = Math.floor(Math.random() * target.hand.length)
        const myCard = player.hand.splice(myIdx, 1)[0]!
        const theirCard = target.hand.splice(theirIdx, 1)[0]!
        player.hand.push(theirCard)
        target.hand.push(myCard)
        events.push(`${player.username} et ${target.username} ont échangé une carte (Troc).`)
        s.pendingAction = null
        break
      }

      case 'vengeance': {
        const malusCard = player.board.malus.find((c: any) => c.id === data.cardId)
        const target = s.players.find(p => p.id === data.targetPlayerId)
        if (!malusCard || !target || malusCard.malusType === 'attentat') return
        // Retirer le malus du joueur
        player.board.malus = player.board.malus.filter((c: any) => c.id !== data.cardId)
        // Appliquer RÉELLEMENT le malus à la cible
        const malusResult = game.applyMalusPublic(target, malusCard, player, events)
        if (!malusResult.ok) {
          // Remettre le malus si inapplicable
          player.board.malus.push(malusCard)
          events.push(`Vengeance impossible : ${malusResult.reason}`)
        } else {
          events.push(`${player.username} renvoie ${malusCard.name} à ${target.username} !`)
        }
        s.pendingAction = null
        break
      }

      case 'astronaute': {
        if (data.skip) {
          events.push(`${player.username} (Astronaute) ne prend rien dans la défausse.`)
          s.pendingAction = null
          break
        }
        const astroCard = s.discard.find((c: any) => c.id === data.cardId)
        if (!astroCard) return
        s.discard = s.discard.filter((c: any) => c.id !== astroCard.id)
        s.pendingAction = null
        if (astroCard.category === 'malus' && data.targetPlayerId) {
          const target = s.players.find((p: any) => p.id === data.targetPlayerId)
          if (target) game.applyMalusPublic(target, astroCard, player, events)
        } else {
          // Vérifier la jouabilité AVANT d'ajouter à la main
          const canPlay = game.canPlayCardPublic(player, astroCard)
          if (!canPlay.ok) {
            s.discard.push(astroCard)
            events.push(`${player.username} (Astronaute) ne peut pas jouer ${astroCard.name} (${canPlay.reason}) — défaussée.`)
          } else {
            events.push(`${player.username} (Astronaute) joue ${astroCard.name} directement !`)
            game.applyCardPublic(player, astroCard, events)
            // Fin de tour après Astronaute
            const s4 = game.getState()
            player.hasDrawn = false; player.hasActed = false; player.hasDismissed = false
            s4.currentPlayerIndex = (s4.players.indexOf(player) + 1) % s4.players.length
            events.push(`Tour de ${s4.players[s4.currentPlayerIndex]!.username}.`)
          }
        }
        break
      }

      case 'piston': {
        // Jouer un métier sans condition de niveau d'études
        const metierCard = player.hand.find((c: any) => c.id === data.cardId)
        if (!metierCard || metierCard.category !== 'metier') break
        player.hand = player.hand.filter((c: any) => c.id !== data.cardId)
        player.board.metier = metierCard
        events.push(`${player.username} devient ${metierCard.name} grâce au Piston !`)
        // Repiocher jusqu'à 5 cartes
        while (player.hand.length < 5 && s.deck.length > 0) {
          player.hand.push(s.deck.shift()!)
        }
        events.push(`${player.username} repioche pour avoir 5 cartes en main.`)
        s.pendingAction = null
        player.hasActed = true
        // Passer au joueur suivant
        const nextIdx = (s.players.indexOf(player) + 1) % s.players.length
        player.hasDrawn = false
        player.hasActed = false
        player.hasDismissed = false
        s.currentPlayerIndex = nextIdx
        events.push(`Tour de ${s.players[nextIdx]!.username}.`)
        break
      }

      case 'casino-bet-a': {
        // Joueur A mise un salaire de sa main
        const betCard = player.hand.find((c: any) => c.id === data.cardId)
        if (!betCard || betCard.category !== 'salaire') {
          events.push('Vous devez miser un salaire de votre main.')
          break
        }
        // Choisir le joueur B
        if (!data.targetPlayerId) {
          events.push('Choisissez un adversaire à qui proposer le casino.')
          break
        }
        const playerB = s.players.find((p: any) => p.id === data.targetPlayerId)
        if (!playerB || playerB.id === player.id) break
        // Vérifier que B a bien un salaire en main
        const bHasSalaire = playerB.hand.some((c: any) => c.category === 'salaire')
        if (!bHasSalaire) {
          events.push(`${playerB.username} n'a pas de salaire en main — choisissez un autre joueur.`)
          break
        }
        // Retirer la mise de la main de A
        player.hand = player.hand.filter((c: any) => c.id !== betCard.id)
        s.pendingAction = {
          type: 'casino-bet-b',
          initiatorId: playerB.id, // maintenant c'est B qui doit agir
          data: { ...s.pendingAction!.data, playerBId: playerB.id, betA: betCard }
        }
        events.push(`${player.username} mise un salaire au Casino ! ${playerB.username}, à vous de miser.`)
        break
      }

      case 'casino-bet-b': {
        // Joueur B mise un salaire de sa main
        const pendData = s.pendingAction!.data as any
        const playerA = s.players.find((p: any) => p.id === pendData.playerAId)!
        if (!playerA) break
        const betCard = player.hand.find((c: any) => c.id === data.cardId)
        if (!betCard || betCard.category !== 'salaire') {
          events.push('Vous devez miser un salaire de votre main.')
          break
        }
        // Retirer la mise de la main de B
        player.hand = player.hand.filter((c: any) => c.id !== betCard.id)
        const betA = pendData.betA as any
        // Révéler et résoudre
        events.push(`🎰 Révélation Casino : ${playerA.username} misait Niv.${betA.salaryLevel} vs ${player.username} Niv.${betCard.salaryLevel}.`)
        if (betCard.salaryLevel === betA.salaryLevel) {
          // Égalité → B gagne les deux salaires
          player.board.salaires.push(betA, betCard)
          events.push(`⚖️ Égalité ! ${player.username} remporte les deux salaires !`)
        } else {
          // Différents → A gagne les deux salaires
          playerA.board.salaires.push(betA, betCard)
          events.push(`🎰 ${playerA.username} remporte les deux salaires !`)
        }
        s.pendingAction = null
        // Repiocher pour A et B pour revenir à 5 cartes
        while (playerA.hand.length < 5 && s.deck.length > 0) playerA.hand.push(s.deck.shift()!)
        while (player.hand.length < 5 && s.deck.length > 0) player.hand.push(s.deck.shift()!)
        events.push(`${playerA.username} et ${player.username} repiochent pour avoir 5 cartes.`)
        // Passer au tour suivant depuis A (c'était son tour)
        const idx = s.players.indexOf(playerA)
        playerA.hasDrawn = false; playerA.hasActed = false; playerA.hasDismissed = false
        s.currentPlayerIndex = (idx + 1) % s.players.length
        events.push(`Tour de ${s.players[s.currentPlayerIndex]!.username}.`)
        break
      }

      case 'medium':
        // Le joueur ferme le modal — on efface juste le pendingAction
        s.pendingAction = null
        events.push(`${player.username} a consulté la pioche (Médium).`)
        break

      case 'chercheur-discard': {
        // Le joueur choisit une carte à défausser pour revenir à 5
        const cardToDiscard = player.hand.find((c: any) => c.id === data.cardId)
        if (!cardToDiscard) break
        player.hand = player.hand.filter((c: any) => c.id !== data.cardId)
        s.discard.push(cardToDiscard)
        events.push(`${player.username} défausse ${cardToDiscard.name} (retour à 5 cartes).`)
        s.pendingAction = null
        // Passer le tour si le joueur avait démissionné
        if (player.hasDismissed) {
          player.hasDrawn = false; player.hasActed = false; player.hasDismissed = false
          s.currentPlayerIndex = (s.players.indexOf(player) + 1) % s.players.length
          events.push(`Tour de ${s.players[s.currentPlayerIndex]!.username}.`)
        }
        break
      }

      default:
        s.pendingAction = null
    }

    broadcast(game)
    if (events.length) broadcastLog(_room.code, events)
  })

  socket.on('smilelife:get-state' as any, () => {
    const _room = store.getRoomBySocket(socket.id)
    if (!_room) return
    const game = activeGames.get(_room.code)
    if (!game) return
    const publicState = game.getPublicState(user.id)
    socket.emit('smilelife:state' as any, publicState)
  })
}

export function cleanupSmileLife(code: string) {
  activeGames.delete(code)
}
