import { Header } from '../layout/Header'
import type { BettingMode } from '../types/bettingMode'
import { RouletteBettingWorkspace } from '../components/rouletteBetting/RouletteBettingWorkspace'
import { useRoundSync } from '../hooks/useRoundSync'
import '../components/rouletteBetting/bettingTokens.css'

// Pantalla top-level, fuera de Admin Panel (pedido explícito) -- mismo criterio que LoginPage.tsx/
// AdminPanel.tsx: ocupa todo el viewport por sí misma, reutiliza el Header real del proyecto en
// vez de duplicarlo. `mode` llega fijo desde main.tsx (ver resolveScreen), no cambia en caliente.
// A diferencia de Admin/Login, esta pantalla SÍ necesita round timing real (countdown, drawNumber
// para el ticket) -- useRoundSync la sincroniza directo con /api/gameInfo, ya que App.tsx (el
// único lugar que hoy hace ese fetch) no se monta en esta ruta.
//
// activeTab="none" -- ningún tab del header se resalta estando en ninguna vista de Betting (pedido
// explícito, ver Header.tsx: BETTING ahora siempre debe quedar clickeable, no tiene sentido
// combinarlo con el estilo "activo/bloqueado"). activeBettingGame="roulette" es lo que bloquea la
// opción Roulette dentro de BettingGamePickerModal cuando se reabre desde acá.
export function RouletteBettingView({ mode }: { mode: BettingMode }) {
  useRoundSync()

  return (
    <div className="roulette-betting-shell">
      <Header activeTab="none" activeBettingGame="roulette" />
      <div className="roulette-betting-body">
        <RouletteBettingWorkspace mode={mode} />
      </div>
    </div>
  )
}
