// ─── Configuration visuelle de toutes les cartes ─────────────────────────────
// Pour remplacer un emoji par une image :
//   1. Ajouter image: '/assets/cards/nom.png' dans l'entrée
//   2. Supprimer ou commenter la ligne emoji:
// Le composant CardFace détecte automatiquement image vs emoji

export interface CardAsset {
  emoji: string
  image?: string   // chemin vers l'image custom (optionnel)
  color: string    // couleur du header
  bg: string       // couleur du fond
  textColor: string // couleur du texte sur le header
}

// ─── Dos de carte ─────────────────────────────────────────────────────────────
export const CARD_BACK = {
  image: undefined as string | undefined,  // '/assets/cards/card-back.png'
  color: '#1e293b',
  emoji: '🃏',
}

// ─── Assets par catégorie et nom ─────────────────────────────────────────────
export const CARD_ASSETS: Record<string, CardAsset> = {

  // ── Études ──────────────────────────────────────────────────────────────────
  'etude-simple':  { emoji: '🎓', color: '#3b82f6', bg: '#dbeafe', textColor: '#fff' },
  'etude-double':  { emoji: '🎓', image: '/assets/cards/etudes-2.png', color: '#1d4ed8', bg: '#bfdbfe', textColor: '#fff' },

  // ── Métiers ──────────────────────────────────────────────────────────────────
  'architecte':    { emoji: '🏗️',  color: '#7c3aed', bg: '#ede9fe', textColor: '#fff' },
  'astronaute':    { emoji: '🚀',  color: '#7c3aed', bg: '#ede9fe', textColor: '#fff' },
  'avocat':        { emoji: '⚖️',  color: '#7c3aed', bg: '#ede9fe', textColor: '#fff' },
  'bandit':        { emoji: '🦹',  color: '#374151', bg: '#f3f4f6', textColor: '#fff' },
  'barman':        { emoji: '🍺',  color: '#7c3aed', bg: '#ede9fe', textColor: '#fff' },
  'chef-achats':   { emoji: '🛒',  color: '#7c3aed', bg: '#ede9fe', textColor: '#fff' },
  'chef-ventes':   { emoji: '📊',  color: '#7c3aed', bg: '#ede9fe', textColor: '#fff' },
  'chercheur':     { emoji: '🔭',  color: '#7c3aed', bg: '#ede9fe', textColor: '#fff' },
  'chirurgien':    { emoji: '🔬',  color: '#7c3aed', bg: '#ede9fe', textColor: '#fff' },
  'designer':      { emoji: '🎨',  color: '#7c3aed', bg: '#ede9fe', textColor: '#fff' },
  'ecrivain':      { emoji: '✍️',  color: '#7c3aed', bg: '#ede9fe', textColor: '#fff' },
  'garagiste':     { emoji: '🔧',  color: '#7c3aed', bg: '#ede9fe', textColor: '#fff' },
  'gourou':        { emoji: '🧘',  color: '#7c3aed', bg: '#ede9fe', textColor: '#fff' },
  'grand-prof':    { emoji: '👨‍🏫', color: '#4f46e5', bg: '#e0e7ff', textColor: '#fff' },
  'jardinier':     { emoji: '🌱',  color: '#7c3aed', bg: '#ede9fe', textColor: '#fff' },
  'journaliste':   { emoji: '📰',  color: '#7c3aed', bg: '#ede9fe', textColor: '#fff' },
  'medecin':       { emoji: '💊',  color: '#7c3aed', bg: '#ede9fe', textColor: '#fff' },
  'medium':        { emoji: '🔮',  color: '#7c3aed', bg: '#ede9fe', textColor: '#fff' },
  'militaire':     { emoji: '🪖',  color: '#374151', bg: '#f3f4f6', textColor: '#fff' },
  'pharmacien':    { emoji: '💉',  color: '#7c3aed', bg: '#ede9fe', textColor: '#fff' },
  'pilote':        { emoji: '✈️',  color: '#7c3aed', bg: '#ede9fe', textColor: '#fff' },
  'pizzaiolo':     { emoji: '🍕',  color: '#7c3aed', bg: '#ede9fe', textColor: '#fff' },
  'plombier':      { emoji: '🪠',  color: '#7c3aed', bg: '#ede9fe', textColor: '#fff' },
  'policier':      { emoji: '🚔',  color: '#1e40af', bg: '#dbeafe', textColor: '#fff' },
  'prof-anglais':  { emoji: '🇬🇧', color: '#4f46e5', bg: '#e0e7ff', textColor: '#fff' },
  'prof-francais': { emoji: '📝',  color: '#4f46e5', bg: '#e0e7ff', textColor: '#fff' },
  'prof-histoire': { emoji: '🏛️', color: '#4f46e5', bg: '#e0e7ff', textColor: '#fff' },
  'prof-maths':    { emoji: '📐',  color: '#4f46e5', bg: '#e0e7ff', textColor: '#fff' },
  'serveur':       { emoji: '🍽️', color: '#7c3aed', bg: '#ede9fe', textColor: '#fff' },
  'stripteaser':   { emoji: '💃',  color: '#7c3aed', bg: '#ede9fe', textColor: '#fff' },

  // ── Salaires ─────────────────────────────────────────────────────────────────
  'salaire-1': { emoji: '💵',        color: '#16a34a', bg: '#dcfce7', textColor: '#fff' },
  'salaire-2': { emoji: '💵💵',     color: '#15803d', bg: '#bbf7d0', textColor: '#fff' },
  'salaire-3': { emoji: '💵💵💵',  color: '#166534', bg: '#86efac', textColor: '#fff' },
  'salaire-4': { emoji: '💵💵💵💵',color: '#14532d', bg: '#4ade80', textColor: '#fff' },

  // ── Flirts ───────────────────────────────────────────────────────────────────
  'flirt-camping':    { emoji: '⛺', color: '#ec4899', bg: '#fce7f3', textColor: '#fff' },
  'flirt-hotel':      { emoji: '🏨', color: '#ec4899', bg: '#fce7f3', textColor: '#fff' },
  'flirt-zoo':        { emoji: '🦁', color: '#ec4899', bg: '#fce7f3', textColor: '#fff' },
  'flirt-internet':   { emoji: '🌐', color: '#ec4899', bg: '#fce7f3', textColor: '#fff' },
  'flirt-parc':       { emoji: '🌳', color: '#ec4899', bg: '#fce7f3', textColor: '#fff' },
  'flirt-boite':      { emoji: '🎉', color: '#ec4899', bg: '#fce7f3', textColor: '#fff' },
  'flirt-bar':        { emoji: '🍸', color: '#ec4899', bg: '#fce7f3', textColor: '#fff' },
  'flirt-cinema':     { emoji: '🎬', color: '#ec4899', bg: '#fce7f3', textColor: '#fff' },
  'flirt-restaurant': { emoji: '🍷', color: '#ec4899', bg: '#fce7f3', textColor: '#fff' },
  'flirt-theatre':    { emoji: '🎭', color: '#ec4899', bg: '#fce7f3', textColor: '#fff' },

  // ── Mariage / Adultère ───────────────────────────────────────────────────────
  'mariage':  { emoji: '💍', color: '#a21caf', bg: '#fdf4ff', textColor: '#fff' },
  'adultere': { emoji: '🙊', color: '#e11d48', bg: '#fff1f2', textColor: '#fff' },

  // ── Enfants ──────────────────────────────────────────────────────────────────
  'enfant-diana':    { emoji: '👧', color: '#d97706', bg: '#fffbeb', textColor: '#fff' },
  'enfant-zelda':    { emoji: '👧', color: '#d97706', bg: '#fffbeb', textColor: '#fff' },
  'enfant-leia':     { emoji: '👧', color: '#d97706', bg: '#fffbeb', textColor: '#fff' },
  'enfant-lara':     { emoji: '👧', color: '#d97706', bg: '#fffbeb', textColor: '#fff' },
  'enfant-hermione': { emoji: '👧', color: '#d97706', bg: '#fffbeb', textColor: '#fff' },
  'enfant-harry':    { emoji: '👦', color: '#b45309', bg: '#fef3c7', textColor: '#fff' },
  'enfant-mario':    { emoji: '👦', color: '#b45309', bg: '#fef3c7', textColor: '#fff' },
  'enfant-luke':     { emoji: '👦', color: '#b45309', bg: '#fef3c7', textColor: '#fff' },
  'enfant-rocky':    { emoji: '👦', color: '#b45309', bg: '#fef3c7', textColor: '#fff' },
  'enfant-luigi':    { emoji: '👦', color: '#b45309', bg: '#fef3c7', textColor: '#fff' },

  // ── Animaux ──────────────────────────────────────────────────────────────────
  'animal-chat':       { emoji: '🐱', color: '#15803d', bg: '#f0fdf4', textColor: '#fff' },
  'animal-chien':      { emoji: '🐶', color: '#15803d', bg: '#f0fdf4', textColor: '#fff' },
  'animal-lapin':      { emoji: '🐰', color: '#15803d', bg: '#f0fdf4', textColor: '#fff' },
  'animal-perroquet':  { emoji: '🦜', color: '#15803d', bg: '#f0fdf4', textColor: '#fff' },
  'animal-hamster':    { emoji: '🐹', color: '#15803d', bg: '#f0fdf4', textColor: '#fff' },

  // ── Voyages ───────────────────────────────────────────────────────────────────
  'voyage-new-york':  { emoji: '🗽', color: '#0891b2', bg: '#ecfeff', textColor: '#fff' },
  'voyage-tokyo':     { emoji: '🗾', color: '#0891b2', bg: '#ecfeff', textColor: '#fff' },
  'voyage-bali':      { emoji: '🌴', color: '#0891b2', bg: '#ecfeff', textColor: '#fff' },
  'voyage-maldives':  { emoji: '🏝️',color: '#0891b2', bg: '#ecfeff', textColor: '#fff' },
  'voyage-patagonie': { emoji: '🏔️',color: '#0891b2', bg: '#ecfeff', textColor: '#fff' },

  // ── Maisons ───────────────────────────────────────────────────────────────────
  'maison-simple':      { emoji: '🏠', color: '#ea580c', bg: '#fff7ed', textColor: '#fff' },
  'maison-garage':      { emoji: '🏡', color: '#ea580c', bg: '#fff7ed', textColor: '#fff' },
  'maison-villa':       { emoji: '🏰', color: '#c2410c', bg: '#ffedd5', textColor: '#fff' },

  // ── Malus ─────────────────────────────────────────────────────────────────────
  'malus-accident':     { emoji: '🚗', color: '#dc2626', bg: '#fef2f2', textColor: '#fff' },
  'malus-burnout':      { emoji: '😩', color: '#dc2626', bg: '#fef2f2', textColor: '#fff' },
  'malus-divorce':      { emoji: '💔', color: '#dc2626', bg: '#fef2f2', textColor: '#fff' },
  'malus-impot':        { emoji: '🏛️',color: '#dc2626', bg: '#fef2f2', textColor: '#fff' },
  'malus-licenciement': { emoji: '📋', color: '#dc2626', bg: '#fef2f2', textColor: '#fff' },
  'malus-maladie':      { emoji: '🤒', color: '#dc2626', bg: '#fef2f2', textColor: '#fff' },
  'malus-redoublement': { emoji: '📚', color: '#dc2626', bg: '#fef2f2', textColor: '#fff' },
  'malus-prison':       { emoji: '🔒', color: '#dc2626', bg: '#fef2f2', textColor: '#fff' },
  'malus-attentat':     { emoji: '💣', color: '#7f1d1d', bg: '#fee2e2', textColor: '#fff' },

  // ── Spéciales ─────────────────────────────────────────────────────────────────
  'special-anniversaire':  { emoji: '🎂', color: '#7c3aed', bg: '#faf5ff', textColor: '#fff' },
  'special-arc-en-ciel':   { emoji: '🌈', color: '#7c3aed', bg: '#faf5ff', textColor: '#fff' },
  'special-chance':        { emoji: '🍀', color: '#7c3aed', bg: '#faf5ff', textColor: '#fff' },
  'special-etoile-filante':{ emoji: '⭐', color: '#7c3aed', bg: '#faf5ff', textColor: '#fff' },
  'special-heritage':      { emoji: '💰', color: '#7c3aed', bg: '#faf5ff', textColor: '#fff' },
  'special-piston':        { emoji: '⚙️', color: '#7c3aed', bg: '#faf5ff', textColor: '#fff' },
  'special-troc':          { emoji: '🔄', color: '#7c3aed', bg: '#faf5ff', textColor: '#fff' },
  'special-tsunami':       { emoji: '🌊', color: '#7c3aed', bg: '#faf5ff', textColor: '#fff' },
  'special-vengeance':     { emoji: '⚔️', color: '#7c3aed', bg: '#faf5ff', textColor: '#fff' },
  'special-casino':        { emoji: '🎰', color: '#7c3aed', bg: '#faf5ff', textColor: '#fff' },

  // ── Dos / Caché ───────────────────────────────────────────────────────────────
  'hidden': { emoji: '🃏', color: '#1e293b', bg: '#0f172a', textColor: '#fff' },
}

