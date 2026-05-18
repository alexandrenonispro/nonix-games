import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import styles from './RulesPage.module.css'

// ─── Types ────────────────────────────────────────────────────────────────────

interface Section {
  id: string
  title: string
  content: React.ReactNode
}

interface Game {
  id: string
  name: string
  emoji: string
  tagline: string
  sections: Section[]
}

// ─── Composants utilitaires ───────────────────────────────────────────────────

function Rule({ children }: { children: React.ReactNode }) {
  return <li className={styles.rule}>{children}</li>
}

function Tag({ color, children }: { color: string; children: React.ReactNode }) {
  return <span className={styles.tag} style={{ background: color }}>{children}</span>
}

function CardRow({ name, tags, desc }: { name: string; tags: { label: string; color: string }[]; desc: string }) {
  return (
    <div className={styles.cardRow}>
      <div className={styles.cardRowLeft}>
        <span className={styles.cardRowName}>{name}</span>
        <div className={styles.cardRowTags}>
          {tags.map((t, i) => <Tag key={i} color={t.color}>{t.label}</Tag>)}
        </div>
      </div>
      <p className={styles.cardRowDesc}>{desc}</p>
    </div>
  )
}

function Accordion({ title, children }: { title: string; children: React.ReactNode }) {
  const [open, setOpen] = useState(false)
  return (
    <div className={`${styles.accordion} ${open ? styles.accordionOpen : ''}`}>
      <button className={styles.accordionBtn} onClick={() => setOpen(!open)}>
        <span>{title}</span>
        <span className={styles.accordionIcon}>{open ? '−' : '+'}</span>
      </button>
      {open && <div className={styles.accordionContent}>{children}</div>}
    </div>
  )
}

// ─── Données des jeux ─────────────────────────────────────────────────────────

