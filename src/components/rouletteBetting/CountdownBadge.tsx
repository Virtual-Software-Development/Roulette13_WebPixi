import { useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { useBettingRoundPhase } from '../../hooks/useBettingRoundPhase'
import { useGameConfigStore } from '../../store/useGameConfigStore'
import { ClockIcon } from './icons'
import './countdownBadge.css'

// Countdown real, sincronizado con el mismo reloj compartido que ya usa el resto del proyecto
// (useCountdown/useClockStore, ver useBettingRoundPhase.ts) -- no se implementa un timer propio.
// El total del ciclo tampoco lo da el backend (mismo caso que LastGame.tsx): se infiere
// localmente como el mayor remainingSeconds visto en este ciclo, solo para la progress bar.
export function CountdownBadge() {
  const { t } = useTranslation()
  const { phase, countdown } = useBettingRoundPhase()
  const drawNumber = useGameConfigStore((state) => state.drawNumber)
  const cycleTotalRef = useRef(countdown.remainingSeconds || 1)
  if (countdown.remainingSeconds > cycleTotalRef.current) cycleTotalRef.current = countdown.remainingSeconds
  // Arranca llena (100%) y se vacía a medida que se acaba el tiempo -- no al revés -- para que se
  // lea como "se está acabando", no como progreso acumulándose.
  const remaining = cycleTotalRef.current > 0 ? countdown.remainingSeconds / cycleTotalRef.current : 0

  return (
    <div className="countdown-badge" data-phase={phase}>
      <div className="countdown-badge-heading">
        <span className="countdown-badge-icon">
          <ClockIcon />
        </span>
        <span className="countdown-badge-label">{t('bettingView.countdown.label')}</span>
        {drawNumber && <span className="countdown-badge-round">{t('bettingView.countdown.round', { number: drawNumber })}</span>}
      </div>
      <div className="countdown-badge-main">
        <span className="countdown-badge-value">{countdown.display}</span>
        <p className="countdown-badge-hint">
          {t(phase === 'closed' ? 'bettingView.countdown.closed' : 'bettingView.countdown.placeBets')}
        </p>
      </div>
      <div className="countdown-badge-progress">
        <div className="countdown-badge-progress-fill" style={{ width: `${Math.min(100, Math.max(0, remaining * 100))}%` }} />
      </div>
    </div>
  )
}
