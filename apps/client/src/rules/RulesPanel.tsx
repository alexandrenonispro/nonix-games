import { useState } from 'react'
import styles from './RulesPanel.module.css'

// ─── Données simplifiées par jeu ──────────────────────────────────────────────

interface RuleSection {
  title: string
  content: React.ReactNode
}

function Li({ children }: { children: React.ReactNode }) {
  return <li className={styles.li}>{children}</li>
}

function Tag({ color, children }: { color: string; children: React.ReactNode }) {
  return <span className={styles.tag} style={{ background: color }}>{children}</span>
}

const DRAWNIX_SECTIONS: RuleSection[] = [
  {
    title: '🎯 But du jeu',
    content: <p>Un joueur dessine un mot secret, les autres doivent le deviner. Plus tu devines vite, plus tu marques de points !</p>,
  },
  {
    title: '🔄 Déroulement d\'un tour',
    content: (
      <ol className={styles.ol}>
        <li>Le <strong>dessinateur</strong> choisit un mot parmi 3 proposés</li>
        <li>Il dessine pendant le <strong>temps imparti</strong></li>
        <li>Les autres <strong>tapent leurs propositions</strong> dans le chat</li>
        <li>Points selon la rapidité à deviner</li>
      </ol>
    ),
  },
  {
    title: '🏆 Points',
    content: (
      <ul className={styles.ul}>
        <Li>Plus tu devines <strong>tôt</strong> → plus de points</Li>
        <Li>Dessinateur : points pour chaque devineur</Li>
        <Li>Personne ne trouve = <strong>0 point</strong> pour le dessinateur</Li>
      </ul>
    ),
  },
]

const SMILELIFE_SECTIONS: RuleSection[] = [
  {
    title: '🎯 But du jeu',
    content: <p>Construis ta vie en posant des cartes sur ton plateau. Le joueur avec le plus de <strong>😊 smiles</strong> quand la pioche est vide gagne !</p>,
  },
  {
    title: '🔄 Tour de jeu',
    content: (
      <ol className={styles.ol}>
        <li><strong>Piocher</strong> 1 carte (ou prendre la défausse si jouable)</li>
        <li><strong>Jouer</strong> 1 carte, infliger un malus, ou défausser</li>
        <li>Le tour passe automatiquement à 5 cartes (6 pour Chercheur)</li>
      </ol>
    ),
  },
  {
    title: '🎓 Études & Métiers',
    content: (
      <ul className={styles.ul}>
        <Li>Les études (max 6 niveaux) débloquent des métiers</Li>
        <Li>Le métier détermine le <strong>niveau de salaire max</strong></Li>
        <Li>1 seul métier à la fois — démission nécessaire</Li>
        <Li>Fonctionnaires : insensibles au licenciement</Li>
        <Li>Intérimaires : peuvent démissionner sans passer leur tour</Li>
      </ul>
    ),
  },
  {
    title: '💕 Vie personnelle',
    content: (
      <ul className={styles.ul}>
        <Li><strong>Flirts</strong> : max 5 avant mariage (illimité pour Barman)</Li>
        <Li><strong>Mariage</strong> : requiert 1 flirt — maisons à moitié prix</Li>
        <Li><strong>Enfants</strong> : nécessite le mariage ou flirt camping/hôtel</Li>
        <Li><strong>Adultère</strong> : permet de flirter en étant marié</Li>
        <Li>Flirt camping/hôtel = 1 enfant possible sans mariage</Li>
      </ul>
    ),
  },
  {
    title: '🏠 Acquisitions',
    content: (
      <ul className={styles.ul}>
        <Li>Maison simple : 6 liasses (3 si marié) · 1 smile</Li>
        <Li>Maison avec garage : 8 liasses (4 si marié) · 2 smiles</Li>
        <Li>Villa : 10 liasses (5 si marié) · 3 smiles</Li>
        <Li>Voyages : 3 liasses · 3 smiles (gratuit pour Pilote)</Li>
        <Li>Animaux : gratuits · 1 smile</Li>
      </ul>
    ),
  },
  {
    title: '💥 Malus & Immunités',
    content: (
      <ul className={styles.ul}>
        <Li><strong>Accident / Maladie / Burn-out</strong> → passe 1 tour</Li>
        <Li><strong>Licenciement</strong> → perd son métier (salaires conservés)</Li>
        <Li><strong>Impôt</strong> → perd 1 salaire (doit travailler)</Li>
        <Li><strong>Divorce</strong> → perd mariage (+ adultère si en cours)</Li>
        <Li><strong>Prison</strong> → 3 tours bloqué (Bandit uniquement)</Li>
        <Li><strong>Attentat</strong> → tous les enfants éliminés</Li>
        <Li className={styles.liImmune}>🔧 Garagiste = immunisé accident</Li>
        <Li className={styles.liImmune}>⚖️ Avocat = immunisé divorce</Li>
        <Li className={styles.liImmune}>🔬 Chirurgien/Médecin/Pharmacien = immunisé maladie</Li>
        <Li className={styles.liImmune}>🦹 Bandit = immunisé licenciement & impôt</Li>
        <Li className={styles.liImmune}>🪖 Militaire = bloque l'Attentat</Li>
      </ul>
    ),
  },
  {
    title: '⭐ Cartes Spéciales',
    content: (
      <ul className={styles.ul}>
        <Li><strong>Arc-en-ciel</strong> : jouer 3 cartes d'affilée puis repiocher</Li>
        <Li><strong>Chance</strong> : piocher 3, garder 1 et la jouer directement</Li>
        <Li><strong>Étoile filante</strong> : choisir une carte dans la défausse</Li>
        <Li><strong>Héritage</strong> : 3 liasses supplémentaires</Li>
        <Li><strong>Piston</strong> : poser un métier sans conditions d'études</Li>
        <Li><strong>Troc</strong> : échange aléatoire avec un adversaire</Li>
        <Li><strong>Tsunami</strong> : toutes les mains redistribuées</Li>
        <Li><strong>Vengeance</strong> : renvoyer un malus reçu</Li>
        <Li><strong>Anniversaire</strong> : chaque adversaire vous donne un salaire</Li>
        <Li><strong>Casino</strong> : miser un salaire, égalité = adversaire gagne</Li>
      </ul>
    ),
  },
]


