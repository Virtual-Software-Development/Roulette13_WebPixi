import { extend } from '@pixi/react'
import { Container } from 'pixi.js'
import { useResultsStore } from '../../store/useResultsStore'
import { DESIGN_WIDTH, TABLE_WIDTH_RATIO, WINNER_CARD_HEADER_BLOCK_HEIGHT } from '../../layout/layout.constants'
import { ResultRow, ROW_HEIGHT } from './ResultRow'

extend({ Container })

const ROW_GAP = 10
// Debajo del bloque de encabezados/leyenda de WinnerCard y de su propia fila
// "en vivo" (ROW_HEIGHT), con un margen extra antes de la primera fila histórica.
const TABLE_TOP_GAP = 40
export const TABLE_TOP_Y = WINNER_CARD_HEADER_BLOCK_HEIGHT + ROW_HEIGHT + TABLE_TOP_GAP

export function ResultsTable() {
  const results = useResultsStore((state) => state.history)
  const tableWidth = DESIGN_WIDTH * TABLE_WIDTH_RATIO
  const tableX = (DESIGN_WIDTH - tableWidth) / 2

  return (
    <pixiContainer x={tableX} y={TABLE_TOP_Y}>
      {results.map((result, index) => (
        <ResultRow
          key={result.id}
          result={result}
          width={tableWidth}
          y={index * (ROW_HEIGHT + ROW_GAP)}
        />
      ))}
    </pixiContainer>
  )
}
