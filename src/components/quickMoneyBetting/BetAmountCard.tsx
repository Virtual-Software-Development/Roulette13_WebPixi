import { useTranslation } from 'react-i18next'
import type { QuickMoneyBetType } from '../../types/quickMoneyBet'
import './betAmountCard.css'

const BET_TYPES: QuickMoneyBetType[] = ['straight', 'box', 'combo']
const STEP_CENTS = 100

interface BetAmountCardProps {
  amountCents: number
  isActive: boolean
  onFocus: () => void
  onStep: (deltaCents: number) => void
  betTypes: QuickMoneyBetType[]
  onToggleBetType: (betType: QuickMoneyBetType) => void
  onAdd: () => void
  canAdd: boolean
}

// "2 ENTER BET AMOUNT" de la referencia -- el campo $ también es un botón que fija el foco activo
// (ver activeField en el workspace) para que SharedNumberPad escriba el monto en vez de un dígito
// del sorteo. El monto se maneja en CENTAVOS enteros (amountCents) para no arrastrar errores de
// punto flotante con $ -- cada tap de dígito hace cents*10+digit, mismo mecanismo que un monto de
// POS real tecleado dígito por dígito.
//
// Tipo de apuesta es multi-selección (no radio): se puede marcar Box y Combo a la vez con el
// mismo monto, y Add to Bet Slip genera una entrada separada por cada tipo marcado (un split Box
// y otro split Combo), en vez de forzar a repetir la carga de dígitos+monto por cada tipo.
export function BetAmountCard({ amountCents, isActive, onFocus, onStep, betTypes, onToggleBetType, onAdd, canAdd }: BetAmountCardProps) {
  const { t } = useTranslation()
  const formatted = `$${(amountCents / 100).toFixed(2)}`

  return (
    <div className="qm-card">
      <div className="qm-card-heading">
        <span className="qm-card-step qm-card-step--blue">2</span>
        <div>
          <h3 className="qm-card-title">{t('quickMoneyBettingView.amountEntry.title')}</h3>
          <p className="qm-card-subtitle">{t('quickMoneyBettingView.amountEntry.hint')}</p>
        </div>
      </div>

      <div className="qm-amount-row">
        <button type="button" className="qm-amount-field" data-active={isActive} onClick={onFocus}>
          {formatted}
        </button>
        <div className="qm-amount-steppers">
          <button type="button" className="qm-amount-stepper" aria-label={t('quickMoneyBettingView.amountEntry.increase')} onClick={() => onStep(STEP_CENTS)}>
            ▲
          </button>
          <button type="button" className="qm-amount-stepper" aria-label={t('quickMoneyBettingView.amountEntry.decrease')} onClick={() => onStep(-STEP_CENTS)}>
            ▼
          </button>
        </div>
      </div>

      <span className="qm-amount-bettype-label">{t('quickMoneyBettingView.amountEntry.betTypeLabel')}</span>
      <div className="qm-amount-bettype-row">
        {BET_TYPES.map((type) => (
          <button
            key={type}
            type="button"
            className="qm-amount-bettype"
            data-selected={betTypes.includes(type)}
            aria-pressed={betTypes.includes(type)}
            onClick={() => onToggleBetType(type)}
          >
            {t(`quickMoneyBettingView.amountEntry.betType.${type}`)}
          </button>
        ))}
      </div>
      <p className="qm-amount-bettype-hint">{t('quickMoneyBettingView.amountEntry.betTypeHint')}</p>

      <button type="button" className="qm-add-to-slip" disabled={!canAdd} onClick={onAdd}>
        {t('quickMoneyBettingView.amountEntry.addToBetSlip')}
      </button>
    </div>
  )
}
