// ─── Types ────────────────────────────────────────────────────────────────────

export type CardCategory = 'etude' | 'metier' | 'salaire' | 'flirt' | 'mariage' | 'enfant' | 'adultere' | 'animal' | 'voyage' | 'maison' | 'malus' | 'special'

export type MalusType = 'accident' | 'burnout' | 'divorce' | 'impot' | 'licenciement' | 'maladie' | 'redoublement' | 'prison' | 'attentat'
export type SpecialType = 'anniversaire' | 'arc-en-ciel' | 'chance' | 'etoile-filante' | 'heritage' | 'troc' | 'tsunami' | 'vengeance' | 'piston' | 'casino'
export type MetierStatut = 'fonctionnaire' | 'interimaire' | null

export interface Card {
  id: string
  category: CardCategory
  name: string
  smiles: number
  // Études
  level?: number        // niveau études (1-6), double = +2
  isDouble?: boolean
  // Métier
  studiesRequired?: number
  maxSalary?: number    // nb liasses (1-4)
  statut?: MetierStatut
  metierEffect?: string | null // identifiant de l'effet spécial
  isFonctionnaire?: boolean
  // Salaire
  salaryLevel?: number  // 1-4
  // Flirt
  lieu?: string
  allowsChild?: boolean // flirt qui permet un enfant
  // Enfant
  gender?: 'garcon' | 'fille'
  childName?: string
  // Acquisition
  cost?: number         // nb liasses pour acheter
  // Malus
  malusType?: MalusType
  // Spéciale
  specialType?: SpecialType
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

let _idCounter = 0
function card(base: Omit<Card, 'id'>): Card {
  return { ...base, id: `card_${++_idCounter}` }
}

function repeat(n: number, base: Omit<Card, 'id'>): Card[] {
  return Array.from({ length: n }, () => card(base))
}

// ─── Deck ─────────────────────────────────────────────────────────────────────

export function buildDeck(): Card[] {
  const deck: Card[] = []

  // ── ÉTUDES (22 simples + 3 doubles) ─────────────────────────────────────────
  const etudeNames = ['Primaire', 'Collège', 'Lycée', 'BTS / DUT', 'Licence', 'Master / Ingénieur']
  for (let lvl = 1; lvl <= 6; lvl++) {
    const count = lvl <= 3 ? 4 : lvl <= 5 ? 3 : 2
    for (let i = 0; i < count; i++) {
      deck.push(card({ category: 'etude', name: etudeNames[lvl - 1]!, smiles: 1, level: lvl }))
    }
  }
  // 3 doubles — couvrent niveaux 1+2, 2+3, 3+4
  deck.push(card({ category: 'etude', name: 'Double Études Niv.1-2', smiles: 2, level: 2, isDouble: true }))
  deck.push(card({ category: 'etude', name: 'Double Études Niv.2-3', smiles: 2, level: 3, isDouble: true }))
  deck.push(card({ category: 'etude', name: 'Double Études Niv.3-4', smiles: 2, level: 4, isDouble: true }))

  // ── MÉTIERS (30) ─────────────────────────────────────────────────────────────
  const metiers: Omit<Card, 'id' | 'category' | 'smiles'>[] = [
    { name: 'Architecte',       studiesRequired: 4, maxSalary: 3, statut: null,          metierEffect: 'architecte' },
    { name: 'Astronaute',       studiesRequired: 6, maxSalary: 6, statut: null,          metierEffect: 'astronaute' },
    { name: 'Avocat',           studiesRequired: 4, maxSalary: 3, statut: null,          metierEffect: 'avocat' },
    { name: 'Bandit',           studiesRequired: 0, maxSalary: 2, statut: null,          metierEffect: 'bandit' },
    { name: 'Barman',           studiesRequired: 0, maxSalary: 1, statut: 'interimaire', metierEffect: 'barman' },
    { name: 'Chef des Achats',  studiesRequired: 3, maxSalary: 3, statut: null,          metierEffect: 'chef-achats' },
    { name: 'Chef des Ventes',  studiesRequired: 3, maxSalary: 3, statut: null,          metierEffect: 'chef-ventes' },
    { name: 'Chercheur',        studiesRequired: 5, maxSalary: 3, statut: null,          metierEffect: 'chercheur' },
    { name: 'Chirurgien',       studiesRequired: 6, maxSalary: 4, statut: null,          metierEffect: 'chirurgien' },
    { name: 'Designer',         studiesRequired: 4, maxSalary: 3, statut: null,          metierEffect: null },
    { name: 'Écrivain',         studiesRequired: 3, maxSalary: 2, statut: null,          metierEffect: 'ecrivain' },
    { name: 'Garagiste',        studiesRequired: 1, maxSalary: 2, statut: null,          metierEffect: 'garagiste' },
    { name: 'Gourou',           studiesRequired: 0, maxSalary: 3, statut: null,          metierEffect: 'gourou' },
    { name: 'Grand Prof',       studiesRequired: 2, maxSalary: 3, statut: 'fonctionnaire', metierEffect: 'grand-prof' },
    { name: 'Jardinier',        studiesRequired: 1, maxSalary: 1, statut: 'interimaire', metierEffect: null },
    { name: 'Journaliste',      studiesRequired: 3, maxSalary: 2, statut: null,          metierEffect: 'journaliste' },
    { name: 'Médecin',          studiesRequired: 6, maxSalary: 4, statut: null,          metierEffect: 'medecin' },
    { name: 'Médium',           studiesRequired: 0, maxSalary: 2, statut: null,          metierEffect: 'medium' },
    { name: 'Militaire',        studiesRequired: 2, maxSalary: 2, statut: 'fonctionnaire', metierEffect: 'militaire' },
    { name: 'Pharmacien',       studiesRequired: 5, maxSalary: 3, statut: null,          metierEffect: 'pharmacien' },
    { name: 'Pilote de Ligne',  studiesRequired: 5, maxSalary: 4, statut: null,          metierEffect: 'pilote' },
    { name: 'Pizzaïolo',        studiesRequired: 0, maxSalary: 1, statut: 'interimaire', metierEffect: null },
    { name: 'Plombier',         studiesRequired: 1, maxSalary: 2, statut: 'interimaire', metierEffect: null },
    { name: 'Policier',         studiesRequired: 1, maxSalary: 1, statut: 'fonctionnaire', metierEffect: 'policier', isFonctionnaire: true },
    { name: 'Prof d\'Anglais',  studiesRequired: 2, maxSalary: 2, statut: 'fonctionnaire', metierEffect: null, isFonctionnaire: true },
    { name: 'Prof de Français', studiesRequired: 2, maxSalary: 2, statut: 'fonctionnaire', metierEffect: null, isFonctionnaire: true },
    { name: 'Prof d\'Histoire', studiesRequired: 2, maxSalary: 2, statut: 'fonctionnaire', metierEffect: null, isFonctionnaire: true },
    { name: 'Prof de Maths',    studiesRequired: 2, maxSalary: 2, statut: 'fonctionnaire', metierEffect: null, isFonctionnaire: true },
    { name: 'Serveur',          studiesRequired: 0, maxSalary: 1, statut: 'interimaire', metierEffect: null },
    { name: 'Stripteaser',      studiesRequired: 0, maxSalary: 1, statut: 'interimaire', metierEffect: null },
  ]
  metiers.forEach(m => deck.push(card({ ...m, category: 'metier', smiles: 2, isFonctionnaire: m.statut === 'fonctionnaire' })))

  // ── SALAIRES (10 x 4 niveaux = 40) ──────────────────────────────────────────
  for (let lvl = 1; lvl <= 4; lvl++) {
    for (let i = 0; i < 10; i++) {
      deck.push(card({ category: 'salaire', name: `Salaire Niv.${lvl}`, smiles: 1, salaryLevel: lvl }))
    }
  }

  // ── FLIRTS (20) ──────────────────────────────────────────────────────────────
  const lieux: { lieu: string; allowsChild?: boolean }[] = [
    { lieu: 'Au camping',      allowsChild: true },
    { lieu: 'À l\'hôtel',     allowsChild: true },
    { lieu: 'Au Zoo' },
    { lieu: 'Sur internet' },
    { lieu: 'Au parc' },
    { lieu: 'En boîte de nuit' },
    { lieu: 'Au bar' },
    { lieu: 'Au cinéma' },
    { lieu: 'Au restaurant' },
    { lieu: 'Au théâtre' },
  ]
  lieux.forEach(l => {
    repeat(2, { category: 'flirt', name: 'Flirt', smiles: 1, lieu: l.lieu, allowsChild: l.allowsChild ?? false }).forEach(c => deck.push(c))
  })

  // ── MARIAGES (6) ─────────────────────────────────────────────────────────────
  repeat(6, { category: 'mariage', name: 'Mariage', smiles: 3 }).forEach(c => deck.push(c))

  // ── ENFANTS (10) ─────────────────────────────────────────────────────────────
  const enfants: { name: string; gender: 'garcon' | 'fille' }[] = [
    { name: 'Diana',    gender: 'fille' },
    { name: 'Zelda',    gender: 'fille' },
    { name: 'Leïa',     gender: 'fille' },
    { name: 'Lara',     gender: 'fille' },
    { name: 'Hermione', gender: 'fille' },
    { name: 'Harry',    gender: 'garcon' },
    { name: 'Mario',    gender: 'garcon' },
    { name: 'Luke',     gender: 'garcon' },
    { name: 'Rocky',    gender: 'garcon' },
    { name: 'Luigi',    gender: 'garcon' },
  ]
  enfants.forEach(e => deck.push(card({ category: 'enfant', name: 'Enfant', smiles: 2, childName: e.name, gender: e.gender })))

  // ── ADULTÈRES (3) ────────────────────────────────────────────────────────────
  repeat(3, { category: 'adultere', name: 'Adultère', smiles: 0 }).forEach(c => deck.push(c))

  // ── ANIMAUX (5) ──────────────────────────────────────────────────────────────
  const animaux = ['Chat', 'Chien', 'Lapin', 'Perroquet', 'Hamster']
  animaux.forEach(a => deck.push(card({ category: 'animal', name: a, smiles: 1, cost: 0 })))

  // ── VOYAGES (5) ──────────────────────────────────────────────────────────────
  const voyages = [
    { name: 'New York',  cost: 2, smiles: 2 },
    { name: 'Tokyo',     cost: 2, smiles: 2 },
    { name: 'Bali',      cost: 1, smiles: 1 },
    { name: 'Maldives',  cost: 3, smiles: 3 },
    { name: 'Patagonie', cost: 2, smiles: 2 },
  ]
  voyages.forEach(v => deck.push(card({ category: 'voyage', name: v.name, smiles: v.smiles, cost: v.cost })))

  // ── MAISONS (5) ──────────────────────────────────────────────────────────────
  const maisons = [
    { name: 'Studio',        cost: 2, smiles: 2 },
    { name: 'Appartement',   cost: 3, smiles: 3 },
    { name: 'Maison',        cost: 4, smiles: 4 },
    { name: 'Villa',         cost: 5, smiles: 5 },
    { name: 'Manoir',        cost: 6, smiles: 6 },
  ]
  maisons.forEach(m => deck.push(card({ category: 'maison', name: m.name, smiles: m.smiles, cost: m.cost })))

  // ── MALUS (37) ───────────────────────────────────────────────────────────────
  repeat(5,  { category: 'malus', name: 'Accident',     smiles: 0, malusType: 'accident' }).forEach(c => deck.push(c))
  repeat(5,  { category: 'malus', name: 'Burn-out',     smiles: 0, malusType: 'burnout' }).forEach(c => deck.push(c))
  repeat(5,  { category: 'malus', name: 'Divorce',      smiles: 0, malusType: 'divorce' }).forEach(c => deck.push(c))
  repeat(5,  { category: 'malus', name: 'Impôt',        smiles: 0, malusType: 'impot' }).forEach(c => deck.push(c))
  repeat(5,  { category: 'malus', name: 'Licenciement', smiles: 0, malusType: 'licenciement' }).forEach(c => deck.push(c))
  repeat(5,  { category: 'malus', name: 'Maladie',      smiles: 0, malusType: 'maladie' }).forEach(c => deck.push(c))
  repeat(5,  { category: 'malus', name: 'Redoublement', smiles: 0, malusType: 'redoublement' }).forEach(c => deck.push(c))
  repeat(1,  { category: 'malus', name: 'Prison',       smiles: 0, malusType: 'prison' }).forEach(c => deck.push(c))
  repeat(1,  { category: 'malus', name: 'Attentat',     smiles: 0, malusType: 'attentat' }).forEach(c => deck.push(c))

  // ── CARTES SPÉCIALES (10) ────────────────────────────────────────────────────
  deck.push(card({ category: 'special', name: 'Anniversaire',   smiles: 0, specialType: 'anniversaire' }))
  deck.push(card({ category: 'special', name: 'Arc-en-ciel',    smiles: 0, specialType: 'arc-en-ciel' }))
  deck.push(card({ category: 'special', name: 'Chance',         smiles: 0, specialType: 'chance' }))
  deck.push(card({ category: 'special', name: 'Étoile Filante', smiles: 0, specialType: 'etoile-filante' }))
  deck.push(card({ category: 'special', name: 'Héritage',       smiles: 1, specialType: 'heritage' }))
  deck.push(card({ category: 'special', name: 'Piston',         smiles: 0, specialType: 'piston' }))
  deck.push(card({ category: 'special', name: 'Troc',           smiles: 0, specialType: 'troc' }))
  deck.push(card({ category: 'special', name: 'Tsunami',        smiles: 0, specialType: 'tsunami' }))
  deck.push(card({ category: 'special', name: 'Vengeance',      smiles: 0, specialType: 'vengeance' }))
  deck.push(card({ category: 'special', name: 'Casino',         smiles: 1, specialType: 'casino' }))

  return deck
}

export function shuffle<T>(arr: T[]): T[] {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j]!, a[i]!]
  }
  return a
}
