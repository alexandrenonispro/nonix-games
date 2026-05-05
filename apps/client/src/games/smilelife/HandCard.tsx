import { useState } from 'react'
import { categoryIcon } from './SmileLifeGame'
import { getCardDescription } from './cardDescriptions'
import { CardFace } from './CardFace'
import type { CardData } from './CardFace'
import styles from './HandCard.module.css'

interface Card { id: string; category: string; name: string; smiles: number; [key: string]: any }

// ─── HandCard ────────────────────────────────────────────────────────────────

interface HandCardProps {
  card: Card
  selected: boolean
  playable: boolean
  onClick: () => void
}

const CATEGORY_COLORS: Record<string, { bg: string; border: string; text: string }> = {
  etude:    { bg: '#eff6ff', border: '#3b82f6', text: '#1d4ed8' },
  metier:   { bg: '#f5f3ff', border: '#8b5cf6', text: '#6d28d9' },
  salaire:  { bg: '#f0fdf4', border: '#16a34a', text: '#15803d' },
  flirt:    { bg: '#fdf2f8', border: '#ec4899', text: '#be185d' },
  mariage:  { bg: '#fce7f3', border: '#db2777', text: '#9d174d' },
  enfant:   { bg: '#fffbeb', border: '#f59e0b', text: '#b45309' },
  adultere: { bg: '#fef2f2', border: '#ef4444', text: '#b91c1c' },
  animal:   { bg: '#f7fee7', border: '#84cc16', text: '#4d7c0f' },
  voyage:   { bg: '#ecfeff', border: '#06b6d4', text: '#0e7490' },
  maison:   { bg: '#fff7ed', border: '#f97316', text: '#c2410c' },
  malus:    { bg: '#fef2f2', border: '#dc2626', text: '#991b1b' },
  special:  { bg: '#faf5ff', border: '#7c3aed', text: '#5b21b6' },
}

export function HandCard({ card, selected, playable, onClick }: HandCardProps) {
  return (
    <div style={{ display: 'inline-block' }} onClick={onClick}>
      <CardFace
        card={card as CardData}
        size="hand"
        selected={selected}
        playable={playable}
        onClick={onClick}
      />
    </div>
  )
}

function cardSub(card: Card): string {
  if (card.category === 'etude') return card.isDouble ? `Double Niv.${card.level}` : `Niv.${card.level}`
  if (card.category === 'metier') return `${card.studiesRequired ?? 0}🎓 · ${card.maxSalary ?? 1}💵${card.statut ? ` · ${card.statut}` : ''}`
  if (card.category === 'salaire') return `Niveau ${card.salaryLevel}`
  if (card.category === 'flirt') return card.lieu ?? ''
  if (card.category === 'enfant') return card.childName ?? ''
  if (card.category === 'voyage' || card.category === 'maison') return `${card.cost} liasses`
  if (card.category === 'malus') return card.malusType ?? ''
  return ''
}


// ─── Casino Picker ─────────────────────────────────────────────────────────────
function CasinoPicker({ myCards, opponents, onConfirm }: {
  myCards: any[]; opponents: any[]; onConfirm: (cardId: string, targetId: string) => void
}) {
  const [selectedCard, setSelectedCard] = useState<string | null>(null)
  const [selectedOpponent, setSelectedOpponent] = useState<string | null>(null)
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <div>
        <p style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.07em', color: 'var(--text-muted)', marginBottom: 8 }}>1. Choisissez votre salaire à miser</p>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {myCards.map((c: any) => (
            <div key={c.id} style={{ cursor: 'pointer', outline: selectedCard === c.id ? '2px solid var(--accent)' : '2px solid transparent', borderRadius: 10 }}
              onClick={() => setSelectedCard(c.id)}>
              <HandCard card={c} selected={selectedCard === c.id} playable onClick={() => setSelectedCard(c.id)} />
            </div>
          ))}
          {myCards.length === 0 && <p style={{ fontSize: 12, color: 'var(--text-muted)', fontStyle: 'italic' }}>Aucun salaire en main.</p>}
        </div>
      </div>
      <div>
        <p style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.07em', color: 'var(--text-muted)', marginBottom: 8 }}>2. Choisissez un adversaire</p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {opponents.map((p: any) => (
            <button key={p.id}
              style={{
                padding: '8px 14px', borderRadius: 8, border: selectedOpponent === p.id ? '2px solid var(--accent)' : '1px solid var(--border)',
                background: selectedOpponent === p.id ? 'var(--accent-dim)' : 'var(--bg-base)',
                cursor: 'pointer', textAlign: 'left', fontFamily: 'var(--font-body)', fontSize: 13, fontWeight: 500, color: 'var(--text-primary)',
              }}
              onClick={() => setSelectedOpponent(p.id)}>
              {p.username}
            </button>
          ))}
          {opponents.length === 0 && <p style={{ fontSize: 12, color: 'var(--text-muted)', fontStyle: 'italic' }}>Aucun adversaire avec un salaire en main.</p>}
        </div>
      </div>
      <button
        style={{
          padding: '10px 16px', borderRadius: 8, border: 'none', background: 'var(--accent)', color: 'white',
          fontSize: 14, fontWeight: 700, cursor: selectedCard && selectedOpponent ? 'pointer' : 'not-allowed',
          opacity: selectedCard && selectedOpponent ? 1 : 0.4, fontFamily: 'var(--font-body)',
        }}
        disabled={!selectedCard || !selectedOpponent}
        onClick={() => selectedCard && selectedOpponent && onConfirm(selectedCard, selectedOpponent)}>
        🎰 Lancer le Casino
      </button>
    </div>
  )
}

