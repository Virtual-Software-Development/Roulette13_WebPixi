import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useDrawCycleStore } from '../store/useDrawCycleStore'
import { useResultsStore } from '../store/useResultsStore'
import { getRouletteColor, toWheelPocket } from '../utils/rouletteColors'
import { getRouletteParity, getRouletteRange } from '../utils/rouletteClassification'
import { WINNER_PANEL_EXIT_DURATION_MS } from '../layout/layout.constants'
import { DRAW_VIDEO_SLOT_ID, getVideoSlot } from '../video/videoElements'
import './winnerPanel.css'

// Cuántos números recientes se muestran en la fila "Recent Results" -- decisión visual (cap fijo
// a 7, igual que la referencia de diseño), no una regla del juego: la fuente de datos
// (useResultsStore) ya trae más historial disponible (maxResults, hoy 10 por defecto).
const RECENT_RESULTS_COUNT = 7

const RANGE_LABEL: Record<'low' | 'high', string> = {
  low: '1 – 18',
  high: '19 – 36',
}

// Trofeo decorativo -- no hay librería de íconos ni asset existente en el proyecto, así que se
// resuelve con un SVG inline simple (sin nueva dependencia).
function TrophyIcon() {
  return (
    <svg viewBox="0 0 24 24" className="winner-panel-trophy" aria-hidden="true" focusable="false">
      <path
        fill="currentColor"
        d="M6 3h12v2h2.5a1.5 1.5 0 0 1 1.5 1.5c0 2.9-1.86 5.32-4.44 5.9C16.6 14.2 14.9 15.6 13 15.93V18h3v2H8v-2h3v-2.07c-1.9-.33-3.6-1.73-4.56-3.53C3.86 11.82 2 9.4 2 6.5A1.5 1.5 0 0 1 3.5 5H6V3zm0 4H4c.2 1.68 1.2 3.1 2.6 3.72A9.6 9.6 0 0 1 6 7zm12 0a9.6 9.6 0 0 1-.6 3.72C18.8 10.1 19.8 8.68 20 7h-2z"
      />
    </svg>
  )
}