// ── Résoudre l'asset d'une carte ─────────────────────────────────────────────
export function resolveAsset(card: { category: string; name?: string; salaryLevel?: number; lieu?: string; childName?: string; malusType?: string; specialType?: string; metierEffect?: string; gender?: string }): CardAsset {
  if (card.category === 'hidden') return CARD_ASSETS['hidden']!

  // Études
  if (card.category === 'etude') return CARD_ASSETS[card.name?.includes('double') || card.name?.includes('Double') ? 'etude-double' : 'etude-simple']!

  // Métiers — par metierEffect ou nom normalisé
  if (card.category === 'metier') {
    const key = card.metierEffect ?? card.name?.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z]/g, '-').replace(/-+/g, '-')
    return CARD_ASSETS[key ?? ''] ?? CARD_ASSETS['jardinier']!
  }

  // Salaires
  if (card.category === 'salaire') return CARD_ASSETS[`salaire-${card.salaryLevel ?? 1}`] ?? CARD_ASSETS['salaire-1']!

  // Flirts
  if (card.category === 'flirt') {
    const lieuMap: Record<string, string> = {
      'Au camping': 'camping', 'À l\'hôtel': 'hotel', 'Au Zoo': 'zoo',
      'Sur internet': 'internet', 'Au parc': 'parc', 'En boîte de nuit': 'boite',
      'Au bar': 'bar', 'Au cinéma': 'cinema', 'Au restaurant': 'restaurant', 'Au théâtre': 'theatre',
    }
    const key = lieuMap[card.lieu ?? ''] ?? 'parc'
    return CARD_ASSETS[`flirt-${key}`]!
  }

  // Mariage / Adultère
  if (card.category === 'mariage') return CARD_ASSETS['mariage']!
  if (card.category === 'adultere') return CARD_ASSETS['adultere']!

  // Enfants
  if (card.category === 'enfant') {
    const key = card.childName?.toLowerCase() ?? (card.gender === 'fille' ? 'diana' : 'harry')
    return CARD_ASSETS[`enfant-${key}`] ?? CARD_ASSETS['enfant-harry']!
  }

  // Animaux
  if (card.category === 'animal') {
    const key = card.name?.toLowerCase() ?? 'chat'
    return CARD_ASSETS[`animal-${key}`] ?? CARD_ASSETS['animal-chat']!
  }

  // Voyages
  if (card.category === 'voyage') {
    const key = card.name?.toLowerCase().replace(/\s/g, '-') ?? 'tokyo'
    return CARD_ASSETS[`voyage-${key}`] ?? CARD_ASSETS['voyage-tokyo']!
  }

  // Maisons
  if (card.category === 'maison') {
    const maMap: Record<string, string> = { 'Maison simple': 'simple', 'Maison avec garage': 'garage', 'Villa': 'villa' }
    const key = maMap[card.name ?? ''] ?? 'simple'
    return CARD_ASSETS[`maison-${key}`] ?? CARD_ASSETS['maison-simple']!
  }

  // Malus
  if (card.category === 'malus') return CARD_ASSETS[`malus-${card.malusType}`] ?? CARD_ASSETS['malus-accident']!

  // Spéciales
  if (card.category === 'special') return CARD_ASSETS[`special-${card.specialType}`] ?? CARD_ASSETS['special-casino']!

  return CARD_ASSETS['hidden']!
}
