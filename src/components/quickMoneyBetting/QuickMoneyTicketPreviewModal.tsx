import { useEffect, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { useFocusTrap } from '../../hooks/useFocusTrap'
import type { QuickMoneyTicket } from '../../types/quickMoneyTicket'
import { formatCurrency } from '../../utils/currencyFormat'
import { getBetTypeLabel, getGameTypeLabel, formatDigits } from '../../utils/quickMoneyBetLabel'
import { TicketIcon } from './icons'
import './quickMoneyTicketPreview.css'

interface QuickMoneyTicketPreviewModalProps {
  ticket: QuickMoneyTicket
  issuing: boolean
  onCancel: () => void
  onIssue: () => void
}

// Mismo patrón que TicketPreviewModal.tsx (Roulette): useFocusTrap, foco inicial en Cancel,
// Escape cierra (salvo mientras se está emitiendo).
export function QuickMoneyTicketPreviewModal({ ticket, issuing, onCancel, onIssue }: QuickMoneyTicketPreviewModalProps) {
  const { t } = useTranslation()
  const dialogRef = useRef<HTMLDivElement>(null)
  const cancelButtonRef = useRef<HTMLButtonElement>(null)

  useFocusTrap(dialogRef, true)

  useEffect(() => {
    cancelButtonRef.current?.focus()
  }, [])

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape' && !issuing) onCancel()
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [onCancel, issuing])

  const drawEntries = Object.entries(ticket.drawNumbers) as [string, string][]

  return (
    <div className="qm-ticket-preview-backdrop" onClick={issuing ? undefined : onCancel}>
      <div
        ref={dialogRef}
        className="qm-ticket-preview"
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="qm-ticket-preview-title"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="qm-ticket-preview-header">
          <TicketIcon />
          <h2 id="qm-ticket-preview-title">{t('quickMoneyBettingView.cashier.ticketPreview.title')}</h2>
        </div>

        <div className="qm-ticket-preview-meta">
          <span>
            {t('quickMoneyBettingView.cashier.ticketPreview.ticketNumber')}: <strong>{ticket.ticketNumber}</strong>
          </span>
          {drawEntries.map(([gameType, drawNumber]) => (
            <span key={gameType}>
              {t('quickMoneyBettingView.cashier.ticketPreview.drawNumber', { game: t(`quickMoneyBettingView.gameType.${gameType}`) })}:{' '}
              <strong>{drawNumber}</strong>
            </span>
          ))}
        </div>

        <div className="qm-ticket-preview-rows">
          {ticket.entries.map((entry) => (
            <div key={entry.id} className="qm-ticket-preview-row">
              <span className="qm-ticket-preview-row-game" data-accent={entry.selection.gameType}>
                {getGameTypeLabel(entry.selection.gameType, t)}
              </span>
              <span className="qm-ticket-preview-row-digits">{formatDigits(entry.selection.digits)}</span>
              <span className="qm-ticket-preview-row-type">{getBetTypeLabel(entry.selection.betType, t)}</span>
              <span className="qm-ticket-preview-row-amount">{formatCurrency(entry.stake)}</span>
            </div>
          ))}
        </div>

        <div className="qm-ticket-preview-totals">
          <div>
            <span>{t('quickMoneyBettingView.betSlip.totalBet')}</span>
            <strong>{formatCurrency(ticket.totalStake)}</strong>
          </div>
          <div>
            <span>{t('quickMoneyBettingView.betSlip.potentialWin')}</span>
            <strong className="qm-ticket-preview-totals-accent">{formatCurrency(ticket.totalPotentialReturn)}</strong>
          </div>
        </div>

        <div className="qm-ticket-preview-total-collect">
          <span>{t('quickMoneyBettingView.cashier.totalToCollect')}</span>
          <strong>{formatCurrency(ticket.totalStake)}</strong>
        </div>

        <div className="qm-ticket-preview-actions">
          <button ref={cancelButtonRef} type="button" className="qm-ticket-preview-btn qm-ticket-preview-btn--ghost" disabled={issuing} onClick={onCancel}>
            {t('quickMoneyBettingView.cashier.ticketPreview.cancel')}
          </button>
          <button type="button" className="qm-ticket-preview-btn qm-ticket-preview-btn--primary" disabled={issuing} onClick={onIssue}>
            {issuing ? t('quickMoneyBettingView.cashier.issuing') : t('quickMoneyBettingView.cashier.issueTicket')}
          </button>
        </div>
      </div>
    </div>
  )
}
