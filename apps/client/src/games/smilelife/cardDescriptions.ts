// ─── Descriptions de toutes les cartes ───────────────────────────────────────

export interface CardDescription {
  category: string        // label affiché en petit (type)
  description: string     // ce que fait la carte
  conditions: string[]    // conditions pour la jouer (✓ vert)
  consequences: string[]  // effets une fois jouée (→ violet)
  color: string           // couleur du header modal
}

export function getCardDescription(card: {
  category: string; name?: string; salaryLevel?: number; lieu?: string
  childName?: string; malusType?: string; specialType?: string
  metierEffect?: string; studiesRequired?: number; maxSalary?: number
  statut?: string | null; cost?: number; isDouble?: boolean
  allowsChild?: boolean; gender?: string
}): CardDescription {

  // ── Études ────────────────────────────────────────────────────────────────
  if (card.category === 'etude') {
    const isDouble = card.isDouble
    return {
      category: 'Études',
      description: isDouble
        ? 'Carte double qui vous fait gagner 2 niveaux d\'études d\'un coup.'
        : 'Vous fait progresser d\'un niveau dans vos études.',
      conditions: [
        'Jouable si vous avez moins de 6 niveaux d\'études',
        'Jouable même si vous avez un métier de Chirurgien ou Médecin',
      ],
      consequences: [
        isDouble ? 'Ajoute 2 niveaux à votre compteur d\'études' : 'Ajoute 1 niveau à votre compteur d\'études',
        'Permet de débloquer des métiers de plus haut niveau',
      ],
      color: '#3b6fd4',
    }
  }

  // ── Métiers ───────────────────────────────────────────────────────────────
  if (card.category === 'metier') {
    const effects: Record<string, { desc: string; conseq: string[] }> = {
      'astronaute':  { desc: 'Choisissez une carte dans la défausse et jouez-la immédiatement.', conseq: ['Accès à la défausse à chaque fois que vous devenez Astronaute', `Salaire max : niv.${card.maxSalary}`] },
      'avocat':      { desc: 'Vous êtes immunisé contre les malus de divorce forcé.', conseq: ['Personne ne peut vous faire divorcer de force', `Salaire max : niv.${card.maxSalary}`] },
      'bandit':      { desc: 'Immunisé contre licenciement et impôt, mais risque la prison.', conseq: ['Ne peut pas être licencié ni taxé', 'Peut être envoyé en prison 3 tours si quelqu\'un joue Prison', `Salaire max : niv.${card.maxSalary}`] },
      'barman':      { desc: 'Vous pouvez poser autant de flirts que vous voulez avant mariage.', conseq: ['Pas de limite de flirts (normalement 5 max)', `Salaire max : niv.${card.maxSalary}`, 'Intérimaire : peut démissionner sans passer son tour'] },
      'chercheur':   { desc: 'Pioche une carte supplémentaire et peut avoir 6 cartes en main.', conseq: ['Main de 6 cartes au lieu de 5', 'Pioche 1 carte bonus lors de la prise de poste', `Salaire max : niv.${card.maxSalary}`] },
      'chirurgien':  { desc: 'Immunisé contre les malus de maladie, peut continuer ses études.', conseq: ['Aucun malus maladie ne peut vous affecter', 'Peut continuer à poser des études', `Salaire max : niv.${card.maxSalary}`] },
      'garagiste':   { desc: 'Immunisé contre les malus d\'accident.', conseq: ['Aucun accident ne peut vous faire passer votre tour', `Salaire max : niv.${card.maxSalary}`, 'Intérimaire'] },
      'gourou':      { desc: 'Métier spécial sans conditions d\'études.', conseq: ['Peut être retiré par un Policier en jeu', `Salaire max : niv.${card.maxSalary}`] },
      'grand-prof':  { desc: 'Upgrade votre métier de Professeur sans démissionner.', conseq: ['Remplace directement votre Prof actuel', 'Conserve vos salaires déjà posés', `Salaire max : niv.${card.maxSalary}`, 'Fonctionnaire'] },
      'journaliste': { desc: 'Permet de voir la main complète d\'un adversaire.', conseq: ['Choisissez un joueur pour voir ses cartes', `Salaire max : niv.${card.maxSalary}`] },
      'medecin':     { desc: 'Immunisé contre les malus de maladie, peut continuer ses études.', conseq: ['Aucun malus maladie', 'Peut continuer à poser des études', `Salaire max : niv.${card.maxSalary}`] },
      'medium':      { desc: 'Permet de voir les 13 prochaines cartes de la pioche.', conseq: ['Vision des 13 prochaines cartes (lecture seule)', `Salaire max : niv.${card.maxSalary}`] },
      'militaire':   { desc: 'Bloque les cartes Attentat tant qu\'il est en jeu.', conseq: ['Aucun Attentat ne peut être joué', `Salaire max : niv.${card.maxSalary}`, 'Fonctionnaire'] },
      'pharmacien':  { desc: 'Immunisé contre les malus de maladie.', conseq: ['Aucun malus maladie', `Salaire max : niv.${card.maxSalary}`] },
      'pilote':      { desc: 'Peut poser ses cartes Voyage gratuitement depuis sa main.', conseq: ['Voyages gratuits (depuis la main uniquement)', `Salaire max : niv.${card.maxSalary}`] },
      'policier':    { desc: 'Retire immédiatement le Bandit et le Gourou de la table.', conseq: ['Les joueurs Bandit/Gourou perdent leur métier', 'Fonctionnaire : insensible au licenciement', `Salaire max : niv.${card.maxSalary}`] },
    }
    const fx = card.metierEffect ? effects[card.metierEffect] : null
    const statut = card.statut === 'fonctionnaire' ? 'Fonctionnaire' : card.statut === 'interimaire' ? 'Intérimaire' : null
    return {
      category: 'Métier',
      description: fx?.desc ?? `Exercez le métier de ${card.name}.`,
      conditions: [
        `Requiert ${card.studiesRequired ?? 0} niveau(x) d\'études`,
        card.metierEffect === 'grand-prof' ? 'Requiert d\'être Professeur actuellement' : 'Pas de métier en cours (sauf Grand Prof)',
      ],
      consequences: fx?.conseq ?? [`Salaire max : niv.${card.maxSalary}`, statut ? statut : 'CDI'].filter(Boolean),
      color: '#7c3aed',
    }
  }

  // ── Salaire ───────────────────────────────────────────────────────────────
  if (card.category === 'salaire') {
    return {
      category: 'Salaire',
      description: `Encaissez ${card.salaryLevel} liasse${(card.salaryLevel ?? 1) > 1 ? 's' : ''} de billet pour financer vos achats.`,
      conditions: [
        'Requiert d\'avoir un métier',
        `Votre métier doit autoriser les salaires de niv.${card.salaryLevel}`,
      ],
      consequences: [
        `Ajoute ${card.salaryLevel} liasse${(card.salaryLevel ?? 1) > 1 ? 's' : ''} à votre plateau`,
        'Utilisable pour acheter maisons et voyages',
        'Conservé en cas de démission ou licenciement',
      ],
      color: '#16a34a',
    }
  }

  // ── Flirt ─────────────────────────────────────────────────────────────────
  if (card.category === 'flirt') {
    return {
      category: 'Flirt',
      description: `Flirtez ${card.lieu}.${card.allowsChild ? ' Ce lieu permet d\'avoir un enfant avant mariage.' : ''}`,
      conditions: [
        'Maximum 5 flirts avant mariage (illimité pour le Barman)',
        'Si marié(e), vous devez d\'abord jouer un Adultère',
      ],
      consequences: [
        `Flirt posé : ${card.lieu}`,
        card.allowsChild ? 'Permet d\'avoir 1 enfant avant mariage' : 'Pas d\'enfant possible avec ce lieu',
        'Vole le flirt du même lieu à un adversaire si il en avait un',
      ],
      color: '#ec4899',
    }
  }

  // ── Mariage ───────────────────────────────────────────────────────────────
  if (card.category === 'mariage') {
    return {
      category: 'Mariage',
      description: 'Officialisez votre relation et débloquez les avantages du mariage.',
      conditions: [
        'Avoir au moins 1 flirt posé',
        'Ne pas être déjà marié(e)',
      ],
      consequences: [
        'Maisons achetées à moitié prix',
        'Permet d\'avoir des enfants',
        'Les flirts futurs nécessitent un Adultère',
      ],
      color: '#a21caf',
    }
  }

  // ── Enfant ────────────────────────────────────────────────────────────────
  if (card.category === 'enfant') {
    return {
      category: 'Enfant',
      description: `Accueillez ${card.childName} dans votre famille !`,
      conditions: [
        'Être marié(e), OU avoir un flirt camping/hôtel (1 enfant max sans mariage)',
        'En cas d\'adultère, l\'enfant est rattaché à l\'adultère',
      ],
      consequences: [
        `${card.childName} rejoint votre plateau (${card.gender === 'fille' ? 'fille' : 'garçon'})`,
        '2 smiles gagnés',
        'Vulnérable à la carte Attentat',
      ],
      color: '#d97706',
    }
  }

  // ── Adultère ──────────────────────────────────────────────────────────────
  if (card.category === 'adultere') {
    return {
      category: 'Adultère',
      description: 'Flirtez en dehors du mariage. Les flirts et enfants pendant l\'adultère sont séparés.',
      conditions: [
        'Être marié(e)',
        'Un seul adultère à la fois',
      ],
      consequences: [
        'Permet de flirter à nouveau malgré le mariage',
        'En cas de divorce forcé : perd adultère, flirts et enfants d\'adultère',
        'Pas de smiles directs',
      ],
      color: '#e11d48',
    }
  }

  // ── Animal ────────────────────────────────────────────────────────────────
  if (card.category === 'animal') {
    return {
      category: 'Animal',
      description: `Adoptez ${card.name}, votre nouvel animal de compagnie.`,
      conditions: ['Jouable à tout moment, aucune condition'],
      consequences: ['Gratuit (coût : 0 liasse)', '1 smile gagné', 'Posé définitivement sur votre plateau'],
      color: '#15803d',
    }
  }

  // ── Voyage ────────────────────────────────────────────────────────────────
  if (card.category === 'voyage') {
    return {
      category: 'Voyage',
      description: `Partez en voyage à ${card.name} !`,
      conditions: [
        `Avoir ${card.cost} liasse(s) de salaire disponibles`,
        'Le Pilote peut jouer ses voyages depuis la main gratuitement',
      ],
      consequences: [
        `Coûte ${card.cost} liasse(s) de salaire (retournées)`,
        `${card.cost} smile(s) gagnés`,
      ],
      color: '#0891b2',
    }
  }

  // ── Maison ────────────────────────────────────────────────────────────────
  if (card.category === 'maison') {
    const cm = (card as any).costMarried
    return {
      category: 'Maison',
      description: `Achetez ${card.name} pour améliorer votre cadre de vie.`,
      conditions: [
        `Avoir ${card.cost} liasse(s) si célibataire${cm ? `, ou ${cm} si marié(e)` : ''}`,
      ],
      consequences: [
        `Coûte ${card.cost} liasse(s)${cm ? ` (ou ${cm} si marié(e))` : ''}`,
        `${(card as any).smiles ?? '?'} smile(s) gagnés`,
        'Posée définitivement sur votre plateau',
      ],
      color: '#ea580c',
    }
  }

  // ── Malus ─────────────────────────────────────────────────────────────────
  if (card.category === 'malus') {
    const malusInfo: Record<string, { desc: string; cond: string[]; conseq: string[] }> = {
      accident:     { desc: 'Forcez un adversaire à passer son prochain tour.', cond: ['Immunisé si la cible est Garagiste'], conseq: ['La cible passe son prochain tour'] },
      burnout:      { desc: 'Forcez un travailleur à passer son prochain tour.', cond: ['La cible doit avoir un métier'], conseq: ['La cible passe son prochain tour'] },
      divorce:      { desc: 'Forcez un adversaire à divorcer.', cond: ['La cible doit être mariée', 'Immunisé si la cible est Avocat'], conseq: ['Perd le mariage', 'Si adultère en cours : perd flirts et enfants d\'adultère', 'Les flirts officiels sont conservés'] },
      impot:        { desc: 'Taxez un adversaire et lui faites perdre son dernier salaire.', cond: ['La cible doit travailler ET avoir au moins 1 salaire posé', 'Immunisé si la cible est Bandit'], conseq: ['Supprime le dernier salaire non investi de la cible'] },
      licenciement: { desc: 'Renvoyez un adversaire de son poste.', cond: ['La cible doit avoir un métier', 'Immunisé si fonctionnaire ou Bandit'], conseq: ['Perd son métier', 'Conserve ses salaires déjà posés'] },
      maladie:      { desc: 'Rendez un adversaire malade pour un tour.', cond: ['Immunisé si Chirurgien, Médecin ou Pharmacien'], conseq: ['La cible passe son prochain tour'] },
      redoublement: { desc: 'Faites redoubler un étudiant.', cond: ['La cible doit avoir au moins 1 carte études posée'], conseq: ['Supprime la dernière carte études posée'] },
      prison:       { desc: 'Envoyez le Bandit en prison pour 3 tours.', cond: ['La cible doit être Bandit'], conseq: ['Bloqué 3 tours', 'Perd son métier Bandit à la sortie'] },
      attentat:     { desc: 'Éliminez tous les enfants en jeu d\'un coup.', cond: ['Au moins 1 enfant doit être en jeu', 'Bloqué si un Militaire est en jeu'], conseq: ['Tous les enfants de tous les joueurs sont retirés'] },
    }
    const info = card.malusType ? malusInfo[card.malusType] : null
    return {
      category: 'Malus',
      description: info?.desc ?? 'Infligez un malus à un adversaire.',
      conditions: info?.cond ?? ['Cibler un adversaire'],
      consequences: info?.conseq ?? ['Effet négatif sur la cible'],
      color: '#dc2626',
    }
  }

  // ── Spéciales ─────────────────────────────────────────────────────────────
  if (card.category === 'special') {
    const specialInfo: Record<string, { desc: string; cond: string[]; conseq: string[] }> = {
      'anniversaire':  { desc: 'Chaque adversaire vous offre un de ses salaires.', cond: ['Jouable à tout moment'], conseq: ['Chaque adversaire ayant un salaire vous en donne un', 'Peut récupérer plusieurs salaires en un tour'] },
      'arc-en-ciel':   { desc: 'Jouez jusqu\'à 3 cartes d\'affilée depuis votre main.', cond: ['Jouable à tout moment'], conseq: ['Jouez 1, 2 ou 3 cartes (jouer, malus ou défausser)', 'Repioche ensuite pour revenir à 5 cartes'] },
      'chance':        { desc: 'Piochez 3 cartes, gardez-en 1 et jouez-la immédiatement.', cond: ['Jouable à tout moment'], conseq: ['Pioche 3 cartes depuis la pioche', 'Choisissez 1 à jouer directement (si jouable)', 'Les 2 autres sont défaussées'] },
      'etoile-filante':{ desc: 'Choisissez une carte dans la défausse et jouez-la directement.', cond: ['La défausse ne doit pas être vide', 'La carte choisie doit être jouable'], conseq: ['Récupère une carte de la défausse', 'La joue immédiatement si possible, sinon la défausse'] },
      'heritage':      { desc: 'Recevez un héritage de 3 liasses utilisables pour vos achats.', cond: ['Jouable à tout moment'], conseq: ['3 liasses d\'héritage ajoutées à votre réserve', 'Utilisables pour maisons et voyages (consommées entièrement)'] },
      'piston':        { desc: 'Jouez un métier de votre main sans condition d\'études.', cond: ['Avoir au moins 1 carte Métier en main', 'Pas de Grand Prof possible via Piston'], conseq: ['Posez le métier choisi sans vérification du niveau d\'études', 'Repioche pour revenir à 5 cartes', 'Passe votre tour'] },
      'troc':          { desc: 'Échangez une carte aléatoire avec un adversaire.', cond: ['Vous et la cible devez avoir au moins 1 carte en main'], conseq: ['Échange aléatoire d\'une carte de chaque côté'] },
      'tsunami':       { desc: 'Toutes les mains sont mélangées et redistribuées aléatoirement.', cond: ['Jouable à tout moment'], conseq: ['Toutes les mains de tous les joueurs mélangées', 'Redistribuées aléatoirement (5 cartes chacun)'] },
      'vengeance':     { desc: 'Renvoyez un de vos malus à un adversaire.', cond: ['Avoir au moins 1 malus reçu applicable', 'Le malus doit pouvoir affecter la cible (vérification des immunités)', 'L\'Attentat ne peut pas être renvoyé'], conseq: ['Retire le malus choisi de votre plateau', 'Applique l\'effet du malus à la cible'] },
      'casino':        { desc: 'Défiez un adversaire : misez chacun un salaire, égalité = l\'adversaire gagne.', cond: ['Vous et la cible devez avoir un salaire en main'], conseq: ['Vous misez chacun un salaire', 'Si niveaux égaux : l\'adversaire gagne les deux', 'Si niveaux différents : vous gagnez les deux', 'Les deux joueurs repiochent 1 carte'] },
    }
    const info = card.specialType ? specialInfo[card.specialType] : null
    return {
      category: 'Spéciale',
      description: info?.desc ?? 'Carte spéciale à effet unique.',
      conditions: info?.cond ?? ['Jouable à tout moment'],
      consequences: info?.conseq ?? ['Effet spécial'],
      color: '#7c3aed',
    }
  }

  return {
    category: 'Carte',
    description: card.name ?? 'Carte inconnue',
    conditions: [],
    consequences: [],
    color: '#6b7280',
  }
}
