import { useState, useEffect, useRef } from 'react'
import {
  MOCK_PLAYERS, MOCK_QUESTIONS, MOCK_ROUND_RESULTS, MOCK_FINAL_RANKINGS,
  type QuizPhase, type QuizPlayer, type Question,
} from './mock'
import styles from './QuizGame.module.css'

const MY_ID = 'me'
const TOTAL_QUESTIONS = MOCK_QUESTIONS.length
const TIME_PER_QUESTION = 20

// ─── Avatar ───────────────────────────────────────────────────────────────────

function Avatar({ username, size = 36 }: { username: string; size?: number }) {
  const initials = username.slice(0, 2).toUpperCase()
  const hue = username.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0) % 360
  return (
    <div className={styles.avatar} style={{
      width: size, height: size, fontSize: size * 0.34,
      background: `hsl(${hue} 55% 18%)`,
      border: `1.5px solid hsl(${hue} 55% 32%)`,
      color: `hsl(${hue} 80% 72%)`,
    }}>
      {initials}
    </div>
  )
}

// ─── Timer ring ───────────────────────────────────────────────────────────────

function TimerRing({ timeLeft, total }: { timeLeft: number; total: number }) {
  const r = 28
  const circ = 2 * Math.PI * r
  const progress = timeLeft / total
  const urgent = timeLeft <= 5
  return (
    <div className={styles.timerWrap}>
      <svg width="72" height="72" viewBox="0 0 72 72">
        <circle cx="36" cy="36" r={r} fill="none" stroke="var(--border-strong)" strokeWidth="4" />
        <circle
          cx="36" cy="36" r={r} fill="none"
          stroke={urgent ? '#f87171' : 'var(--accent)'}
          strokeWidth="4" strokeLinecap="round"
          strokeDasharray={circ}
          strokeDashoffset={circ * (1 - progress)}
          transform="rotate(-90 36 36)"
          style={{ transition: 'stroke-dashoffset 1s linear, stroke 0.3s' }}
        />
      </svg>
      <span className={styles.timerNum} style={{ color: urgent ? '#f87171' : 'var(--text-primary)' }}>
        {timeLeft}
      </span>
    </div>
  )
}

// ─── Players bar ──────────────────────────────────────────────────────────────

function PlayersBar({ players }: { players: QuizPlayer[] }) {
  const sorted = [...players].sort((a, b) => b.score - a.score)
  const maxScore = Math.max(...sorted.map((p) => p.score), 1)
  return (
    <div className={styles.playersBar}>
      {sorted.map((p) => (
        <div key={p.id} className={`${styles.playerBarItem} ${p.id === MY_ID ? styles.playerBarMe : ''}`}>
          <div className={styles.playerBarTop}>
            <Avatar username={p.username} size={28} />
            <span className={styles.playerBarName}>{p.id === MY_ID ? 'Vous' : p.username}</span>
            {p.hasAnswered && <span className={styles.answeredDot} title="A répondu" />}
          </div>
          <div className={styles.scoreBarTrack}>
            <div
              className={styles.scoreBarFill}
              style={{
                width: `${(p.score / maxScore) * 100}%`,
                background: p.id === MY_ID ? 'var(--accent)' : 'var(--border-strong)',
              }}
            />
          </div>
          <span className={styles.playerScore}>{p.score.toLocaleString()}</span>
        </div>
      ))}
    </div>
  )
}

// ─── MCQ phase ────────────────────────────────────────────────────────────────

const MCQ_COLORS = ['#60a5fa', '#f472b6', '#fb923c', '#a78bfa']

