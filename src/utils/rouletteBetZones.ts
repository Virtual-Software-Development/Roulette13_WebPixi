import type { WheelPocket, WheelType } from '../types/wheel'
import type { ColumnGroup, DozenGroup } from '../types/numberIndicator'
import type { BetSelection, BetType } from '../types/rouletteBet'
import { getColumnGroupPockets } from './columnGroups'
import { getDozenGroupPockets } from './dozenGroups'
import { getRouletteParity, getRouletteRange } from './rouletteClassification'
import { getRouletteColor } from './rouletteColors'

// -----------------------------------------------------------------------------------------------
// Geometría del paño horizontal clásico (0/00 a la izquierda, grilla 12x3, columna 2:1 a la
// derecha, docenas + apuestas exteriores debajo) -- generada PROGRAMÁTICAMENTE a partir de un
// grid de unidades enteras, en vez de hitboxes hardcodeadas a mano en JSX. Todo lo que sabe "qué
// números componen esta apuesta" y "dónde cae en el grid" vive acá, una sola vez.
//
// UNIT = ancho (en unidades de CSS grid) de una celda de número/calle -- gobierna todo lo
// horizontal (columnas). ROW_HEIGHT es el equivalente vertical, deliberadamente MENOR que UNIT
// (pedido explícito: filas más bajas) -- ancho y alto de celda ya no son iguales, por eso
// innerRange() ahora recibe el tamaño de celda como parámetro en vez de asumir siempre UNIT (ver
// más abajo). Todo lo que depende de "alto de fila" (straightUp, columna 2:1, dozens/outside, y
// el alto total que ocupan 0/00) sale de rowGroupStart/rowGroupEnd, así que basta con cambiar
// ROW_HEIGHT acá para que todos esos elementos se achiquen juntos y sigan proporcionados entre sí.
const UNIT = 16
// Pedido explícito de subirle el alto al tablero (era 12, después 14, después 18) -- debe quedar
// par (para que `half`, el punto medio de 0/00, siga siendo entero).
const ROW_HEIGHT = 22
// Cuánto de la celda ocupa el número visible en el eje horizontal. = UNIT (0 margen): los números
// llenan TODO el ancho de su celda -- mismo criterio que column/dozen/outside, para que no haya
// hueco de fondo entre columnas. La única separación visual entre números vecinos queda el
// hairline de su propio `border` (ver bettingBoard.css), como el gridline de un paño real. En el
// eje vertical el equivalente es ROW_HEIGHT mismo (ver rowRange en cada zona: siempre
// {rowGroupStart(row), rowGroupEnd(row)}, sin margen). Split/corner/trio siguen teniendo dónde
// caer: se overlayan sobre el borde compartido vía z-index (ver BOUNDARY_SPAN), no necesitan
// margen reservado aparte.
const NUMBER_CELL_FILL = UNIT
// Cuánto se extiende split/corner/sixLine hacia cada celda vecina desde el borde compartido
// (ahora sobre el propio número, no sobre un margen vacío -- ver comentario de NUMBER_CELL_FILL).
const BOUNDARY_SPAN = 6
// Igual que BOUNDARY_SPAN pero para los tríos de la esquina 0/00 (ver buildZeroAreaZones) -- ese
// rincón tiene mucho menos espacio disponible que el resto del grid, necesita un span más chico.
const TRIO_SPAN = 4
const NUMBER_COLUMNS = 12
const ZERO_COL_START = 1
const ZERO_COL_END = ZERO_COL_START + UNIT

function numberColStart(col: number): number {
  return ZERO_COL_END + col * UNIT
}
const COLUMN_BET_COL_START = numberColStart(NUMBER_COLUMNS)
const COLUMN_BET_COL_END = COLUMN_BET_COL_START + UNIT

