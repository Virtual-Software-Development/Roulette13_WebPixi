import { Header } from '../layout/Header'
import type { BettingMode } from '../types/bettingMode'
import { QuickMoneyBettingWorkspace } from '../components/quickMoneyBetting/QuickMoneyBettingWorkspace'
import '../components/quickMoneyBetting/quickMoneyBettingTokens.css'

// Pantalla top-level, mismo shape que RouletteBettingView.tsx -- reusa el Header real del
// proyecto (activeTab="lottery", el mismo tab "QUICK MONEY" que ya existía sin onClick, ver
// Header.tsx). A diferencia de Roulette, acá NO hace falta useRoundSync: el ciclo de rondas de
// Quick Money es 100% local/mock (ver useQuickMoneyRoundStore.ts), no depende de /api/gameInfo.
export function QuickMoneyBettingView({ mode }: { mode: BettingMode }) {
  return (
    <div className="quick-money-betting-shell">
      <Header activeTab="lottery" />
      <div className="quick-money-betting-body">
        <QuickMoneyBettingWorkspace mode={mode} />
      </div>
    </div>
  )
}
