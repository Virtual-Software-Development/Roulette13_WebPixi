import { useTranslation } from 'react-i18next'
import { useCountdown } from '../hooks/useCountdown'
import { buildMediaUrl } from '../utils/media'
import { getRouletteColor, toWheelPocket } from '../utils/rouletteColors'
import { WHEEL_GEOMETRY } from '../layout/wheelGeometry.constants'
import { ACTIVE_WHEEL_TYPE } from '../data/wheelOrder'
import './winnerPanel.css'
import './videoErrorPanel.css'

const WHEEL_BASE_URL = buildMediaUrl(WHEEL_GEOMETRY[ACTIVE_WHEEL_TYPE].baseAsset)
const WHEEL_ROTOR_URL = buildMediaUrl(WHEEL_GEOMETRY[ACTIVE_WHEEL_TYPE].rotorAsset)
// Mismo ícono que ya usa el Admin (RtpImportantNote.tsx) -- el único acento de color del panel.
const WARNING_ICON_URL = buildMediaUrl('Website_svg_icons/23_warning_amber.svg')

// Resultado real de la ronda cuyo video falló -- el panel solo lo muestra, nunca lo calcula.
export type VideoErrorResult =
  | { game: 'roulette'; number: number }
  | { game: 'quickMoney'; pick3: number[]; pick4: number[] }

export interface VideoErrorPanelProps {
  // Resultado de la ronda. null = esta máquina no llegó a recibirlo (p.ej. /drawResult no
  // respondió a tiempo): no hay nada que revelar, así que se omite RESULT IN/RESULT y solo se
  // cuenta CONTINUING IN, en vez de mostrar algo que parezca que el resultado también falló.
  result: VideoErrorResult | null
  // Instante (ISO) en que el flujo normal habría revelado el resultado -- hasta ahí el panel NO lo
  // muestra (countdown "RESULT IN"), así el fallback no adelanta la revelación respecto del video.
  revealAtIso: string
  // Instante (ISO) en que habría terminado el video -- objetivo del countdown "CONTINUING IN" (si
  // queda tiempo después de la revelación). Al llegar a 0 quien lo monta sigue el flujo como si el
  // video hubiera terminado; el countdown se desvanece y el panel queda mostrando solo el resultado
  // durante el hold.
  continueAtIso: string
  // true = anima la escala a 0; quien lo monta lo desmonta WINNER_PANEL_EXIT_DURATION_MS después.
  exiting?: boolean
  // Fondo detrás del panel: la rueda del lobby blureada (Roulette) o el backdrop liso (Quick Money,
  // donde una rueda de ruleta no tendría sentido).
  backdrop?: 'wheel' | 'plain'
  // Nivel de énfasis (ver la sección "Niveles de énfasis" de videoErrorPanel.css) -- cambia solo
  // brillo/opacidad del countdown, nunca colores ni estructura. Sin valor: 'attention' en los
  // últimos 10s del countdown (mismo umbral que el resto, ver useCountdown) y 'normal' antes.
  emphasis?: VideoErrorPanelEmphasis
}

export type VideoErrorPanelEmphasis = 'normal' | 'attention' | 'muted'

// Una celda de ancho fijo por carácter: la Poppins que sirve Google Fonts no aplica tabular-nums
// (medido: "11:11" 211px vs "44:44" 346px a 112px), así que sin esto el número cambia de ancho a
// cada segundo.
function FixedWidthTime({ display }: { display: string }) {
  return (
    <>
      {Array.from(display, (char, index) => (
        <span
          key={index}
          className={char === ':' ? 'video-error-panel-timer-separator' : 'video-error-panel-timer-digit'}
          aria-hidden="true"
        >
          {char}
        </span>
      ))}
    </>
  )
}

function DigitRow({ label, digits }: { label: string; digits: number[] }) {
  return (
    <div className="video-error-panel-pick">
      <span className="video-error-panel-pick-label">{label}</span>
      <span className="video-error-panel-pick-digits">
        {digits.map((digit, index) => (
          <span key={index} className="video-error-panel-pick-digit">
            {digit}
          </span>
        ))}
      </span>
    </div>
  )
}

function ResultValue({ result }: { result: VideoErrorResult }) {
  const { t } = useTranslation()

  if (result.game === 'quickMoney') {
    return (
      <div className="video-error-panel-picks">
        <DigitRow label={t('quickMoneyBettingView.gameType.pick3')} digits={result.pick3} />
        <DigitRow label={t('quickMoneyBettingView.gameType.pick4')} digits={result.pick4} />
      </div>
    )
  }

  // Indicador de color chico (mismo dot y textos que el WinnerPanel) -- el panel en sí nunca cambia
  // de color según el resultado.
  const pocket = toWheelPocket(result.number)
  const color = getRouletteColor(pocket)
  return (
    <>
      <span className="video-error-panel-result-number">{pocket}</span>
      <span className="video-error-panel-result-color">
        <span className="winner-panel-color-dot" data-color={color} />
        {t(`spinStats.${color}`)}
      </span>
    </>
  )
}

