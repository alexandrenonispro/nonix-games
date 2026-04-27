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
          {visible.map(h => <HistoryCard key={h.id} entry={h} userId={userId} />)}
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
