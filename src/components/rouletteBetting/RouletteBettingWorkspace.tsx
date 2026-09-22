import type { BettingMode } from '../../types/bettingMode'
import { useBettingRoundPhase } from '../../hooks/useBettingRoundPhase'
import { BettingBoard } from './BettingBoard'
import { ChipSelector } from './ChipSelector'
import { SelectedBetsList } from './SelectedBetsList'
import { CountdownBadge } from './CountdownBadge'
import { RecentResultsStrip } from './RecentResultsStrip'
import { PlayerPanel } from './PlayerPanel'
import { CashierPanel } from './CashierPanel'
import './rouletteBettingWorkspace.css'

// Motor compartido entre Player y Cashier Mode -- board, countdown, recent results, chip selector
// y selected bets son IDÉNTICOS en ambos modos (leen useBetSlipStore/useResultsStore/
// useGameConfigStore directamente, no reciben `mode`). Solo el panel final varía, evitando
// duplicar las piezas grandes entre dos árboles de componentes.
export function RouletteBettingWorkspace({ mode }: { mode: BettingMode }) {
  const { phase } = useBettingRoundPhase()
  const boardDisabled = phase !== 'open'

  // Grid (no flex column + flex column por separado) -- board a la izquierda y bet-slip a la
  // derecha necesitan compartir las MISMAS filas (ver rouletteBettingWorkspace.css) para que
  // "board alineado abajo con bet-slip" sea una garantía del layout, no un cálculo de píxeles a
  // mano -- por eso van directo como hijos del grid (grid-area solo aplica a hijos directos).
  // Chip/panel en cambio NO tienen ninguna restricción tipo aspect-ratio entre sí -- van en su
  // propia fila de flex (roulette-betting-bottom-row), que ya los iguala en alto por su cuenta
  // (align-items:stretch), sin necesitar ser parte del grid como los otros dos.
  return (
    <div className="roulette-betting-workspace">
      <div className="roulette-betting-top-row">
        <CountdownBadge />
        <RecentResultsStrip />
      </div>
      <BettingBoard disabled={boardDisabled} />
      <SelectedBetsList />
      <div className="roulette-betting-bottom-row">
        <ChipSelector />
        {mode === 'player' ? <PlayerPanel /> : <CashierPanel />}
      </div>
    </div>
  )
}
