import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useGameConfigStore } from '../../store/useGameConfigStore'
import { useQuickMoneyBetSlipStore } from '../../store/useQuickMoneyBetSlipStore'
import { useQuickMoneyRoundPhase } from '../../hooks/useQuickMoneyRoundPhase'
import { placeQuickMoneyTicket } from '../../api/quickMoneyTicket'
import { calculateSlipTotals, getBetDraw } from '../../utils/quickMoneyPayout'
import { formatMoney } from '../../utils/moneyFormat'
import './quickMoneyPlayerFooter.css'

// Place Bet envía el slip como un ticket real (POST /api/tickets, ver api/quickMoneyTicket.ts) al
// sorteo abierto -- mismo criterio que PlayerPanel.tsx (Roulette). El balance sigue siendo solo
// local (no hay backend de balance todavía): se debita recién cuando el backend acepta el ticket.

export function QuickMoneyPlayerFooter() {
  const { t } = useTranslation()
  const balance = useGameConfigStore((state) => state.balance)
  const setGameConfig = useGameConfigStore((state) => state.setGameConfig)
  const entries = useQuickMoneyBetSlipStore((state) => state.entries)
  const clearAll = useQuickMoneyBetSlipStore((state) => state.clearAll)
  const [submitting, setSubmitting] = useState(false)
  const [justPlaced, setJustPlaced] = useState(false)
  const [popup, setPopup] = useState<'insufficient' | 'failed' | null>(null)
  const { phase, live, eventId } = useQuickMoneyRoundPhase()

  const { totalStake } = useMemo(() => calculateSlipTotals(entries), [entries])
  const insufficientBalance = totalStake > balance
  // Place Bet actúa sobre TODO el slip -- mismo criterio que Confirm Bet en QuickMoneyCashierFooter
  // (ver su comentario): neutro cuando mezcla Pick 3 y Pick 4, coloreado solo cuando es uniforme.
  const soleGameType = useMemo(() => {
    const draws = new Set(entries.map((entry) => getBetDraw(entry.selection)))
    const [only] = [...draws]
    return draws.size === 1 && only !== 'both' ? only : undefined
  }, [entries])
  // insufficientBalance queda AFUERA de canPlaceBet a propósito -- mismo criterio que
  // PlayerPanel.tsx: el botón sigue habilitado para que el click dispare el popup de aviso.
  // Sincronizado con el backend, desde el cierre de apuestas (o sin sorteo abierto) no se puede.
  const canPlaceBet = entries.length > 0 && totalStake > 0 && !submitting && phase !== 'closed'

  function showPopup(kind: 'insufficient' | 'failed') {
    setPopup(kind)
    setTimeout(() => setPopup(null), 3000)
  }

  async function handlePlaceBet() {
    if (!canPlaceBet) return
    if (insufficientBalance) {
      showPopup('insufficient')
      return
    }
    setSubmitting(true)
    if (live && eventId !== null) {
      try {
        await placeQuickMoneyTicket(entries, eventId)
      } catch (err) {
        // The slip stays as it was, so it's clear nothing was placed.
        console.error('[quickMoney] could not place the ticket:', err instanceof Error ? err.message : err)
        setSubmitting(false)
        showPopup('failed')
        return
      }
    }
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
        {popup && (
          <p className="qm-player-footer-popup" role="alert">
            {popup === 'insufficient' ? t('quickMoneyBettingView.player.insufficientBalance') : t('quickMoneyBettingView.player.placeBetFailed')}
          </p>
        )}
        <button type="button" className="qm-player-footer-place-bet" data-accent={soleGameType} disabled={!canPlaceBet} onClick={handlePlaceBet}>
          {submitting ? t('quickMoneyBettingView.player.placing') : t('quickMoneyBettingView.player.placeBet')}
        </button>
      </div>
    </div>
  )
}
