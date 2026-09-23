import { useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { useCountdown } from '../../hooks/useCountdown'
import { useQuickMoneyRoundStore } from '../../store/useQuickMoneyRoundStore'
import type { QuickMoneyGameType } from '../../types/quickMoneyBet'
import { ClockIcon } from './icons'
import './roundCountdownRow.css'

// Countdown 100% local/mock (ver useQuickMoneyRoundStore.ts) -- puramente informativo en v1, no
// bloquea Add to Bet Slip/Place Bet por fase de ronda (a diferencia de Roulette). Al llegar a 0
// dispara advanceRound() para que el ciclo se repita solo, sin depender de nada externo.
function RoundBadge({ gameType }: { gameType: QuickMoneyGameType }) {
  const { t } = useTranslation()
  const round = useQuickMoneyRoundStore((state) => state[gameType])
  const advanceRound = useQuickMoneyRoundStore((state) => state.advanceRound)
  const countdown = useCountdown(round.nextDrawTime)

  useEffect(() => {
    if (countdown.remainingSeconds <= 0) advanceRound(gameType)
  }, [countdown.remainingSeconds, gameType, advanceRound])

  return (
    <div className="qm-round-badge" data-accent={gameType}>
      <span className="qm-round-badge-icon">
        <ClockIcon />
      </span>
      <div className="qm-round-badge-text">
        <span className="qm-round-badge-label">
          {t('quickMoneyBettingView.countdown.label', { game: t(`quickMoneyBettingView.gameType.${gameType}`) })}
        </span>
        <span className="qm-round-badge-value">{countdown.display}</span>
      </div>
      <span className="qm-round-badge-draw">{t('quickMoneyBettingView.countdown.round', { number: round.drawNumber })}</span>
    </div>
  )
}

export function RoundCountdownRow({ gameTypes }: { gameTypes: QuickMoneyGameType[] }) {
  return (
    <div className="qm-round-row">
      {gameTypes.map((gameType) => (
        <RoundBadge key={gameType} gameType={gameType} />
      ))}
    </div>
  )
}
