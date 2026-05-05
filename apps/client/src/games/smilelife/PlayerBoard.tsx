import styles from './PlayerBoard.module.css'

interface Card { id: string; category: string; name: string; smiles: number; [key: string]: any }
interface Board {
  etudes: Card[]; metier: Card | null; salaires: Card[]; salairesInvestis: Card[]
  flirts: Card[]; flirtsAdultere: Card[]; mariage: Card | null; adultere: Card | null
  enfants: Card[]; enfantsAdultere: Card[]; animaux: Card[]; voyages: Card[]; maisons: Card[]
  malus: Card[]; speciales: Card[]; heritage: number
}
interface Player { id: string; username: string; avatarUrl: string | null; hand: Card[]; board: Board; skippedTurns: number; prisonTurns: number }

interface Props {
  player: Player
  isMe: boolean
  isCurrentTurn: boolean
  onTarget?: () => void
}

const CHIP_COLORS: Record<string, string> = {
  etude: '#3b82f6', metier: '#8b5cf6', salaire: '#16a34a', flirt: '#ec4899',
  mariage: '#db2777', enfant: '#f59e0b', adultere: '#ef4444', animal: '#84cc16',
  voyage: '#06b6d4', maison: '#f97316', malus: '#dc2626', special: '#7c3aed',
}
const CHIP_ICONS: Record<string, string> = {
  etude: '🎓', metier: '💼', salaire: '💵', flirt: '💕', mariage: '💍',
  enfant: '👶', adultere: '🙊', animal: '🐾', voyage: '✈️', maison: '🏠',
  malus: '💥', special: '⭐',
}
function MiniCard({ card }: { card: Card }) {
  const color = CHIP_COLORS[card.category] ?? '#6b7280'
  const icon = CHIP_ICONS[card.category] ?? '🃏'
  return (
    <span
      className={styles.chip}
      style={{ background: color }}
      title={`${card.name}${card.smiles > 0 ? ` (${card.smiles} 😊)` : ''}`}
    >
      {icon}
    </span>
  )
}

export function PlayerBoard({ player, isMe, isCurrentTurn, onTarget }: Props) {
  const b = player.board
  const totalSmiles = [
    ...b.etudes, b.metier, ...b.salaires, ...b.salairesInvestis,
    ...b.flirts, ...b.flirtsAdultere, b.mariage, b.adultere,
    ...b.enfants, ...b.enfantsAdultere, ...b.animaux, ...b.voyages, ...b.maisons, ...b.speciales,
  ].filter(Boolean).reduce((s: number, c: any) => s + (c?.smiles ?? 0), 0)

  return (
    <div className={`${styles.board} ${isCurrentTurn ? styles.boardActive : ''} ${isMe ? styles.boardMe : ''}`}
      onClick={onTarget} style={{ cursor: onTarget ? 'pointer' : undefined }}>

      {/* Header joueur */}
      <div className={styles.playerHeader}>
        <div className={styles.playerAvatar}>
          {player.avatarUrl
            ? <img src={player.avatarUrl} alt="" />
            : <span>{player.username[0]?.toUpperCase()}</span>}
        </div>
        <div className={styles.playerInfo}>
          <span className={styles.playerName}>{player.username}{isMe ? ' (moi)' : ''}</span>
          <span className={styles.playerSmiles}>😊 {totalSmiles}</span>
        </div>
        {player.skippedTurns > 0 && <span className={styles.statusBadge} style={{ background: '#f87171' }}>⏭ Skip x{player.skippedTurns}</span>}
        {player.prisonTurns > 0 && <span className={styles.statusBadge} style={{ background: '#6b7280' }}>🔒 Prison x{player.prisonTurns}</span>}
        {!isMe && <span className={styles.handCount}>🃏 {player.hand.length}</span>}
      </div>

      {/* Vie Pro */}
      <div className={styles.section}>
        <div className={styles.sectionLabel}>💼 Vie Pro</div>
        <div className={styles.chips}>
          {b.etudes.map((c: Card) => <MiniCard key={c.id} card={c} />)}
          {b.metier && (
            <>
              <MiniCard card={b.metier} />
              <span className={styles.chip} style={{ background: '#6b7280', fontSize: 10 }}>
                💵 Salaire max niv.{b.metier.maxSalary ?? '?'}
              </span>
            </>
          )}
          {b.salaires.map((c: Card) => <MiniCard key={c.id} card={c} />)}
          {b.salairesInvestis.map((c: Card) => (
            <span key={c.id} className={`${styles.chip} ${styles.chipSm}`}
              style={{ background: '#16a34a', opacity: 0.5, textDecoration: 'line-through' }}
              title={`${c.name} (investi)`}>💵</span>
          ))}
          {b.etudes.length === 0 && !b.metier && b.salaires.length === 0 && (
            <span className={styles.empty}>Aucune carte</span>
          )}
        </div>
      </div>

      {/* Vie Perso */}
      <div className={styles.section}>
        <div className={styles.sectionLabel}>💕 Vie Perso</div>
        <div className={styles.chips}>
          {b.flirts.map((c: Card) => <MiniCard key={c.id} card={c} />)}
          {b.mariage && <MiniCard card={b.mariage} />}
          {b.adultere && <MiniCard card={b.adultere} />}
          {b.flirtsAdultere.map((c: Card) => (
            <span key={c.id} className={`${styles.chip} ${styles.chipSm}`}
              style={{ background: '#f43f5e', border: '2px dashed #fff' }} title={`${c.name} (adultère)`}>💕</span>
          ))}
          {b.enfants.map((c: Card) => <MiniCard key={c.id} card={c} />)}
          {b.enfantsAdultere.map((c: Card) => (
            <span key={c.id} className={`${styles.chip} ${styles.chipSm}`}
              style={{ background: '#fbbf24', border: '2px dashed #fff' }} title={`${c.name} (adultère)`}>👶</span>
          ))}
          {b.flirts.length === 0 && !b.mariage && b.enfants.length === 0 && (
            <span className={styles.empty}>Aucune carte</span>
          )}
        </div>
      </div>

      {/* Acquisitions */}
      {(b.animaux.length > 0 || b.voyages.length > 0 || b.maisons.length > 0 || b.speciales.length > 0 || b.heritage > 0) && (
        <div className={styles.section}>
          <div className={styles.sectionLabel}>🏠 Acquisitions & Spéciales</div>
          <div className={styles.chips}>
            {b.animaux.map((c: Card) => <MiniCard key={c.id} card={c} />)}
            {b.voyages.map((c: Card) => <MiniCard key={c.id} card={c} />)}
            {b.maisons.map((c: Card) => <MiniCard key={c.id} card={c} />)}
            {b.speciales.map((c: Card) => <MiniCard key={c.id} card={c} />)}
            {b.heritage > 0 && <span className={styles.chip} style={{ background: '#a78bfa' }}>💰 Héritage x{b.heritage}</span>}
          </div>
        </div>
      )}

      {/* Malus */}
      {b.malus.length > 0 && (
        <div className={styles.section}>
          <div className={styles.sectionLabel}>💥 Malus</div>
          <div className={styles.chips}>
            {b.malus.map((c: Card) => <MiniCard key={c.id} card={c} />)}
          </div>
        </div>
      )}

      {/* Overlay cible */}
      {onTarget && (
        <div className={styles.targetOverlay}>
          <span>🎯 Infliger le malus</span>
        </div>
      )}
    </div>
  )
}