function MCQPhase({ question, timeLeft, players, onAnswer, answered, selectedIndex }: {
  question: Extract<Question, { type: 'mcq' }>
  timeLeft: number
  players: QuizPlayer[]
  onAnswer: (i: number) => void
  answered: boolean
  selectedIndex: number | null
}) {
  return (
    <div className={styles.gameLayout}>
      <PlayersBar players={players} />
      <div className={styles.questionArea}>
        <div className={styles.questionHeader}>
          <span className={styles.questionTheme}>{question.theme}</span>
          <TimerRing timeLeft={timeLeft} total={TIME_PER_QUESTION} />
        </div>
        <p className={styles.questionText}>{question.text}</p>
        <div className={styles.mcqGrid}>
          {question.choices.map((choice, i) => {
            const color = MCQ_COLORS[i] ?? '#888'
            const isSelected = selectedIndex === i
            return (
              <button
                key={i}
                className={`${styles.mcqBtn} ${isSelected ? styles.mcqBtnSelected : ''} ${answered && !isSelected ? styles.mcqBtnDimmed : ''}`}
                style={isSelected ? { borderColor: color, background: `${color}22`, color } : {}}
                onClick={() => !answered && onAnswer(i)}
                disabled={answered}
              >
                <span className={styles.mcqLetter} style={{ background: color, color: '#0a0a0a' }}>
                  {String.fromCharCode(65 + i)}
                </span>
                <span className={styles.mcqText}>{choice}</span>
                {isSelected && (
                  <svg width="18" height="18" viewBox="0 0 12 12" fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" style={{ marginLeft: 'auto', flexShrink: 0 }}>
                    <path d="M2 6l3 3 5-5" />
                  </svg>
                )}
              </button>
            )
          })}
        </div>
        {answered && (
          <p className={styles.waitingLabel}>
            En attente des autres joueurs…
            <span className={styles.waitingDots}><span /><span /><span /></span>
          </p>
        )}
      </div>
    </div>
  )
}

// ─── Free text phase ──────────────────────────────────────────────────────────

