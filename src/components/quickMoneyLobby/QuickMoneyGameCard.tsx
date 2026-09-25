import { useTranslation } from 'react-i18next'
import type { QuickMoneyGameType } from '../../types/quickMoneyBet'
import type { QuickMoneyLobbyDraw } from '../../data/quickMoneyLobbyMockData'
import { resultFor } from '../../data/quickMoneyLobbyMockData'
import { buildMediaUrl } from '../../utils/media'
import './quickMoneyPanelFrame.css'
import './quickMoneyGameCard.css'

// pick-3-raffle.png/pick-4-raffle.png (ver local-media/Lobby/) ya traen los rayos de luz radiales
// horneados en el propio PNG (transparencia real, no hace falta reconstruirlos con
// repeating-conic-gradient) -- se usan tal cual, solo se agranda/posiciona, nunca se recorta el
// asset ni se deforma (object-fit: contain, ver CSS).
const RAFFLE_IMAGE_URL: Record<QuickMoneyGameType, string> = {
  pick3: buildMediaUrl('Lobby/pick-3-raffle.png'),
  pick4: buildMediaUrl('Lobby/pick-4-raffle.png'),
}

// Logo real "PICK 3"/"PICK 4" (Option 2, con anillo -- pedido explícito, combina con el anillo
// decorativo que ya tiene el logo de Quick Money del panel central) -- reemplaza el título que
// antes se armaba a mano con CSS ("PICK" + dígito grande, ver git history). Colores (verde/dorado)
// ya vienen definidos adentro del propio SVG, no dependen de --qml-accent.
const LOGO_URL: Record<QuickMoneyGameType, string> = {
  pick3: buildMediaUrl('Website_svg_icons/49_pick-3-logo-option-2.svg'),
  pick4: buildMediaUrl('Website_svg_icons/51_pick-4-logo-option-2.svg'),
}

interface QuickMoneyGameCardProps {
  gameType: QuickMoneyGameType
  latestDraw: QuickMoneyLobbyDraw
}

// Contenido dinámico (Previous Result -- viene de `latestDraw`, nada hardcodeado ni convertido en
// imagen) posicionado ENCIMA del marco. En desktop el marco (borde/glow/textura/bandas diagonales)
// es 100% CSS (ver quickMoneyPanelFrame.css, deliverable del usuario -- reemplaza el PNG
// "Panel Quick Money.png" que se usaba antes como fondo de .qml-hero) -- el bloque `.qml-frame`
// de acá abajo es puramente decorativo (aria-hidden, sin texto), `.qml-game-panel` sigue siendo
// el único que posiciona contenido real. En mobile (≤900px, ver CSS) el marco se oculta y el panel
// recupera su propio fondo/glow simple, como antes.
//
// Draw Date/Draw Time/Game # SE SACARON de acá (pedido explícito): Pick 3 y Pick 4 comparten el
// mismo draw (mismo store, ver useQuickMoneyRoundStore), así que mostrar esos 3 datos en los DOS
// paneles era pura repetición -- Game # ahora vive una sola vez en QuickMoneyDrawCountdown.tsx
// (panel central). Draw Date/Draw Time no se movieron a ningún lado (pedido explícito: "lo único
// que sería bueno poner es el Game #").
//
// Sigue INERTE (pedido explícito anterior, no cambiado acá): sin onClick, sin role="button", sin
// cursor:pointer.
export function QuickMoneyGameCard({ gameType, latestDraw }: QuickMoneyGameCardProps) {
  const { t } = useTranslation()
  const digits = resultFor(latestDraw, gameType)
  const side = gameType === 'pick3' ? 'left' : 'right'

  return (
    <div className="qml-game-panel-wrap" data-accent={gameType} data-side={side}>
      <div className="qml-frame" data-side={side} aria-hidden="true">
        <span className="qml-frame-glow" />
        <span className="qml-frame-shape" />
        <span className="qml-frame-vband qml-frame-vband--1" />
        <span className="qml-frame-vband qml-frame-vband--2" />
        <span className="qml-frame-vband qml-frame-vband--3" />
        <span className="qml-frame-vband qml-frame-vband--4" />
        <span className="qml-frame-vband qml-frame-vband--5" />
        <span className="qml-frame-mist qml-frame-mist--edge" />
        <span className="qml-frame-mist qml-frame-mist--bottom" />
      </div>

      <div className="qml-game-panel" data-accent={gameType} data-side={side}>
        <div className="qml-game-panel-content">
          <div className="qml-game-panel-heading">
            <span className="qml-game-panel-eyebrow">{t('header.lottery')}</span>
            <h2 className="qml-game-panel-title">
              <img
                src={LOGO_URL[gameType]}
                className="qml-game-panel-logo"
                alt={t(`quickMoneyBettingView.gameType.${gameType}`)}
              />
            </h2>
          </div>

          <div className="qml-game-panel-result">
            <span className="qml-game-panel-result-label">{t('quickMoneyLobby.previousResult')}</span>
            <div className="qml-game-panel-result-digits">
              {digits.map((digit, index) => (
                <span key={index} className="qml-game-panel-result-digit">
                  {digit}
                </span>
              ))}
            </div>
          </div>
        </div>

        <img src={RAFFLE_IMAGE_URL[gameType]} className="qml-game-panel-machine" alt="" />
      </div>
    </div>
  )
}
