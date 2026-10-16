import { useMemo } from 'react'
import type { BettingMode } from '../../types/bettingMode'
import { useQuickMoneyBetSlipStore } from '../../store/useQuickMoneyBetSlipStore'
import { useGameConfigStore } from '../../store/useGameConfigStore'
import { useQuickMoneyRoundPhase } from '../../hooks/useQuickMoneyRoundPhase'
import { calculateSlipTotals } from '../../utils/quickMoneyPayout'
import { BetSlipQuickActions } from '../betSlipActions/BetSlipQuickActions'

interface QuickMoneyBetFormActionsProps {
  mode: BettingMode
  // Lo que agregaría Add to Bet Slip con el formulario actual (monto × tipos elegidos), y lo que
  // volvería a cargar Rebet (la última apuesta agregada).
  formTotal: number
  lastTotal: number
  onRebet: () => void
  onDouble: () => void
}

// Rebet / Double de Quick Money: actúan sobre el formulario de la apuesta (números, monto y tipo),
// no sobre el bet slip. En Player Mode el límite es el saldo que queda después de lo que ya está en
// el bet slip; en Cashier Mode no hay saldo.
export function QuickMoneyBetFormActions({ mode, formTotal, lastTotal, onRebet, onDouble }: QuickMoneyBetFormActionsProps) {
  const entries = useQuickMoneyBetSlipStore((state) => state.entries)
  const balance = useGameConfigStore((state) => state.balance)
  const { phase } = useQuickMoneyRoundPhase()
  const slipTotal = useMemo(() => calculateSlipTotals(entries).totalStake, [entries])

  return (
    <BetSlipQuickActions
      target="form"
      currentTotal={formTotal}
      lastTotal={lastTotal}
      balance={mode === 'player' ? Math.max(0, balance - slipTotal) : null}
      disabled={phase === 'closed'}
      onRebet={onRebet}
      onDouble={onDouble}
    />
  )
}
