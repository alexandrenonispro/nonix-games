import { useNavigate } from 'react-router-dom'
import { DiceLogo } from '../components/DiceLogo'
import styles from './NotFoundPage.module.css'

export function NotFoundPage() {
  const navigate = useNavigate()

  return (
    <div className={styles.root}>
      <div className={styles.card}>
        <DiceLogo size={56} />
        <h1 className={styles.code}>404</h1>
        <p className={styles.title}>Page introuvable</p>
        <p className={styles.desc}>
          Cette page n'existe pas ou a été déplacée.
        </p>
        <button className={styles.btn} onClick={() => navigate('/', { replace: true })}>
          ← Retour au lobby
        </button>
      </div>
    </div>
  )
}
