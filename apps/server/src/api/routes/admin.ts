import { Router } from 'express'
import { prisma } from '../../lib/prisma.js'
import { requireAdmin } from '../middleware/requireAdmin.js'
import { verifyToken } from '../../lib/jwt.js'

// Définition de toutes les cartes SmileLife avec leurs valeurs par défaut
export const SMILELIFE_CARD_DEFAULTS: { cardType: string; label: string; category: string; defaultQty: number }[] = [
  // Études
  { cardType: 'etude-simple',  label: 'Études (Niv.1)',        category: 'Études',   defaultQty: 22 },
  { cardType: 'etude-double',  label: 'Études Double (Niv.2)', category: 'Études',   defaultQty: 3  },
  // Métiers
  { cardType: 'architecte',    label: 'Architecte',            category: 'Métiers',  defaultQty: 1  },
  { cardType: 'astronaute',    label: 'Astronaute',            category: 'Métiers',  defaultQty: 1  },
  { cardType: 'avocat',        label: 'Avocat',                category: 'Métiers',  defaultQty: 1  },
  { cardType: 'bandit',        label: 'Bandit',                category: 'Métiers',  defaultQty: 1  },
  { cardType: 'barman',        label: 'Barman',                category: 'Métiers',  defaultQty: 1  },
  { cardType: 'chef-achats',   label: 'Chef des Achats',       category: 'Métiers',  defaultQty: 1  },
  { cardType: 'chef-ventes',   label: 'Chef des Ventes',       category: 'Métiers',  defaultQty: 1  },
  { cardType: 'chercheur',     label: 'Chercheur',             category: 'Métiers',  defaultQty: 1  },
  { cardType: 'chirurgien',    label: 'Chirurgien',            category: 'Métiers',  defaultQty: 1  },
  { cardType: 'designer',      label: 'Designer',              category: 'Métiers',  defaultQty: 1  },
  { cardType: 'ecrivain',      label: 'Écrivain',              category: 'Métiers',  defaultQty: 1  },
  { cardType: 'garagiste',     label: 'Garagiste',             category: 'Métiers',  defaultQty: 1  },
  { cardType: 'gourou',        label: 'Gourou',                category: 'Métiers',  defaultQty: 1  },
  { cardType: 'grand-prof',    label: 'Grand Prof',            category: 'Métiers',  defaultQty: 1  },
  { cardType: 'jardinier',     label: 'Jardinier',             category: 'Métiers',  defaultQty: 1  },
  { cardType: 'journaliste',   label: 'Journaliste',           category: 'Métiers',  defaultQty: 1  },
  { cardType: 'medecin',       label: 'Médecin',               category: 'Métiers',  defaultQty: 1  },
  { cardType: 'medium',        label: 'Médium',                category: 'Métiers',  defaultQty: 1  },
  { cardType: 'militaire',     label: 'Militaire',             category: 'Métiers',  defaultQty: 1  },
  { cardType: 'pharmacien',    label: 'Pharmacien',            category: 'Métiers',  defaultQty: 1  },
  { cardType: 'pilote',        label: 'Pilote de Ligne',       category: 'Métiers',  defaultQty: 1  },
  { cardType: 'pizzaiolo',     label: 'Pizzaïolo',             category: 'Métiers',  defaultQty: 1  },
  { cardType: 'plombier',      label: 'Plombier',              category: 'Métiers',  defaultQty: 1  },
  { cardType: 'policier',      label: 'Policier',              category: 'Métiers',  defaultQty: 1  },
  { cardType: 'prof-anglais',  label: 'Prof d\'Anglais',       category: 'Métiers',  defaultQty: 1  },
  { cardType: 'prof-francais', label: 'Prof de Français',      category: 'Métiers',  defaultQty: 1  },
  { cardType: 'prof-histoire', label: 'Prof d\'Histoire',      category: 'Métiers',  defaultQty: 1  },
  { cardType: 'prof-maths',    label: 'Prof de Maths',         category: 'Métiers',  defaultQty: 1  },
  { cardType: 'serveur',       label: 'Serveur',               category: 'Métiers',  defaultQty: 1  },
  { cardType: 'stripteaser',   label: 'Stripteaser',           category: 'Métiers',  defaultQty: 1  },
  // Salaires
  { cardType: 'salaire-1',     label: 'Salaire Niv.1',         category: 'Salaires', defaultQty: 10 },
  { cardType: 'salaire-2',     label: 'Salaire Niv.2',         category: 'Salaires', defaultQty: 10 },
  { cardType: 'salaire-3',     label: 'Salaire Niv.3',         category: 'Salaires', defaultQty: 10 },
  { cardType: 'salaire-4',     label: 'Salaire Niv.4',         category: 'Salaires', defaultQty: 10 },
  // Flirts
  { cardType: 'flirt-camping',    label: 'Flirt — Camping',        category: 'Flirts',   defaultQty: 2 },
  { cardType: 'flirt-hotel',      label: 'Flirt — Hôtel',          category: 'Flirts',   defaultQty: 2 },
  { cardType: 'flirt-zoo',        label: 'Flirt — Zoo',            category: 'Flirts',   defaultQty: 2 },
  { cardType: 'flirt-internet',   label: 'Flirt — Internet',       category: 'Flirts',   defaultQty: 2 },
  { cardType: 'flirt-parc',       label: 'Flirt — Parc',           category: 'Flirts',   defaultQty: 2 },
  { cardType: 'flirt-boite',      label: 'Flirt — Boîte de nuit',  category: 'Flirts',   defaultQty: 2 },
  { cardType: 'flirt-bar',        label: 'Flirt — Bar',            category: 'Flirts',   defaultQty: 2 },
  { cardType: 'flirt-cinema',     label: 'Flirt — Cinéma',         category: 'Flirts',   defaultQty: 2 },
  { cardType: 'flirt-restaurant', label: 'Flirt — Restaurant',     category: 'Flirts',   defaultQty: 2 },
  { cardType: 'flirt-theatre',    label: 'Flirt — Théâtre',        category: 'Flirts',   defaultQty: 2 },
  // Perso
  { cardType: 'mariage',       label: 'Mariage',               category: 'Perso',    defaultQty: 6  },
  { cardType: 'adultere',      label: 'Adultère',              category: 'Perso',    defaultQty: 3  },
  { cardType: 'enfant',        label: 'Enfants (total)',        category: 'Perso',    defaultQty: 10 },
  // Animaux
  { cardType: 'animal-chat',      label: 'Chat',               category: 'Animaux',  defaultQty: 1  },
  { cardType: 'animal-chien',     label: 'Chien',              category: 'Animaux',  defaultQty: 1  },
  { cardType: 'animal-lapin',     label: 'Lapin',              category: 'Animaux',  defaultQty: 1  },
  { cardType: 'animal-perroquet', label: 'Perroquet',          category: 'Animaux',  defaultQty: 1  },
  { cardType: 'animal-hamster',   label: 'Hamster',            category: 'Animaux',  defaultQty: 1  },
  // Voyages
  { cardType: 'voyage-new-york',  label: 'Voyage — New York',  category: 'Voyages',  defaultQty: 1  },
  { cardType: 'voyage-tokyo',     label: 'Voyage — Tokyo',     category: 'Voyages',  defaultQty: 1  },
  { cardType: 'voyage-bali',      label: 'Voyage — Bali',      category: 'Voyages',  defaultQty: 1  },
  { cardType: 'voyage-maldives',  label: 'Voyage — Maldives',  category: 'Voyages',  defaultQty: 1  },
  { cardType: 'voyage-patagonie', label: 'Voyage — Patagonie', category: 'Voyages',  defaultQty: 1  },
  // Maisons
  { cardType: 'maison-simple',    label: 'Maison simple',      category: 'Maisons',  defaultQty: 2  },
  { cardType: 'maison-garage',    label: 'Maison avec garage', category: 'Maisons',  defaultQty: 2  },
  { cardType: 'maison-villa',     label: 'Villa',              category: 'Maisons',  defaultQty: 1  },
  // Malus
  { cardType: 'malus-accident',     label: 'Accident',     category: 'Malus', defaultQty: 5 },
  { cardType: 'malus-burnout',      label: 'Burn-out',     category: 'Malus', defaultQty: 5 },
  { cardType: 'malus-divorce',      label: 'Divorce',      category: 'Malus', defaultQty: 5 },
  { cardType: 'malus-impot',        label: 'Impôt',        category: 'Malus', defaultQty: 5 },
  { cardType: 'malus-licenciement', label: 'Licenciement', category: 'Malus', defaultQty: 5 },
  { cardType: 'malus-maladie',      label: 'Maladie',      category: 'Malus', defaultQty: 5 },
  { cardType: 'malus-redoublement', label: 'Redoublement', category: 'Malus', defaultQty: 5 },
  { cardType: 'malus-prison',       label: 'Prison',       category: 'Malus', defaultQty: 1 },
  { cardType: 'malus-attentat',     label: 'Attentat',     category: 'Malus', defaultQty: 1 },
  // Spéciales
  { cardType: 'special-anniversaire',   label: 'Anniversaire',   category: 'Spéciales', defaultQty: 1 },
  { cardType: 'special-arc-en-ciel',    label: 'Arc-en-ciel',    category: 'Spéciales', defaultQty: 1 },
  { cardType: 'special-chance',         label: 'Chance',         category: 'Spéciales', defaultQty: 1 },
  { cardType: 'special-etoile-filante', label: 'Étoile Filante', category: 'Spéciales', defaultQty: 1 },
  { cardType: 'special-heritage',       label: 'Héritage',       category: 'Spéciales', defaultQty: 1 },
  { cardType: 'special-piston',         label: 'Piston',         category: 'Spéciales', defaultQty: 1 },
  { cardType: 'special-troc',           label: 'Troc',           category: 'Spéciales', defaultQty: 1 },
  { cardType: 'special-tsunami',        label: 'Tsunami',        category: 'Spéciales', defaultQty: 1 },
  { cardType: 'special-vengeance',      label: 'Vengeance',      category: 'Spéciales', defaultQty: 1 },
  { cardType: 'special-casino',         label: 'Casino',         category: 'Spéciales', defaultQty: 1 },
]

