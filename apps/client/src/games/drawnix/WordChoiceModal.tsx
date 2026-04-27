import { useState, useEffect } from 'react'
import styles from './WordChoiceModal.module.css'

interface WordChoiceModalProps {
  words: string[]
  onChoose: (word: string) => void
}

export function WordChoiceModal({ words, onChoose }: WordChoiceModalProps) {
  const [timeLeft, setTimeLeft] = useState(15)

  useEffect(() => {
    const interval = setInterval(() => {
      setTimeLeft((t) => {
        if (t <= 1) { clearInterval(interval); return 0 }
        return t - 1
      })
    }, 1000)
    return () => clearInterval(interval)
  }, [])

  return (
    <div className={styles.overlay}>
      <div className={styles.modal}>
        <p className={styles.title}>Choisissez un mot à faire deviner</p>
        <p className={styles.sub}>Vous avez <strong style={{ color: timeLeft <= 5 ? '#ef4444' : 'inherit' }}>{timeLeft}s</strong> pour choisir</p>
        <div className={styles.words}>
          {words.map((w) => (
            <button key={w} className={styles.wordBtn} onClick={() => onChoose(w)}>
              {w}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
