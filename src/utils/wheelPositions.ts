import { getWheelOrder } from '../data/wheelOrder'
import { WHEEL_GEOMETRY } from '../layout/wheelGeometry.constants'
import type { WheelPocket, WheelType } from '../types/wheel'

// Forma mínima que necesita este archivo para ubicar casillas -- WHEEL_GEOMETRY (imagen) y
// WHEEL_VIDEO_GEOMETRY (video, ver layout/wheelVideoGeometry.constants.ts) cumplen ambas esta
// forma, así que las funciones *ForGeometry de abajo sirven para cualquiera de las dos sin
// import cruzado entre esos dos archivos de constantes.
export interface PocketGeometry {
  center: { x: number; y: number }
  radius: number
  pocketAngleDeg: number[]
}

// Ángulo (grados, 0 = arriba, sentido horario) de una casilla tal como aparece impresa en el
// rotor de este tipo de rueda (ver WHEEL_GEOMETRY.pocketAngleDeg) -- es la posición de
// referencia en reposo; el giro en pantalla lo aplica el transform CSS (.lobby-wheel-rotor /
// LobbyWheelDebugOverlay), no este cálculo.
export function getPocketAngleDeg(pocket: WheelPocket, wheelType: WheelType): number {
  return getPocketAngleDegForGeometry(pocket, wheelType, WHEEL_GEOMETRY[wheelType])
}

// Misma lógica que getPocketAngleDeg, pero contra una geometría explícita en vez de
// WHEEL_GEOMETRY[wheelType] -- usada por el modo video (ver layout/wheelVideoGeometry.constants.ts),
// que tiene su propia tabla de ángulos sin relación con la del PNG.
export function getPocketAngleDegForGeometry(pocket: WheelPocket, wheelType: WheelType, geometry: PocketGeometry): number {
  const order = getWheelOrder(wheelType)
  const index = order.indexOf(pocket)
  if (index === -1) {
    throw new Error(`Pocket ${pocket} does not exist on the ${wheelType} wheel`)
  }

  return geometry.pocketAngleDeg[index]
}

// Posición de una casilla en unidades del canvas del rotor de este tipo de rueda (ver
// WHEEL_GEOMETRY), tal como aparece impresa en reposo. Consumida por un elemento cuyo padre ya
// tiene aplicado el mismo transform de rotación que .lobby-wheel-rotor (ver
// LobbyWheelDebugOverlay), así que no hace falta recalcular la posición cuadro a cuadro.
//
// radiusOffset (por defecto 0) mueve el punto hacia afuera/adentro del anillo de números --
// usado por overlays que no deben quedar exactamente sobre el número impreso (ver
// HotColdNumberChipLayer).
export function getPocketPosition(
  pocket: WheelPocket,
  wheelType: WheelType,
  radiusOffset = 0,
): { x: number; y: number } {
  return getPocketPositionForGeometry(pocket, wheelType, WHEEL_GEOMETRY[wheelType], radiusOffset)
}

// Misma lógica que getPocketPosition, pero contra una geometría explícita -- ver
// getPocketAngleDegForGeometry.
export function getPocketPositionForGeometry(
  pocket: WheelPocket,
  wheelType: WheelType,
  geometry: PocketGeometry,
  radiusOffset = 0,
): { x: number; y: number } {
  const { center, radius } = geometry
  const angleDeg = getPocketAngleDegForGeometry(pocket, wheelType, geometry)
  const angleRad = (angleDeg * Math.PI) / 180
  const effectiveRadius = radius + radiusOffset

  return {
    x: center.x + effectiveRadius * Math.sin(angleRad),
    y: center.y - effectiveRadius * Math.cos(angleRad),
  }
}

// Punto sobre un círculo de radio `radius` centrado en `center`, misma convención de ángulo
// que el resto del archivo (0°=arriba, horario).
export function getPolarPoint(center: { x: number; y: number }, radius: number, angleDeg: number): { x: number; y: number } {
  const angleRad = (angleDeg * Math.PI) / 180
  return { x: center.x + radius * Math.sin(angleRad), y: center.y - radius * Math.cos(angleRad) }
}

// Arma el `d` de un <path> SVG con forma de "rectángulo que se abre arriba": un borde angosto
// en innerRadius (abajo, más cerca del centro de la rueda) y un borde más ancho en outerRadius
// (arriba, un poco más afuera). innerStartDeg/innerEndDeg y outerStartDeg/outerEndDeg se pasan
// por separado justamente para que el borde interno pueda ser más angosto que el externo --
// misma convención de ángulo que el resto del archivo (0°=arriba, horario). Asume arcos
// menores a 180° (siempre cierto para una sola casilla), por eso large-arc-flag queda fijo en 0.
export function describeCellFlarePath(
  center: { x: number; y: number },
  innerRadius: number,
  outerRadius: number,
  innerStartDeg: number,
  innerEndDeg: number,
  outerStartDeg: number,
  outerEndDeg: number,
): string {
  const innerStart = getPolarPoint(center, innerRadius, innerStartDeg)
  const innerEnd = getPolarPoint(center, innerRadius, innerEndDeg)
  const outerStart = getPolarPoint(center, outerRadius, outerStartDeg)
  const outerEnd = getPolarPoint(center, outerRadius, outerEndDeg)

  return [
    `M ${innerStart.x} ${innerStart.y}`,
    `L ${outerStart.x} ${outerStart.y}`,
    `A ${outerRadius} ${outerRadius} 0 0 1 ${outerEnd.x} ${outerEnd.y}`,
    `L ${innerEnd.x} ${innerEnd.y}`,
    `A ${innerRadius} ${innerRadius} 0 0 0 ${innerStart.x} ${innerStart.y}`,
    'Z',
  ].join(' ')
}
