import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import type { BettingMode } from '../../types/bettingMode'
import { useQuickMoneyBetSlipStore } from '../../store/useQuickMoneyBetSlipStore'
import { calculateMaxPotentialWin, calculateSlipTotals } from '../../utils/quickMoneyPayout'
import { getBetTypeLabel, getGameTypeLabel, formatDigits } from '../../utils/quickMoneyBetLabel'
import { formatCurrency } from '../../utils/currencyFormat'
import { RemoveIcon } from './icons'
import { QuickMoneyPlayerFooter } from './QuickMoneyPlayerFooter'
import { QuickMoneyCashierFooter } from './QuickMoneyCashierFooter'
import './quickMoneyBetSlip.css'

// A diferencia de Roulette (Player/Cashier es un panel APARTE al lado del chip selector), acá el
// footer de acción vive DENTRO del mismo panel de Bet Slip -- fiel a la referencia visual (Total
// Bet + Place Bet apilados debajo de la lista, en la misma tarjeta).
export function QuickMoneyBetSlip({ mode }: { mode: BettingMode }) {
  const { t } = useTranslation()
  const entries = useQuickMoneyBetSlipStore((state) => state.entries)
  const removeBet = useQuickMoneyBetSlipStore((state) => state.removeBet)
  const clearAll = useQuickMoneyBetSlipStore((state) => state.clearAll)

  const totals = useMemo(() => calculateSlipTotals(entries), [entries])
  const maxPotentialWin = useMemo(() => calculateMaxPotentialWin(entries), [entries])

  return (
    <div className="qm-betslip">
      <div className="qm-betslip-header">
        <span className="qm-betslip-title">{t('quickMoneyBettingView.betSlip.title', { count: entries.length })}</span>
        {entries.length > 0 && (
          <button type="button" className="qm-betslip-clear" onClick={clearAll}>
            {t('quickMoneyBettingView.betSlip.clearAll')}
          </button>
        )}
      </div>

      {entries.length > 0 && (
        <div className="qm-betslip-columns">
          <span>{t('quickMoneyBettingView.betSlip.columnGame')}</span>
          <span>{t('quickMoneyBettingView.betSlip.columnNumbers')}</span>
          <span>{t('quickMoneyBettingView.betSlip.columnType')}</span>
          <span>{t('quickMoneyBettingView.betSlip.columnAmount')}</span>
          <span aria-hidden="true" />
        </div>
      )}

      <div className="qm-betslip-rows">
        {entries.length === 0 && <p className="qm-betslip-empty">{t('quickMoneyBettingView.betSlip.empty')}</p>}
        {entries.map((entry) => (
          <div key={entry.id} className="qm-betslip-row">
            <span className="qm-betslip-row-game" data-accent={entry.selection.gameType}>
              {getGameTypeLabel(entry.selection.gameType, t)}
            </span>
            <span className="qm-betslip-row-digits">{formatDigits(entry.selection.digits)}</span>
            <span className="qm-betslip-row-type">{getBetTypeLabel(entry.selection.betType, t)}</span>
            <span className="qm-betslip-row-amount">{formatCurrency(entry.stake)}</span>
            <button
              type="button"
              className="qm-betslip-row-remove"
              aria-label={t('quickMoneyBettingView.betSlip.removeAria', { digits: formatDigits(entry.selection.digits) })}
              onClick={() => removeBet(entry.id)}
            >
              <RemoveIcon />
            </button>
          </div>
        ))}
      </div>

      <div className="qm-betslip-totals">
        <div className="qm-betslip-totals-item">
          <span className="qm-betslip-totals-label">{t('quickMoneyBettingView.betSlip.totalBet')}</span>
          <span className="qm-betslip-totals-value">{formatCurrency(totals.totalStake)}</span>
        </div>
        <div className="qm-betslip-totals-item">
          <span className="qm-betslip-totals-label">{t('quickMoneyBettingView.betSlip.potentialWin')}</span>
          <span className="qm-betslip-totals-value qm-betslip-totals-value--accent">{formatCurrency(maxPotentialWin)}</span>
        </div>
      </div>

      {mode === 'player' ? <QuickMoneyPlayerFooter /> : <QuickMoneyCashierFooter />}
    </div>
  )
}
