import { useEffect, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { useDrawCycleStore } from '../store/useDrawCycleStore'
import { getRouletteColor, ROULETTE_TEXT_COLOR_HEX } from '../utils/rouletteColors'
import { WINNER_PANEL_EXIT_DURATION_MS } from '../layout/layout.constants'
import { DRAW_VIDEO_SLOT_ID, getVideoSlot } from '../video/videoElements'
import './winnerPanel.css'

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

  const color = getRouletteColor(winnerNumber)
  const hexColor = '#' + ROULETTE_TEXT_COLOR_HEX[color].toString(16).padStart(6, '0')

  return (
    <div className={`winner-panel-backdrop${exiting ? ' winner-panel-backdrop--exiting' : ''}`}>
      <canvas ref={canvasRef} className="winner-panel-backdrop-canvas" />
      <div className="winner-panel-tint" />
      <div className="winner-panel-card">
        <div className="winner-panel-title">{t('winnerPanel.title')}</div>
        <div className="winner-panel-number" style={{ color: hexColor }}>
          {winnerNumber}
        </div>
      </div>
    </div>
  )
}
