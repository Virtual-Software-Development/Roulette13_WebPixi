import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { useBetSlipStore } from '../../store/useBetSlipStore'
import { useGameConfigStore } from '../../store/useGameConfigStore'
import { calculateBetPayout, calculateMaxPotentialWin, calculateSlipTotals } from '../../utils/rouletteBetPayout'
import { getBetSelectionDescription, getBetTypeLabel } from '../../utils/rouletteBetLabel'
import { formatMoney } from '../../utils/moneyFormat'
import type { BetSlipEntry } from '../../types/betSlip'
import { RemoveIcon } from './icons'
import './betSlip.css'

const NO_ENTRIES: BetSlipEntry[] = []

export function SelectedBetsList() {
  const { t } = useTranslation()
  const entries = useBetSlipStore((state) => state.entries)
  const removeBet = useBetSlipStore((state) => state.removeBet)
  const clearAll = useBetSlipStore((state) => state.clearAll)
  const drawNumber = useGameConfigStore((state) => state.drawNumber)
  // Lo ya realizado en ESTA ronda: lo local que el jugador necesita ver aunque se caiga la
  // conexión. Deja de mostrarse solo cuando useRoundSync pasa a la ronda siguiente.
  const placed = useBetSlipStore((state) => (state.placedRound === drawNumber ? state.placed : NO_ENTRIES))

  const totals = useMemo(() => calculateSlipTotals(entries), [entries])
  // Máximo realmente cobrable con UN solo resultado de giro (no la suma de "si ganara todo", que
  // es imposible con apuestas mutuamente excluyentes como Rojo+Negro) -- ver
  // calculateMaxPotentialWin en rouletteBetPayout.ts.
  const maxPotentialWin = useMemo(() => calculateMaxPotentialWin(entries), [entries])

  return (
    <div className="bet-slip">
      <div className="bet-slip-header">
        <span className="bet-slip-title">{t('bettingView.selectedBets.title')}</span>
        {entries.length > 0 && (
          <button type="button" className="bet-slip-clear" onClick={clearAll}>
            {t('bettingView.selectedBets.clearAll')}
          </button>
        )}
      </div>

      {(entries.length > 0 || placed.length > 0) && (
        <div className="bet-slip-columns">
          <span>{t('bettingView.selectedBets.columnBet')}</span>
          <span>{t('bettingView.selectedBets.columnSelection')}</span>
          <span>{t('bettingView.selectedBets.columnAmount')}</span>
          <span>{t('bettingView.selectedBets.columnPayout')}</span>
          <span aria-hidden="true" />
        </div>
      )}

      <div className="bet-slip-rows">
        {entries.length === 0 && placed.length === 0 && <p className="bet-slip-empty">{t('bettingView.selectedBets.empty')}</p>}
        {entries.map((entry) => {
          const payout = calculateBetPayout(entry.betType, entry.stake)
          return (
            <div key={entry.zoneId} className="bet-slip-row">
              <span className="bet-slip-row-type">{getBetTypeLabel(entry.betType, t)}</span>
              <span className="bet-slip-row-selection">{getBetSelectionDescription(entry.selection, t)}</span>
              <span className="bet-slip-row-amount">{formatMoney(entry.stake)}</span>
              <span className="bet-slip-row-payout">{formatMoney(payout.totalReturn)}</span>
              <button
                type="button"
                className="bet-slip-row-remove"
                aria-label={t('bettingView.selectedBets.removeAria', { selection: getBetSelectionDescription(entry.selection, t) })}
                onClick={() => removeBet(entry.zoneId)}
              >
                <RemoveIcon />
              </button>
            </div>
          )
        })}
        {placed.length > 0 && (
          <>
            <p className="bet-slip-placed-title">{t('bettingView.selectedBets.placedThisRound', { round: drawNumber })}</p>
            {placed.map((entry) => (
              <div key={entry.zoneId} className="bet-slip-row bet-slip-row--placed">
                <span className="bet-slip-row-type">{getBetTypeLabel(entry.betType, t)}</span>
                <span className="bet-slip-row-selection">{getBetSelectionDescription(entry.selection, t)}</span>
                <span className="bet-slip-row-amount">{formatMoney(entry.stake)}</span>
                <span className="bet-slip-row-payout">{formatMoney(calculateBetPayout(entry.betType, entry.stake).totalReturn)}</span>
                <span aria-hidden="true" />
              </div>
            ))}
          </>
        )}
      </div>

      <div className="bet-slip-totals">
        <div className="bet-slip-totals-item">
          <span className="bet-slip-totals-label">{t('bettingView.selectedBets.totalStake')}</span>
          <span className="bet-slip-totals-value">{formatMoney(totals.totalStake)}</span>
        </div>
        <div className="bet-slip-totals-item">
          <span className="bet-slip-totals-label">{t('bettingView.selectedBets.potentialWin')}</span>
          <span className="bet-slip-totals-value bet-slip-totals-value--accent">{formatMoney(maxPotentialWin)}</span>
        </div>
      </div>
    </div>
  )
}