const router = Router()

function authMiddleware(req: any, res: any, next: any) {
  const auth = req.headers.authorization
  if (!auth?.startsWith('Bearer ')) return res.status(401).json({ error: 'Non authentifié' })
  try {
    const payload = verifyToken(auth.slice(7))
    req.userId = (payload as any).userId
    next()
  } catch {
    res.status(401).json({ error: 'Token invalide' })
  }
}

// ── GET /api/admin/smilelife/cards ────────────────────────────────────────────
router.get('/smilelife/cards', authMiddleware, requireAdmin, async (req, res) => {
  try {
    // Récupérer les configs existantes en base
    const configs = await prisma.cardConfig.findMany({ where: { gameId: 'smilelife' } })
    const configMap = new Map(configs.map(c => [c.cardType, c]))

    // Merger avec les valeurs par défaut
    const cards = SMILELIFE_CARD_DEFAULTS.map(def => {
      const config = configMap.get(def.cardType)
      return {
        cardType: def.cardType,
        label: def.label,
        category: def.category,
        defaultQty: def.defaultQty,
        enabled: config?.enabled ?? true,
        quantity: config?.quantity ?? def.defaultQty,
      }
    })

    res.json({ cards })
  } catch (e) {
    res.status(500).json({ error: 'Erreur serveur' })
  }
})