const GAMES: Game[] = [
  {
    id: 'drawnix',
    name: 'Drawnix',
    emoji: '🎨',
    tagline: 'Dessine, fais deviner, marque des points !',
    sections: [
      {
        id: 'drawnix-but',
        title: 'But du jeu',
        content: (
          <p>Un joueur dessine un mot secret, les autres doivent le deviner le plus vite possible. Plus tu devines vite, plus tu marques de points. À la fin des manches, le joueur avec le plus de points gagne !</p>
        ),
      },
      {
        id: 'drawnix-tour',
        title: 'Déroulement d\'un tour',
        content: (
          <ol className={styles.orderedList}>
            <li>Le <strong>dessinateur</strong> reçoit un mot secret (choix parmi 3 mots proposés).</li>
            <li>Il dispose d'un <strong>temps limité</strong> pour le dessiner sur le canvas partagé.</li>
            <li>Les <strong>devineurs</strong> tapent leurs propositions dans le chat en temps réel.</li>
            <li>Quand un joueur trouve le mot, il gagne des points selon sa rapidité.</li>
            <li>Le dessinateur gagne aussi des points pour chaque joueur qui a trouvé.</li>
            <li>À la fin du temps, le mot est révélé et le tour suivant commence.</li>
          </ol>
        ),
      },
      {
        id: 'drawnix-points',
        title: 'Calcul des points',
        content: (
          <>
            <ul className={styles.ruleList}>
              <Rule>Plus tu devines <strong>tôt</strong>, plus tu gagnes de points.</Rule>
              <Rule>Le dessinateur gagne des points pour <strong>chaque devineur</strong> qui trouve.</Rule>
              <Rule>Si personne ne trouve, le dessinateur ne gagne <strong>rien</strong>.</Rule>
              <Rule>Le jeu se joue sur <strong>plusieurs manches</strong>, chaque joueur dessine à son tour.</Rule>
            </ul>
          </>
        ),
      },
      {
        id: 'drawnix-outils',
        title: 'Outils de dessin',
        content: (
          <ul className={styles.ruleList}>
            <Rule>Pinceau avec taille réglable</Rule>
            <Rule>Gomme</Rule>
            <Rule>Remplissage (pot de peinture)</Rule>
            <Rule>Palette de couleurs complète</Rule>
            <Rule>Annuler (Undo)</Rule>
            <Rule>Effacer tout le canvas</Rule>
          </ul>
        ),
      },
    ],
  },
  {
    id: 'smilelife',
    name: 'Smile Life',
    emoji: '😊',
    tagline: 'Construis ta vie, accumule des smiles, sois le plus heureux !',
    sections: [
      {
        id: 'sl-but',
        title: 'But du jeu',
        content: (
          <p>Smile Life est un jeu de cartes multijoueur où tu construis ta vie : études, métier, salaires, famille, maison, voyages... Chaque carte posée sur ton plateau rapporte des <strong>😊 smiles</strong>. Le joueur avec le plus de smiles quand la pioche est vide remporte la partie !</p>
        ),
      },
      {
        id: 'sl-tour',
        title: 'Déroulement d\'un tour',
        content: (
          <>
            <p className={styles.sectionIntro}>À chaque tour, le joueur actif effectue dans l'ordre :</p>
            <ol className={styles.orderedList}>
              <li><strong>Piocher</strong> — Prend 1 carte depuis la pioche (ou la défausse si 3+ joueurs et si la carte est immédiatement jouable).</li>
              <li><strong>Jouer ou défausser</strong> — Joue 1 carte devant lui, inflige un malus à un adversaire, ou défausse 1 carte.</li>
              <li><strong>Fin de tour automatique</strong> — Quand la main revient à 5 cartes (ou 6 pour le Chercheur), le tour passe au suivant.</li>
            </ol>
            <div className={styles.infoBox}>
              💡 Il est aussi possible de <strong>démissionner</strong> ou <strong>divorcer volontairement</strong> avant de piocher, ce qui passe votre tour.
            </div>
          </>
        ),
      },
      {
        id: 'sl-cartes-etudes',
        title: 'Cartes Études',
        content: (
          <>
            <p className={styles.sectionIntro}>Les études permettent de débloquer des métiers plus lucratifs. Maximum <strong>6 niveaux</strong>.</p>
            <div className={styles.cardRowList}>
              <CardRow name="Études (simple)" tags={[{ label: '1 smile', color: '#3b82f6' }, { label: '+1 niveau', color: '#1d4ed8' }]} desc="Ajoute 1 niveau d'études à votre compteur." />
              <CardRow name="Études (double)" tags={[{ label: '1 smile', color: '#3b82f6' }, { label: '+2 niveaux', color: '#1d4ed8' }]} desc="Ajoute 2 niveaux d'un coup — très efficace !" />
            </div>
          </>
        ),
      },
      {
        id: 'sl-cartes-metiers',
        title: 'Cartes Métiers',
        content: (
          <>
            <p className={styles.sectionIntro}>Le métier détermine le niveau de salaire que vous pouvez encaisser. Chaque métier a un niveau d'études requis et un salaire maximum.</p>
            <ul className={styles.ruleList}>
              <Rule>Vous ne pouvez avoir qu'<strong>un seul métier</strong> à la fois.</Rule>
              <Rule>Pour changer de métier, vous devez d'abord <strong>démissionner</strong> (passe votre tour si non-intérimaire).</Rule>
              <Rule>Les <strong>intérimaires</strong> peuvent démissionner sans passer leur tour.</Rule>
              <Rule>Les <strong>fonctionnaires</strong> ne peuvent pas être licenciés.</Rule>
            </ul>
            <div className={styles.metierGrid}>
              {[
                { name: 'Architecte', etudes: 4, salaire: 3, statut: null, effet: null },
                { name: 'Astronaute', etudes: 6, salaire: 6, statut: null, effet: 'Choisit 1 carte dans la défausse à jouer directement' },
                { name: 'Avocat', etudes: 4, salaire: 3, statut: null, effet: 'Immunisé contre le divorce forcé' },
                { name: 'Bandit', etudes: 0, salaire: 2, statut: null, effet: 'Immunisé licenciement & impôt. Risque la prison' },
                { name: 'Barman', etudes: 0, salaire: 1, statut: 'intérimaire', effet: 'Flirts illimités avant mariage' },
                { name: 'Chef des Achats', etudes: 3, salaire: 3, statut: null, effet: null },
                { name: 'Chef des Ventes', etudes: 3, salaire: 3, statut: null, effet: null },
                { name: 'Chercheur', etudes: 5, salaire: 3, statut: null, effet: 'Main de 6 cartes, pioche 1 bonus à la prise de poste' },
                { name: 'Chirurgien', etudes: 6, salaire: 4, statut: null, effet: 'Immunisé maladie, peut continuer ses études' },
                { name: 'Designer', etudes: 4, salaire: 3, statut: null, effet: null },
                { name: 'Écrivain', etudes: 3, salaire: 2, statut: null, effet: null },
                { name: 'Garagiste', etudes: 1, salaire: 2, statut: null, effet: 'Immunisé accident' },
                { name: 'Gourou', etudes: 0, salaire: 3, statut: null, effet: 'Retiré par le Policier' },
                { name: 'Grand Prof', etudes: 2, salaire: 3, statut: 'fonctionnaire', effet: 'Upgrade un métier Prof sans démissionner' },
                { name: 'Jardinier', etudes: 1, salaire: 1, statut: 'intérimaire', effet: null },
                { name: 'Journaliste', etudes: 3, salaire: 2, statut: null, effet: 'Peut voir la main d\'un adversaire' },
                { name: 'Médecin', etudes: 6, salaire: 4, statut: null, effet: 'Immunisé maladie, peut continuer ses études' },
                { name: 'Médium', etudes: 0, salaire: 1, statut: null, effet: 'Voit les 13 prochaines cartes de la pioche' },
                { name: 'Militaire', etudes: 0, salaire: 1, statut: 'fonctionnaire', effet: 'Bloque les cartes Attentat' },
                { name: 'Pharmacien', etudes: 5, salaire: 3, statut: null, effet: 'Immunisé maladie' },
                { name: 'Pilote de Ligne', etudes: 5, salaire: 4, statut: null, effet: 'Voyages gratuits depuis la main' },
                { name: 'Pizzaïolo', etudes: 0, salaire: 1, statut: 'intérimaire', effet: null },
                { name: 'Plombier', etudes: 1, salaire: 2, statut: 'intérimaire', effet: null },
                { name: 'Policier', etudes: 1, salaire: 1, statut: 'fonctionnaire', effet: 'Retire Bandit & Gourou de la table' },
                { name: 'Prof d\'Anglais / Français / Histoire / Maths', etudes: 2, salaire: 2, statut: 'fonctionnaire', effet: 'Upgradable en Grand Prof' },
                { name: 'Serveur', etudes: 0, salaire: 1, statut: 'intérimaire', effet: null },
                { name: 'Stripteaser', etudes: 0, salaire: 1, statut: 'intérimaire', effet: null },
              ].map((m, i) => (
                <div key={i} className={styles.metierCard}>
                  <div className={styles.metierName}>{m.name}</div>
                  <div className={styles.metierStats}>
                    <span>🎓 ×{m.etudes}</span>
                    <span>💵 max niv.{m.salaire}</span>
                    {m.statut && <Tag color={m.statut === 'fonctionnaire' ? '#1d4ed8' : '#6b7280'}>{m.statut}</Tag>}
                  </div>
                  {m.effet && <div className={styles.metierEffet}>{m.effet}</div>}
                </div>
              ))}
            </div>
          </>
        ),
      },
      {
        id: 'sl-salaires',
        title: 'Cartes Salaires',
        content: (
          <>
            <p className={styles.sectionIntro}>Les salaires représentent des liasses de billets utilisables pour acheter des maisons et voyages.</p>
            <ul className={styles.ruleList}>
              <Rule>4 niveaux : Niv.1 (1 liasse), Niv.2 (2 liasses), Niv.3 (3 liasses), Niv.4 (4 liasses).</Rule>
              <Rule>Votre métier détermine le <strong>niveau maximum</strong> de salaire que vous pouvez encaisser.</Rule>
              <Rule>Les salaires sont <strong>conservés</strong> en cas de démission ou licenciement.</Rule>
              <Rule>Pour acheter, les salaires sont <strong>retournés</strong> (investis) — le système consomme les cartes de plus haute valeur en premier pour minimiser le nombre de cartes utilisées.</Rule>
            </ul>
          </>
        ),
      },
      {
        id: 'sl-vie-perso',
        title: 'Vie personnelle (Flirts, Mariage, Enfants, Adultère)',
        content: (
          <>
            <Accordion title="💕 Flirts">
              <ul className={styles.ruleList}>
                <Rule>Maximum <strong>5 flirts</strong> officiels avant mariage (illimité pour le Barman).</Rule>
                <Rule>Les flirts au <strong>camping ou à l'hôtel</strong> permettent d'avoir 1 enfant avant mariage.</Rule>
                <Rule>Si vous posez un flirt au même lieu qu'un adversaire, vous lui <strong>volez</strong> son flirt.</Rule>
                <Rule>Si vous êtes marié(e), il faut d'abord jouer un Adultère pour flirter à nouveau.</Rule>
              </ul>
            </Accordion>
            <Accordion title="💍 Mariage">
              <ul className={styles.ruleList}>
                <Rule>Requiert au moins <strong>1 flirt</strong> posé.</Rule>
                <Rule>Les maisons coûtent <strong>moitié prix</strong> (prix spécial marié).</Rule>
                <Rule>Permet d'avoir des enfants sans limite.</Rule>
                <Rule>Les flirts futurs nécessitent un Adultère.</Rule>
              </ul>
            </Accordion>
            <Accordion title="👶 Enfants">
              <ul className={styles.ruleList}>
                <Rule>Requiert d'être <strong>marié(e)</strong>, OU d'avoir un flirt camping/hôtel (1 enfant max sans mariage).</Rule>
                <Rule>En cas d'adultère, les enfants sont rattachés à l'adultère.</Rule>
                <Rule>Les enfants sont vulnérables à la carte <strong>Attentat</strong>.</Rule>
                <Rule>En cas de divorce forcé, les enfants issus de l'adultère sont perdus, les autres restent.</Rule>
              </ul>
            </Accordion>
            <Accordion title="🙊 Adultère">
              <ul className={styles.ruleList}>
                <Rule>Requiert d'être <strong>marié(e)</strong>.</Rule>
                <Rule>Un seul adultère à la fois.</Rule>
                <Rule>Permet de flirter à nouveau malgré le mariage.</Rule>
                <Rule>En cas de divorce forcé : perd l'adultère, les flirts d'adultère et les enfants d'adultère.</Rule>
                <Rule>Les flirts officiels (avant mariage) sont <strong>toujours conservés</strong>.</Rule>
              </ul>
            </Accordion>
          </>
        ),
      },
      {
        id: 'sl-acquisitions',
        title: 'Acquisitions (Maisons, Voyages, Animaux)',
        content: (
          <>
            <Accordion title="🏠 Maisons">
              <div className={styles.cardRowList}>
                <CardRow name="Maison simple" tags={[{ label: '1 smile', color: '#ea580c' }, { label: '6 liasses', color: '#c2410c' }, { label: '3 si marié', color: '#9a3412' }]} desc="La plus accessible. ×2 exemplaires." />
                <CardRow name="Maison avec garage" tags={[{ label: '2 smiles', color: '#ea580c' }, { label: '8 liasses', color: '#c2410c' }, { label: '4 si marié', color: '#9a3412' }]} desc="Avec stationnement assuré. ×2 exemplaires." />
                <CardRow name="Villa" tags={[{ label: '3 smiles', color: '#ea580c' }, { label: '10 liasses', color: '#c2410c' }, { label: '5 si marié', color: '#9a3412' }]} desc="Le summum du luxe. ×1 exemplaire." />
              </div>
            </Accordion>
            <Accordion title="✈️ Voyages">
              <p>5 destinations disponibles (New York, Tokyo, Bali, Maldives, Patagonie). Chaque voyage coûte <strong>3 liasses</strong> et rapporte <strong>3 smiles</strong>. Le Pilote peut jouer ses voyages gratuitement depuis sa main.</p>
            </Accordion>
            <Accordion title="🐾 Animaux">
              <p>5 animaux disponibles (Chat, Chien, Lapin, Perroquet, Hamster). Tous <strong>gratuits</strong> (0 liasse) et rapportent <strong>1 smile</strong>. Jouables à tout moment.</p>
            </Accordion>
          </>
        ),
      },
      {
        id: 'sl-malus',
        title: 'Cartes Malus',
        content: (
          <>
            <p className={styles.sectionIntro}>Les malus s'infligent à un adversaire à la place de jouer une carte devant soi.</p>
            <div className={styles.cardRowList}>
              <CardRow name="🚗 Accident" tags={[{ label: 'passe 1 tour', color: '#dc2626' }]} desc="La cible passe son prochain tour. Immunisé : Garagiste." />
              <CardRow name="😩 Burn-out" tags={[{ label: 'passe 1 tour', color: '#dc2626' }]} desc="La cible passe son tour. Requiert que la cible ait un métier." />
              <CardRow name="💔 Divorce" tags={[{ label: 'perd mariage', color: '#dc2626' }]} desc="La cible perd son mariage. Si adultère : perd aussi flirts & enfants d'adultère. Les flirts officiels restent. Requiert que la cible soit mariée. Immunisé : Avocat." />
              <CardRow name="🏛️ Impôt" tags={[{ label: 'perd 1 salaire', color: '#dc2626' }]} desc="Supprime le dernier salaire non investi. Requiert que la cible travaille et ait au moins 1 salaire. Immunisé : Bandit." />
              <CardRow name="📋 Licenciement" tags={[{ label: 'perd métier', color: '#dc2626' }]} desc="La cible perd son métier (conserve ses salaires). Immunisé : fonctionnaires, Bandit." />
              <CardRow name="🤒 Maladie" tags={[{ label: 'passe 1 tour', color: '#dc2626' }]} desc="La cible passe son tour. Immunisé : Chirurgien, Médecin, Pharmacien." />
              <CardRow name="📚 Redoublement" tags={[{ label: 'perd 1 étude', color: '#dc2626' }]} desc="Supprime la dernière carte études. Requiert que la cible soit étudiante (études posées)." />
              <CardRow name="🔒 Prison" tags={[{ label: '3 tours bloqué', color: '#dc2626' }]} desc="La cible est bloquée 3 tours et perd son métier Bandit à la sortie. Uniquement jouable sur le Bandit." />
              <CardRow name="💣 Attentat" tags={[{ label: 'tous les enfants', color: '#7f1d1d' }]} desc="Tous les enfants de tous les joueurs sont éliminés. Requiert au moins 1 enfant en jeu. Bloqué si un Militaire est en jeu." />
            </div>
          </>
        ),
      },
      {
        id: 'sl-speciales',
        title: 'Cartes Spéciales',
        content: (
          <div className={styles.cardRowList}>
            <CardRow name="🎂 Anniversaire" tags={[{ label: 'spéciale', color: '#7c3aed' }]} desc="Chaque adversaire vous offre un de ses salaires (s'il en a)." />
            <CardRow name="🌈 Arc-en-ciel" tags={[{ label: 'spéciale', color: '#7c3aed' }]} desc="Jouez jusqu'à 3 cartes d'affilée (jouer, malus ou défausser). Puis repioche jusqu'à 5 cartes." />
            <CardRow name="🍀 Chance" tags={[{ label: 'spéciale', color: '#7c3aed' }]} desc="Piochez 3 cartes, gardez-en 1 et jouez-la directement (si jouable). Les 2 autres sont défaussées." />
            <CardRow name="⭐ Étoile Filante" tags={[{ label: 'spéciale', color: '#7c3aed' }]} desc="Choisissez une carte dans la défausse et jouez-la directement (si jouable)." />
            <CardRow name="💰 Héritage" tags={[{ label: '1 smile', color: '#7c3aed' }]} desc="Recevez 3 liasses d'héritage utilisables pour vos achats (consommées entièrement)." />
            <CardRow name="⚙️ Piston" tags={[{ label: 'spéciale', color: '#7c3aed' }]} desc="Jouez un métier de votre main sans condition d'études. Repioche puis passe votre tour." />
            <CardRow name="🔄 Troc" tags={[{ label: 'spéciale', color: '#7c3aed' }]} desc="Échangez une carte aléatoire avec un adversaire de votre choix." />
            <CardRow name="🌊 Tsunami" tags={[{ label: 'spéciale', color: '#7c3aed' }]} desc="Toutes les mains de tous les joueurs sont mélangées et redistribuées aléatoirement." />
            <CardRow name="⚔️ Vengeance" tags={[{ label: 'spéciale', color: '#7c3aed' }]} desc="Renvoyez un de vos malus reçus à un adversaire (vérification des immunités). L'Attentat ne peut pas être renvoyé. Jouable uniquement si vous avez un malus applicable." />
            <CardRow name="🎰 Casino" tags={[{ label: '1 smile', color: '#7c3aed' }]} desc="Défiez un adversaire : vous misez chacun un salaire de votre main. Si niveaux égaux : l'adversaire gagne les deux. Sinon, vous gagnez les deux. Les deux joueurs repiochent ensuite 1 carte." />
          </div>
        ),
      },
      {
        id: 'sl-prison',
        title: 'Prison & Tours à passer',
        content: (
          <ul className={styles.ruleList}>
            <Rule>Certains malus (Accident, Maladie, Burn-out) font <strong>passer 1 tour</strong>. Un bouton apparaît pour confirmer.</Rule>
            <Rule>La <strong>Prison</strong> dure 3 tours. Le joueur passe chaque tour en cliquant le bouton correspondant.</Rule>
            <Rule>À la sortie de prison, le Bandit <strong>perd son métier</strong>.</Rule>
          </ul>
        ),
      },
      {
        id: 'sl-immunites',
        title: 'Tableau des immunités',
        content: (
          <div className={styles.immuniteTable}>
            <div className={styles.immuniteRow}>
              <span className={styles.immuniteMetier}>🔧 Garagiste</span>
              <span className={styles.immuniteDesc}>Immunisé contre les Accidents</span>
            </div>
            <div className={styles.immuniteRow}>
              <span className={styles.immuniteMetier}>⚖️ Avocat</span>
              <span className={styles.immuniteDesc}>Immunisé contre le Divorce forcé</span>
            </div>
            <div className={styles.immuniteRow}>
              <span className={styles.immuniteMetier}>🔬 Chirurgien / 💊 Médecin / 💉 Pharmacien</span>
              <span className={styles.immuniteDesc}>Immunisés contre les Maladies</span>
            </div>
            <div className={styles.immuniteRow}>
              <span className={styles.immuniteMetier}>🦹 Bandit</span>
              <span className={styles.immuniteDesc}>Immunisé contre Licenciement & Impôt</span>
            </div>
            <div className={styles.immuniteRow}>
              <span className={styles.immuniteMetier}>🏛️ Fonctionnaires</span>
              <span className={styles.immuniteDesc}>Immunisés contre le Licenciement</span>
            </div>
            <div className={styles.immuniteRow}>
              <span className={styles.immuniteMetier}>🪖 Militaire</span>
              <span className={styles.immuniteDesc}>Bloque la carte Attentat tant qu'il est en jeu</span>
            </div>
          </div>
        ),
      },
      {
        id: 'sl-score',
        title: 'Fin de partie & scores',
        content: (
          <>
            <ul className={styles.ruleList}>
              <Rule>La partie se termine quand la <strong>pioche est vide</strong>.</Rule>
              <Rule>Chaque carte posée sur votre plateau vaut ses <strong>smiles indiqués</strong>.</Rule>
              <Rule>Les cartes en main ne comptent <strong>pas</strong>.</Rule>
              <Rule>Les salaires <strong>investis</strong> (retournés pour achats) comptent quand même leurs smiles.</Rule>
              <Rule>Le joueur avec le plus de smiles remporte la partie !</Rule>
            </ul>
          </>
        ),
      },
    ],
  },
  {
    id: 'undercover',
    name: 'Undercover',
    emoji: '🕵️',
    tagline: 'Bluffez, déduisez, survivez !',
    sections: [
      {
        id: 'uc-but',
        title: 'But du jeu',
        content: (
          <p>Undercover est un jeu de déduction sociale pour 4 à 20 joueurs. Une paire de mots proches est choisie par le serveur (ex : Chat / Chien). Les civils reçoivent le même mot, les undercovers reçoivent l'autre mot, et Mr. White ne reçoit rien. Personne ne sait qui est qui au début !</p>
        ),
      },
      {
        id: 'uc-roles',
        title: 'Les 3 rôles',
        content: (
          <>
            <div className={styles.cardRowList}>
              <CardRow name="👤 Civil" tags={[{ label: 'majorité', color: '#16a34a' }, { label: 'mot A', color: '#15803d' }]} desc="Reçoit le mot des civils. Doit éliminer tous les undercovers et Mr. Whites sans se faire piéger." />
              <CardRow name="🕵️ Undercover" tags={[{ label: '1 à 2', color: '#dc2626' }, { label: 'mot B', color: '#b91c1c' }]} desc="Reçoit un mot proche mais différent de celui des civils. Doit survivre en bluffant." />
              <CardRow name="👻 Mr. White" tags={[{ label: '1 à 2', color: '#7c3aed' }, { label: 'aucun mot', color: '#6d28d9' }]} desc="Ne reçoit aucun mot. Doit bluffer et observer pour deviner le mot des civils." />
            </div>
            <div className={styles.infoBox}>
              💡 Par défaut : 1 undercover + 1 Mr. White. À partir de 10 joueurs : 2 undercovers. À partir de 15 joueurs : 2 Mr. Whites.
            </div>
          </>
        ),
      },
      {
        id: 'uc-description',
        title: 'Phase 1 — Description',
        content: (
          <>
            <p className={styles.sectionIntro}>Un joueur aléatoire commence, puis chacun décrit son mot à tour de rôle.</p>
            <ul className={styles.ruleList}>
              <Rule>Chaque joueur décrit son mot en <strong>1 à 3 mots maximum</strong>.</Rule>
              <Rule>Les descriptions sont visibles par tous en temps réel.</Rule>
              <Rule>Mr. White doit bluffer sans connaître le vrai mot — il observe les autres pour deviner.</Rule>
              <Rule>Soyez assez précis pour être crédible, mais pas trop pour ne pas trahir le mot exact.</Rule>
            </ul>
            <div className={styles.infoBox}>
              ⚠️ Écrire le mot exact comme description est interdit — c'est trop facile !
            </div>
          </>
        ),
      },
      {
        id: 'uc-discussion',
        title: 'Phase 2 — Discussion',
        content: (
          <>
            <p className={styles.sectionIntro}>Un timer de 2 minutes est lancé. Les joueurs débattent librement.</p>
            <ul className={styles.ruleList}>
              <Rule>Analysez les descriptions : qui semble décrire un mot différent ?</Rule>
              <Rule>Défendez-vous si vous êtes accusé.</Rule>
              <Rule>L'hôte peut passer au vote avant la fin du timer.</Rule>
            </ul>
          </>
        ),
      },
      {
        id: 'uc-vote',
        title: 'Phase 3 — Vote & Élimination',
        content: (
          <>
            <p className={styles.sectionIntro}>Tous les joueurs encore en vie votent simultanément.</p>
            <ul className={styles.ruleList}>
              <Rule>Le joueur avec le plus de votes est <strong>éliminé</strong>.</Rule>
              <Rule>En cas d'égalité, le joueur éliminé est choisi aléatoirement parmi les ex-aequo.</Rule>
              <Rule>Les joueurs éliminés passent en <strong>mode spectateur</strong> et continuent de regarder.</Rule>
              <Rule>Le rôle du joueur éliminé est révélé à l'élimination.</Rule>
            </ul>
          </>
        ),
      },
      {
        id: 'uc-mrwhite',
        title: 'La chance de Mr. White',
        content: (
          <>
            <p className={styles.sectionIntro}>Si le joueur éliminé est Mr. White, il a une chance unique !</p>
            <ul className={styles.ruleList}>
              <Rule>Mr. White peut tenter de <strong>deviner le mot des civils</strong>.</Rule>
              <Rule>S'il devine correctement → <strong>victoire immédiate</strong> pour Mr. White !</Rule>
              <Rule>S'il se trompe ou renonce → la partie continue normalement.</Rule>
            </ul>
          </>
        ),
      },
      {
        id: 'uc-victoire',
        title: 'Conditions de victoire',
        content: (
          <>
            <div className={styles.cardRowList}>
              <CardRow name="👤 Civils gagnent" tags={[{ label: '✓ victoire', color: '#16a34a' }]} desc="Quand tous les undercovers ET tous les Mr. Whites sont éliminés." />
              <CardRow name="🕵️ Undercovers gagnent" tags={[{ label: '✓ victoire', color: '#dc2626' }]} desc="S'ils survivent jusqu'à ce qu'il ne reste plus qu'un seul civil en vie." />
              <CardRow name="👻 Mr. White gagne" tags={[{ label: '✓ victoire', color: '#7c3aed' }]} desc="S'il survit jusqu'à la fin (comme les undercovers), OU s'il devine correctement le mot des civils lors de son élimination." />
            </div>
            <div className={styles.infoBox}>
              🔄 Si aucune condition n'est remplie après l'élimination, un nouveau cycle des 3 phases recommence !
            </div>
          </>
        ),
      },
      {
        id: 'uc-conseils',
        title: 'Stratégies & conseils',
        content: (
          <ul className={styles.ruleList}>
            <Rule><strong>Civil :</strong> Soyez assez précis pour convaincre les autres civils, mais pas trop pour ne pas trahir le mot à l'undercover. Écoutez les autres descriptions pour détecter les incohérences.</Rule>
            <Rule><strong>Undercover :</strong> Écoutez attentivement les descriptions des civils pour deviner leur mot. Restez vague et adaptez votre description pour paraître civil.</Rule>
            <Rule><strong>Mr. White :</strong> Proposez des descriptions très génériques qui pourraient correspondre à n'importe quel thème. Observez tout pour deviner le mot si vous êtes éliminé.</Rule>
            <Rule>Un mot trop précis peut trahir un civil... un mot trop vague peut trahir un infiltré !</Rule>
          </ul>
        ),
      },
    ],
  },
]

