import { useState, useMemo } from 'react'
import styles from './GameHistory.module.css'

interface TurnData {
  id: string; round: number; turnIndex: number
  drawerId: string; drawerName: string; word: string
  canvasData: string
  guessers: { userId: string; username: string; points: number; rank: number }[]
}

interface HistoryEntry {
  id: string; roomCode: string; startedAt: string; endedAt: string
  settings: { rounds: number; timePerRound: number; wordCount: number; durationMs: number }
  rankings: { userId: string; username: string; avatarUrl: string | null; score: number; rank: number }[]
  turns: TurnData[]
  gameId?: string
  // Undercover specific
  winner?: string
  civilWord?: string
  undercoverWord?: string
  rounds?: number
  players?: {
    userId: string; username: string; avatarUrl: string | null
    role: string; word: string | null; isEliminated: boolean; isWinner: boolean
    descriptions: { round: number; text: string }[]
  }[]
}

const MEDALS = ['🥇', '🥈', '🥉']
const PAGE_SIZE = 5

const GAME_LABELS: Record<string, string> = {
  skribble: '🎨 Drawnix',
  quiz: '🧠 Quiz',
  loup_garou: '🐺 Loup-Garou',
  blind_test: '🎵 Blind Test',
  undercover: '🕵️ Undercover',
}

