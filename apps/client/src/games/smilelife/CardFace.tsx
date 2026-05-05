import { resolveAsset, CARD_BACK } from './cardAssets'
import styles from './CardFace.module.css'

export interface CardData {
  id: string
  category: string
  name: string
  smiles: number
  level?: number
  isDouble?: boolean
  studiesRequired?: number
  maxSalary?: number
  statut?: string | null
  metierEffect?: string | null
  salaryLevel?: number
  lieu?: string
  allowsChild?: boolean
  gender?: string
  childName?: string
  cost?: number
  malusType?: string
  specialType?: string
  isFonctionnaire?: boolean
}

interface CardFaceProps {
  card: CardData
  size?: 'hand' | 'mini' | 'preview'
  selected?: boolean
  playable?: boolean
  dimmed?: boolean
  onClick?: () => void
}


// ─── SVG helpers ─────────────────────────────────────────────────────────────

const SmileySVG = () => (
  <svg width="22" height="22" viewBox="0 0 22 22" style={{ flexShrink: 0 }}>
    <circle cx="11" cy="11" r="10" fill="#f5c842"/>
    <circle cx="7.5" cy="9" r="1.4" fill="#333"/>
    <circle cx="14.5" cy="9" r="1.4" fill="#333"/>
    <path d="M7 13.5 Q11 17 15 13.5" stroke="#333" strokeWidth="1.5" fill="none" strokeLinecap="round"/>
  </svg>
)

const CapIconSVG = () => (
  <svg width="18" height="13" viewBox="0 0 20 14">
    <polygon points="10,2 20,7 10,12 0,7" fill="white" opacity="0.9"/>
    <rect x="15" y="7" width="1.5" height="5" fill="white" opacity="0.9"/>
    <rect x="14" y="12" width="4" height="1.5" rx="0.5" fill="white" opacity="0.9"/>
  </svg>
)

const ChapeauSVG = ({ small = false }: { small?: boolean }) => (
  <svg width={small ? 80 : 130} height={small ? 60 : 100} viewBox="0 0 140 110">
    <polygon points="70,10 128,40 70,70 12,40" fill="#3d3d4d" stroke="#222" strokeWidth="3" strokeLinejoin="round"/>
    <ellipse cx="70" cy="70" rx="30" ry="11" fill="#555566" stroke="#222" strokeWidth="2.5"/>
    <line x1="118" y1="40" x2="124" y2="65" stroke="#222" strokeWidth="2.5"/>
    <rect x="118" y="65" width="12" height="7" rx="2.5" fill="#c89000" stroke="#222" strokeWidth="2"/>
  </svg>
)

const DoubleChapeauSVG = ({ small = false }: { small?: boolean }) => (
  <svg width={small ? 60 : 130} height={small ? 72 : 160} viewBox="0 0 140 170">
    <polygon points="70,8 118,28 70,48 22,28" fill="#3d3d4d" stroke="#222" strokeWidth="2.5" strokeLinejoin="round"/>
    <ellipse cx="70" cy="48" rx="24" ry="9" fill="#555566" stroke="#222" strokeWidth="2"/>
    <line x1="108" y1="28" x2="113" y2="47" stroke="#222" strokeWidth="2"/>
    <rect x="107" y="47" width="10" height="6" rx="2" fill="#c89000" stroke="#222" strokeWidth="1.8"/>
    <polygon points="70,88 118,108 70,128 22,108" fill="#3d3d4d" stroke="#222" strokeWidth="2.5" strokeLinejoin="round"/>
    <ellipse cx="70" cy="128" rx="24" ry="9" fill="#555566" stroke="#222" strokeWidth="2"/>
    <line x1="108" y1="108" x2="113" y2="127" stroke="#222" strokeWidth="2"/>
    <rect x="107" y="127" width="10" height="6" rx="2" fill="#c89000" stroke="#222" strokeWidth="1.8"/>
  </svg>
)

