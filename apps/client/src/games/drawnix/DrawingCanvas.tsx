import { useRef, useEffect, useState, useCallback } from 'react'
import styles from './DrawingCanvas.module.css'

interface Point { x: number; y: number }
interface Stroke { points: Point[]; color: string; size: number; tool: 'pen' | 'eraser' }
interface FillAction { type: 'fill'; x: number; y: number; color: string; _normalized?: boolean }

type DrawAction = Stroke | FillAction

const COLORS = [
  '#1c1917', '#ef4444', '#f97316', '#eab308', '#22c55e',
  '#3b82f6', '#8b5cf6', '#ec4899', '#ffffff', '#94a3b8',
]
const SIZES = [3, 6, 12, 20]

interface DrawingCanvasProps {
  isDrawer: boolean
  onDraw: (action: DrawAction) => void
  onClear: () => void
  onCanvasUpdate?: (data: string) => void
  restoreData?: string | null
}

// ── Flood fill BFS ─────────────────────────────────────────────────────────────

// ── Flood fill via Web Worker (non-bloquant) ──────────────────────────────────

let fillWorker: Worker | null = null

function getFillWorker(): Worker {
  if (!fillWorker) {
    fillWorker = new Worker(
      new URL('./floodFill.worker.ts', import.meta.url),
      { type: 'module' }
    )
  }
  return fillWorker
}


