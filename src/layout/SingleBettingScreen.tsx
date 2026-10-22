import { useEffect, useRef, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { useFocusTrap } from '../hooks/useFocusTrap'
import { useBettingScreenClaim } from '../network/bettingScreenClaim'
import './bettingGamePicker.css'
import './creditTicketDialog.css'

// Wraps each betting screen (main.tsx) so only one window of this machine can bet at a time (see
// network/bettingScreenClaim.ts). While another window has it, the screen is unmounted -- nothing
// here can send a ticket -- and this window only offers to take it back.
export function SingleBettingScreen({ children }: { children: ReactNode }) {
  const { active, takeOver } = useBettingScreenClaim()
  if (active) return <>{children}</>
  return <OpenElsewhere onTakeOver={takeOver} />
}

function OpenElsewhere({ onTakeOver }: { onTakeOver: () => void }) {
  const { t } = useTranslation()
  const dialogRef = useRef<HTMLDivElement>(null)
  const useHereRef = useRef<HTMLButtonElement>(null)

  useFocusTrap(dialogRef, true)
  useEffect(() => {
    useHereRef.current?.focus()
  }, [])

  // The betting screen is not mounted behind it: the same dark page as main.tsx's ScreenFallback.
  return (
    <div className="betting-game-picker-backdrop" style={{ background: '#05090d' }}>
      <div ref={dialogRef} className="betting-game-picker credit-ticket-dialog" role="alertdialog" aria-modal="true" aria-labelledby="betting-elsewhere-title">
        <h2 id="betting-elsewhere-title" className="betting-game-picker-title">
          {t('bettingElsewhere.title')}
        </h2>
        <p className="betting-game-picker-subtitle">{t('bettingElsewhere.message')}</p>
        <div className="credit-ticket-actions">
          <button ref={useHereRef} type="button" className="credit-ticket-primary" onClick={onTakeOver}>
            {t('bettingElsewhere.useHere')}
          </button>
        </div>
      </div>
    </div>
  )
}