function FreePhase({ question, timeLeft, players, onAnswer, answered }: {
  question: Extract<Question, { type: 'free' }>
  timeLeft: number
  players: QuizPlayer[]
  onAnswer: (v: string) => void
  answered: boolean
}) {
  const [value, setValue] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)
  useEffect(() => { inputRef.current?.focus() }, [])
  const submit = () => { if (value.trim() && !answered) onAnswer(value.trim()) }

  return (
    <div className={styles.gameLayout}>
      <PlayersBar players={players} />
      <div className={styles.questionArea}>
        <div className={styles.questionHeader}>
          <span className={styles.questionTheme}>{question.theme}</span>
          <TimerRing timeLeft={timeLeft} total={TIME_PER_QUESTION} />
        </div>
        <p className={styles.questionText}>{question.text}</p>
        <div className={styles.freeInputWrap}>
          <input
            ref={inputRef}
            className={styles.freeInput}
            placeholder="Ta réponse…"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && submit()}
            disabled={answered}
            maxLength={80}
          />
          <button className={styles.freeSubmitBtn} onClick={submit} disabled={!value.trim() || answered}>
            Valider
          </button>
        </div>
        {answered && (
          <div className={styles.freeAnsweredWrap}>
            <span className={styles.freeAnsweredLabel}>Réponse envoyée :</span>
            <span className={styles.freeAnsweredValue}>"{value}"</span>
            <p className={styles.waitingLabel}>
              En attente des autres joueurs…
              <span className={styles.waitingDots}><span /><span /><span /></span>
            </p>
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Round results ────────────────────────────────────────────────────────────

function RoundResults({ questionIndex, onNext }: { questionIndex: number; onNext: () => void }) {
  const [revealed, setRevealed] = useState(false)
  useEffect(() => { const t = setTimeout(() => setRevealed(true), 200); return () => clearTimeout(t) }, [])

  return (
    <div className={styles.resultsLayout}>
      <div className={styles.resultsHeader}>
        <span className={styles.resultsLabel}>Question {questionIndex + 1} — Résultats</span>
        <button className={styles.nextBtn} onClick={onNext}>
          {questionIndex + 1 >= TOTAL_QUESTIONS ? 'Voir le podium' : 'Question suivante'}
          <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
            <path d="M5 12h14M12 5l7 7-7 7" />
          </svg>
        </button>
      </div>
      <div className={styles.correctAnswer}>
        <span className={styles.correctLabel}>Bonne réponse</span>
        <span className={styles.correctValue}>Canberra</span>
      </div>
      <div className={styles.resultsList}>
        {MOCK_ROUND_RESULTS.map((p, i) => (
          <div
            key={p.id}
            className={`${styles.resultRow} ${p.id === MY_ID ? styles.resultRowMe : ''}`}
            style={{
              opacity: revealed ? 1 : 0,
              transform: revealed ? 'none' : 'translateY(16px)',
              transition: `opacity .35s ${i * 0.09}s, transform .35s ${i * 0.09}s`,
            }}
          >
            <div className={styles.resultRank}>#{i + 1}</div>
            <Avatar username={p.username} size={36} />
            <div className={styles.resultInfo}>
              <span className={styles.resultName}>{p.id === MY_ID ? 'Vous' : p.username}</span>
              <span className={`${styles.resultAnswer} ${p.correct ? styles.resultAnswerOk : styles.resultAnswerWrong}`}>
                {p.correct ? '✓' : '✗'} {p.answer}
              </span>
            </div>
            <div className={styles.resultPoints}>
              {p.correct
                ? <span className={styles.pointsGained}>+{p.pointsGained}</span>
                : <span className={styles.pointsNone}>+0</span>}
              <span className={styles.totalScore}>{p.score.toLocaleString()} pts</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── Final podium ─────────────────────────────────────────────────────────────

const PODIUM_COLORS = ['#facc15', '#94a3b8', '#cd7c2f']
const PODIUM_LABELS = ['🥇', '🥈', '🥉']

function FinalPodium({ onLeave }: { onLeave: () => void }) {
  const [revealed, setRevealed] = useState(false)
  useEffect(() => { const t = setTimeout(() => setRevealed(true), 200); return () => clearTimeout(t) }, [])
  const myRank = MOCK_FINAL_RANKINGS.findIndex((p) => p.id === MY_ID) + 1

  return (
    <div className={styles.podiumLayout}>
      <div className={styles.podiumStar}>★</div>
      <h2 className={styles.podiumTitle}>Fin de partie</h2>
      {myRank > 0 && (
        <p className={styles.podiumMyRank}>
          Tu termines <strong>{myRank === 1 ? '1er' : `${myRank}ème`}</strong>
          {myRank === 1 ? ' 🎉' : myRank <= 3 ? ' 🎊' : ''}
        </p>
      )}
      <div className={styles.podiumStage}>
        {[1, 0, 2].map((idx) => {
          const p = MOCK_FINAL_RANKINGS[idx]
          if (!p) return null
          const heights = [120, 160, 90]
          return (
            <div key={p.id} className={styles.podiumBlock} style={{
              opacity: revealed ? 1 : 0,
              transform: revealed ? 'none' : 'translateY(30px)',
              transition: `opacity .5s ${idx * 0.12}s, transform .5s ${idx * 0.12}s`,
            }}>
              <div className={styles.podiumPlayerInfo}>
                <Avatar username={p.username} size={44} />
                <span className={styles.podiumPlayerName}>{p.id === MY_ID ? 'Vous' : p.username}</span>
                <span className={styles.podiumPlayerScore}>{p.score.toLocaleString()} pts</span>
              </div>
              <div className={styles.podiumPillar} style={{ height: heights[idx] ?? 90, background: PODIUM_COLORS[idx] ?? '#888' }}>
                <span className={styles.podiumMedal}>{PODIUM_LABELS[idx]}</span>
              </div>
            </div>
          )
        })}
      </div>
      <div className={styles.podiumFullRanking}>
        {MOCK_FINAL_RANKINGS.map((p, i) => (
          <div key={p.id} className={`${styles.podiumRankRow} ${p.id === MY_ID ? styles.podiumRankRowMe : ''}`}
            style={{ opacity: revealed ? 1 : 0, transition: `opacity .4s ${0.4 + i * 0.08}s` }}>
            <span className={styles.podiumRankNum} style={{ color: i < 3 ? PODIUM_COLORS[i] : 'var(--text-muted)' }}>#{i + 1}</span>
            <Avatar username={p.username} size={28} />
            <span className={styles.podiumRankName}>{p.id === MY_ID ? 'Vous' : p.username}</span>
            <span className={styles.podiumRankScore}>{p.score.toLocaleString()} pts</span>
          </div>
        ))}
      </div>
      <div className={styles.podiumActions}>
        <button className={styles.podiumBtnGhost}>Rejouer</button>
        <button className={styles.podiumBtnAccent} onClick={onLeave}>Retour au lobby</button>
      </div>
    </div>
  )
}

// ─── Root ─────────────────────────────────────────────────────────────────────

export function QuizGame({ onLeave }: { onLeave: () => void }) {
  const [phase, setPhase] = useState<QuizPhase>('question_mcq')
  const [questionIndex, setQuestionIndex] = useState(0)
  const [timeLeft, setTimeLeft] = useState(TIME_PER_QUESTION)
  const [players, setPlayers] = useState<QuizPlayer[]>(MOCK_PLAYERS)
  const [answered, setAnswered] = useState(false)
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const currentQ = MOCK_QUESTIONS[questionIndex]

  useEffect(() => {
    if (phase !== 'question_mcq' && phase !== 'question_free') return
    setTimeLeft(TIME_PER_QUESTION)
    setAnswered(false)
    setSelectedIndex(null)
    setPlayers(MOCK_PLAYERS.map((p) => ({ ...p, hasAnswered: false })))

    timerRef.current = setInterval(() => {
      setTimeLeft((t) => {
        if (t <= 1) { clearInterval(timerRef.current!); setTimeout(() => setPhase('round_results'), 400); return 0 }
        if (t === 15) setPlayers((ps) => ps.map((p) => p.id === '1' ? { ...p, hasAnswered: true } : p))
        if (t === 10) setPlayers((ps) => ps.map((p) => p.id === '3' ? { ...p, hasAnswered: true } : p))
        if (t === 6)  setPlayers((ps) => ps.map((p) => p.id === '2' ? { ...p, hasAnswered: true } : p))
        return t - 1
      })
    }, 1000)

    return () => clearInterval(timerRef.current!)
  }, [phase, questionIndex])

  const handleAnswer = (indexOrValue: number | string) => {
    clearInterval(timerRef.current!)
    setAnswered(true)
    if (typeof indexOrValue === 'number') setSelectedIndex(indexOrValue)
    setPlayers((ps) => ps.map((p) => p.id === MY_ID ? { ...p, hasAnswered: true } : p))
    setTimeout(() => setPhase('round_results'), 1800)
  }

  const handleNext = () => {
    const next = questionIndex + 1
    if (next >= TOTAL_QUESTIONS) { setPhase('final'); return }
    setQuestionIndex(next)
    setPhase(MOCK_QUESTIONS[next]?.type === 'free' ? 'question_free' : 'question_mcq')
  }

  if (phase === 'final') return <FinalPodium onLeave={onLeave} />
  if (phase === 'round_results') return <RoundResults questionIndex={questionIndex} onNext={handleNext} />

  return (
    <div className={styles.root}>
      <div className={styles.topBar}>
        <button className={styles.leaveBtn} onClick={onLeave}>
          <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <path d="M19 12H5M12 5l-7 7 7 7" />
          </svg>
          Quitter
        </button>
        <div className={styles.questionCounter}>
          {Array.from({ length: TOTAL_QUESTIONS }).map((_, i) => (
            <div key={i} className={styles.counterDot} style={{
              background: i < questionIndex ? 'var(--accent)' : i === questionIndex ? 'var(--text-primary)' : 'var(--border-strong)',
              transform: i === questionIndex ? 'scale(1.3)' : 'scale(1)',
            }} />
          ))}
        </div>
        <span className={styles.questionNum}>{questionIndex + 1} / {TOTAL_QUESTIONS}</span>
      </div>

      {phase === 'question_mcq' && currentQ?.type === 'mcq' && (
        <MCQPhase question={currentQ} timeLeft={timeLeft} players={players}
          onAnswer={handleAnswer} answered={answered} selectedIndex={selectedIndex} />
      )}
      {phase === 'question_free' && currentQ?.type === 'free' && (
        <FreePhase question={currentQ} timeLeft={timeLeft} players={players}
          onAnswer={handleAnswer} answered={answered} />
      )}
    </div>
  )
}
