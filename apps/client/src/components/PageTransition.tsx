import { useLocation } from 'react-router-dom'
import styles from './PageTransition.module.css'

interface PageTransitionProps {
  children: React.ReactNode
}

export function PageTransition({ children }: PageTransitionProps) {
  const location = useLocation()
  return (
    <div key={location.pathname} className={styles.wrap}>
      {children}
    </div>
  )
}
