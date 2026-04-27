import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '../auth/AuthContext'
import { usersApi, type AppNotification } from '../lib/usersApi'
import styles from './NotifBell.module.css'

interface NotifBellProps {
  onFriendRequestHandled?: () => void
}

export function NotifBell({ onFriendRequestHandled }: NotifBellProps) {
  const { token } = useAuth()
  const [open, setOpen] = useState(false)
  const [notifs, setNotifs] = useState<AppNotification[]>([])

  const fetchNotifs = useCallback(async () => {
    if (!token) return
    try {
      const { notifications } = await usersApi.getNotifications(token)
      setNotifs(notifications)
    } catch {}
  }, [token])

  useEffect(() => {
    fetchNotifs()
    const interval = setInterval(fetchNotifs, 15000) // poll toutes les 15s
    return () => clearInterval(interval)
  }, [fetchNotifs])

  const handleRespond = async (notif: AppNotification, accept: boolean) => {
    if (!token) return
    try {
      await usersApi.respondToRequest(notif.data.friendshipId, accept, token)
      await usersApi.markNotificationRead(notif.id, token)
      setNotifs((ns) => ns.filter((n) => n.id !== notif.id))
      onFriendRequestHandled?.()
    } catch (e: any) { alert(e.message) }
  }

  const handleDismiss = async (notif: AppNotification) => {
    if (!token) return
    await usersApi.markNotificationRead(notif.id, token)
    setNotifs((ns) => ns.filter((n) => n.id !== notif.id))
  }

  const unread = notifs.length

  return (
    <div className={styles.wrap}>
      <button className={styles.bell} onClick={() => setOpen((o) => !o)}>
        <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
          <path d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6 6 0 00-5-5.917V4a1 1 0 10-2 0v1.083A6 6 0 006 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"/>
        </svg>
        {unread > 0 && <span className={styles.badge}>{unread}</span>}
      </button>

      {open && (
        <>
          <div className={styles.backdrop} onClick={() => setOpen(false)} />
          <div className={styles.dropdown}>
            <div className={styles.dropdownHeader}>Notifications</div>
            {notifs.length === 0 && (
              <div className={styles.empty}>Aucune notification</div>
            )}
            {notifs.map((n) => (
              <div key={n.id} className={styles.notif}>
                <div className={styles.notifIcon}>
                  {n.type === 'FRIEND_REQUEST' ? '👋' : '✅'}
                </div>
                <div className={styles.notifContent}>
                  {n.type === 'FRIEND_REQUEST' && (
                    <>
                      <p className={styles.notifText}>
                        <strong>{n.sender?.username}</strong> vous a envoyé une demande d'ami
                      </p>
                      <div className={styles.notifActions}>
                        <button className={styles.acceptBtn} onClick={() => handleRespond(n, true)}>Accepter</button>
                        <button className={styles.declineBtn} onClick={() => handleRespond(n, false)}>Refuser</button>
                      </div>
                    </>
                  )}
                  {n.type === 'FRIEND_ACCEPTED' && (
                    <>
                      <p className={styles.notifText}>
                        <strong>{n.sender?.username}</strong> a accepté votre demande d'ami 🎉
                      </p>
                      <button className={styles.dismissBtn} onClick={() => handleDismiss(n)}>OK</button>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  )
}
