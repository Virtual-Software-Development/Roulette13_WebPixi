import { extend } from '@pixi/react'
import { Container } from 'pixi.js'
import { useResultsStore } from '../../store/useResultsStore'
import { DESIGN_WIDTH, TABLE_WIDTH_RATIO } from '../../layout/layout.constants'
import { GameRow } from './GameRow'

extend({ Container })

export function LastGame() {
  const currentWinner = useResultsStore((state) => state.currentWinner)

  const tableWidth = DESIGN_WIDTH * TABLE_WIDTH_RATIO
  const tableX = (DESIGN_WIDTH - tableWidth) / 2

  if (!currentWinner) return null

  return (
    <pixiContainer x={tableX} y={0}>
      <GameRow result={currentWinner} width={tableWidth} y={0} isLive />
    </pixiContainer>
  )
}
