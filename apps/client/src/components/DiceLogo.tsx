interface DiceLogoProps {
  size?: number
}

export function DiceLogo({ size = 36 }: DiceLogoProps) {
  const r = size / 2
  const dotR = size * 0.09
  // Positions des 5 points (dé face 5)
  const dots = [
    { cx: r * 0.65, cy: r * 0.65 }, // haut gauche
    { cx: r * 1.35, cy: r * 0.65 }, // haut droite
    { cx: r,        cy: r          }, // centre
    { cx: r * 0.65, cy: r * 1.35 }, // bas gauche
    { cx: r * 1.35, cy: r * 1.35 }, // bas droite
  ]

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} fill="none" style={{ flexShrink: 0 }}>
      {/* Cercle fond teal */}
      <circle cx={r} cy={r} r={r} fill="#3d9e8a" />
      {/* Carré blanc du dé */}
      <rect
        x={size * 0.17}
        y={size * 0.17}
        width={size * 0.66}
        height={size * 0.66}
        rx={size * 0.12}
        fill="white"
      />
      {/* Points teal */}
      {dots.map((d, i) => (
        <circle key={i} cx={d.cx} cy={d.cy} r={dotR} fill="#3d9e8a" />
      ))}
    </svg>
  )
}
