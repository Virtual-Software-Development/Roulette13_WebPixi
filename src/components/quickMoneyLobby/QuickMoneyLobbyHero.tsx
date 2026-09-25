import type { QuickMoneyLobbyDraw } from '../../data/quickMoneyLobbyMockData'
import { QuickMoneyGameCard } from './QuickMoneyGameCard'
import { QuickMoneyDrawCountdown } from './QuickMoneyDrawCountdown'
import './quickMoneyLobbyHero.css'

// [PICK 3] [QUICK MONEY / DRAW INFO] [PICK 4] -- composición simétrica pedida explícitamente,
// Pick 3 a la izquierda, Pick 4 a la derecha, panel de countdown compartido al centro. El marco
// (panel verde/centro azul/panel dorado, borde, glow, bandas diagonales) ya NO es una imagen (ver
// local-media/Lobby/Panel Quick Money.png, reemplazada -- pedido explícito) -- ahora es 100% CSS,
// ver quickMoneyPanelFrame.css/quickMoneyCenterFrame.css, dibujado dentro de cada
// QuickMoneyGameCard/QuickMoneyDrawCountdown.
export function QuickMoneyLobbyHero({ latestDraw }: { latestDraw: QuickMoneyLobbyDraw }) {
  return (
    <section className="qml-hero">
      <QuickMoneyGameCard gameType="pick3" latestDraw={latestDraw} />
      <QuickMoneyDrawCountdown gameNumber={latestDraw.gameNumber} />
      <QuickMoneyGameCard gameType="pick4" latestDraw={latestDraw} />
    </section>
  )
}
