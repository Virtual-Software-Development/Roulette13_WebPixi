import { useMemo } from 'react'
import type { BettingMode } from '../../types/bettingMode'
import { useBetSlipStore } from '../../store/useBetSlipStore'
import { useGameConfigStore } from '../../store/useGameConfigStore'
import { useBettingRoundPhase } from '../../hooks/useBettingRoundPhase'
import { calculateSlipTotals } from '../../utils/rouletteBetPayout'
import { BetSlipQuickActions } from '../betSlipActions/BetSlipQuickActions'

// Rebet / Double del bet slip de Roulette. En Player Mode se respeta el saldo; en Cashier Mode no hay.
export function RouletteBetSlipActions({ mode }: { mode: BettingMode }) {
  const entries = useBetSlipStore((state) => state.entries)
  const lastPlaced = useBetSlipStore((state) => state.lastPlaced)
  const rebet = useBetSlipStore((state) => state.rebet)
  const doubleAll = useBetSlipStore((state) => state.doubleAll)
  const balance = useGameConfigStore((state) => state.balance)
  const { phase } = useBettingRoundPhase()

  const currentTotal = useMemo(() => calculateSlipTotals(entries).totalStake, [entries])
  const lastTotal = useMemo(() => calculateSlipTotals(lastPlaced).totalStake, [lastPlaced])

  return (
    <BetSlipQuickActions
      target="board"
      currentTotal={currentTotal}
      lastTotal={lastTotal}
      balance={mode === 'player' ? balance : null}
      disabled={phase !== 'open'}
      onRebet={rebet}
      onDouble={doubleAll}
    />
  )
}