// ─── ActionModal ─────────────────────────────────────────────────────────────

interface ActionModalProps {
  card: Card | null
  players: { id: string; username: string; board: any }[]
  myBoard: any
  pendingAction: any
  discard?: Card[]
  onPlaySelf: () => void
  onPlayMalus: (targetId: string) => void
  onDiscard: () => void
  onClose: () => void
  onPendingResolve?: (data: any) => void
}

export function ActionModal({
  card, players, myBoard, pendingAction, discard,
  onPlaySelf, onPlayMalus, onDiscard, onClose, onPendingResolve,
}: ActionModalProps) {

  // Gérer les actions en attente
  if (pendingAction && onPendingResolve) {
    return (
      <div className={styles.overlay}>
        <div className={styles.modal}>
          <div className={styles.modalHeader}>
            <span>⏳ Action spéciale</span>
            <button className={styles.closeBtn} onClick={onClose}>✕</button>
          </div>

          {pendingAction.type === 'chance' && (
            <>
              <p className={styles.modalDesc}>Choisissez 1 carte parmi 3 :</p>
              <div className={styles.cardChoices}>
                {(pendingAction.data?.cards ?? []).map((c: Card) => (
                  <button key={c.id} className={styles.choiceBtn}
                    onClick={() => onPendingResolve({ cardId: c.id })}>
                    <HandCard card={c} selected={false} playable onClick={() => {}} />
                  </button>
                ))}
              </div>
            </>
          )}

          {(pendingAction.type === 'pick-from-discard' || pendingAction.type === 'etoile-filante' || pendingAction.type === 'astronaute') && (
            <>
              <p className={styles.modalDesc}>Choisissez une carte dans la défausse :</p>
              <div className={styles.cardChoices}>
                {(discard ?? []).slice().reverse().map((c: Card) => (
                  <button key={c.id} className={styles.choiceBtn}
                    onClick={() => onPendingResolve({ cardId: c.id })}>
                    <HandCard card={c} selected={false} playable onClick={() => {}} />
                  </button>
                ))}
                {(!discard || discard.length === 0) && <p className={styles.empty}>Défausse vide.</p>}
              </div>
            </>
          )}

          {pendingAction.type === 'troc' && (
            <>
              <p className={styles.modalDesc}>Choisissez un joueur pour le Troc :</p>
              <div className={styles.targetList}>
                {players.map(p => (
                  <button key={p.id} className={styles.targetBtn}
                    onClick={() => onPendingResolve({ targetPlayerId: p.id })}>
                    {p.username}
                  </button>
                ))}
              </div>
            </>
          )}

          {pendingAction.type === 'casino-bet-a' && (() => {
            const myCards = (pendingAction.data?.salaireOptions ?? myBoard?.hand?.filter((c: any) => c.category === 'salaire') ?? []) as any[]
            const opponents = (pendingAction.data?.eligibleOpponents ?? players.filter((p: any) => p.hand?.some((c: any) => c.category === 'salaire'))) as any[]
            const [selectedSalId, setSelectedSalId] = (window as any).__casinoSel ?? [null, null]
            // Use local state via a wrapper
            return (
              <CasinoPicker
                myCards={myCards}
                opponents={opponents}
                onConfirm={(cardId: string, targetId: string) => onPendingResolve?.({ cardId, targetPlayerId: targetId })}
              />
            )
          })()}

          {pendingAction.type === 'casino-bet-b' && (
            <>
              <p className={styles.modalDesc}>🎰 Casino ! Un joueur vous défie. Choisissez un salaire à miser :</p>
              <div className={styles.cardChoices}>
                {myBoard?.hand?.filter((c: any) => c.category === 'salaire').map((c: any) => (
                  <button key={c.id} className={styles.choiceBtn}
                    onClick={() => onPendingResolve?.({ cardId: c.id })}>
                    <CardFace card={c as CardData} size="hand" playable />
                  </button>
                ))}
                {myBoard?.hand?.filter((c: any) => c.category === 'salaire').length === 0 && (
                  <p className={styles.empty}>Aucun salaire en main à miser.</p>
                )}
              </div>
            </>
          )}

          {pendingAction.type === 'chercheur-discard' && (
            <>
              <p className={styles.modalDesc}>🔭 Vous n'êtes plus Chercheur — défaussez une carte pour revenir à 5 cartes en main :</p>
              <div className={styles.cardChoices}>
                {myBoard?.hand?.map((c: any) => (
                  <button key={c.id} className={styles.choiceBtn}
                    onClick={() => onPendingResolve?.({ cardId: c.id })}>
                    <HandCard card={c} selected={false} playable onClick={() => {}} />
                  </button>
                ))}
              </div>
            </>
          )}

          {pendingAction.type === 'medium' && (
            <>
              <p className={styles.modalDesc}>🔮 Vous voyez les 13 prochaines cartes de la pioche :</p>
              <div className={styles.cardChoices} style={{ flexWrap: 'wrap', maxHeight: 320, overflowY: 'auto', justifyContent: 'flex-start', gap: 6 }}>
                {(pendingAction.data?.cards ?? []).map((c: any, i: number) => (
                  <div key={c.id ?? i} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
                    <span style={{ fontSize: 9, color: 'var(--text-muted)', fontWeight: 700 }}>#{i + 1}</span>
                    <HandCard card={c} selected={false} playable={false} onClick={() => {}} />
                  </div>
                ))}
              </div>
              <button className={styles.actionPrimary}
                onClick={() => onPendingResolve?.({})}>
                ✅ Fermer et continuer à jouer
              </button>
            </>
          )}

          {pendingAction.type === 'piston' && (
            <>
              <p className={styles.modalDesc}>Choisissez un métier de votre main à jouer :</p>
              <div className={styles.cardChoices}>
                {(pendingAction.data?.metiers ?? []).map((c: any) => (
                  <button key={c.id} className={styles.choiceBtn}
                    onClick={() => onPendingResolve?.({ cardId: c.id })}>
                    <CardFace card={c as CardData} size="hand" playable />
                  </button>
                ))}
              </div>
            </>
          )}

          {pendingAction.type === 'vengeance' && (
            <>
              <p className={styles.modalDesc}>Renvoyez un de vos malus :</p>
              <div className={styles.cardChoices}>
                {(myBoard?.malus ?? []).filter((c: Card) => c.malusType !== 'attentat').map((c: Card) => (
                  <div key={c.id} className={styles.twoStep}>
                    <HandCard card={c} selected={false} playable onClick={() => {}} />
                    <div className={styles.targetList}>
                      {players.map(p => (
                        <button key={p.id} className={styles.targetBtn}
                          onClick={() => onPendingResolve({ cardId: c.id, targetPlayerId: p.id })}>
                          → {p.username}
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    )
  }

  if (!card) return null

  const isMalus = card.category === 'malus'
  const desc = getCardDescription(card)

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modalNew} onClick={e => e.stopPropagation()}>
        {/* Header coloré */}
        <div className={styles.modalColorHeader} style={{ background: desc.color }}>
          <div>
            <div className={styles.modalCategoryLabel}>{desc.category}</div>
            <div className={styles.modalCardTitle}>{card.name}</div>
          </div>
          <button className={styles.closeBtnWhite} onClick={onClose}>✕</button>
        </div>

        {/* Corps : preview + infos */}
        <div className={styles.modalBody}>
          {/* Carte preview à gauche */}
          <div className={styles.modalPreviewCol} style={{ background: desc.color + '14' }}>
            <HandCard card={card} selected={false} playable={false} onClick={() => {}} />
          </div>

          {/* Infos à droite */}
          <div className={styles.modalInfoCol}>
            <div className={styles.modalSection}>
              <div className={styles.modalSectionLabel}>Description</div>
              <div className={styles.modalSectionText}>{desc.description}</div>
            </div>
            <div className={styles.modalSection}>
              <div className={styles.modalSectionLabel}>Conditions</div>
              {desc.conditions.map((c, i) => (
                <div key={i} className={styles.modalCondLine}>
                  <span className={styles.modalCondIcon}>✓</span>{c}
                </div>
              ))}
            </div>
            <div className={styles.modalSection}>
              <div className={styles.modalSectionLabel}>Conséquences</div>
              {desc.consequences.map((c, i) => (
                <div key={i} className={styles.modalConseqLine}>
                  <span className={styles.modalConseqIcon} style={{ color: desc.color }}>→</span>{c}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className={styles.modalFooter}>
          {!isMalus && (
            <button className={styles.actionPrimary} style={{ background: desc.color }} onClick={onPlaySelf}>
              ✅ Jouer
            </button>
          )}
          {isMalus && (
            <div style={{ flex: 1 }}>
              <div className={styles.modalDesc}>Choisissez la cible :</div>
              <div className={styles.targetList}>
                {players.map(p => (
                  <button key={p.id} className={styles.targetBtn} onClick={() => onPlayMalus(p.id)}>
                    💥 → {p.username}
                  </button>
                ))}
              </div>
            </div>
          )}
          <button className={styles.actionSecondary} onClick={onDiscard}>🗑 Défausser</button>
        </div>
      </div>
    </div>
  )
}
