import { Header } from '../layout/Header'
import { BettingGamePickerModal } from '../layout/BettingGamePickerModal'
import '../components/rouletteBetting/bettingTokens.css'

// Inicio del servidor de Betting (puerto 4200, ver appSurface.ts): la misma tarjeta "Choose Betting
// Game" que abre el tab BETTING del header, pero como página -- desde acá se entra a Roulette o
// Quick Money Betting. Mismo shell/fondo que las vistas de apuesta.
export function BettingHomePage() {
  return (
    <div className="roulette-betting-shell">
      <Header activeTab="none" />
      <div className="roulette-betting-body">
        <BettingGamePickerModal variant="page" />
      </div>
    </div>
  )
}