function EtudeCard({ card, size, selected, playable, onClick }: {
  card: CardData; size: 'hand' | 'mini' | 'preview'
  selected?: boolean; playable?: boolean; onClick?: () => void
}) {
  const isDouble = card.isDouble
  const isMini = size === 'mini'
  return (
    <div
      className={[
        styles.card, styles[size],
        selected ? styles.selected : '',
        playable ? styles.playable : '',
        onClick ? styles.clickable : '',
      ].join(' ')}
      style={{ '--card-color': '#3b6fd4', '--card-bg': '#fff', background: '#fff' } as any}
      onClick={onClick}
    >
      <div className={styles.etudeHeader}>
        {!isMini && <SmileySVG />}
        <span className={styles.etudeTitle}>Études</span>
        <div className={styles.etudeCaps}>
          <CapIconSVG />
          {isDouble && <CapIconSVG />}
        </div>
      </div>
      {!isMini && (
        <div className={styles.etudeBody}>
          {isDouble ? <DoubleChapeauSVG /> : <ChapeauSVG />}
        </div>
      )}
      {isMini && (
        <div className={styles.etudeBody} style={{ fontSize: 22 }}>🎓</div>
      )}
      {!isMini && (
        <div className={styles.etudeFooter}>
          {isDouble ? 'Vous êtes surdoué !' : 'Félicitation !'}
        </div>
      )}
      {selected && <div className={styles.selectedBadge}>✓</div>}
    </div>
  )
}

export function CardFace({ card, size = 'hand', selected, playable, dimmed, onClick }: CardFaceProps) {
  if (card.category === 'hidden') return <HiddenCard size={size} />
  if (card.category === 'etude') return <EtudeCard card={card} size={size} selected={selected} playable={playable} onClick={onClick} />

  const asset = resolveAsset(card)
  const isHand = size === 'hand'
  const isMini = size === 'mini'
  const isPreview = size === 'preview'

  return (
    <div
      className={[
        styles.card,
        styles[size],
        selected ? styles.selected : '',
        playable ? styles.playable : '',
        dimmed ? styles.dimmed : '',
        onClick ? styles.clickable : '',
      ].join(' ')}
      style={{ '--card-color': asset.color, '--card-bg': asset.bg } as any}
      onClick={onClick}
    >
      {/* Image custom si disponible */}
      {asset.image ? (
        <img src={asset.image} alt={card.name} className={styles.fullImage} draggable={false} />
      ) : (
        <>
          {/* Header */}
          <div className={styles.header}>
            <div className={styles.smiles}>
              {card.smiles > 0 ? '😊'.repeat(Math.min(card.smiles, isHand ? 4 : 2)) : ''}
            </div>
            <div className={styles.cardName}>{card.name}</div>
            {!isMini && <div className={styles.tag}>{cardTag(card)}</div>}
          </div>

          {/* Corps */}
          <div className={styles.body}>
            <span className={styles.emoji}>{asset.emoji}</span>
            {!isMini && card.category === 'enfant' && (
              <span className={styles.childName}>{card.childName}</span>
            )}
            {!isMini && card.category === 'flirt' && (
              <span className={styles.lieu}>{card.lieu}</span>
            )}
            {!isMini && (card.category === 'voyage' || card.category === 'maison') && (
              <span className={styles.cost}>💵 {card.cost} liasses</span>
            )}
          </div>

          {/* Footer */}
          {!isMini && (
            <div className={styles.footer}>
              {footerContent(card)}
            </div>
          )}
        </>
      )}

      {/* Badge sélectionné */}
      {selected && <div className={styles.selectedBadge}>✓</div>}
    </div>
  )
}

