import './nextResults.css'

interface ResultBallProps {
  value: number
}

// Bola física blanca/metálica compartida por Pick 3 y Pick 4 (Current Next Result) -- no existe
// un equivalente DOM en el resto del proyecto (ResultBadge.tsx es Pixi, no reutilizable acá).
export function ResultBall({ value }: ResultBallProps) {
  return (
    <span className="admin-result-ball">
      <span className="admin-result-ball-number">{value}</span>
    </span>
  )
}
