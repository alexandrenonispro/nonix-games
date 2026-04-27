import styles from './LoadingScreen.module.css'

const MESSAGES = [
  'Chargement des crayons…',
  'Mélange des mots…',
  'Préparation du canvas…',
  'Lancement des dés…',
  'Connexion aux joueurs…',
]

const msg = MESSAGES[Math.floor(Math.random() * MESSAGES.length)]!

export function LoadingScreen() {
  return (
    <div className={styles.root}>
      <div className={styles.scene}>
        {/* Dé animé */}
        <div className={styles.dice}>
          <svg viewBox="0 0 80 80" fill="none" className={styles.diceSvg}>
            {/* Cercle fond */}
            <circle cx="40" cy="40" r="40" fill="#3d9e8a" className={styles.diceCircle} />
            {/* Carré blanc */}
            <rect x="14" y="14" width="52" height="52" rx="10" fill="white" />
            {/* Points — face 5 */}
            <circle cx="27" cy="27" r="5.5" fill="#3d9e8a" className={styles.dot1} />
            <circle cx="53" cy="27" r="5.5" fill="#3d9e8a" className={styles.dot2} />
            <circle cx="40" cy="40" r="5.5" fill="#3d9e8a" className={styles.dot3} />
            <circle cx="27" cy="53" r="5.5" fill="#3d9e8a" className={styles.dot4} />
            <circle cx="53" cy="53" r="5.5" fill="#3d9e8a" className={styles.dot5} />
          </svg>
        </div>

        {/* Traînée de petites étoiles */}
        <div className={styles.trail}>
          {[...Array(4)].map((_, i) => (
            <div key={i} className={styles.trailDot} style={{ '--i': i } as any} />
          ))}
        </div>

        {/* Nom du site */}
        <div className={styles.brand}>Nonix Games</div>

        {/* Message aléatoire */}
        <p className={styles.message}>{msg}</p>

        {/* Barre de progression indéterminée */}
        <div className={styles.bar}>
          <div className={styles.barFill} />
        </div>
      </div>
    </div>
  )
}
