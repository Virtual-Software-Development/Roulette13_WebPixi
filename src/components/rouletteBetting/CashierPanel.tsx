import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useGameConfigStore } from '../../store/useGameConfigStore'
import { useBetSlipStore } from '../../store/useBetSlipStore'
import { calculateSlipTotals } from '../../utils/rouletteBetPayout'
import { formatMoney } from '../../utils/moneyFormat'
import { useBettingRoundPhase } from '../../hooks/useBettingRoundPhase'
import { buildTicketPreview, issueTicket } from '../../data/bettingTicketMockData'
import type { BettingTicket } from '../../types/bettingTicket'
import { TicketPreviewModal } from './TicketPreviewModal'
import './cashierPanel.css'

// Cashier nunca confirma directo -- Confirm Bet solo abre el Ticket Preview (ver
// TicketPreviewModal), Issue Ticket es un paso aparte y explícito, para que un click accidental
// sobre una zona del board no termine emitiendo un ticket. Sin backend de tickets/impresión
// todavía (ver data/bettingTicketMockData.ts) -- mismo criterio mock que el resto del proyecto.
export function CashierPanel() {
  const { t } = useTranslation()
  const drawNumber = useGameConfigStore((state) => state.drawNumber)
  const entries = useBetSlipStore((state) => state.entries)
  const clearAll = useBetSlipStore((state) => state.clearAll)
  const { phase } = useBettingRoundPhase()
  const [stage, setStage] = useState<'building' | 'preview'>('building')
  const [ticket, setTicket] = useState<BettingTicket | null>(null)
  const [issuing, setIssuing] = useState(false)
  const [justIssued, setJustIssued] = useState(false)

  const { totalStake } = useMemo(() => calculateSlipTotals(entries), [entries])
  const canConfirm = phase === 'open' && entries.length > 0 && totalStake > 0

  function handleConfirmBet() {
    if (!canConfirm) return
    setTicket(buildTicketPreview(entries, drawNumber))
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
    <div className="cashier-panel">
      <div className="cashier-panel-total">
        <span className="cashier-panel-total-label">{t('bettingView.cashier.totalToCollect')}</span>
        <span className="cashier-panel-total-value">{formatMoney(totalStake)}</span>
      </div>

      {justIssued && (
        <p className="cashier-panel-success" role="status">
          {t('bettingView.cashier.ticketIssued')}
        </p>
      )}

      <button type="button" className="cashier-panel-confirm" disabled={!canConfirm} onClick={handleConfirmBet}>
        {t('bettingView.cashier.confirmBet')}
      </button>

      {stage === 'preview' && ticket && (
        <TicketPreviewModal ticket={ticket} issuing={issuing} onCancel={handleCancelPreview} onIssue={handleIssueTicket} />
      )}
    </div>
  )
}
