import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useQuickMoneyBetSlipStore } from '../../store/useQuickMoneyBetSlipStore'
import { useQuickMoneyRoundStore } from '../../store/useQuickMoneyRoundStore'
import { calculateSlipTotals } from '../../utils/quickMoneyPayout'
import { formatCurrency } from '../../utils/currencyFormat'
import { buildTicketPreview, issueTicket } from '../../data/quickMoneyTicketMockData'
import type { QuickMoneyTicket } from '../../types/quickMoneyTicket'
import { QuickMoneyTicketPreviewModal } from './QuickMoneyTicketPreviewModal'
import './quickMoneyCashierFooter.css'

// Mismo patrón que CashierPanel.tsx (Roulette): Confirm Bet nunca emite directo, solo abre el
// Ticket Preview -- Issue Ticket es un paso aparte y explícito.
export function QuickMoneyCashierFooter() {
  const { t } = useTranslation()
  const drawNumber = useQuickMoneyRoundStore((state) => state.drawNumber)
  const entries = useQuickMoneyBetSlipStore((state) => state.entries)
  const clearAll = useQuickMoneyBetSlipStore((state) => state.clearAll)
  const [stage, setStage] = useState<'building' | 'preview'>('building')
  const [ticket, setTicket] = useState<QuickMoneyTicket | null>(null)
  const [issuing, setIssuing] = useState(false)
  const [justIssued, setJustIssued] = useState(false)

  const { totalStake } = useMemo(() => calculateSlipTotals(entries), [entries])
  const canConfirm = entries.length > 0 && totalStake > 0

  function handleConfirmBet() {
    if (!canConfirm) return
    const usedGameTypes = new Set(entries.map((entry) => entry.selection.gameType))
    const drawNumbers = {
      ...(usedGameTypes.has('pick3') ? { pick3: drawNumber } : {}),
      ...(usedGameTypes.has('pick4') ? { pick4: drawNumber } : {}),
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
    await issueTicket(ticket)
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

      {justIssued && (
        <p className="qm-cashier-footer-success" role="status">
          {t('quickMoneyBettingView.cashier.ticketIssued')}
        </p>
      )}

      <button type="button" className="qm-cashier-footer-confirm" disabled={!canConfirm} onClick={handleConfirmBet}>
        {t('quickMoneyBettingView.cashier.confirmBet')}
      </button>

      {stage === 'preview' && ticket && (
        <QuickMoneyTicketPreviewModal ticket={ticket} issuing={issuing} onCancel={handleCancelPreview} onIssue={handleIssueTicket} />
      )}
    </div>
  )
}
