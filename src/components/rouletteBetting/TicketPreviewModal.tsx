import { useEffect, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { useFocusTrap } from '../../hooks/useFocusTrap'
import type { BettingTicket } from '../../types/bettingTicket'
import { formatMoney } from '../../utils/moneyFormat'
import { getBetSelectionDescription, getBetTypeLabel } from '../../utils/rouletteBetLabel'
import { TicketIcon } from './icons'
import './ticketPreview.css'

interface TicketPreviewModalProps {
  ticket: BettingTicket
  issuing: boolean
  onCancel: () => void
  onIssue: () => void
}

// Paso de confirmación explícito antes de emitir -- Cashier ve TODAS las apuestas, el total a
// cobrar y los datos del round antes de poder imprimir (ver requisito: un click accidental sobre
// el board no debe terminar en un ticket impreso). Mismo mecanismo de foco/backdrop/Escape que
// ConfirmDialog.tsx (useFocusTrap), namespace CSS propio -- no importa confirmDialog.css (esta
// vista no es parte de Admin, ver bettingTokens.css).
export function TicketPreviewModal({ ticket, issuing, onCancel, onIssue }: TicketPreviewModalProps) {
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

  return (
    <div className="ticket-preview-backdrop" onClick={issuing ? undefined : onCancel}>
      <div
        ref={dialogRef}
        className="ticket-preview"
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="ticket-preview-title"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="ticket-preview-header">
          <TicketIcon />
          <h2 id="ticket-preview-title">{t('bettingView.cashier.ticketPreview.title')}</h2>
        </div>

        <div className="ticket-preview-meta">
          <span>
            {t('bettingView.cashier.ticketPreview.ticketNumber')}: <strong>{ticket.ticketNumber}</strong>
          </span>
          <span>
            {t('bettingView.cashier.ticketPreview.drawNumber')}: <strong>{ticket.drawNumber || '—'}</strong>
          </span>
        </div>

        <div className="ticket-preview-rows">
          {ticket.entries.map((entry) => (
            <div key={entry.zoneId} className="ticket-preview-row">
              <span className="ticket-preview-row-type">{getBetTypeLabel(entry.betType, t)}</span>
              <span className="ticket-preview-row-selection">{getBetSelectionDescription(entry.selection, t)}</span>
              <span className="ticket-preview-row-amount">{formatMoney(entry.stake)}</span>
            </div>
          ))}
        </div>

        <div className="ticket-preview-totals">
          <div>
            <span>{t('bettingView.selectedBets.totalStake')}</span>
            <strong>{formatMoney(ticket.totalStake)}</strong>
          </div>
          <div>
            <span>{t('bettingView.selectedBets.potentialWin')}</span>
            <strong className="ticket-preview-totals-accent">{formatMoney(ticket.totalPotentialReturn)}</strong>
          </div>
        </div>

        <div className="ticket-preview-total-collect">
          <span>{t('bettingView.cashier.totalToCollect')}</span>
          <strong>{formatMoney(ticket.totalStake)}</strong>
        </div>

        <div className="ticket-preview-actions">
          <button ref={cancelButtonRef} type="button" className="ticket-preview-btn ticket-preview-btn--ghost" disabled={issuing} onClick={onCancel}>
            {t('bettingView.cashier.ticketPreview.cancel')}
          </button>
          <button type="button" className="ticket-preview-btn ticket-preview-btn--primary" disabled={issuing} onClick={onIssue}>
            {issuing ? t('bettingView.cashier.issuing') : t('bettingView.cashier.issueTicket')}
          </button>
        </div>
      </div>
    </div>
  )
}