// ── PUT /api/admin/smilelife/cards ────────────────────────────────────────────
router.put('/smilelife/cards', authMiddleware, requireAdmin, async (req, res) => {
  try {
    const { cards } = req.body as { cards: { cardType: string; enabled: boolean; quantity: number }[] }
    if (!Array.isArray(cards)) return res.status(400).json({ error: 'Format invalide' })

    // Upsert chaque carte
    await Promise.all(cards.map(c =>
      prisma.cardConfig.upsert({
        where: { gameId_cardType: { gameId: 'smilelife', cardType: c.cardType } },
        update: { enabled: c.enabled, quantity: c.quantity },
        create: { gameId: 'smilelife', cardType: c.cardType, enabled: c.enabled, quantity: c.quantity },
      })
    ))

    res.json({ ok: true })
  } catch (e) {
    res.status(500).json({ error: 'Erreur serveur' })
  }
})

// ── GET /api/admin/users ──────────────────────────────────────────────────────
router.get('/users', authMiddleware, requireAdmin, async (req, res) => {
  try {
    const users = await prisma.user.findMany({
      select: { id: true, username: true, email: true, role: true, createdAt: true, level: true },
      orderBy: { createdAt: 'desc' },
    })
    res.json({ users })
  } catch (e) {
    res.status(500).json({ error: 'Erreur serveur' })
  }
})

export { router as adminRouter }
