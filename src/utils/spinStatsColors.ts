import type { SpinStatsCategory } from '../hooks/useSpinStatsCycle'

// Colores por categoría del ciclo de SpinStatsPanel -- fuente única para el anillo de la dona
// activa (SpinStatsPanel) y el highlight de la rueda (NumberCellHighlight, vía
// useCategoryHighlightEntries), para que ambos lados siempre coincidan en color.
export const RED_COLOR = 0xd6202b
// Gris claro, no el negro real -- un anillo/glow negro se pierde contra la foto oscurecida.
export const BLACK_COLOR = 0xd0d0d8
// Antes 0xffffff (blanco) -- casi idéntico a BLACK_COLOR (gris muy claro), se confundían. Ahora
// un azul bien saturado, imposible de confundir con black/odd (grises) o con cualquier otro.
export const EVEN_COLOR = 0x3aa8ff
export const ODD_COLOR = 0x9a9a9a
// Antes 0x3f6570 (verde azulado muy oscuro) -- el glow se veía apagado/raro al encenderse. Ahora
// un tono más claro de la misma familia (turquesa), sigue distinguiéndose de EVEN (azul) y LOW
// (morado) pero brilla de verdad al activarse.
export const HIGH_COLOR = 0x4fd1c5
// Antes 0x3f3b40 (casi negro, "casi morado" solo de nombre) -- el glow no se notaba contra el
// fondo oscuro. Ahora un morado bien saturado, de verdad visible.
export const LOW_COLOR = 0xa855f7

// Trío de fase 2 (docenas/columnas) -- un color por posición (primera/segunda/tercera),
// compartido entre ambos gráficos igual que hacían los placeholders de dozenDiamondIndicatorStyles
// / columnDiamondIndicatorStyles (que ahora leen de acá, ver esos archivos). Rosado + light blue
// pedidos directamente; dorado como tercero -- ya es parte de la paleta de la app (spoke de las
// donas, header HOT) y contrasta bien contra los otros dos sin acercarse al morado de LOW_COLOR.
export const FIRST_GROUP_COLOR = 0xf472b6 // rosado
export const SECOND_GROUP_COLOR = 0x5ab4f0 // light blue
export const THIRD_GROUP_COLOR = 0xf5b942 // dorado

export const SPIN_STATS_CATEGORY_COLOR: Record<SpinStatsCategory, number> = {
  red: RED_COLOR,
  black: BLACK_COLOR,
  even: EVEN_COLOR,
  odd: ODD_COLOR,
  high: HIGH_COLOR,
  low: LOW_COLOR,
  firstDozen: FIRST_GROUP_COLOR,
  secondDozen: SECOND_GROUP_COLOR,
  thirdDozen: THIRD_GROUP_COLOR,
  firstColumn: FIRST_GROUP_COLOR,
  secondColumn: SECOND_GROUP_COLOR,
  thirdColumn: THIRD_GROUP_COLOR,
}

// Pixi (Donut, GlowFilter) toma colores como number 0xRRGGBB; SVG (NumberCellHighlight) los
// necesita como string CSS -- un solo conversor para no repetir el padStart/toString(16) en cada
// consumidor.
export function numberToCssHex(color: number): string {
  return `#${color.toString(16).padStart(6, '0')}`
}