export function HiddenCard({ size = 'hand' }: { size?: 'hand' | 'mini' | 'preview' }) {
  const w = size === 'mini' ? 52 : size === 'preview' ? 140 : 162
  const h = size === 'mini' ? 74 : size === 'preview' ? 200 : 232
  const rx = size === 'mini' ? 6 : 12
  const cx = w / 2
  const cy = h / 2
  const r = size === 'mini' ? 11 : 32
  const fontSize = size === 'mini' ? 5 : 9
  const eyeR = size === 'mini' ? 1.4 : 3.5
  const eyeOff = size === 'mini' ? 3 : 8
  const eyeY = size === 'mini' ? -3 : -6
  const smileY = size === 'mini' ? 2 : 5
  const smileW = size === 'mini' ? 4 : 10
  const patW = size === 'mini' ? 10 : 20
  const dotR = size === 'mini' ? 2 : 4
  const textY1 = size === 'mini' ? 0 : h * 0.22
  const textY2 = size === 'mini' ? 0 : h * 0.84
  const patId = `dp-${size}`

  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} style={{ borderRadius: rx, display: 'block', flexShrink: 0 }}>
      <rect width={w} height={h} rx={rx} fill="#1e3a5f"/>
      <rect x="6" y="6" width={w-12} height={h-12} rx={rx-3} fill="none" stroke="#2d5a8e" strokeWidth="1.5"/>
      <defs>
        <pattern id={patId} x="0" y="0" width={patW} height={patW} patternUnits="userSpaceOnUse">
          <polygon points={`${patW/2},0.5 ${patW-0.5},${patW/2} ${patW/2},${patW-0.5} 0.5,${patW/2}`} fill="none" stroke="#7eb8f7" strokeWidth={size === 'mini' ? 0.7 : 1}/>
        </pattern>
      </defs>
      <rect x="8" y="8" width={w-16} height={h-16} rx={rx-4} fill={`url(#${patId})`} opacity="0.18"/>
      <circle cx={cx} cy={cy} r={r} fill="#2d5a8e" stroke="#4a8fd4" strokeWidth={size === 'mini' ? 1 : 1.5}/>
      <circle cx={cx - eyeOff} cy={cy + eyeY} r={eyeR} fill="#7eb8f7"/>
      <circle cx={cx + eyeOff} cy={cy + eyeY} r={eyeR} fill="#7eb8f7"/>
      <path d={`M${cx-smileW} ${cy+smileY} Q${cx} ${cy+smileY+smileW} ${cx+smileW} ${cy+smileY}`} stroke="#7eb8f7" strokeWidth={size === 'mini' ? 1.5 : 2.5} fill="none" strokeLinecap="round"/>
      {size !== 'mini' && <>
        <text x={cx} y={textY1} textAnchor="middle" fontSize={fontSize} fontWeight="700" fill="#4a8fd4" fontFamily="sans-serif" letterSpacing="2">SMILE LIFE</text>
        <text x={cx} y={textY2} textAnchor="middle" fontSize={fontSize} fontWeight="700" fill="#4a8fd4" fontFamily="sans-serif" letterSpacing="2">SMILE LIFE</text>
        <circle cx={20} cy={20} r={dotR} fill="#4a8fd4" opacity="0.6"/>
        <circle cx={w-20} cy={20} r={dotR} fill="#4a8fd4" opacity="0.6"/>
        <circle cx={20} cy={h-20} r={dotR} fill="#4a8fd4" opacity="0.6"/>
        <circle cx={w-20} cy={h-20} r={dotR} fill="#4a8fd4" opacity="0.6"/>
      </>}
    </svg>
  )
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function cardTag(card: CardData): string {
  if (card.category === 'etude') return card.isDouble ? 'Double' : 'Niv.1'
  if (card.category === 'metier') return `🎓×${card.studiesRequired ?? 0}`
  if (card.category === 'salaire') return `Niv.${card.salaryLevel}`
  if (card.category === 'flirt') return '1→5'
  if (card.category === 'mariage') return '×1'
  if (card.category === 'maison' && card.cost) return `💵×${card.cost}`
  return ''
}

function footerContent(card: CardData): React.ReactNode {
  if (card.category === 'metier') {
    return (
      <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%' }}>
        <span>{'💵'.repeat(card.maxSalary ?? 1)}</span>
        {card.statut && <span style={{ fontSize: '7px', opacity: .8 }}>{card.statut === 'fonctionnaire' ? 'Fonct.' : 'Intér.'}</span>}
      </div>
    )
  }
  if (card.category === 'flirt' && card.allowsChild) return <span>Enfant possible ✓</span>
  if (card.category === 'animal') return <span style={{ fontWeight: 700 }}>GRATUIT</span>
  if (card.category === 'malus') return <span style={{ fontWeight: 700 }}>MALUS</span>
  return null
}
