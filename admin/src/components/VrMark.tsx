import './vrMark.css'

const DOT_COUNT = 16

export function VrMark({ size = 44 }: { size?: number }) {
  const radius = size / 2
  const dotSize = size * 0.075

  return (
    <div className="vr-mark" style={{ width: size, height: size }}>
      {Array.from({ length: DOT_COUNT }).map((_, i) => {
        const angle = (i / DOT_COUNT) * Math.PI * 2
        const x = radius + Math.cos(angle) * (radius - dotSize * 0.9)
        const y = radius + Math.sin(angle) * (radius - dotSize * 0.9)
        const isAccent = i % 3 === 0
        return (
          <span
            key={i}
            className={`vr-mark__dot${isAccent ? ' vr-mark__dot--accent' : ''}`}
            style={{ width: dotSize, height: dotSize, left: x - dotSize / 2, top: y - dotSize / 2 }}
          />
        )
      })}
      <span className="vr-mark__letters" style={{ fontSize: size * 0.4 }}>
        VR
      </span>
    </div>
  )
}