const UNDERCOVER_SECTIONS: RuleSection[] = [
  {
    title: '🎯 But du jeu',
    content: <p>Trouvez les infiltrés avant d'être mis en minorité. Civils, Undercovers et Mr. White ont chacun leur stratégie !</p>,
  },
  {
    title: '👥 Les rôles',
    content: (
      <ul className={styles.ul}>
        <Li><strong style={{ color: '#16a34a' }}>👤 Civil</strong> : reçoit le mot A, doit éliminer les infiltrés</Li>
        <Li><strong style={{ color: '#dc2626' }}>🕵️ Undercover</strong> : reçoit le mot B (proche), doit survivre</Li>
        <Li><strong style={{ color: '#7c3aed' }}>👻 Mr. White</strong> : aucun mot, doit bluffer</Li>
      </ul>
    ),
  },
  {
    title: '🔄 Déroulement',
    content: (
      <ol className={styles.ol}>
        <li><strong>Description</strong> — chacun décrit son mot en 1-3 mots</li>
        <li><strong>Discussion</strong> — 2min pour débattre</li>
        <li><strong>Vote</strong> — le plus voté est éliminé</li>
        <li>Répéter jusqu'à la victoire d'un camp</li>
      </ol>
    ),
  },
  {
    title: '👻 Mr. White éliminé',
    content: (
      <ul className={styles.ul}>
        <Li>Peut tenter de <strong>deviner le mot des civils</strong></Li>
        <Li>Bonne réponse = <strong>victoire immédiate</strong></Li>
        <Li>Mauvaise réponse = la partie continue</Li>
      </ul>
    ),
  },
  {
    title: '🏆 Victoires',
    content: (
      <ul className={styles.ul}>
        <Li><strong>Civils</strong> : éliminent tous les infiltrés</Li>
        <Li><strong>Undercovers</strong> : survivent jusqu'à 1 seul civil restant</Li>
        <Li><strong>Mr. White</strong> : survit, OU devine le bon mot</Li>
      </ul>
    ),
  },
]

const RULES: Record<string, { title: string; emoji: string; sections: RuleSection[] }> = {
  drawnix:   { title: 'Drawnix',    emoji: '🎨', sections: DRAWNIX_SECTIONS },
  skribble:  { title: 'Drawnix',    emoji: '🎨', sections: DRAWNIX_SECTIONS },
  smilelife:  { title: 'Smile Life', emoji: '😊', sections: SMILELIFE_SECTIONS },
  undercover: { title: 'Undercover',  emoji: '🕵️', sections: UNDERCOVER_SECTIONS },
}

// ─── Composant ────────────────────────────────────────────────────────────────

export function RulesPanel({ gameId }: { gameId: string }) {
  const game = RULES[gameId]
  const [open, setOpen] = useState<Set<string>>(new Set([RULES[gameId]?.sections[0]?.title ?? '']))

  if (!game) {
    return (
      <div className={styles.panel}>
        <div className={styles.header}>
          <span className={styles.headerTitle}>📖 Règles</span>
        </div>
        <div className={styles.empty}>Aucune règle disponible pour ce jeu.</div>
      </div>
    )
  }

  const toggle = (title: string) => {
    setOpen(prev => {
      const next = new Set(prev)
      if (next.has(title)) next.delete(title)
      else next.add(title)
      return next
    })
  }

  return (
    <div className={styles.panel}>
      <div className={styles.header}>
        <span className={styles.headerEmoji}>{game.emoji}</span>
        <span className={styles.headerTitle}>Règles · {game.title}</span>
      </div>
      <div className={styles.sections}>
        {game.sections.map(s => (
          <div key={s.title} className={styles.section}>
            <button
              className={`${styles.sectionBtn} ${open.has(s.title) ? styles.sectionBtnOpen : ''}`}
              onClick={() => toggle(s.title)}
            >
              <span>{s.title}</span>
              <span className={styles.sectionIcon}>{open.has(s.title) ? '−' : '+'}</span>
            </button>
            {open.has(s.title) && (
              <div className={styles.sectionContent}>{s.content}</div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