function formatDuration(ms: number) {
  const m = Math.floor(ms / 60000)
  const s = Math.floor((ms % 60000) / 1000)
  return m > 0 ? `${m}m ${s}s` : `${s}s`
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('fr-FR', {
    day: 'numeric', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
}

function formatDateInput(iso: string) {
  return new Date(iso).toISOString().split('T')[0]!
}

function TurnCard({ turn }: { turn: TurnData }) {
  const [expanded, setExpanded] = useState(false)
  return (
    <div className={styles.turnCard}>
      <div className={styles.turnHeader} onClick={() => setExpanded(e => !e)}>
        <span className={styles.turnRound}>Round {turn.round}</span>
        <span className={styles.turnDrawer}>✏️ {turn.drawerName}</span>
        <span className={styles.turnWord}>« {turn.word} »</span>
        <span className={styles.turnGuessCount}>{turn.guessers.length} deviné(s)</span>
        <span className={styles.turnToggle}>{expanded ? '▲' : '▼'}</span>
      </div>
      {expanded && (
        <div className={styles.turnBody}>
          {turn.canvasData && (
            <img src={turn.canvasData} alt={`${turn.drawerName} — ${turn.word}`} className={styles.canvasImg} />
          )}
          <div className={styles.guesserList}>
            {turn.guessers.sort((a, b) => a.rank - b.rank).map(g => (
              <div key={g.userId} className={styles.guesserRow}>
                <span className={styles.guesserRank}>#{g.rank}</span>
                <span className={styles.guesserName}>{g.username}</span>
                <span className={styles.guesserPts}>+{g.points} pts</span>
              </div>
            ))}
            {turn.guessers.length === 0 && <p className={styles.noGuess}>Personne n'a trouvé</p>}
          </div>
        </div>
      )}
    </div>
  )
}


const ROLE_LABELS: Record<string, string> = { civil: 'Civil', undercover: 'Undercover', mrwhite: 'Mr. White' }
const ROLE_COLORS: Record<string, string> = { civil: '#16a34a', undercover: '#dc2626', mrwhite: '#7c3aed' }
const ROLE_ICONS: Record<string, string> = { civil: '👤', undercover: '🕵️', mrwhite: '👻' }
const WINNER_LABELS: Record<string, string> = { civils: '👤 Civils', undercover: '🕵️ Undercovers', mrwhite: '👻 Mr. White' }

function UndercoverCard({ entry, userId }: { entry: HistoryEntry; userId: string }) {
  const [expanded, setExpanded] = useState(false)
  const duration = formatDuration(entry.settings.durationMs || (new Date(entry.endedAt).getTime() - new Date(entry.startedAt).getTime()))
  const me = entry.players?.find(p => p.userId === userId)
  const myRole = me?.role ?? ''

  return (
    <div className={styles.historyCard}>
      <div className={styles.historyHeader} onClick={() => setExpanded(e => !e)}>
        <div className={styles.historyLeft}>
          <span className={styles.historyGame}>🕵️ Undercover</span>
          <span className={styles.historyDate}>{formatDate(entry.endedAt)}</span>
        </div>
        <div className={styles.historyMeta}>
          {me && (
            <span className={styles.myRank} style={{ color: me.isWinner ? '#16a34a' : '#dc2626' }}>
              {me.isWinner ? '🏆 Victoire' : '💀 Défaite'}
            </span>
          )}
          {myRole && <span style={{ fontSize: 11, color: ROLE_COLORS[myRole] }}>{ROLE_ICONS[myRole]} {ROLE_LABELS[myRole]}</span>}
          <span className={styles.historyDuration}>⏱ {duration}</span>
          <span className={styles.historyPlayers}>{(entry.players?.length ?? 0)} joueurs</span>
          <span className={styles.historyToggle}>{expanded ? '▲' : '▼'}</span>
        </div>
      </div>
      {expanded && (
        <div className={styles.historyBody}>
          {/* Mots */}
          <div style={{ display: 'flex', gap: 12, marginBottom: 12, flexWrap: 'wrap' }}>
            <div style={{ background: '#dcfce7', border: '1px solid #16a34a', borderRadius: 8, padding: '8px 16px', textAlign: 'center' }}>
              <div style={{ fontSize: 10, fontWeight: 600, color: '#15803d', textTransform: 'uppercase', letterSpacing: '.06em' }}>Mot des civils</div>
              <div style={{ fontSize: 18, fontWeight: 700, color: '#14532d' }}>{entry.civilWord}</div>
            </div>
            <div style={{ background: '#fee2e2', border: '1px solid #dc2626', borderRadius: 8, padding: '8px 16px', textAlign: 'center' }}>
              <div style={{ fontSize: 10, fontWeight: 600, color: '#dc2626', textTransform: 'uppercase', letterSpacing: '.06em' }}>Mot undercover</div>
              <div style={{ fontSize: 18, fontWeight: 700, color: '#7f1d1d' }}>{entry.undercoverWord}</div>
            </div>
            <div style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: 8, padding: '8px 16px', textAlign: 'center' }}>
              <div style={{ fontSize: 10, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '.06em' }}>Vainqueurs</div>
              <div style={{ fontSize: 15, fontWeight: 700 }}>{WINNER_LABELS[entry.winner ?? ''] ?? entry.winner}</div>
            </div>
          </div>

          {/* Joueurs + descriptions */}
          <div className={styles.podium}>
            {entry.players?.map(p => (
              <div key={p.userId} className={`${styles.podiumRow} ${p.userId === userId ? styles.podiumRowMe : ''}`}>
                <span style={{ color: ROLE_COLORS[p.role], fontWeight: 700, minWidth: 28 }}>{ROLE_ICONS[p.role]}</span>
                <span className={styles.podiumName}>{p.username}{p.userId === userId ? ' (moi)' : ''}</span>
                <span style={{ fontSize: 11, color: ROLE_COLORS[p.role] }}>{ROLE_LABELS[p.role]}</span>
                {p.word && <span style={{ fontSize: 11, color: 'var(--text-muted)', fontStyle: 'italic' }}>— "{p.word}"</span>}
                {p.isEliminated && <span style={{ fontSize: 11 }}>💀</span>}
                {p.isWinner && <span style={{ fontSize: 11 }}>🏆</span>}
              </div>
            ))}
          </div>

          {/* Historique des descriptions par tour */}
          {entry.players && entry.players.some(p => p.descriptions.length > 0) && (
            <div style={{ marginTop: 12 }}>
              <p className={styles.turnsTitle}>Historique des descriptions</p>
              {Array.from({ length: entry.rounds ?? 0 }, (_, i) => i + 1).map(round => {
                const descs = entry.players!.flatMap(p => p.descriptions.filter(d => d.round === round).map(d => ({ username: p.username, text: d.text, role: p.role })))
                if (descs.length === 0) return null
                return (
                  <div key={round} style={{ marginBottom: 8 }}>
                    <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 4 }}>Tour {round}</div>
                    {descs.map((d, i) => (
                      <div key={i} style={{ display: 'flex', gap: 8, alignItems: 'center', padding: '3px 0', borderBottom: '1px solid var(--border)' }}>
                        <span style={{ fontSize: 11, color: ROLE_COLORS[d.role], minWidth: 16 }}>{ROLE_ICONS[d.role]}</span>
                        <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-primary)', minWidth: 80 }}>{d.username}</span>
                        <span style={{ fontSize: 12, color: 'var(--text-secondary)', fontStyle: 'italic' }}>"{d.text}"</span>
                      </div>
                    ))}
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function HistoryCard({ entry, userId }: { entry: HistoryEntry; userId: string }) {
  const [expanded, setExpanded] = useState(false)
  const myResult = entry.rankings.find(r => r.userId === userId)
  const duration = formatDuration(entry.settings.durationMs || (new Date(entry.endedAt).getTime() - new Date(entry.startedAt).getTime()))
  const gameLabel = GAME_LABELS[entry.gameId ?? 'skribble'] ?? '🎮 Jeu'

  return (
    <div className={styles.historyCard}>
      <div className={styles.historyHeader} onClick={() => setExpanded(e => !e)}>
        <div className={styles.historyLeft}>
          <span className={styles.historyGame}>{gameLabel}</span>
          <span className={styles.historyDate}>{formatDate(entry.endedAt)}</span>
        </div>
        <div className={styles.historyMeta}>
          {myResult && (
            <span className={styles.myRank}>
              {MEDALS[myResult.rank - 1] ?? `#${myResult.rank}`} {myResult.score} pts
            </span>
          )}
          <span className={styles.historyDuration}>⏱ {duration}</span>
          <span className={styles.historyPlayers}>{entry.rankings.length} joueurs</span>
          <span className={styles.historyToggle}>{expanded ? '▲' : '▼'}</span>
        </div>
      </div>
      {expanded && (
        <div className={styles.historyBody}>
          <div className={styles.podium}>
            {entry.rankings.map(r => (
              <div key={r.userId} className={`${styles.podiumRow} ${r.userId === userId ? styles.podiumRowMe : ''}`}>
                <span className={styles.podiumMedal}>{MEDALS[r.rank - 1] ?? `#${r.rank}`}</span>
                <span className={styles.podiumName}>{r.username}</span>
                <span className={styles.podiumScore}>{r.score} pts</span>
              </div>
            ))}
          </div>
          <div className={styles.turns}>
            <p className={styles.turnsTitle}>Tours joués</p>
            {entry.turns.map(t => <TurnCard key={t.id} turn={t} />)}
          </div>
        </div>
      )}
    </div>
  )
}

interface GameHistoryProps {
  histories: HistoryEntry[]
  userId: string
}

export function GameHistory({ histories, userId }: GameHistoryProps) {
  const [gameFilter, setGameFilter] = useState<string>('all')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [page, setPage] = useState(1)

  // Jeux disponibles dans l'historique
  const availableGames = useMemo(() => {
    const ids = new Set(histories.map(h => h.gameId ?? 'skribble'))
    return ['all', ...Array.from(ids)]
  }, [histories])

  // Filtrage
  const filtered = useMemo(() => {
    return histories.filter(h => {
      if (gameFilter !== 'all' && (h.gameId ?? 'skribble') !== gameFilter) return false
      if (dateFrom && new Date(h.endedAt) < new Date(dateFrom)) return false
      if (dateTo && new Date(h.endedAt) > new Date(dateTo + 'T23:59:59')) return false
      return true
    })
  }, [histories, gameFilter, dateFrom, dateTo])

  const visible = filtered.slice(0, page * PAGE_SIZE)
  const hasMore = filtered.length > visible.length

  // Reset page quand les filtres changent
  const handleFilter = (fn: () => void) => { fn(); setPage(1) }

  if (histories.length === 0) {
    return <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>Aucune partie jouée pour l'instant.</p>
  }

  return (
    <div className={styles.root}>
      {/* Filtres */}
      <div className={styles.filters}>
        {/* Filtre par jeu */}
        <div className={styles.filterGroup}>
          {availableGames.map(gid => (
            <button key={gid}
              className={`${styles.filterBtn} ${gameFilter === gid ? styles.filterBtnActive : ''}`}
              onClick={() => handleFilter(() => setGameFilter(gid))}>
              {gid === 'all' ? 'Tous' : (GAME_LABELS[gid] ?? gid)}
            </button>
          ))}
        </div>

        {/* Filtre par date */}
        <div className={styles.dateFilters}>
          <div className={styles.dateField}>
            <label className={styles.dateLabel}>Du</label>
            <input type="date" className={styles.dateInput} value={dateFrom}
              onChange={e => handleFilter(() => setDateFrom(e.target.value))} />
          </div>
          <div className={styles.dateField}>
            <label className={styles.dateLabel}>Au</label>
            <input type="date" className={styles.dateInput} value={dateTo}
              onChange={e => handleFilter(() => setDateTo(e.target.value))} />
          </div>
          {(dateFrom || dateTo) && (
            <button className={styles.clearBtn}
              onClick={() => handleFilter(() => { setDateFrom(''); setDateTo('') })}>
              ✕ Effacer
            </button>
          )}
        </div>
      </div>

      {/* Résultats */}
      <div className={styles.count}>
        {filtered.length === 0
          ? 'Aucune partie trouvée'
          : `${filtered.length} partie${filtered.length > 1 ? 's' : ''} — affichage ${visible.length}`}
      </div>

      {/* Liste */}
      {filtered.length === 0 ? (
        <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>Aucune partie ne correspond aux filtres.</p>
      ) : (
        <>
          {visible.map(h => h.gameId === 'undercover'
            ? <UndercoverCard key={h.id} entry={h} userId={userId} />
            : <HistoryCard key={h.id} entry={h} userId={userId} />
          )}
          {hasMore && (
            <button className={styles.loadMoreBtn} onClick={() => setPage(p => p + 1)}>
              Afficher plus ({filtered.length - visible.length} restantes)
            </button>
          )}
        </>
      )}
    </div>
  )
}