// Filas físicas de la mesa, de arriba hacia abajo -- derivadas de las columnas matemáticas ya
// existentes (getColumnGroupPockets), mismo criterio que LiveTableBetsPanel.tsx (TOP/MIDDLE/
// BOTTOM_ROW): la fila de arriba es la 3ra columna (3,6,9...36), la del medio la 2da, la de abajo
// la 1ra -- así cada columna del grid, leída de abajo hacia arriba, es la calle real (1,2,3 /
// 4,5,6 / ... / 34,35,36).
const ROW_GROUPS: ColumnGroup[] = ['thirdColumn', 'secondColumn', 'firstColumn']
const ROW_GROUP_POCKETS = ROW_GROUPS.map((group) => getColumnGroupPockets(group))

function rowGroupStart(row: number): number {
  return 1 + row * ROW_HEIGHT
}
function rowGroupEnd(row: number): number {
  return rowGroupStart(row) + ROW_HEIGHT
}
const NUMBER_GRID_ROW_END = rowGroupEnd(ROW_GROUPS.length - 1)

// Las dozens arrancan INMEDIATAMENTE después de la grilla de números -- sin franja/fila propia
// en el medio (esa franja se probó y se leía como un hueco vacío empujando a dozens/outside
// bets hacia abajo). Street/Six Line no tienen "su" fila: se overlayan sobre este mismo borde
// (rowStart=NUMBER_GRID_ROW_END), igual criterio que split/corner sobre un borde entre números
// -- ver más abajo. Dozens/Red-Black/Odd-Even/High-Low son más bajas todavía que una fila de
// número -- pedido explícito, reduce el alto total del tablero para dejarle más aire al chip
// selector debajo. Constante propia (no derivada de ROW_HEIGHT) para que ambas puedan ajustarse
// de forma independiente sin caer en fracciones.
// TECHO ~15 (viewport 1600x900, bet-slip 550px) sin mover roulette-betting-bottom-row hacia abajo:
// subir esto crece el alto total del tablero (via aspect-ratio, ver BETTING_BOARD_GRID), y ese
// alto extra se descuenta de la fila spacer "1fr" en rouletteBettingWorkspace.css que empuja
// bottom-row al fondo (pedido explicito anterior). Mientras el spacer tenga margen, bottom-row no
// se mueve; pasado ese punto (spacer en 0) cualquier aumento aca empuja bottom-row hacia abajo
// 1 a 1. Si hace falta mas alto que esto, hay que liberar espacio en otro lado (top-row, gaps,
// padding del workspace) en vez de esperar que el spacer lo absorba solo.
const OUTSIDE_ROW_HEIGHT = 15
const DOZEN_ROW_START = NUMBER_GRID_ROW_END
const DOZEN_ROW_END = DOZEN_ROW_START + OUTSIDE_ROW_HEIGHT
const OUTSIDE_ROW_START = DOZEN_ROW_END
const OUTSIDE_ROW_END = OUTSIDE_ROW_START + OUTSIDE_ROW_HEIGHT

export const BETTING_BOARD_GRID = {
  totalColumns: COLUMN_BET_COL_END - 1,
  totalRows: OUTSIDE_ROW_END - 1,
  zeroCol: { colStart: ZERO_COL_START, colEnd: ZERO_COL_END },
  columnBetCol: { colStart: COLUMN_BET_COL_START, colEnd: COLUMN_BET_COL_END },
  dozenRow: { rowStart: DOZEN_ROW_START, rowEnd: DOZEN_ROW_END },
  outsideRow: { rowStart: OUTSIDE_ROW_START, rowEnd: OUTSIDE_ROW_END },
}

export interface BetGridArea {
  rowStart: number
  rowEnd: number
  colStart: number
  colEnd: number
}

export interface BetZone {
  id: string
  betType: BetType
  selection: BetSelection
  gridArea: BetGridArea
  kind: 'inside' | 'outside'
}

// Exportado -- rouletteBetLabel.ts lo reusa para ordenar pockets de forma legible (0-1-2, no
// 1-2-0), sin duplicar la regla "'00' ordena como 37".
export function pocketSortValue(pocket: WheelPocket): number {
  return pocket === '00' ? 37 : pocket
}

