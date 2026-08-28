import { getWheelOrder } from '../data/wheelOrder'
import { WHEEL_GEOMETRY } from '../layout/wheelGeometry.constants'
import type { WheelPocket, WheelType } from '../types/wheel'

// Ángulo (grados, 0 = arriba, sentido horario) de una casilla tal como aparece impresa en el
// rotor de este tipo de rueda (ver WHEEL_GEOMETRY.pocketAngleDeg) -- es la posición de
// referencia en reposo; el giro en pantalla lo aplica el transform CSS (.lobby-wheel-rotor /
// LobbyWheelDebugOverlay), no este cálculo.
export function getPocketAngleDeg(pocket: WheelPocket, wheelType: WheelType): number {
  const order = getWheelOrder(wheelType)
  const index = order.indexOf(pocket)
  if (index === -1) {
    throw new Error(`Pocket ${pocket} does not exist on the ${wheelType} wheel`)
  }

  return WHEEL_GEOMETRY[wheelType].pocketAngleDeg[index]
}

// Posición de una casilla en unidades del canvas del rotor de este tipo de rueda (ver
// WHEEL_GEOMETRY), tal como aparece impresa en reposo. Consumida por un elemento cuyo padre ya
// tiene aplicado el mismo transform de rotación que .lobby-wheel-rotor (ver
// LobbyWheelDebugOverlay), así que no hace falta recalcular la posición cuadro a cuadro.
export function getPocketPosition(pocket: WheelPocket, wheelType: WheelType): { x: number; y: number } {
  const { center, radius } = WHEEL_GEOMETRY[wheelType]
  const angleDeg = getPocketAngleDeg(pocket, wheelType)
  const angleRad = (angleDeg * Math.PI) / 180

  return {
    x: center.x + radius * Math.sin(angleRad),
    y: center.y - radius * Math.cos(angleRad),
  }
}