// ─── Composant principal ──────────────────────────────────────────────────────

export function RulesPage() {
  const navigate = useNavigate()
  const [selectedGame, setSelectedGame] = useState<string>('smilelife')
  const [openSections, setOpenSections] = useState<Set<string>>(new Set(['sl-but', 'sl-tour']))

  const game = GAMES.find(g => g.id === selectedGame)!

  const toggleSection = (id: string) => {
    setOpenSections(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  return (
    <div className={styles.page}>
      {/* Sidebar jeux */}
      <aside className={styles.sidebar}>
        <button className={styles.backBtn} onClick={() => navigate('/')}>
          ← Retour au lobby
        </button>
        <div className={styles.sidebarTitle}>Jeux</div>
        {GAMES.map(g => (
          <button
            key={g.id}
            className={`${styles.gameBtn} ${selectedGame === g.id ? styles.gameBtnActive : ''}`}
            onClick={() => setSelectedGame(g.id)}
          >
            <span className={styles.gameBtnEmoji}>{g.emoji}</span>
            <span>{g.name}</span>
          </button>
        ))}
      </aside>

      {/* Contenu */}
      <main className={styles.content}>
        <div className={styles.gameHeader}>
          <span className={styles.gameHeaderEmoji}>{game.emoji}</span>
          <div>
            <h1 className={styles.gameTitle}>{game.name}</h1>
            <p className={styles.gameTagline}>{game.tagline}</p>
          </div>
        </div>

        {/* Table des matières */}
        <div className={styles.toc}>
          <div className={styles.tocTitle}>Sommaire</div>
          <div className={styles.tocLinks}>
            {game.sections.map(s => (
              <button key={s.id} className={styles.tocLink} onClick={() => {
                setOpenSections(prev => new Set([...prev, s.id]))
                setTimeout(() => document.getElementById(s.id)?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 50)
              }}>
                {s.title}
              </button>
            ))}
          </div>
        </div>

        {/* Sections */}
        <div className={styles.sections}>
          {game.sections.map(s => (
            <div key={s.id} id={s.id} className={styles.section}>
              <button
                className={`${styles.sectionHeader} ${openSections.has(s.id) ? styles.sectionHeaderOpen : ''}`}
                onClick={() => toggleSection(s.id)}
              >
                <span>{s.title}</span>
                <span className={styles.sectionIcon}>{openSections.has(s.id) ? '−' : '+'}</span>
              </button>
              {openSections.has(s.id) && (
                <div className={styles.sectionContent}>{s.content}</div>
              )}
            </div>
          ))}
        </div>
      </main>
    </div>
  )
}
