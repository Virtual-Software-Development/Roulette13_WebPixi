import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useGameConfigStore } from '../../store/useGameConfigStore'
import { useQuickMoneyBetSlipStore } from '../../store/useQuickMoneyBetSlipStore'
import { calculateSlipTotals } from '../../utils/quickMoneyPayout'
import { formatMoney } from '../../utils/moneyFormat'
import './quickMoneyPlayerFooter.css'

// Sin backend de apuestas/balance real todavía -- mismo criterio mock que PlayerPanel.tsx
// (Roulette): debita el balance vía el setter genérico ya existente (setGameConfig).
const ACTION_DURATION_MS = 700

function simulateAction(): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ACTION_DURATION_MS))
}

export function QuickMoneyPlayerFooter() {
  const { t } = useTranslation()
  const balance = useGameConfigStore((state) => state.balance)
  const setGameConfig = useGameConfigStore((state) => state.setGameConfig)
  const entries = useQuickMoneyBetSlipStore((state) => state.entries)
  const clearAll = useQuickMoneyBetSlipStore((state) => state.clearAll)
  const [submitting, setSubmitting] = useState(false)
  const [justPlaced, setJustPlaced] = useState(false)
  const [showInsufficientPopup, setShowInsufficientPopup] = useState(false)

  const { totalStake } = useMemo(() => calculateSlipTotals(entries), [entries])
  const insufficientBalance = totalStake > balance
  // Place Bet actúa sobre TODO el slip -- mismo criterio que Confirm Bet en QuickMoneyCashierFooter
  // (ver su comentario): neutro cuando mezcla Pick 3 y Pick 4, coloreado solo cuando es uniforme.
  const soleGameType = useMemo(() => {
    const gameTypes = new Set(entries.map((entry) => entry.selection.gameType))
    return gameTypes.size === 1 ? [...gameTypes][0] : undefined
  }, [entries])
  // insufficientBalance queda AFUERA de canPlaceBet a propósito -- mismo criterio que
  // PlayerPanel.tsx: el botón sigue habilitado para que el click dispare el popup de aviso.
  const canPlaceBet = entries.length > 0 && totalStake > 0 && !submitting

  async function handlePlaceBet() {
    if (!canPlaceBet) return
    if (insufficientBalance) {
      setShowInsufficientPopup(true)
      setTimeout(() => setShowInsufficientPopup(false), 3000)
      return
    }
    setSubmitting(true)
    await simulateAction()
    setGameConfig({ balance: balance - totalStake })
    clearAll()
    setSubmitting(false)
    setJustPlaced(true)
    setTimeout(() => setJustPlaced(false), 2500)
  }

  return (
    <div className="qm-player-footer">
      <div className="qm-player-footer-balance">
        <span className="qm-player-footer-balance-label">{t('quickMoneyBettingView.player.balanceLabel')}</span>
        <span className="qm-player-footer-balance-value">{formatMoney(balance)}</span>
      </div>

      {justPlaced && (
        <p className="qm-player-footer-success" role="status">
          {t('quickMoneyBettingView.player.betPlacedSuccess')}
        </p>
      )}

      <div className="qm-player-footer-place-bet-wrap">
        {showInsufficientPopup && (
          <p className="qm-player-footer-popup" role="alert">
            {t('quickMoneyBettingView.player.insufficientBalance')}
          </p>
        )}
        <button type="button" className="qm-player-footer-place-bet" data-accent={soleGameType} disabled={!canPlaceBet} onClick={handlePlaceBet}>
          {submitting ? t('quickMoneyBettingView.player.placing') : t('quickMoneyBettingView.player.placeBet')}
        </button>
      </div>
    </div>
  )
}
