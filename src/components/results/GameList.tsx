import { extend } from '@pixi/react'
import { Container } from 'pixi.js'
import { useResultsStore } from '../../store/useResultsStore'
import { DESIGN_WIDTH, TABLE_WIDTH_RATIO } from '../../layout/layout.constants'
import { GameRow, LIVE_ROW_HEIGHT, ROW_HEIGHT } from './GameRow'

extend({ Container })

const ROW_GAP = 6
const LIVE_TO_LIST_GAP = 18
export const TABLE_TOP_Y = LIVE_ROW_HEIGHT + LIVE_TO_LIST_GAP

export function GameList() {
  const results = useResultsStore((state) => state.history)
  const tableWidth = DESIGN_WIDTH * TABLE_WIDTH_RATIO
  const tableX = (DESIGN_WIDTH - tableWidth) / 2

  return (
    <pixiContainer x={tableX} y={TABLE_TOP_Y}>
      {results.map((result, index) => (
        <GameRow key={result.id} result={result} width={tableWidth} y={index * (ROW_HEIGHT + ROW_GAP)} />
      ))}
    </pixiContainer>
  )
}
