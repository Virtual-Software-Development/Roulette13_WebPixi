import { useTranslation } from 'react-i18next'
import { useDrawCycleStore } from '../store/useDrawCycleStore'
import { useLobbyModeStore } from '../store/useLobbyModeStore'
import './jackpotOverlay.css'

// Vista Jackpot de la rotación del lobby (modo 'rotation', ver sync/lobbyRotation.ts). PROVISORIA:
// solo el título centrado hasta que se diseñe la vista real (tarea futura). Tapa la pantalla entera
// por encima del canvas, como el split de Quick Money; oculta mientras hay un sorteo de Roulette en
// pantalla.
export function JackpotOverlay() {
  const { t } = useTranslation()
  const phase = useLobbyModeStore((state) => state.phase)
  const lobbyInfoVisible = useDrawCycleStore((state) => state.lobbyInfoVisible)
  const visible = phase === 'jackpot' && lobbyInfoVisible

  return (
    <div className="jackpot-overlay" data-visible={visible} aria-hidden={!visible}>
      <h1 className="jackpot-overlay-title">{t('jackpotView.title')}</h1>
    </div>
  )
}