// Panel que reemplaza al video de resultado cuando éste no llega a cargar a tiempo (Roulette:
// VideoErrorRound; Quick Money: QuickMoneyVideoView). La ronda NO falló: el panel comunica que solo
// falta el video y respeta los tiempos del video original, derivados del reloj (sin timers propios):
//   1. antes de revealAtIso   -- "RESULT IN" + countdown, el resultado todavía oculto
//   2. revealAtIso..continueAtIso -- RESULT + resultado real, y "CONTINUING IN" por lo que falte
//   3. después de continueAtIso -- solo el resultado (el countdown se desvanece) durante el hold
// Jerarquía: resultado > VIDEO UNAVAILABLE > countdown > mensaje.
//
// Del WinnerPanel reusa el backdrop (winnerPanel.css: capa full-screen, tint y transición de
// salida) y el dot de color; la tarjeta es propia y de color FIJO (paleta navy/acero en
// videoErrorPanel.css), sea cual sea el juego o el resultado.
//
// Fondo 'wheel': no hay frame de video que capturar (el video es justamente lo que falló), así que
// se arma con las mismas PNG de la rueda del lobby, ESTÁTICAS (sin el giro CSS del rotor -- un blur
// sobre algo animado se repinta en cada frame, caro en el hardware del kiosco) y blureadas una sola
// vez.
export function VideoErrorPanel({
  result,
  revealAtIso,
  continueAtIso,
  exiting = false,
  backdrop = 'wheel',
  emphasis,
}: VideoErrorPanelProps) {
  const { t } = useTranslation()
  const revealCountdown = useCountdown(revealAtIso)
  const continueCountdown = useCountdown(continueAtIso)
  // Sin resultado no hay revelación que esperar: el panel pasa directo a CONTINUING IN.
  const revealed = result === null || revealCountdown.remainingSeconds === 0
  // CONTINUING IN solo si después de la revelación todavía queda video (en Quick Money la revelación
  // es el final del video, ver QuickMoneyVideoView) -- si no, no se muestra nunca.
  const hasTimeAfterReveal = result === null || Date.parse(continueAtIso) > Date.parse(revealAtIso)
  const activeCountdown = revealed ? continueCountdown : revealCountdown
  const resolvedEmphasis = emphasis ?? (activeCountdown.urgent ? 'attention' : 'normal')
  const continuing = continueCountdown.remainingSeconds === 0

  return (
    <div className={`winner-panel-backdrop${exiting ? ' winner-panel-backdrop--exiting' : ''}`}>
      {backdrop === 'wheel' && (
        <div className="video-error-panel-wheel" aria-hidden="true">
          <img src={WHEEL_ROTOR_URL} className="video-error-panel-wheel-layer" alt="" />
          <img src={WHEEL_BASE_URL} className="video-error-panel-wheel-layer" alt="" />
        </div>
      )}
      <div className="winner-panel-tint" />
      <section className="video-error-panel" data-emphasis={resolvedEmphasis}>
        <header className="video-error-panel-header">
          <img src={WARNING_ICON_URL} className="video-error-panel-icon" alt="" />
          <h2 className="video-error-panel-title">{t('videoErrorPanel.title')}</h2>
        </header>

        <p className="video-error-panel-message">{t('videoErrorPanel.message')}</p>

        {result && !revealed && (
          <div className="video-error-panel-result video-error-panel-result--pending">
            <span className="video-error-panel-label">{t('videoErrorPanel.resultIn')}</span>
            <span className="video-error-panel-timer-value" role="timer" aria-label={revealCountdown.display}>
              <FixedWidthTime display={revealCountdown.display} />
            </span>
          </div>
        )}

        {result && revealed && (
          <div className="video-error-panel-result video-error-panel-result--revealed">
            <span className="video-error-panel-label">{t('videoErrorPanel.result')}</span>
            <ResultValue result={result} />
          </div>
        )}

        {revealed && hasTimeAfterReveal && (
          <div className="video-error-panel-countdown" data-done={continuing}>
            <span className="video-error-panel-label">{t('videoErrorPanel.continuingIn')}</span>
            <span className="video-error-panel-timer-value" role="timer" aria-label={continueCountdown.display}>
              <FixedWidthTime display={continueCountdown.display} />
            </span>
          </div>
        )}
      </section>
    </div>
  )
}
