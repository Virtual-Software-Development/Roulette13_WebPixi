import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useQuickMoneyBetSlipStore } from '../../store/useQuickMoneyBetSlipStore'
import { useQuickMoneyRoundStore } from '../../store/useQuickMoneyRoundStore'
import { calculateSlipTotals, getBetDraw } from '../../utils/quickMoneyPayout'
import { formatCurrency } from '../../utils/currencyFormat'
import { buildTicketPreview } from '../../data/quickMoneyTicketMockData'
import { useQuickMoneyRoundPhase } from '../../hooks/useQuickMoneyRoundPhase'
import { placeQuickMoneyTicket } from '../../api/quickMoneyTicket'
import type { QuickMoneyTicket } from '../../types/quickMoneyTicket'
import { QuickMoneyTicketPreviewModal } from './QuickMoneyTicketPreviewModal'
import './quickMoneyCashierFooter.css'

// Mismo patrón que CashierPanel.tsx (Roulette): Confirm Bet nunca emite directo, solo abre el
// Ticket Preview -- Issue Ticket es un paso aparte y explícito, y es el que envía el ticket real
// (POST /api/tickets) al sorteo abierto, con el mismo número que muestra el preview.
export function QuickMoneyCashierFooter() {
  const { t } = useTranslation()
  const drawNumber = useQuickMoneyRoundStore((state) => state.drawNumber)
  const entries = useQuickMoneyBetSlipStore((state) => state.entries)
  const clearAll = useQuickMoneyBetSlipStore((state) => state.clearAll)
  const [stage, setStage] = useState<'building' | 'preview'>('building')
  const [ticket, setTicket] = useState<QuickMoneyTicket | null>(null)
  const [issuing, setIssuing] = useState(false)
  const [justIssued, setJustIssued] = useState(false)
  const [issueFailed, setIssueFailed] = useState(false)
  const { phase, live, eventId } = useQuickMoneyRoundPhase()

  const { totalStake } = useMemo(() => calculateSlipTotals(entries), [entries])
  const canConfirm = entries.length > 0 && totalStake > 0 && phase !== 'closed'
  // Confirm Bet actúa sobre TODO el slip, no sobre la pestaña activa -- si mezcla Pick 3 y Pick 4
  // (posible: se puede armar una apuesta, cambiar de tab, y armar otra antes de confirmar) no hay
  // un único color de juego al que pintarlo, así que queda neutro (ver quickMoneyCashierFooter.css).
  const soleGameType = useMemo(() => {
    const draws = new Set(entries.map((entry) => getBetDraw(entry.selection)))
    const [only] = [...draws]
    return draws.size === 1 && only !== 'both' ? only : undefined
  }, [entries])

  function handleConfirmBet() {
    if (!canConfirm) return
    // Directo/Palé dependen de los dos sorteos, así que cuentan para ambos.
    const draws = new Set(entries.map((entry) => getBetDraw(entry.selection)))
    const drawNumbers = {
      ...(draws.has('pick3') || draws.has('both') ? { pick3: drawNumber } : {}),
      ...(draws.has('pick4') || draws.has('both') ? { pick4: drawNumber } : {}),
    }
    setTicket(buildTicketPreview(entries, drawNumbers))
    setStage('preview')
  }

  function handleCancelPreview() {
    setStage('building')
    setTicket(null)
  }

  async function handleIssueTicket() {
    if (!ticket) return
    setIssuing(true)
    try {
      if (!live || eventId === null) throw new Error('no Quick Money draw open for betting')
      await placeQuickMoneyTicket(ticket.entries, eventId, ticket.ticketNumber)
    } catch (err) {
      // Nothing was issued: the preview closes but the slip stays, ready to try again.
      console.error('[quickMoney] could not issue the ticket:', err instanceof Error ? err.message : err)
      setIssuing(false)
      setStage('building')
      setTicket(null)
      setIssueFailed(true)
      setTimeout(() => setIssueFailed(false), 3000)
      return
    }
    setIssuing(false)
    setStage('building')
    setTicket(null)
    clearAll()
    setJustIssued(true)
    setTimeout(() => setJustIssued(false), 2500)
  }

  return (
    <div className="qm-cashier-footer">
      <div className="qm-cashier-footer-total">
        <span className="qm-cashier-footer-total-label">{t('quickMoneyBettingView.cashier.totalToCollect')}</span>
        <span className="qm-cashier-footer-total-value">{formatCurrency(totalStake)}</span>
      </div>

      {issueFailed && (
        <p className="qm-cashier-footer-error" role="alert">
          {t('quickMoneyBettingView.cashier.issueFailed')}
        </p>
      )}

      {justIssued && (
        <p className="qm-cashier-footer-success" role="status">
          {t('quickMoneyBettingView.cashier.ticketIssued')}
        </p>
      )}

      <button type="button" className="qm-cashier-footer-confirm" data-accent={soleGameType} disabled={!canConfirm} onClick={handleConfirmBet}>
        {t('quickMoneyBettingView.cashier.confirmBet')}
      </button>

      {stage === 'preview' && ticket && (
        <QuickMoneyTicketPreviewModal ticket={ticket} issuing={issuing} onCancel={handleCancelPreview} onIssue={handleIssueTicket} />
      )}
    </div>
  )
}