// Clave canónica y determinística de una selección -- MISMA clave que usa el bet slip para
// agregar apuestas repetidas sobre el mismo target (ver store/useBetSlipStore.ts), así el board y
// el store nunca pueden desincronizarse sobre "qué apuesta es esta".
export function buildZoneId(selection: BetSelection): string {
  switch (selection.type) {
    case 'column':
      return `column:${selection.group}`
    case 'dozen':
      return `dozen:${selection.group}`
    case 'redBlack':
      return `redBlack:${selection.color}`
    case 'oddEven':
      return `oddEven:${selection.parity}`
    case 'highLow':
      return `highLow:${selection.range}`
    default: {
      const sorted = [...selection.pockets].sort((a, b) => pocketSortValue(a) - pocketSortValue(b))
      return `${selection.type}:${sorted.join('-')}`
    }
  }
}

function pocketAt(col: number, row: number): number {
  return ROW_GROUP_POCKETS[row][col]
}

// Rango centrado dentro de una celda de `cellSize` unidades -- ver comentario de UNIT/ROW_HEIGHT
// más arriba. `cellSize` default UNIT (eje horizontal); las llamadas sobre el eje vertical pasan
// ROW_HEIGHT explícito, porque ya no son el mismo número.
function innerRange(start: number, size: number, cellSize: number = UNIT): { from: number; to: number } {
  const margin = (cellSize - size) / 2
  return { from: start + margin, to: start + margin + size }
}

// Franja de `span` unidades centrada exactamente sobre una línea de grid compartida (borde entre
// dos celdas) -- usada por split/corner/sixLine para alcanzar cada celda vecina.
function straddle(boundaryLine: number, span: number): { from: number; to: number } {
  const half = span / 2
  return { from: boundaryLine - half, to: boundaryLine + half }
}

function zone(betType: BetType, selection: BetSelection, gridArea: BetGridArea, kind: BetZone['kind']): BetZone {
  return { id: buildZoneId(selection), betType, selection, gridArea, kind }
}

