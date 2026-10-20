import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useFocusTrap } from '../hooks/useFocusTrap'
import { useCreditStore } from '../store/useCreditStore'
import { cashOutCreditTicket, insertCreditTicket } from '../api/machineBalance'
import { formatMoney } from '../utils/moneyFormat'
import './bettingGamePicker.css'
import './creditTicketDialog.css'

interface CreditTicketDialogProps {
  onClose: () => void
}

// TICKET credit mode (General Settings): the player's ticket on this machine. Without one, a field to
// type or scan its code (a barcode scanner types it and presses Enter); with one, its masked code,
// its credit and "Cash out", which takes it out of the machine -- the credit stays on the ticket, to
// keep playing elsewhere or collect it at the cashier. Opened from the balance in the Header. Same
// backdrop/card as BettingGamePickerModal.
export function CreditTicketDialog({ onClose }: CreditTicketDialogProps) {
  const { t } = useTranslation()
  const creditTicket = useCreditStore((state) => state.creditTicket)
  const [code, setCode] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const dialogRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  useFocusTrap(dialogRef, true)

  useEffect(() => {
    inputRef.current?.focus()
  }, [creditTicket])

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape' && !busy) onClose()
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [busy, onClose])

  async function run(action: () => Promise<void>) {
    setBusy(true)
    setError('')
    try {
      await action()
      setCode('')
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="betting-game-picker-backdrop" onClick={busy ? undefined : onClose}>
      <div
        ref={dialogRef}
        className="betting-game-picker credit-ticket-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="credit-ticket-title"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 id="credit-ticket-title" className="betting-game-picker-title">
          {t(creditTicket ? 'header.creditTicket.insertedTitle' : 'header.creditTicket.insertTitle')}
        </h2>

        {creditTicket ? (
          <>
            <p className="betting-game-picker-subtitle">{t('header.creditTicket.insertedSubtitle')}</p>
            <div className="credit-ticket-summary">
              <span className="credit-ticket-code">{creditTicket.maskedCode}</span>
              <span className="credit-ticket-balance">{formatMoney(creditTicket.balance)}</span>
            </div>
            {error && <p className="credit-ticket-error" role="alert">{error}</p>}
            <div className="credit-ticket-actions">
              <button type="button" className="betting-game-picker-cancel" onClick={onClose} disabled={busy}>
                {t('header.creditTicket.close')}
              </button>
              <button type="button" className="credit-ticket-primary" onClick={() => void run(cashOutCreditTicket)} disabled={busy}>
                {t('header.creditTicket.cashOut')}
              </button>
            </div>
          </>
        ) : (
          <form
            onSubmit={(e) => {
              e.preventDefault()
              if (code.trim()) void run(() => insertCreditTicket(code))
            }}
          >
            <p className="betting-game-picker-subtitle">{t('header.creditTicket.insertSubtitle')}</p>
            <input
              ref={inputRef}
              className="credit-ticket-input"
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              placeholder="ABCD-EFGH-JKMN"
              aria-label={t('header.creditTicket.codeLabel')}
              autoComplete="off"
              spellCheck={false}
              maxLength={20}
              disabled={busy}
            />
            {error && <p className="credit-ticket-error" role="alert">{error}</p>}
            <div className="credit-ticket-actions">
              <button type="button" className="betting-game-picker-cancel" onClick={onClose} disabled={busy}>
                {t('header.creditTicket.cancel')}
              </button>
              <button type="submit" className="credit-ticket-primary" disabled={busy || !code.trim()}>
                {t('header.creditTicket.insert')}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}
