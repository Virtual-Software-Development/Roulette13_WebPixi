import { Header } from '../layout/Header'
import type { BettingMode } from '../types/bettingMode'
import { QuickMoneyBettingWorkspace } from '../components/quickMoneyBetting/QuickMoneyBettingWorkspace'
import { useQuickMoneyEventSync } from '../hooks/useQuickMoneyEventSync'
import '../components/quickMoneyBetting/quickMoneyBettingTokens.css'

// Pantalla top-level, mismo shape que RouletteBettingView.tsx -- reusa el Header real del
// proyecto. En vez de useRoundSync (/api/gameInfo, solo Roulette) sigue el sorteo de Quick Money
// abierto en el backend con useQuickMoneyEventSync (ver useQuickMoneyRoundStore.ts).
//
// activeTab="none" -- ningún tab del header se resalta estando en ninguna vista de Betting (pedido
// explícito, ver Header.tsx/RouletteBettingView.tsx). activeBettingGame="quickMoney" es lo que
// bloquea la opción Quick Money dentro de BettingGamePickerModal cuando se reabre desde acá.
export function QuickMoneyBettingView({ mode }: { mode: BettingMode }) {
  useQuickMoneyEventSync()
  return (
    <div className="quick-money-betting-shell">
      <Header activeTab="none" activeBettingGame="quickMoney" />
      <div className="quick-money-betting-body">
        <QuickMoneyBettingWorkspace mode={mode} />
      </div>
    </div>
  )
}