// -----------------------------------------------------------------------------------------------
// Genera TODAS las zonas de apuesta válidas del paño para el tipo de rueda dado -- straight up,
// split, trio, street, corner, six line, column, dozen, red/black, odd/even, high/low. Nada se lista a
// mano: todo sale de recorrer el grid matemático una sola vez, reusando getColumnGroupPockets/
// getDozenGroupPockets/getRouletteColor/getRouletteParity/getRouletteRange (mismas utilidades que
// ya usa el resto del proyecto, sin duplicar la definición de qué números componen cada apuesta).
//
// Apuestas de la zona 0/00: split 0-00, los splits de 0/00 contra sus vecinos en la primera calle
// (0-1, 0-2, 00-2, 00-3) y los tríos de 3 números propios de esa esquina (0-1-2, 00-2-3, 0-00-2).
// Standard de mesa americana -- 0 limita con 1 y 2 (via la mitad inferior de la columna cero, que
// toca la fila de "1" entera y la mitad de abajo de la fila de "2"), 00 limita con 2 y 3 (mismo
// razonamiento, mitad de arriba). Todo esto se deriva de las mismas rowGroupStart/numberColStart
// que ya arma el resto del grid -- no hay coordenadas sueltas.
function buildZeroAreaZones(half: number): BetZone[] {
  const colBoundary = numberColStart(0) // borde entre la columna 0/00 y la primera calle (1,2,3)
  const rowBoundary01 = rowGroupStart(1) // borde entre la fila de "3" y la fila de "2"
  const rowBoundary12 = rowGroupStart(2) // borde entre la fila de "2" y la fila de "1"
  const value1Row = { from: rowGroupStart(2), to: rowGroupEnd(2) }
  const value2Row = { from: rowGroupStart(1), to: rowGroupEnd(1) }
  const value3Row = { from: rowGroupStart(0), to: rowGroupEnd(0) }
  const boundaryCol = straddle(colBoundary, BOUNDARY_SPAN)
  // Franja centrada DENTRO de la columna 0/00 (no en su borde derecho) para el split 0-00, así no
  // compite por espacio con los splits/tríos que sí viven sobre ese borde.
  const zeroSplitCol = innerRange(ZERO_COL_START, UNIT / 2)

  return [
    zone(
      'split',
      { type: 'split', pockets: [0, '00'] },
      { colStart: zeroSplitCol.from, colEnd: zeroSplitCol.to, rowStart: half - BOUNDARY_SPAN / 2, rowEnd: half + BOUNDARY_SPAN / 2 },
      'inside',
    ),
    zone(
      'split',
      { type: 'split', pockets: [0, 1] },
      { colStart: boundaryCol.from, colEnd: boundaryCol.to, rowStart: value1Row.from, rowEnd: value1Row.to },
      'inside',
    ),
    zone(
      'split',
      { type: 'split', pockets: [0, 2] },
      { colStart: boundaryCol.from, colEnd: boundaryCol.to, rowStart: Math.max(value2Row.from, half), rowEnd: value2Row.to },
      'inside',
    ),
    zone(
      'split',
      { type: 'split', pockets: ['00', 2] },
      { colStart: boundaryCol.from, colEnd: boundaryCol.to, rowStart: value2Row.from, rowEnd: Math.min(value2Row.to, half) },
      'inside',
    ),
    zone(
      'split',
      { type: 'split', pockets: ['00', 3] },
      { colStart: boundaryCol.from, colEnd: boundaryCol.to, rowStart: value3Row.from, rowEnd: value3Row.to },
      'inside',
    ),
    zone(
      'trio',
      { type: 'trio', pockets: [0, 1, 2] },
      { colStart: boundaryCol.from, colEnd: boundaryCol.to, rowStart: rowBoundary12 - TRIO_SPAN / 2, rowEnd: rowBoundary12 + TRIO_SPAN / 2 },
      'inside',
    ),
    zone(
      'trio',
      { type: 'trio', pockets: ['00', 2, 3] },
      { colStart: boundaryCol.from, colEnd: boundaryCol.to, rowStart: rowBoundary01 - TRIO_SPAN / 2, rowEnd: rowBoundary01 + TRIO_SPAN / 2 },
      'inside',
    ),
    zone(
      'trio',
      { type: 'trio', pockets: [0, '00', 2] },
      { colStart: boundaryCol.from, colEnd: boundaryCol.to, rowStart: half - TRIO_SPAN / 2, rowEnd: half + TRIO_SPAN / 2 },
      'inside',
    ),
  ]
}