// Panel full-screen (DOM, fuera de Pixi -- backdrop-filter no es viable barato en WebGL) que
// aparece cuando al video de sorteo le quedan WINNER_PANEL_LEAD_SECONDS (ver RouletteVideoView,
// que escribe winnerPanelNumber) y se mantiene fijo durante el resto del video + el hold + la
// bajada de la rueda -- recién cuando esa bajada termina (App.tsx: handleFullyExited pone
// winnerPanelExiting=true) arranca su animación de escala a 0. Al terminar esa animación, avisa
// (setLobbyInfoVisible(true)) para que recién ahí vuelvan Header/Footer/SharedLayout -- ver
// useDrawCycleStore.lobbyInfoVisible.
export function WinnerPanel() {
  const { t } = useTranslation()
  const winnerNumber = useDrawCycleStore((state) => state.winnerPanelNumber)
  const exiting = useDrawCycleStore((state) => state.winnerPanelExiting)
  const canvasRef = useRef<HTMLCanvasElement>(null)

  // Recent Results congelado en el instante en que el panel aparece -- winnerNumber se fija
  // WINNER_PANEL_LEAD_SECONDS ANTES de que el video real termine (ver RouletteVideoView), pero
  // addResult (el que mete el nuevo número en currentWinner/history) recién corre en el evento
  // 'ended', varios segundos después, con el panel ya en pantalla. Si esta fila leyera
  // currentWinner/history en vivo (como antes), se veía el chip más nuevo faltar y luego
  // aparecer/correr el resto un toque a la derecha a mitad de la animación -- ahora se arma la
  // foto final (nuevo número + lo que había antes de que addResult corra) UNA sola vez acá y no se
  // vuelve a tocar por el resto de la vida del panel, aunque el store cambie debajo.
  const [frozenRecentNumbers, setFrozenRecentNumbers] = useState<number[] | null>(null)
  useEffect(() => {
    if (winnerNumber === null) {
      setFrozenRecentNumbers(null)
      return
    }
    const store = useResultsStore.getState()
    const priorNumbers = [store.currentWinner, ...store.history]
      .filter((r): r is NonNullable<typeof r> => r !== null)
      .map((r) => r.winningNumber)
    setFrozenRecentNumbers([winnerNumber, ...priorNumbers].slice(0, RECENT_RESULTS_COUNT))
  }, [winnerNumber])

  // Captura UN frame del video real al momento de aparecer (no backdrop-filter, que reblurea
  // contenido en vivo en cada frame -- eso es justo lo que se ve mal: el fondo blureado cambia
  // visiblemente cuando el video hace su hand-off hacia LobbyBackgroundLayer detrás). Dibujado en
  // un <canvas> con filter:blur (CSS, no backdrop-filter) sobre una imagen ya estática -- se
  // queda fijo aunque el video siga reproduciéndose o desaparezca detrás.
  useEffect(() => {
    if (winnerNumber === null) return
    const canvas = canvasRef.current
    const video = getVideoSlot(DRAW_VIDEO_SLOT_ID)
    if (!canvas || !video.videoWidth) return
    canvas.width = video.videoWidth
    canvas.height = video.videoHeight
    canvas.getContext('2d')?.drawImage(video, 0, 0, canvas.width, canvas.height)
  }, [winnerNumber])

  useEffect(() => {
    if (!exiting) return
    const timer = setTimeout(() => {
      useDrawCycleStore.getState().setLobbyInfoVisible(true)
      useDrawCycleStore.getState().setWinnerPanelNumber(null)
      useDrawCycleStore.getState().setWinnerPanelExiting(false)
    }, WINNER_PANEL_EXIT_DURATION_MS)
    return () => clearTimeout(timer)
  }, [exiting])

  if (winnerNumber === null) return null

  const winnerPocket = toWheelPocket(winnerNumber)
  const color = getRouletteColor(winnerPocket)
  const parity = getRouletteParity(winnerPocket)
  const range = getRouletteRange(winnerPocket)

  // frozenRecentNumbers se setea en el mismo tick en que winnerNumber deja de ser null (ver el
  // useEffect de arriba) -- ?? [] solo cubre el primer render de ese cambio, antes de que el
  // efecto corra.
  const recentNumbers = frozenRecentNumbers ?? []

  return (
    <div className={`winner-panel-backdrop${exiting ? ' winner-panel-backdrop--exiting' : ''}`}>
      <canvas ref={canvasRef} className="winner-panel-backdrop-canvas" />
      <div className="winner-panel-tint" />
      <div className="winner-panel-card" data-color={color}>
        <div className="winner-panel-header" data-color={color}>
          <TrophyIcon />
          <span className="winner-panel-header-title">{t('winnerPanel.title')}</span>
        </div>

        <div className="winner-panel-body">
          <div className="winner-panel-number-box" data-color={color}>
            <span className="winner-panel-number">{winnerPocket}</span>
          </div>

          <div className="winner-panel-details">
            <div className="winner-panel-detail-row">
              <div className="winner-panel-detail">
                <span className="winner-panel-detail-label">{t('winnerPanel.color')}</span>
                <span className="winner-panel-detail-value winner-panel-color-value">
                  <span className="winner-panel-color-dot" data-color={color} />
                  {t(`spinStats.${color}`)}
                </span>
              </div>

              <div className="winner-panel-detail">
                <span className="winner-panel-detail-label">{t('winnerPanel.parity')}</span>
                <span className="winner-panel-detail-value">
                  {parity ? t(`spinStats.${parity}`) : t('winnerPanel.notApplicable')}
                </span>
              </div>

              <div className="winner-panel-detail">
                <span className="winner-panel-detail-label">{t('winnerPanel.range')}</span>
                <span className="winner-panel-detail-value">
                  {range ? RANGE_LABEL[range] : t('winnerPanel.notApplicable')}
                </span>
              </div>
            </div>

            {recentNumbers.length > 0 && (
              <div className="winner-panel-recent">
                <span className="winner-panel-detail-label">{t('winnerPanel.recentResults')}</span>
                <div className="winner-panel-recent-list">
                  {recentNumbers.map((n, index) => {
                    const pocket = toWheelPocket(n)
                    return (
                      <span key={index} className="winner-panel-chip" data-color={getRouletteColor(pocket)}>
                        {pocket}
                      </span>
                    )
                  })}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
