import { extend } from '@pixi/react'
import { Container } from 'pixi.js'
import { useResultsStore } from '../../store/useResultsStore'
import { useScreenSize } from '../../hooks/useScreenSize'
import { ResultRow, ROW_HEIGHT } from './ResultRow'

extend({ Container })

const ROW_GAP = 10
const TABLE_TOP_Y = 180
export const TABLE_WIDTH_RATIO = 0.5

export function ResultsTable() {
  const results = useResultsStore((state) => state.history)
  const { width: screenWidth } = useScreenSize()
  const tableWidth = screenWidth * TABLE_WIDTH_RATIO
  const tableX = (screenWidth - tableWidth) / 2

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