export function buildRouletteBetZones(wheelType: WheelType): BetZone[] {
  const zones: BetZone[] = []

  // --- 0 / 00 -------------------------------------------------------------------------------
  if (wheelType === 'american') {
    const half = rowGroupStart(0) + (NUMBER_GRID_ROW_END - rowGroupStart(0)) / 2
    zones.push(
      zone(
        'straightUp',
        { type: 'straightUp', pockets: ['00'] },
        { colStart: ZERO_COL_START, colEnd: ZERO_COL_END, rowStart: rowGroupStart(0), rowEnd: half },
        'inside',
      ),
      zone(
        'straightUp',
        { type: 'straightUp', pockets: [0] },
        { colStart: ZERO_COL_START, colEnd: ZERO_COL_END, rowStart: half, rowEnd: NUMBER_GRID_ROW_END },
        'inside',
      ),
      ...buildZeroAreaZones(half),
    )
  } else {
    zones.push(
      zone(
        'straightUp',
        { type: 'straightUp', pockets: [0] },
        { colStart: ZERO_COL_START, colEnd: ZERO_COL_END, rowStart: rowGroupStart(0), rowEnd: NUMBER_GRID_ROW_END },
        'inside',
      ),
    )
  }

  // --- Straight up (1-36) --------------------------------------------------------------------
  for (let row = 0; row < ROW_GROUPS.length; row++) {
    for (let col = 0; col < NUMBER_COLUMNS; col++) {
      const pocket = pocketAt(col, row)
      const colRange = innerRange(numberColStart(col), NUMBER_CELL_FILL)
      const rowRange = { from: rowGroupStart(row), to: rowGroupEnd(row) }
      zones.push(
        zone(
          'straightUp',
          { type: 'straightUp', pockets: [pocket] },
          { colStart: colRange.from, colEnd: colRange.to, rowStart: rowRange.from, rowEnd: rowRange.to },
          'inside',
        ),
      )
    }
  }

  // --- Split horizontal (números adyacentes en la misma fila) --------------------------------
  // Cuadrado chico y preciso centrado en el borde compartido (BOUNDARY_SPAN en ambos ejes) --
  // mismo tamaño/proporción que el split 0-00 (ver buildZeroAreaZones), no una franja que cubre
  // todo el alto de la celda.
  for (let row = 0; row < ROW_GROUPS.length; row++) {
    const rowRange = innerRange(rowGroupStart(row), BOUNDARY_SPAN, ROW_HEIGHT)
    for (let col = 0; col < NUMBER_COLUMNS - 1; col++) {
      const boundary = numberColStart(col + 1)
      const colRange = straddle(boundary, BOUNDARY_SPAN)
      const a = pocketAt(col, row)
      const b = pocketAt(col + 1, row)
      zones.push(
        zone(
          'split',
          { type: 'split', pockets: [a, b] },
          { colStart: colRange.from, colEnd: colRange.to, rowStart: rowRange.from, rowEnd: rowRange.to },
          'inside',
        ),
      )
    }
  }

  // --- Split vertical (números adyacentes en la misma calle) ---------------------------------
  // Mismo criterio que el split horizontal de arriba -- cuadrado chico centrado en el borde.
  for (let col = 0; col < NUMBER_COLUMNS; col++) {
    const colRange = innerRange(numberColStart(col), BOUNDARY_SPAN)
    for (let row = 0; row < ROW_GROUPS.length - 1; row++) {
      const boundary = rowGroupStart(row + 1)
      const rowRange = straddle(boundary, BOUNDARY_SPAN)
      const a = pocketAt(col, row)
      const b = pocketAt(col, row + 1)
      zones.push(
        zone(
          'split',
          { type: 'split', pockets: [a, b] },
          { colStart: colRange.from, colEnd: colRange.to, rowStart: rowRange.from, rowEnd: rowRange.to },
          'inside',
        ),
      )
    }
  }

  // --- Corner (intersección de 4 números) -----------------------------------------------------
  for (let row = 0; row < ROW_GROUPS.length - 1; row++) {
    const rowBoundary = rowGroupStart(row + 1)
    const rowRange = straddle(rowBoundary, BOUNDARY_SPAN)
    for (let col = 0; col < NUMBER_COLUMNS - 1; col++) {
      const colBoundary = numberColStart(col + 1)
      const colRange = straddle(colBoundary, BOUNDARY_SPAN)
      const pockets = [pocketAt(col, row), pocketAt(col + 1, row), pocketAt(col, row + 1), pocketAt(col + 1, row + 1)] as [
        number,
        number,
        number,
        number,
      ]
      zones.push(
        zone(
          'corner',
          { type: 'corner', pockets },
          { colStart: colRange.from, colEnd: colRange.to, rowStart: rowRange.from, rowEnd: rowRange.to },
          'inside',
        ),
      )
    }
  }

  // --- Street (las 3 casillas de una calle) + Six Line (2 calles adyacentes) -----------------
  // Sin fila propia (ver comentario de DOZEN_ROW_START) -- ambas se overlayan sobre el borde
  // entre la grilla y las dozens, mismo criterio (straddle + z-index) que split/corner sobre un
  // borde entre números.
  const streetRowRange = straddle(NUMBER_GRID_ROW_END, BOUNDARY_SPAN)
  for (let col = 0; col < NUMBER_COLUMNS; col++) {
    const pockets = [pocketAt(col, 0), pocketAt(col, 1), pocketAt(col, 2)].sort((a, b) => a - b) as [number, number, number]
    const colRange = innerRange(numberColStart(col), NUMBER_CELL_FILL)
    zones.push(
      zone(
        'street',
        { type: 'street', pockets },
        { colStart: colRange.from, colEnd: colRange.to, rowStart: streetRowRange.from, rowEnd: streetRowRange.to },
        'inside',
      ),
    )
  }
  for (let col = 0; col < NUMBER_COLUMNS - 1; col++) {
    const boundary = numberColStart(col + 1)
    const colRange = straddle(boundary, BOUNDARY_SPAN)
    const pockets = [
      pocketAt(col, 0),
      pocketAt(col, 1),
      pocketAt(col, 2),
      pocketAt(col + 1, 0),
      pocketAt(col + 1, 1),
      pocketAt(col + 1, 2),
    ].sort((a, b) => a - b) as [number, number, number, number, number, number]
    zones.push(
      zone(
        'sixLine',
        { type: 'sixLine', pockets },
        { colStart: colRange.from, colEnd: colRange.to, rowStart: streetRowRange.from, rowEnd: streetRowRange.to },
        'inside',
      ),
    )
  }

  // --- Column bet (2:1), una por fila física --------------------------------------------------
  for (let row = 0; row < ROW_GROUPS.length; row++) {
    const group = ROW_GROUPS[row]
    zones.push(
      zone(
        'column',
        { type: 'column', group, pockets: getColumnGroupPockets(group) },
        { colStart: COLUMN_BET_COL_START, colEnd: COLUMN_BET_COL_END, rowStart: rowGroupStart(row), rowEnd: rowGroupEnd(row) },
        'outside',
      ),
    )
  }

  // --- Dozens (cada una cubre 4 calles) --------------------------------------------------------
  const DOZEN_GROUPS: DozenGroup[] = ['firstDozen', 'secondDozen', 'thirdDozen']
  DOZEN_GROUPS.forEach((group, index) => {
    const startCol = numberColStart(index * 4)
    const endCol = numberColStart(index * 4 + 4)
    zones.push(
      zone(
        'dozen',
        { type: 'dozen', group, pockets: getDozenGroupPockets(group) },
        { colStart: startCol, colEnd: endCol, rowStart: DOZEN_ROW_START, rowEnd: DOZEN_ROW_END },
        'outside',
      ),
    )
  })

  // --- Low/Even/Red/Black/Odd/High, cada una cubre 2 calles -----------------------------------
  const allPockets = Array.from({ length: 36 }, (_, i) => i + 1)
  const redPockets = allPockets.filter((n) => getRouletteColor(n) === 'red')
  const blackPockets = allPockets.filter((n) => getRouletteColor(n) === 'black')
  const evenPockets = allPockets.filter((n) => getRouletteParity(n) === 'even')
  const oddPockets = allPockets.filter((n) => getRouletteParity(n) === 'odd')
  const lowPockets = allPockets.filter((n) => getRouletteRange(n) === 'low')
  const highPockets = allPockets.filter((n) => getRouletteRange(n) === 'high')

  const outsideCells: { betType: BetType; selection: BetSelection }[] = [
    { betType: 'highLow', selection: { type: 'highLow', range: 'low', pockets: lowPockets } },
    { betType: 'oddEven', selection: { type: 'oddEven', parity: 'even', pockets: evenPockets } },
    { betType: 'redBlack', selection: { type: 'redBlack', color: 'red', pockets: redPockets } },
    { betType: 'redBlack', selection: { type: 'redBlack', color: 'black', pockets: blackPockets } },
    { betType: 'oddEven', selection: { type: 'oddEven', parity: 'odd', pockets: oddPockets } },
    { betType: 'highLow', selection: { type: 'highLow', range: 'high', pockets: highPockets } },
  ]
  outsideCells.forEach(({ betType, selection }, index) => {
    const startCol = numberColStart(index * 2)
    const endCol = numberColStart(index * 2 + 2)
    zones.push(zone(betType, selection, { colStart: startCol, colEnd: endCol, rowStart: OUTSIDE_ROW_START, rowEnd: OUTSIDE_ROW_END }, 'outside'))
  })

  return zones
}
