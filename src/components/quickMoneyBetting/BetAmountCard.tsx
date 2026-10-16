import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import type { QuickMoneyBetType } from '../../types/quickMoneyBet'
import { QUICK_MONEY_BET_TYPES, digitCountsForBetType } from '../../types/quickMoneyBet'
import './betAmountCard.css'
import '../betSlipActions/betSlipQuickActions.css'

const STEP_CENTS = 100
// Montos rápidos (en dólares) que se suman al monto de la apuesta.
const QUICK_ADD_AMOUNTS = [1, 5, 10, 50, 100]
const MESSAGE_MS = 3000

interface BetAmountCardProps {
  amountCents: number
  isActive: boolean
  onFocus: () => void
  onStep: (deltaCents: number) => void
  // Suma `cents` al monto; devuelve el motivo si no se puede (saldo), o null si lo sumó.
  onQuickAdd: (cents: number) => string | null
  // Ronda cerrada a las apuestas.
  quickAddDisabled: boolean
  // Tipos de jugada válidos para la cantidad de dígitos cargada (ver BET_TYPES_BY_DIGIT_COUNT).
  availableBetTypes: QuickMoneyBetType[]
  betTypes: QuickMoneyBetType[]
  digitCount: number
  onToggleBetType: (betType: QuickMoneyBetType) => void
  onAdd: () => void
  canAdd: boolean
}

export function BetAmountCard({
  amountCents,
  isActive,
  onFocus,
  onStep,
  onQuickAdd,
  quickAddDisabled,
  availableBetTypes,
  betTypes,
  digitCount,
  onToggleBetType,
  onAdd,
  canAdd,
}: BetAmountCardProps) {
  const { t, i18n } = useTranslation()
  const formatted = `$${(amountCents / 100).toFixed(2)}`
  // Motivo por el que un monto rápido no se sumó, arriba de ese botón (mismo aviso que Rebet/Double).
  const [quickMessage, setQuickMessage] = useState<{ amount: number; text: string; key: number } | null>(null)

  useEffect(() => {
    if (!quickMessage) return
    const timer = setTimeout(() => setQuickMessage(null), MESSAGE_MS)
    return () => clearTimeout(timer)
  }, [quickMessage])

  function handleQuickAdd(amount: number) {
    const reason = onQuickAdd(amount * 100)
    setQuickMessage(reason ? { amount, text: reason, key: Date.now() } : null)
  }
  // "Directo o Bolita" -- los tipos jugables con los dígitos cargados, en el idioma actual.
  const availableNames = new Intl.ListFormat(i18n.language, { type: 'disjunction' }).format(
    availableBetTypes.map((type) => t(`quickMoneyBettingView.amountEntry.betType.${type}`)),
  )

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

      <div className="qm-amount-quick">
        {QUICK_ADD_AMOUNTS.map((amount) => (
          <div key={amount} className="qm-amount-quick-wrap">
            {quickMessage?.amount === amount && (
              <>
                <p key={quickMessage.key} className="bet-slip-action-message" role="alert">
                  {quickMessage.text}
                </p>
                <span className="bet-slip-action-message-arrow" aria-hidden="true" />
              </>
            )}
            <button
              type="button"
              className="qm-amount-quick-button"
              disabled={quickAddDisabled}
              aria-label={t('quickMoneyBettingView.amountEntry.quickAddAria', { amount })}
              onClick={() => handleQuickAdd(amount)}
            >
              +{amount}
            </button>
          </div>
        ))}
      </div>

      <span className="qm-amount-bettype-label">{t('quickMoneyBettingView.amountEntry.betTypeLabel')}</span>
      <p className="qm-amount-bettype-hint" data-ready={digitCount > 0}>
        {digitCount === 0
          ? t('quickMoneyBettingView.amountEntry.betTypeEmptyHint')
          : t('quickMoneyBettingView.amountEntry.betTypeHint', { count: digitCount, types: availableNames })}
      </p>
      {/* Siempre los seis tipos, cada uno con cuántos números lleva. Los jugables con los dígitos
          cargados se marcan con borde de acento y casilla; el resto queda apagado y deshabilitado. */}
      <div className="qm-amount-bettype-row">
        {QUICK_MONEY_BET_TYPES.map((type) => {
          const available = availableBetTypes.includes(type)
          // Straight lleva 3 o 4: cuando ya es jugable se muestra solo la cantidad cargada.
          const counts = available ? [digitCount] : digitCountsForBetType(type)
          return (
            <button
              key={type}
              type="button"
              className="qm-amount-bettype"
              data-selected={available && betTypes.includes(type)}
              data-available={available}
              data-accent="pick3"
              aria-pressed={available && betTypes.includes(type)}
              disabled={!available}
              onClick={() => onToggleBetType(type)}
            >
              {available && <span className="qm-amount-bettype-check" aria-hidden="true" />}
              <span className="qm-amount-bettype-name">{t(`quickMoneyBettingView.amountEntry.betType.${type}`)}</span>
              <span className="qm-amount-bettype-digits">
                {t('quickMoneyBettingView.amountEntry.betTypeDigits', { count: Math.max(...counts), digits: counts.join(' / ') })}
              </span>
            </button>
          )
        })}
      </div>

      <button type="button" className="qm-add-to-slip" data-accent="pick3" disabled={!canAdd} onClick={onAdd}>
        {/* Con números pero sin monto, el botón dice qué falta en vez de quedar apagado sin explicar. */}
        {digitCount > 0 && amountCents === 0
          ? t('quickMoneyBettingView.amountEntry.enterAmountFirst')
          : t('quickMoneyBettingView.amountEntry.addToBetSlip')}
      </button>
    </div>
  )
}
