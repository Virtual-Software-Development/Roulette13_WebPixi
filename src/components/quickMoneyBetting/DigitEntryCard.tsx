import { useTranslation } from 'react-i18next'
import { QUICK_MONEY_MAX_DIGITS } from '../../types/quickMoneyBet'
import type { QuickMoneyActiveField } from './quickMoneyBettingTypes'
import './digitEntryCard.css'

interface DigitEntryCardProps {
  // QUICK_MONEY_MAX_DIGITS casilleros, llenos de izquierda a derecha sin huecos.
  digits: (number | null)[]
  activeField: QuickMoneyActiveField
  onFocusField: (index: number) => void
}

// Paso 1: de 1 a 4 dígitos (0-9), cualquier cantidad vale. Solo se ven los dígitos ya cargados --
// cada uno aparece al tocarlo en el teclado -- más un casillero opcional "+" para agregar otro, así
// la cantidad de números de la apuesta se lee de un vistazo (también en el contador). Nada sugiere
// que haya que llegar a 4.
export function DigitEntryCard({ digits, activeField, onFocusField }: DigitEntryCardProps) {
  const { t } = useTranslation()
  const entered = digits.filter((digit): digit is number => digit !== null)
  const count = entered.length
  const activeIndex = activeField?.kind === 'digit' ? activeField.index : null

  return (
    <div className="qm-card">
      <div className="qm-card-heading">
        <span className="qm-card-step">1</span>
        <div>
          <h3 className="qm-card-title">{t('quickMoneyBettingView.digitEntry.title')}</h3>
          <p className="qm-card-subtitle">{t('quickMoneyBettingView.digitEntry.hint')}</p>
        </div>
        <div className="qm-digit-count" data-accent="pick3" data-filled={count > 0} aria-live="polite">
          {t('quickMoneyBettingView.digitEntry.count', { count })}
        </div>
      </div>

      <div className="qm-digit-boxes" data-accent="pick3">
        {entered.map((digit, index) => (
          <button
            key={index}
            type="button"
            className="qm-digit-box"
            data-active={activeIndex === index}
            aria-label={t('quickMoneyBettingView.digitEntry.digitAria', { position: index + 1 })}
            onClick={() => onFocusField(index)}
          >
            {digit}
          </button>
        ))}
        {count < QUICK_MONEY_MAX_DIGITS && (
          <button
            type="button"
            className="qm-digit-box qm-digit-box--next"
            data-active={activeIndex === count}
            data-optional={count > 0}
            aria-label={t('quickMoneyBettingView.digitEntry.digitAria', { position: count + 1 })}
            onClick={() => onFocusField(count)}
          >
            <span className="qm-digit-caret" aria-hidden="true" />
            {count > 0 && activeIndex !== count && <span className="qm-digit-plus">+</span>}
          </button>
        )}
      </div>
    </div>
  )
}
