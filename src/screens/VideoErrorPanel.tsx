import { useTranslation } from 'react-i18next'
import { useCountdown } from '../hooks/useCountdown'
import { buildMediaUrl } from '../utils/media'
import { WHEEL_GEOMETRY } from '../layout/wheelGeometry.constants'
import { ACTIVE_WHEEL_TYPE } from '../data/wheelOrder'
import './winnerPanel.css'
import './videoErrorPanel.css'

const WHEEL_BASE_URL = buildMediaUrl(WHEEL_GEOMETRY[ACTIVE_WHEEL_TYPE].baseAsset)
const WHEEL_ROTOR_URL = buildMediaUrl(WHEEL_GEOMETRY[ACTIVE_WHEEL_TYPE].rotorAsset)
// Mismo ícono que ya usa el Admin (GameEventDetailPanel.tsx).
const CLOCK_ICON_URL = buildMediaUrl('Website_svg_icons/30_clock_white.svg')

export interface VideoErrorPanelProps {
  // Objetivo del countdown (ISO).
  nextRoundStartIso: string
  // true = anima la escala a 0; quien lo monta lo desmonta WINNER_PANEL_EXIT_DURATION_MS después.
  exiting?: boolean
  // Título e ícono del header -- por defecto "NEXT ROUND" / reloj. El header es el único texto del
  // panel: la tarjeta interior muestra solo el countdown. Otros estados (BETTING OPEN, DRAWING,
  // ...) cambian SOLO título/ícono: mismo layout, mismas dimensiones y mismo color (componente de
  // sistema, nunca depende del juego, estado ni resultado).
  title?: string
  iconUrl?: string
  // Nivel de énfasis (ver la sección "Niveles de énfasis" de videoErrorPanel.css) -- cambia solo
  // brillo/opacidad del contenido, nunca colores ni estructura. Sin valor: 'attention' en los
  // últimos 10s del countdown (mismo umbral que el resto, ver useCountdown) y 'normal' antes.
  emphasis?: VideoErrorPanelEmphasis
}

export type VideoErrorPanelEmphasis = 'normal' | 'attention' | 'muted'

// Panel que reemplaza al video de sorteo cuando éste no llega a cargar. Del WinnerPanel reusa solo
// el backdrop (winnerPanel.css: capa full-screen, tint y transición de salida); la tarjeta es
// propia porque la del WinnerPanel cambia de color según el resultado (data-color), y ésta tiene
// que verse siempre igual -- paleta navy/acero fija en videoErrorPanel.css.
//
// Fondo: no hay frame de video que capturar (el video es justamente lo que falló), así que se arma
// con las mismas PNG de la rueda del lobby, ESTÁTICAS (sin el giro CSS del rotor -- un blur sobre
// algo animado se repinta en cada frame, caro en el hardware del kiosco) y blureadas una sola vez.
export function VideoErrorPanel({
  nextRoundStartIso,
  exiting = false,
  title,
  iconUrl = CLOCK_ICON_URL,
  emphasis,
}: VideoErrorPanelProps) {
  const { t } = useTranslation()
  const countdown = useCountdown(nextRoundStartIso)
  const resolvedEmphasis = emphasis ?? (countdown.urgent ? 'attention' : 'normal')

  return (
    <div className={`winner-panel-backdrop${exiting ? ' winner-panel-backdrop--exiting' : ''}`}>
      <div className="video-error-panel-wheel" aria-hidden="true">
        <img src={WHEEL_ROTOR_URL} className="video-error-panel-wheel-layer" alt="" />
        <img src={WHEEL_BASE_URL} className="video-error-panel-wheel-layer" alt="" />
      </div>
      <div className="winner-panel-tint" />
      <section className="video-error-panel" data-emphasis={resolvedEmphasis}>
        <header className="video-error-panel-header">
          <img src={iconUrl} className="video-error-panel-icon" alt="" />
          <h2 className="video-error-panel-title">{title ?? t('videoErrorPanel.title')}</h2>
        </header>

        <div className="video-error-panel-timer">
          <span
            className="video-error-panel-timer-value"
            role="timer"
            aria-label={countdown.display}
          >
            {/* Una celda de ancho fijo por carácter: la Poppins que sirve Google Fonts no aplica
                tabular-nums (medido: "11:11" 211px vs "44:44" 346px a 112px), así que sin esto el
                número cambia de ancho a cada segundo. */}
            {Array.from(countdown.display, (char, index) => (
              <span
                key={index}
                className={char === ':' ? 'video-error-panel-timer-separator' : 'video-error-panel-timer-digit'}
                aria-hidden="true"
              >
                {char}
              </span>
            ))}
          </span>
        </div>
      </section>
    </div>
  )
}
