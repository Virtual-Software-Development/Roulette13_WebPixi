import { getPocketAngleDegForGeometry } from '../../utils/wheelPositions'
import type { PocketGeometry } from '../../utils/wheelPositions'
import type { WheelPocket, WheelType } from '../../types/wheel'

// Umbral debajo del cual un cambio de ángulo entre frames se considera imperceptible. A los
// radios que usan estos indicadores (~90-120px desde el centro de la rueda), 0.05° de arco es
// bien sub-pixel (~0.1px de desplazamiento), así que saltear el re-render en ese caso no se nota
// -- y a cambio evita que React reconcilie/vuelva a pintar diamantes que en la práctica no se
// movieron. Esto pasa seguido durante la desaceleración/parada del video (useWheelVideoPocketGeometry.ts
// sigue reportando un frame real distinto, pero el ángulo medido para esa casilla puntual cambia
// menos de un grado entre frames consecutivos).
export const POCKET_ANGLE_MEMO_THRESHOLD_DEG = 0.05

function angleDeltaDeg(a: number, b: number): number {
  let delta = (b - a) % 360
  if (delta > 180) delta -= 360
  if (delta < -180) delta += 360
  return delta
}

// Usado como parte del comparador de React.memo de ColumnDiamondIndicator/DozenDiamondIndicator
// -- true si el ángulo de ESTA casilla puntual cambió lo suficiente como para justificar un
// re-render (no compara la geometría completa: dos objetos PocketGeometry distintos pueden dar
// el mismo ángulo para esta casilla en particular aunque otras casillas sí se hayan movido).
export function pocketAngleChangedBeyondThreshold(
  pocket: WheelPocket,
  wheelType: WheelType,
  prevGeometry: PocketGeometry,
  nextGeometry: PocketGeometry,
): boolean {
  if (prevGeometry === nextGeometry) return false
  const prevAngle = getPocketAngleDegForGeometry(pocket, wheelType, prevGeometry)
  const nextAngle = getPocketAngleDegForGeometry(pocket, wheelType, nextGeometry)
  return Math.abs(angleDeltaDeg(prevAngle, nextAngle)) >= POCKET_ANGLE_MEMO_THRESHOLD_DEG
}
