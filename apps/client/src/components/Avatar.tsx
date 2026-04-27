import styles from './Avatar.module.css'

interface AvatarProps {
  username: string
  avatarUrl?: string | null
  size?: number
}

const PASTELS = [
  ['#ddd6fe','#7c3aed'], ['#bbf7d0','#16a34a'], ['#fed7aa','#ea580c'],
  ['#bae6fd','#0284c7'], ['#fecdd3','#e11d48'], ['#fef08a','#ca8a04'],
]

export function Avatar({ username, avatarUrl, size = 36 }: AvatarProps) {
  const hue = username.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0) % 360
  const [bg, fg] = PASTELS[Math.floor((hue / 360) * PASTELS.length)] ?? PASTELS[0]!

  if (avatarUrl) {
    return (
      <img
        src={avatarUrl}
        alt={username}
        className={styles.img}
        style={{ width: size, height: size }}
      />
    )
  }

  return (
    <div
      className={styles.initials}
      style={{ width: size, height: size, fontSize: size * 0.36, background: bg, color: fg }}
    >
      {username.slice(0, 2).toUpperCase()}
    </div>
  )
}
