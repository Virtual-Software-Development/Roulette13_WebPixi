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

// Resumen del sorteo (Draw Date / Draw Time / Game #) -- en los dos paneles (pedido explícito, ver
// comentario del componente). Mismos íconos que ya usa el admin para fecha/hora
// (GameEventDetailPanel.tsx); para Game # no hay ícono de "dial" en el set, 05_target es el más
// parecido a la referencia visual.
const CALENDAR_ICON_URL = buildMediaUrl('Website_svg_icons/33_calendar_white.svg')
const CLOCK_ICON_URL = buildMediaUrl('Website_svg_icons/30_clock_white.svg')
const GAME_NUMBER_ICON_URL = buildMediaUrl('Website_svg_icons/05_target_white.svg')

// Hora del sorteo en horario del Este (la etiqueta dice "(EST)", ver i18n drawSummary.drawTime) --
// independiente de la zona horaria del navegador.
const DRAW_DATE_FORMATTER = new Intl.DateTimeFormat('en-US', {
  month: 'short',
  day: 'numeric',
  year: 'numeric',
  timeZone: 'America/New_York',
})
const DRAW_TIME_FORMATTER = new Intl.DateTimeFormat('en-US', {
  hour: 'numeric',
  minute: '2-digit',
  timeZone: 'America/New_York',
})

// Centros de las bolas de cada PNG de máquina en píxeles del PNG (1254x1254, medidos sobre el
// asset), en el orden en que se leen los dígitos de Previous Result -- igual que las referencias
// visuales: Pick 3 7-3-1 -> 7 arriba, 3 abajo-izq., 1 abajo-der.; Pick 4 2-4-9-7 -> 2 arriba,
// 4 izq., 9 der., 7 abajo. Si se reemplaza un PNG, volver a medir.
const RAFFLE_IMAGE_SIZE = 1254
const BALL_CENTERS: Record<QuickMoneyGameType, ReadonlyArray<readonly [number, number]>> = {
  pick3: [
    [624, 605],
    [505, 787],
    [747, 787],
  ],
  pick4: [
    [625, 561],
    [486, 708],
    [764, 708],
    [625, 837],
  ],
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
// (panel central). Después se volvió a pedir el resumen (.qml-game-panel-summary) debajo de
// Previous Result, primero en Pick 4 y luego también en Pick 3 (pedidos explícitos).
//
// Los dos paneles tienen el mismo layout (Pick 4 ya no es el espejo de Pick 3, pedido explícito):
// logo + Previous Result + resumen a la izquierda y la máquina, con los dígitos sobre las bolas, a
// la derecha -- ver la grilla en el CSS. Solo el marco (.qml-frame) sigue espejado por data-side.
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

          <dl className="qml-game-panel-summary">
            <div className="qml-game-panel-summary-row">
              <img src={CALENDAR_ICON_URL} className="qml-game-panel-summary-icon" alt="" />
              <dt>{t('quickMoneyLobby.drawSummary.drawDate')}</dt>
              <dd>{DRAW_DATE_FORMATTER.format(new Date(latestDraw.drawnAt))}</dd>
            </div>
            <div className="qml-game-panel-summary-row">
              <img src={CLOCK_ICON_URL} className="qml-game-panel-summary-icon" alt="" />
              <dt>{t('quickMoneyLobby.drawSummary.drawTime')}</dt>
              <dd>{DRAW_TIME_FORMATTER.format(new Date(latestDraw.drawnAt))}</dd>
            </div>
            <div className="qml-game-panel-summary-row">
              <img src={GAME_NUMBER_ICON_URL} className="qml-game-panel-summary-icon" alt="" />
              <dt>{t('quickMoneyLobby.drawSummary.gameNumber')}</dt>
              <dd>{latestDraw.gameNumber}</dd>
            </div>
          </dl>

          {/* Celda propia de la grilla (ver CSS): la máquina ocupa el espacio que el texto deja
              libre, en cualquier ancho, en vez de posicionarse con offsets fijos. SVG (no <img>)
              para que los dígitos sobre las bolas escalen junto con la imagen -- viewBox = píxeles
              del PNG, preserveAspectRatio = contain + apoyada abajo. Los dígitos son el mismo dato
              dinámico de Previous Result, aria-hidden porque ya se leen ahí. */}
          <div className="qml-game-panel-machine-cell">
            <svg
              className="qml-game-panel-machine"
              viewBox={`0 0 ${RAFFLE_IMAGE_SIZE} ${RAFFLE_IMAGE_SIZE}`}
              preserveAspectRatio="xMidYMax meet"
              aria-hidden="true"
            >
              <image href={RAFFLE_IMAGE_URL[gameType]} width={RAFFLE_IMAGE_SIZE} height={RAFFLE_IMAGE_SIZE} />
              {digits.map((digit, index) => {
                const center = BALL_CENTERS[gameType][index]
                if (!center) return null
                return (
                  <text
                    key={index}
                    x={center[0]}
                    y={center[1]}
                    className="qml-game-panel-machine-digit"
                    textAnchor="middle"
                    dominantBaseline="central"
                  >
                    {digit}
                  </text>
                )
              })}
            </svg>
          </div>
        </div>
      </div>
    </div>
  )
}
