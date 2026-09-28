import { useRef } from 'react'
import { Header } from '../layout/Header'
import { useFitToHeight } from '../hooks/useFitToHeight'
import { QuickMoneyLobbyHero } from '../components/quickMoneyLobby/QuickMoneyLobbyHero'
import { QuickMoneyRecentResults } from '../components/quickMoneyLobby/QuickMoneyRecentResults'
import { QuickMoneyFrequencyPanel } from '../components/quickMoneyLobby/QuickMoneyFrequencyPanel'
import { QUICK_MONEY_LOBBY_DRAWS } from '../data/quickMoneyLobbyMockData'
import '../components/quickMoneyLobby/quickMoneyLobbyTokens.css'
import './quickMoneyLobby.css'

// Pantalla top-level, mismo shape que RouletteBettingView.tsx/QuickMoneyBettingView.tsx -- reusa
// el Header real del proyecto. Punto de entrada a Quick Money desde el tab LOTTERY del Header
// (?preview=quick-money-lobby, ver main.tsx): muestra Pick 3/Pick 4 lado a lado con su previous
// result, el countdown compartido del próximo sorteo, resultados recientes y hot/cold -- todavía
// sin navegar a las vistas de apuesta (tarjetas inertes, pedido explícito, ver
// QuickMoneyGameCard.tsx).
//
// activeTab="quickMoneyLobby" -- el tab LOTTERY se resalta como activo estando acá (a diferencia de
// las vistas de Betting, que dejan los 4 tabs sin resaltar).
//
// Sin scroll en desktop (pedido explícito): si el contenido no entra en el alto de la ventana,
// .qml-fit se escala entero (useFitToHeight) hasta que entre, en vez de scrollear. En mobile
// (≤900px, paneles apilados, ~2700px de alto) escalar lo volvería ilegible, así que ahí sí scrollea.
const MOBILE_QUERY = '(max-width: 900px)'

export function QuickMoneyLobby() {
  const [latestDraw] = QUICK_MONEY_LOBBY_DRAWS
  const bodyRef = useRef<HTMLDivElement>(null)
  const fitRef = useRef<HTMLDivElement>(null)
  const scale = useFitToHeight(bodyRef, fitRef, MOBILE_QUERY)

  return (
    <div className="qml-shell">
      <Header activeTab="quickMoneyLobby" />
      <div className="qml-body" ref={bodyRef}>
        <div className="qml-fit" ref={fitRef} style={scale < 1 ? { transform: `scale(${scale})` } : undefined}>
          <QuickMoneyLobbyHero latestDraw={latestDraw} />
          <div className="qml-lower-row">
            <QuickMoneyRecentResults draws={QUICK_MONEY_LOBBY_DRAWS} />
            <QuickMoneyFrequencyPanel draws={QUICK_MONEY_LOBBY_DRAWS} />
          </div>
        </div>
      </div>
    </div>
  )
}
