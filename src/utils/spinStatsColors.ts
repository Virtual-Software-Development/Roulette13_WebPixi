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
// Antes 0x9a9a9a (gris liso) -- combinaba con nada y se sentía "apagado" al lado del azul de EVEN,
// sobre todo al iluminarse (el glow quedaba blanco genérico). Ahora un ámbar/dorado cálido --
// complementario clásico del azul, se nota bien distinto de EVEN y brilla como color propio, no
// como blanco neutro.
export const ODD_COLOR = 0xf0a83c
// Antes 0x3f6570 (verde azulado muy oscuro) -- el glow se veía apagado/raro al encenderse. Ahora
// un tono más claro de la misma familia (turquesa), sigue distinguiéndose de EVEN (azul) y LOW
// (morado) pero brilla de verdad al activarse.
export const HIGH_COLOR = 0x4fd1c5
// Antes 0x3f3b40 (casi negro, "casi morado" solo de nombre) -- el glow no se notaba contra el
// fondo oscuro. Ahora un morado bien saturado, de verdad visible -- combina bien con el turquesa de
// HIGH (dupla teal/violeta), y ahora también se usa en el anillo del lado LOW (antes ese lado
// siempre quedaba gris neutro, sin importar la fila -- ver rightColor en AccentStatRow).
export const LOW_COLOR = 0xa855f7

// Trío de fase 2 (docenas/columnas) -- un color por posición (primera/segunda/tercera),
// compartido entre ambos gráficos igual que hacían los placeholders de dozenDiamondIndicatorStyles
// / columnDiamondIndicatorStyles (que ahora leen de acá, ver esos archivos). Se cambia ACÁ (no con
// una paleta local en SpinStatsPanel.tsx) para que los diamantes de docena/columna sobre la rueda
// sigan consistentes con el nuevo anillo. Los tonos highlight/shadow/glow por sector (para la
// sensación de profundidad del anillo) son puramente decorativos y viven en SpinStatsPanel.tsx
// (DOZEN_COLUMN_DONUT_STYLE), no acá -- ahí SÍ son exclusivos de la dona.
// Antes cyan/plata fría/grafito -- pedido explícito de cambiar a un trío "familia rosa": un rosa
// bien saturado que prenda fuerte con el glow, más dos tonos que combinen con él (blush claro y
// ciruela oscuro), en vez de un acento + dos grises neutros.
export const FIRST_GROUP_COLOR = 0xff3f8f // rosa vivo (acento principal)
export const SECOND_GROUP_COLOR = 0xf5cede // blush / rosa pálido
// Antes 0x45213a (ciruela oscuro) -- este color se usa TAL CUAL (no solo su versión "bright") en
// los indicadores de docena/columna sobre la rueda (dozenDiamondIndicatorStyles/
// columnDiamondIndicatorStyles), y ese tono era demasiado oscuro para notarse ahí. Ahora un
// orchid/magenta medio de la misma familia rosa -- bastante más claro (se ve sobre la rueda) pero
// sigue siendo un tono propio, distinguible de FIRST (rosa vivo) y SECOND (blush pálido).
export const THIRD_GROUP_COLOR = 0xc85a97 // orchid / magenta medio


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
