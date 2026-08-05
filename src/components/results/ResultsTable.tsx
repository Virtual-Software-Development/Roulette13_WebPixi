import { extend } from '@pixi/react'
import { Container } from 'pixi.js'
import { useResultsStore } from '../../store/useResultsStore'
import { DESIGN_WIDTH } from '../../layout/layout.constants'
import { ResultRow, ROW_HEIGHT } from './ResultRow'

extend({ Container })

const ROW_GAP = 10
const TABLE_TOP_Y = 180
export const TABLE_WIDTH_RATIO = 0.42

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
