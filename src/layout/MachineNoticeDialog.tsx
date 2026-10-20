import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useFocusTrap } from '../hooks/useFocusTrap'
import { useCreditStore } from '../store/useCreditStore'
import { acknowledgeMachineNotice } from '../api/machineBalance'
import { formatMoney } from '../utils/moneyFormat'
import './bettingGamePicker.css'
import './creditTicketDialog.css'

// Tells the player this machine's credit changed because the admin changed the credit mode (General
// Settings): its balance was withdrawn (switch to Ticket credit) or its credit ticket was returned
// (switch to Machine balance), with the amount. Shown on any screen of the machine, one notice at a
// time, until the player taps OK (POST /machine/notices/{id}/ack). Mounted once by main.tsx on the
// game and betting servers; renders nothing without notices.
export function MachineNoticeDialog() {
  const { t } = useTranslation()
  const notice = useCreditStore((state) => state.notices[0] ?? null)
  const [busy, setBusy] = useState(false)
  const dialogRef = useRef<HTMLDivElement>(null)
  const okRef = useRef<HTMLButtonElement>(null)

  useFocusTrap(dialogRef, notice !== null)

  useEffect(() => {
    okRef.current?.focus()
  }, [notice?.id])

  if (!notice) return null

  const amount = formatMoney(notice.amount)
  const withdrawn = notice.kind === 'CREDIT_MODE_WITHDRAWAL'

  async function acknowledge() {
    if (!notice) return
    setBusy(true)
    try {
      await acknowledgeMachineNotice(notice.id)
    } catch (err) {
      console.warn('[notice] could not acknowledge it:', err instanceof Error ? err.message : err)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="betting-game-picker-backdrop">
      <div ref={dialogRef} className="betting-game-picker credit-ticket-dialog" role="alertdialog" aria-modal="true" aria-labelledby="machine-notice-title">
        <h2 id="machine-notice-title" className="betting-game-picker-title">
          {t('machineNotice.title')}
        </h2>
        <p className="betting-game-picker-subtitle">
          {withdrawn
            ? t('machineNotice.withdrawn', { amount })
            : t('machineNotice.ticketReturned', { amount, code: notice.creditTicket ?? '' })}
        </p>
        <div className="credit-ticket-summary">
          <span className="credit-ticket-code">{t(withdrawn ? 'machineNotice.amountWithdrawn' : 'machineNotice.creditOnTicket')}</span>
          <span className="credit-ticket-balance">{amount}</span>
        </div>
        <div className="credit-ticket-actions">
          <button ref={okRef} type="button" className="credit-ticket-primary" onClick={() => void acknowledge()} disabled={busy}>
            {t('machineNotice.ok')}
          </button>
        </div>
      </div>
    </div>
  )
}
