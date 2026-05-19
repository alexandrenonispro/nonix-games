import { useEffect, useState } from 'react'
import styles from './XpNotification.module.css'

interface XpPayload {
  xpGained: number
  newXp: number
  newLevel: number
  newRank: string
  leveledUp: boolean
  oldLevel: number
}

interface Props {
  socket: any
}

export function XpNotification({ socket }: Props) {
  const [notif, setNotif] = useState<XpPayload | null>(null)
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    if (!socket) return
    console.log('[XpNotification] registering on socket:', socket.id)
    const handler = (data: XpPayload) => {
      console.log('[XpNotification] received:', data)
      setNotif(data)
      setVisible(true)
      setTimeout(() => setVisible(false), 4500)
      setTimeout(() => setNotif(null), 5000)
    }
    socket.on('user:xp-update', handler)
    return () => { socket.off('user:xp-update', handler) }
  }, [socket?.id])

  if (!notif) return null

  return (
    <div className={`${styles.toast} ${visible ? styles.toastVisible : styles.toastHidden}`}>
      <div className={styles.xpRow}>
        <span className={styles.xpIcon}>⭐</span>
        <span className={styles.xpGained}>+{notif.xpGained} XP</span>
      </div>
      {notif.leveledUp && (
        <div className={styles.levelUp}>
          🎉 Niveau {notif.newLevel} atteint !
        </div>
      )}
      {notif.leveledUp && (
        <div className={styles.rankUp}>
          🏅 {notif.newRank}
        </div>
      )}
      <div className={styles.xpTotal}>{notif.newXp} XP total · Lv.{notif.newLevel}</div>
    </div>
  )
}
