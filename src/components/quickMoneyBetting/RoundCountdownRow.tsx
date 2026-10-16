import { useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { useQuickMoneyRoundPhase } from '../../hooks/useQuickMoneyRoundPhase'
import { useQuickMoneyRoundStore } from '../../store/useQuickMoneyRoundStore'
import { ClockIcon } from './icons'
import './roundCountdownRow.css'

// Un solo sorteo de Quick Money decide todas las apuestas (Pick 3 y Pick 4 salen juntos).
// Sincronizado con el backend (live, ver useQuickMoneyEventSync) cuenta hasta el cierre de apuestas
// del sorteo abierto y muestra "Bets closed" / "Waiting for the next draw" mientras no se puede
// apostar. Sin sincronizar sigue el reloj mock: al llegar a 0 dispara advanceRound().
function RoundBadge() {
  const { t } = useTranslation()
  const drawNumber = useQuickMoneyRoundStore((state) => state.drawNumber)
  const advanceRound = useQuickMoneyRoundStore((state) => state.advanceRound)
  const { phase, countdown, live, eventId } = useQuickMoneyRoundPhase()

  useEffect(() => {
    if (!live && countdown.remainingSeconds <= 0) advanceRound()
  }, [live, countdown.remainingSeconds, advanceRound])

  const closed = phase === 'closed'
  const label = !live
    ? t('quickMoneyBettingView.countdown.label', { game: t('quickMoneyBettingView.gameType.quickMoney') })
    : t('quickMoneyBettingView.countdown.betsCloseIn')
  const value = !closed
    ? countdown.display
    : eventId === null
      ? t('quickMoneyBettingView.countdown.waitingForDraw')
      : t('quickMoneyBettingView.countdown.betsClosed')

  return (
    <div className="qm-round-badge" data-accent="pick3">
      <span className="qm-round-badge-icon">
        <ClockIcon />
      </span>
      <div className="qm-round-badge-text">
        <span className="qm-round-badge-label">{label}</span>
        <span className="qm-round-badge-value" data-closed={closed || undefined}>
          {value}
        </span>
      </div>
      {(!live || eventId !== null) && (
        <span className="qm-round-badge-draw">{t('quickMoneyBettingView.countdown.round', { number: drawNumber })}</span>
      )}
    </div>
  )
}

export function RoundCountdownRow() {
  return (
    <div className="qm-round-row">
      <RoundBadge />
    </div>
  )
}
