import { Avatar } from '../../components/Avatar'
import { sounds } from '../../lib/sounds'
import { useEffect, useRef, useCallback } from 'react'
import styles from './DrawnixPodium.module.css'

interface RankingPlayer {
  id: string; username: string; avatarUrl: string | null
  score: number; rank: number
}

const MEDALS = ['🥇', '🥈', '🥉']
const PODIUM_COLORS = ['#facc15', '#94a3b8', '#cd7c2f']

export function DrawnixPodium({ rankings, onLeave }: { rankings: RankingPlayer[]; onLeave: () => void }) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const animRef = useRef<number>(0)

  const COLORS = ['#3d9e8a', '#facc15', '#f97316', '#ec4899', '#8b5cf6', '#22c55e', '#3b82f6', '#ef4444']

  useEffect(() => {
    sounds.victory()
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')!
    canvas.width = window.innerWidth
    canvas.height = window.innerHeight

    // Créer les particules — réparties sur toute la hauteur de l'écran dès le départ
    const particles = Array.from({ length: 350 }, (_, i) => ({
      x: Math.random() * canvas.width,
      // Répartir verticalement : 60% en haut (hors écran), 40% déjà visibles sur toute la hauteur
      y: i < 210
        ? -20 - Math.random() * 400          // hors écran en haut
        : Math.random() * canvas.height * 0.7, // déjà dans l'écran
      vx: (Math.random() - 0.5) * 3,
      vy: 1.5 + Math.random() * 4,
      color: COLORS[i % COLORS.length]!,
      size: 5 + Math.random() * 9,
      rotation: Math.random() * 360,
      rotationSpeed: (Math.random() - 0.5) * 8,
      shape: Math.random() > 0.5 ? 'rect' : 'circle' as 'rect' | 'circle',
      opacity: 1,
      wobble: Math.random() * Math.PI * 2,
      wobbleSpeed: 0.04 + Math.random() * 0.06,
    }))

    let frame = 0
    const FADE_START = 240 // ~4s à 60fps
    const FADE_SPEED = 0.012 // disparition en ~1s

    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height)
      frame++

      let anyVisible = false
      particles.forEach(p => {
        p.y += p.vy
        p.x += p.vx + Math.sin(p.wobble) * 0.8
        p.wobble += p.wobbleSpeed
        p.rotation += p.rotationSpeed
        p.vy += 0.06
        // Commencer à s'estomper après FADE_START frames
        if (frame > FADE_START) p.opacity = Math.max(0, p.opacity - FADE_SPEED)
        if (p.opacity <= 0) return
        anyVisible = true

        ctx.save()
        ctx.globalAlpha = p.opacity
        ctx.translate(p.x, p.y)
        ctx.rotate((p.rotation * Math.PI) / 180)
        ctx.fillStyle = p.color
        if (p.shape === 'rect') {
          ctx.fillRect(-p.size / 2, -p.size / 4, p.size, p.size / 2)
        } else {
          ctx.beginPath()
          ctx.arc(0, 0, p.size / 2, 0, Math.PI * 2)
          ctx.fill()
        }
        ctx.restore()
      })

      if (anyVisible) {
        animRef.current = requestAnimationFrame(animate)
      } else {
        ctx.clearRect(0, 0, canvas.width, canvas.height)
      }
    }

    animRef.current = requestAnimationFrame(animate)
    return () => cancelAnimationFrame(animRef.current)
  }, [])

  const top3 = rankings.slice(0, 3)
  const rest = rankings.slice(3)
  const podiumOrder = [rankings[1], rankings[0], rankings[2]].filter(Boolean) as RankingPlayer[]
  const heights = [110, 150, 85]

  return (
    <div className={styles.root}>
      <canvas ref={canvasRef} style={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 9999 }} />
      <div className={styles.header}>
        <span className={styles.star}>★</span>
        <h1 className={styles.title}>Drawnix — Résultats</h1>
      </div>

      {/* Podium visuel */}
      <div className={styles.stage}>
        {podiumOrder.map((p, i) => {
          const realRank = rankings.findIndex((r) => r.id === p.id)
          const height = heights[i] ?? 85
          return (
            <div key={p.id} className={styles.podiumBlock}
              style={{ animation: `fadeUp .5s ${i * 0.12}s both` }}>
              <div className={styles.podiumPlayer}>
                <Avatar username={p.username} avatarUrl={p.avatarUrl} size={48} />
                <span className={styles.podiumName}>{p.username}</span>
                <span className={styles.podiumScore}>{p.score} pts</span>
              </div>
              <div className={styles.podiumPillar}
                style={{ height, background: PODIUM_COLORS[realRank] ?? '#94a3b8' }}>
                <span className={styles.podiumMedal}>{MEDALS[realRank] ?? `#${realRank + 1}`}</span>
              </div>
            </div>
          )
        })}
      </div>

      {/* Reste du classement */}
      {rest.length > 0 && (
        <div className={styles.restList}>
          {rest.map((p) => (
            <div key={p.id} className={styles.restRow}>
              <span className={styles.restRank}>#{p.rank}</span>
              <Avatar username={p.username} avatarUrl={p.avatarUrl} size={28} />
              <span className={styles.restName}>{p.username}</span>
              <span className={styles.restScore}>{p.score} pts</span>
            </div>
          ))}
        </div>
      )}

      <div className={styles.actions}>
        <button className={styles.leaveBtn} onClick={onLeave}>Retour au lobby</button>
      </div>
    </div>
  )
}