export function DrawingCanvas({ isDrawer, onDraw, onClear, onCanvasUpdate, restoreData }: DrawingCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [color, setColor] = useState('#1c1917')
  const [size, setSize] = useState(6)
  const [tool, setTool] = useState<'pen' | 'eraser' | 'fill'>('pen')
  const drawing = useRef(false)
  const currentPoints = useRef<Point[]>([])
  const lastPos = useRef<Point | null>(null)

  // ── Draw stroke ────────────────────────────────────────────────────────────

  const drawStroke = useCallback((stroke: Stroke & { _normalized?: boolean }, ctx: CanvasRenderingContext2D) => {
    if (stroke.points.length < 2) return
    const canvas = canvasRef.current
    const w = canvas?.width ?? 800
    const h = canvas?.height ?? 600
    const minDim = Math.min(w, h)
    const pts = stroke._normalized
      ? stroke.points.map(p => ({ x: p.x * w, y: p.y * h }))
      : stroke.points
    const lineWidth = stroke._normalized
      ? stroke.size * minDim * (stroke.tool === 'eraser' ? 3 : 1)
      : (stroke.tool === 'eraser' ? stroke.size * 3 : stroke.size)
    ctx.beginPath()
    ctx.strokeStyle = stroke.tool === 'eraser' ? '#ffffff' : stroke.color
    ctx.lineWidth = lineWidth
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
    ctx.moveTo(pts[0]!.x, pts[0]!.y)
    for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i]!.x, pts[i]!.y)
    ctx.stroke()
  }, [])

  // ── Restore canvas from prop ───────────────────────────────────────────────

  useEffect(() => {
    if (!restoreData) return
    const canvas = canvasRef.current
    const ctx = canvas?.getContext('2d')
    if (!canvas || !ctx) return
    const img = new Image()
    img.onload = () => { ctx.clearRect(0, 0, canvas.width, canvas.height); ctx.drawImage(img, 0, 0, canvas.width, canvas.height) }
    img.onerror = (e) => console.log('[canvas] image load error:', e)
    img.src = restoreData
  }, [restoreData])

  // ── Listen for remote strokes / fills ─────────────────────────────────────

  useEffect(() => {
    const canvas = canvasRef.current
    const ctx = canvas?.getContext('2d', { willReadFrequently: true })
    if (!ctx) return

    const onStroke = (e: Event) => {
      const action = (e as CustomEvent).detail as DrawAction
      if ('type' in action && action.type === 'fill') {
        const w = canvas!.width, h = canvas!.height
        const x = action._normalized ? Math.floor(action.x * w) : action.x
        const y = action._normalized ? Math.floor(action.y * h) : action.y
        const imageData = ctx.getImageData(0, 0, w, h)
        const cloned = new ImageData(new Uint8ClampedArray(imageData.data), w, h)
        const worker = getFillWorker()
        worker.onmessage = (ev) => {
          if (ev.data.changed) ctx.putImageData(ev.data.imageData, 0, 0)
        }
        worker.postMessage(
          { imageData: cloned, width: w, height: h, startX: x, startY: y, fillColor: action.color },
          [cloned.data.buffer]
        )
      } else {
        drawStroke(action as Stroke, ctx)
      }
    }
    const onClearEv = () => { if (canvas) ctx.clearRect(0, 0, canvas.width, canvas.height) }
    const onRestore = (e: Event) => {
      const data = (e as CustomEvent).detail as string
      if (!data || !canvas) return
      const img = new Image()
      img.onload = () => { ctx.clearRect(0, 0, canvas.width, canvas.height); ctx.drawImage(img, 0, 0, canvas.width, canvas.height) }
      img.src = data
    }

    window.addEventListener('drawnix-stroke', onStroke)
    window.addEventListener('drawnix-clear', onClearEv)
    window.addEventListener('drawnix-restore', onRestore)
    return () => {
      window.removeEventListener('drawnix-stroke', onStroke)
      window.removeEventListener('drawnix-clear', onClearEv)
      window.removeEventListener('drawnix-restore', onRestore)
    }
  }, [drawStroke])

  // ── Resize canvas ──────────────────────────────────────────────────────────

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ro = new ResizeObserver(() => {
      const ctx = canvas.getContext('2d', { willReadFrequently: true })
      if (!ctx) return
      const tmp = document.createElement('canvas')
      tmp.width = canvas.width; tmp.height = canvas.height
      tmp.getContext('2d')?.drawImage(canvas, 0, 0)
      canvas.width = canvas.offsetWidth; canvas.height = canvas.offsetHeight
      ctx.drawImage(tmp, 0, 0)
    })
    ro.observe(canvas)
    canvas.width = canvas.offsetWidth; canvas.height = canvas.offsetHeight
    return () => ro.disconnect()
  }, [])

  // ── Mouse/touch helpers ────────────────────────────────────────────────────

  const getPos = (e: React.MouseEvent | React.TouchEvent, canvas: HTMLCanvasElement): Point => {
    const rect = canvas.getBoundingClientRect()
    const scaleX = canvas.width / rect.width, scaleY = canvas.height / rect.height
    if ('touches' in e) {
      const t = e.touches[0]!
      return { x: (t.clientX - rect.left) * scaleX, y: (t.clientY - rect.top) * scaleY }
    }
    return { x: (e.clientX - rect.left) * scaleX, y: (e.clientY - rect.top) * scaleY }
  }

  // ── Fill tool click ────────────────────────────────────────────────────────

  const handleFillClick = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    if (!isDrawer || tool !== 'fill') return
    const canvas = canvasRef.current
    const ctx = canvas?.getContext('2d', { willReadFrequently: true })
    if (!canvas || !ctx) return

    const pos = getPos(e, canvas)
    const x = Math.floor(pos.x), y = Math.floor(pos.y)
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)

    // Envoyer au worker (transfert zero-copy du buffer)
    const worker = getFillWorker()
    const cloned = new ImageData(
      new Uint8ClampedArray(imageData.data),
      imageData.width, imageData.height
    )
    worker.onmessage = (ev) => {
      if (ev.data.changed) {
        ctx.putImageData(ev.data.imageData, 0, 0)
        if (onCanvasUpdate) onCanvasUpdate(canvas.toDataURL('image/png', 0.3))
      }
    }
    worker.postMessage(
      { imageData: cloned, width: canvas.width, height: canvas.height, startX: x, startY: y, fillColor: color },
      [cloned.data.buffer]
    )

    // Envoyer l'action fill normalisée immédiatement
    onDraw({ type: 'fill', x: pos.x / canvas.width, y: pos.y / canvas.height, color, _normalized: true })
  }, [isDrawer, tool, color, onDraw, onCanvasUpdate])

  // ── Drawing events ─────────────────────────────────────────────────────────

  const startDraw = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    if (!isDrawer || tool === 'fill') return
    const canvas = canvasRef.current
    if (!canvas) return
    drawing.current = true
    const pos = getPos(e, canvas)
    currentPoints.current = [pos]
    lastPos.current = pos
  }, [isDrawer, tool])

  const draw = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    if (!isDrawer || !drawing.current || tool === 'fill') return
    const canvas = canvasRef.current
    const ctx = canvas?.getContext('2d')
    if (!canvas || !ctx) return
    const pos = getPos(e, canvas)
    currentPoints.current.push(pos)
    if (lastPos.current) {
      ctx.beginPath()
      ctx.strokeStyle = tool === 'eraser' ? '#ffffff' : color
      ctx.lineWidth = tool === 'eraser' ? size * 3 : size
      ctx.lineCap = 'round'; ctx.lineJoin = 'round'
      ctx.moveTo(lastPos.current.x, lastPos.current.y)
      ctx.lineTo(pos.x, pos.y)
      ctx.stroke()
    }
    lastPos.current = pos
    if (currentPoints.current.length % 5 === 0) {
      const w = canvas.width, h = canvas.height
      const norm = currentPoints.current.slice(-6).map(p => ({ x: p.x / w, y: p.y / h }))
      onDraw({ points: norm, color, size: size / Math.min(w, h), tool, _normalized: true } as any)
    }
  }, [isDrawer, color, size, tool, onDraw])

  const endDraw = useCallback(() => {
    if (!drawing.current) return
    drawing.current = false
    const canvas = canvasRef.current
    if (currentPoints.current.length > 0 && canvas) {
      const w = canvas.width, h = canvas.height
      const norm = currentPoints.current.map(p => ({ x: p.x / w, y: p.y / h }))
      onDraw({ points: norm, color, size: size / Math.min(w, h), tool, _normalized: true } as any)
    }
    currentPoints.current = []
    lastPos.current = null
    if (onCanvasUpdate && canvasRef.current) {
      onCanvasUpdate(canvasRef.current.toDataURL('image/png', 0.5))
    }
  }, [color, size, tool, onDraw, onCanvasUpdate])

  const handleClear = () => {
    const canvas = canvasRef.current
    const ctx = canvas?.getContext('2d')
    if (canvas && ctx) ctx.clearRect(0, 0, canvas.width, canvas.height)
    onClear()
  }

  const cursor = !isDrawer ? 'default' : tool === 'eraser' ? 'cell' : tool === 'fill' ? 'crosshair' : 'crosshair'

  return (
    <div className={styles.wrap}>
      <canvas
        ref={canvasRef}
        className={styles.canvas}
        style={{ cursor }}
        onMouseDown={(e) => { tool === 'fill' ? handleFillClick(e) : startDraw(e) }}
        onMouseMove={draw}
        onMouseUp={endDraw}
        onMouseLeave={endDraw}
        onTouchStart={(e) => { tool === 'fill' ? handleFillClick(e) : startDraw(e) }}
        onTouchMove={draw}
        onTouchEnd={endDraw}
      />

      <div className={styles.toolbar} style={{ opacity: isDrawer ? 1 : 0.3, pointerEvents: isDrawer ? 'auto' : 'none' }}>
        {/* Colors */}
        <div className={styles.colors}>
          {COLORS.map((c) => (
            <button key={c} className={`${styles.colorBtn} ${color === c && tool !== 'eraser' ? styles.colorBtnActive : ''}`}
              style={{ background: c, border: c === '#ffffff' ? '1px solid var(--border)' : 'none' }}
              onClick={() => { setColor(c); if (tool === 'eraser') setTool('pen') }} />
          ))}
        </div>

        <div className={styles.toolSep} />

        {/* Sizes */}
        <div className={styles.sizes}>
          {SIZES.map((s) => (
            <button key={s} className={`${styles.sizeBtn} ${size === s && tool === 'pen' ? styles.sizeBtnActive : ''}`}
              onClick={() => { setSize(s); setTool('pen') }}>
              <div className={styles.sizeDot} style={{ width: Math.min(s * 1.5, 20), height: Math.min(s * 1.5, 20) }} />
            </button>
          ))}
        </div>

        <div className={styles.toolSep} />

        {/* Fill tool — seau de peinture */}
        <button className={`${styles.toolBtn} ${tool === 'fill' ? styles.toolBtnActive : ''}`}
          onClick={() => setTool('fill')} title="Seau de peinture">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M7 7h10l-1 9a2 2 0 01-2 2H9a2 2 0 01-2-2L6 7z"/>
            <path d="M5 7h14"/>
            <path d="M9 7V5a1 1 0 011-1h4a1 1 0 011 1v2"/>
            <circle cx="20" cy="20" r="1.5" fill="currentColor" stroke="none"/>
            <path d="M20 16.5c0 0-2 2-2 3.5" stroke="currentColor" strokeWidth="1.2"/>
          </svg>
        </button>

        {/* Eraser */}
        <button className={`${styles.toolBtn} ${tool === 'eraser' ? styles.toolBtnActive : ''}`}
          onClick={() => setTool('eraser')} title="Gomme">
          <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
            <path d="M20 20H7L3 16l10-10 7 7-3.5 3.5" /><path d="M6.5 17.5l4-4" />
          </svg>
        </button>

        {/* Clear */}
        <button className={styles.toolBtn} onClick={handleClear} title="Tout effacer">
          <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
            <path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6" />
          </svg>
        </button>
      </div>
    </div>
  )
}
