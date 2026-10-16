import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { formatCurrency } from '../../utils/currencyFormat'
import './betSlipQuickActions.css'

// Rebet + Double, compartidos por Roulette y Quick Money. Roulette actúa sobre las apuestas del tablero
// (RouletteBetSlipActions); Quick Money, sobre el formulario de la apuesta (QuickMoneyBetFormActions).
// Si una acción no se puede hacer, en vez de dejar el botón apagado sin explicar, el click muestra
// arriba del botón el motivo (mismo criterio que el aviso de saldo insuficiente de Place Bet).
interface BetSlipQuickActionsProps {
  // 'board': apuestas puestas en el tablero; 'form': la apuesta que se está armando. Solo cambia el
  // texto de los avisos.
  target: 'board' | 'form'
  // Total de lo que duplicaría Double y de lo que volvería a poner Rebet (0 = no hay).
  currentTotal: number
  lastTotal: number
  // Saldo disponible para estas apuestas; null en Cashier Mode (cobra en efectivo, no hay saldo).
  balance: number | null
  // Ronda cerrada a las apuestas.
  disabled: boolean
  onRebet: () => void
  onDouble: () => void
}

type Action = 'rebet' | 'double'

const MESSAGE_MS = 3000

export function BetSlipQuickActions({ target, currentTotal, lastTotal, balance, disabled, onRebet, onDouble }: BetSlipQuickActionsProps) {
  const { t } = useTranslation()
  const k = (key: string) => `betSlipActions.${target}.${key}`
  const [message, setMessage] = useState<{ action: Action; text: string; key: number } | null>(null)

  useEffect(() => {
    if (!message) return
    const timer = setTimeout(() => setMessage(null), MESSAGE_MS)
    return () => clearTimeout(timer)
  }, [message])

  const explain = (action: Action, text: string) => setMessage({ action, text, key: Date.now() })

  function handleRebet() {
    if (lastTotal <= 0) return explain('rebet', t(k('noPreviousBet')))
    if (balance !== null && lastTotal > balance) {
      return explain('rebet', t(k('notEnoughToRebet'), { needed: formatCurrency(lastTotal), balance: formatCurrency(balance) }))
    }
    setMessage(null)
    onRebet()
  }

  function handleDouble() {
    if (currentTotal <= 0) return explain('double', t(k('nothingToDouble')))
    if (balance !== null && currentTotal * 2 > balance) {
      return explain('double', t(k('notEnoughToDouble'), { needed: formatCurrency(currentTotal * 2), balance: formatCurrency(balance) }))
    }
    setMessage(null)
    onDouble()
  }

  const button = (action: Action, label: string, hint: string, onClick: () => void) => (
    <div className="bet-slip-action-wrap">
      {message?.action === action && (
        <>
          <p key={message.key} className="bet-slip-action-message" role="alert">
            {message.text}
          </p>
          <span className="bet-slip-action-message-arrow" aria-hidden="true" />
        </>
      )}
      <button type="button" className="bet-slip-action" disabled={disabled} title={hint} onClick={onClick}>
        {label}
      </button>
    </div>
  )

  return (
    <div className="bet-slip-actions">
      {button('rebet', t('betSlipActions.rebet'), t(k('rebetHint')), handleRebet)}
      {button('double', t('betSlipActions.double'), t(k('doubleHint')), handleDouble)}
    </div>
  )
}
