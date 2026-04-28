import { useEffect, useState } from 'react'
import { Avatar } from '../../components/Avatar'
import styles from './RoundRecap.module.css'

interface RecapPlayer {
  id: string
  username: string
  avatarUrl: string | null
  totalScore: number
  roundScore: number
}

interface RoundRecapProps {
  round: number
  totalRounds: number
  scores: RecapPlayer[]
  isLastTurn?: boolean
  word?: string | null
  onClose: () => void
}

export function RoundRecap({ round, totalRounds, scores, isLastTurn, word, onClose }: RoundRecapProps) {
  const [timeLeft, setTimeLeft] = useState(5)
  const sorted = [...scores].sort((a, b) => b.totalScore - a.totalScore)
  const isLast = round >= totalRounds

  useEffect(() => {
    const interval = setInterval(() => {
      setTimeLeft((t) => {
        if (t <= 1) { clearInterval(interval); setTimeout(onClose, 0); return 0 }
        return t - 1
      })
    }, 1000)
    return () => clearInterval(interval)
  }, [onClose])

  return (
    <div className={styles.overlay}>
      <div className={styles.modal}>
        {word && (
          <div className={styles.wordReveal}>
            <span className={styles.wordRevealLabel}>Le mot était</span>
            <strong className={styles.wordRevealWord}>{word}</strong>
          </div>
        )}
        <div className={styles.header}>
          <div>
            <p className={styles.roundLabel}>Round {round} / {totalRounds}</p>
            <h2 className={styles.title}>{isLastTurn ? 'Fin du round !' : 'Fin du tour'}</h2>
          </div>
          <div className={styles.timer}>{timeLeft}</div>
        </div>
        <div className={styles.scores}>
          {sorted.map((p, i) => (
            <div key={p.id} className={styles.row}>
              <span className={styles.rank}>#{i + 1}</span>
              <Avatar username={p.username} avatarUrl={p.avatarUrl} size={36} />
              <span className={styles.name}>{p.username}</span>
              <div className={styles.scoreGroup}>
                {p.roundScore > 0 && (
                  <span className={styles.roundScore}>+{p.roundScore}</span>
                )}
                <span className={styles.totalScore}>{p.totalScore} pts</span>
              </div>
            </div>
          ))}
        </div>

        <p className={styles.next}>
          {isLast ? 'Fin de la partie dans…' : isLastTurn ? 'Prochain round dans…' : 'Prochain dessinateur dans…'} {timeLeft}s
        </p>
      </div>
    </div>
  )
}
