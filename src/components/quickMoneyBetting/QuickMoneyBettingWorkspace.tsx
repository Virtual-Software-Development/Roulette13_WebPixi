import { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import type { BettingMode } from '../../types/bettingMode'
import type { QuickMoneyBetType } from '../../types/quickMoneyBet'
import { QUICK_MONEY_MAX_DIGITS, betTypesForDigitCount } from '../../types/quickMoneyBet'
import { useQuickMoneyBetSlipStore } from '../../store/useQuickMoneyBetSlipStore'
import { useGameConfigStore } from '../../store/useGameConfigStore'
import { useQuickMoneyRoundPhase } from '../../hooks/useQuickMoneyRoundPhase'
import { calculateSlipTotals } from '../../utils/quickMoneyPayout'
import { formatCurrency } from '../../utils/currencyFormat'
import type { QuickMoneyActiveField } from './quickMoneyBettingTypes'
import { SharedNumberPad } from './SharedNumberPad'
import { RoundCountdownRow } from './RoundCountdownRow'
import { DigitEntryCard } from './DigitEntryCard'
import { BetAmountCard } from './BetAmountCard'
import { QuickMoneyBetSlip } from './QuickMoneyBetSlip'
import { QuickMoneyBetFormActions } from './QuickMoneyBetFormActions'
import './quickMoneyBettingWorkspace.css'

// Última apuesta agregada al bet slip, para Rebet.
interface FormBet {
  digits: number[]
  betTypes: QuickMoneyBetType[]
  amountCents: number
}

const MAX_AMOUNT_CENTS = 9_999_999

function emptyDigits(): (number | null)[] {
  return Array.from({ length: QUICK_MONEY_MAX_DIGITS }, () => null)
}

// Dígitos cargados = los casilleros llenos desde la izquierda (ver focusDigit: nunca quedan huecos).
function enteredDigits(digits: (number | null)[]): number[] {
  const firstEmpty = digits.indexOf(null)
  return (firstEmpty === -1 ? digits : digits.slice(0, firstEmpty)) as number[]
}

// Orquesta el flujo: pad compartido -> panel de entrada (paso 1 dígitos, paso 2 monto+tipo) -> bet
// slip. Un solo formulario (pedido explícito): de 1 a 4 dígitos, y el largo decide qué tipos de
// jugada se ofrecen (ver BET_TYPES_BY_DIGIT_COUNT); cada apuesta se evalúa contra los dos sorteos,
// así que ya no hay pestañas Pick 3 / Pick 4. El estado "en construcción" vive acá; solo al confirmar
// con Add to Bet Slip pasa a useQuickMoneyBetSlipStore.
export function QuickMoneyBettingWorkspace({ mode }: { mode: BettingMode }) {
  const { t } = useTranslation()
  const addBet = useQuickMoneyBetSlipStore((state) => state.addBet)
  const slipEntries = useQuickMoneyBetSlipStore((state) => state.entries)
  const balance = useGameConfigStore((state) => state.balance)
  const { phase } = useQuickMoneyRoundPhase()
  const slipTotal = useMemo(() => calculateSlipTotals(slipEntries).totalStake, [slipEntries])

  const [digits, setDigits] = useState<(number | null)[]>(emptyDigits)
  const [activeField, setActiveField] = useState<QuickMoneyActiveField>({ kind: 'digit', index: 0 })
  const [amountCents, setAmountCents] = useState(0)
  // Multi-selección -- se pueden marcar varios tipos válidos para el largo actual (ej. Straight y
  // Box con 3 dígitos) y Add to Bet Slip genera una entrada por cada uno.
  const [betTypes, setBetTypes] = useState<QuickMoneyBetType[]>([])
  const [lastAdded, setLastAdded] = useState<FormBet | null>(null)

  const chosenDigits = enteredDigits(digits)
  const digitCount = chosenDigits.length
  const availableBetTypes = betTypesForDigitCount(digitCount)
  const selectedBetTypes = betTypes.filter((type) => availableBetTypes.includes(type))

  // Al cambiar la cantidad de dígitos, conserva los tipos que siguen siendo válidos (Straight vale
  // para 3 y 4) y si no queda ninguno marca el primero disponible.
  useEffect(() => {
    const available = betTypesForDigitCount(digitCount)
    setBetTypes((prev) => {
      const kept = prev.filter((type) => available.includes(type))
      return kept.length > 0 ? kept : available.slice(0, 1)
    })
  }, [digitCount])

  function firstEmptyIndex(): number {
    const index = digits.indexOf(null)
    return index === -1 ? QUICK_MONEY_MAX_DIGITS - 1 : index
  }

  // No se puede saltar casilleros: tocar uno más allá del primero vacío enfoca el primero vacío.
  function focusDigit(index: number) {
    setActiveField({ kind: 'digit', index: Math.min(index, firstEmptyIndex()) })
  }

  function focusAmount() {
    setActiveField({ kind: 'amount' })
  }

  function handleDigit(digit: number) {
    if (!activeField) return
    if (activeField.kind === 'amount') {
      setAmountCents((prev) => Math.min(MAX_AMOUNT_CENTS, prev * 10 + digit))
      return
    }
    const { index } = activeField
    setDigits((prev) => prev.map((d, i) => (i === index ? digit : d)))
    // Auto-avance al siguiente casillero; después del cuarto pasa al monto.
    setActiveField(index + 1 < QUICK_MONEY_MAX_DIGITS ? { kind: 'digit', index: index + 1 } : { kind: 'amount' })
  }

  function handleBackspace() {
    if (!activeField) return
    if (activeField.kind === 'amount') {
      // Con el monto vacío (ej. justo después del cuarto dígito, que pasa solo al monto) borrar
      // sigue con los dígitos: quita el último y vuelve a ese casillero.
      if (amountCents === 0 && digitCount > 0) {
        setDigits((prev) => prev.map((d, i) => (i >= digitCount - 1 ? null : d)))
        setActiveField({ kind: 'digit', index: digitCount - 1 })
        return
      }
      setAmountCents((prev) => Math.floor(prev / 10))
      return
    }
    const { index } = activeField
    if (digits[index] !== null) {
      // Borra este casillero y los de su derecha, para no dejar huecos.
      setDigits((prev) => prev.map((d, i) => (i >= index ? null : d)))
      return
    }
    if (index > 0) {
      setDigits((prev) => prev.map((d, i) => (i >= index - 1 ? null : d)))
      setActiveField({ kind: 'digit', index: index - 1 })
    }
  }

  // Reset completo (dígitos + monto) -- distinto de backspace, que solo toca el campo activo.
  function handleClear() {
    setDigits(emptyDigits())
    setAmountCents(0)
    setActiveField({ kind: 'digit', index: 0 })
  }

  function handleStepAmount(deltaCents: number) {
    setAmountCents((prev) => Math.max(0, prev + deltaCents))
  }

  function handleToggleBetType(type: QuickMoneyBetType) {
    setBetTypes((prev) => (prev.includes(type) ? prev.filter((t) => t !== type) : [...prev, type]))
  }

  // Teclado físico -- los casilleros/campo de monto son <button>, no <input> (el pad en pantalla es
  // la interacción "oficial" pensada para kiosco táctil). Reusa los mismos handlers que
  // SharedNumberPad. Se ignora mientras el Ticket Preview está abierto (role="alertdialog"). Sin
  // dependency array a propósito: se re-suscribe en cada render para que el closure vea el estado
  // actual (handleDigit/handleBackspace no están memoizados).
  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (!activeField) return
      const target = event.target as HTMLElement | null
      if (target?.closest('[role="alertdialog"]')) return
      if (event.key >= '0' && event.key <= '9') {
        event.preventDefault()
        handleDigit(Number(event.key))
        return
      }
      if (event.key === 'Backspace') {
        event.preventDefault()
        handleBackspace()
      }
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  })

  const canAdd = digitCount > 0 && amountCents > 0 && selectedBetTypes.length > 0

  function handleAddToSlip() {
    if (!canAdd) return
    const stake = amountCents / 100
    for (const betType of selectedBetTypes) {
      addBet({ betType, digits: chosenDigits }, stake)
    }
    setLastAdded({ digits: chosenDigits, betTypes: selectedBetTypes, amountCents })
    setDigits(emptyDigits())
    // Reset también el monto -- sin esto, la siguiente apuesta arranca de encima del monto anterior.
    setAmountCents(0)
    setActiveField({ kind: 'digit', index: 0 })
  }

  // Rebet: vuelve a cargar en el formulario la última apuesta agregada (números, tipos y monto); el
  // jugador la confirma con Add to Bet Slip.
  function handleRebet() {
    if (!lastAdded) return
    setDigits(Array.from({ length: QUICK_MONEY_MAX_DIGITS }, (_, i) => lastAdded.digits[i] ?? null))
    setBetTypes(lastAdded.betTypes)
    setAmountCents(lastAdded.amountCents)
    setActiveField({ kind: 'amount' })
  }

  // +1/+5/+10/+50/+100: suma al monto si la apuesta resultante (monto × tipos elegidos, al menos uno)
  // entra en el saldo que queda después del bet slip; en Cashier Mode no hay saldo que respetar.
  function handleQuickAdd(cents: number): string | null {
    const next = Math.min(MAX_AMOUNT_CENTS, amountCents + cents)
    if (mode === 'player') {
      const needed = (next / 100) * Math.max(1, selectedBetTypes.length)
      const available = Math.max(0, balance - slipTotal)
      if (needed > available) {
        return t('quickMoneyBettingView.amountEntry.quickAddNotEnough', {
          needed: formatCurrency(needed),
          balance: formatCurrency(available),
        })
      }
    }
    setAmountCents(next)
    setActiveField({ kind: 'amount' })
    return null
  }

  // Double: duplica el monto del formulario.
  function handleDouble() {
    setAmountCents((prev) => Math.min(MAX_AMOUNT_CENTS, prev * 2))
  }

  const formTotal = (amountCents / 100) * selectedBetTypes.length
  const lastTotal = lastAdded ? (lastAdded.amountCents / 100) * lastAdded.betTypes.length : 0

  return (
    <div className="qm-workspace">
      <div className="qm-workspace-pad-col">
        <SharedNumberPad onDigit={handleDigit} onBackspace={handleBackspace} onClear={handleClear} />
      </div>

      <div className="qm-workspace-entry-col">
        <RoundCountdownRow />
        <DigitEntryCard digits={digits} activeField={activeField} onFocusField={focusDigit} />
        <BetAmountCard
          amountCents={amountCents}
          isActive={activeField?.kind === 'amount'}
          onFocus={focusAmount}
          onStep={handleStepAmount}
          onQuickAdd={handleQuickAdd}
          quickAddDisabled={phase === 'closed'}
          availableBetTypes={availableBetTypes}
          betTypes={selectedBetTypes}
          digitCount={digitCount}
          onToggleBetType={handleToggleBetType}
          onAdd={handleAddToSlip}
          canAdd={canAdd}
        />
        <QuickMoneyBetFormActions
          mode={mode}
          formTotal={formTotal}
          lastTotal={lastTotal}
          onRebet={handleRebet}
          onDouble={handleDouble}
        />
      </div>

      <div className="qm-workspace-slip-col">
        <QuickMoneyBetSlip mode={mode} />
      </div>
    </div>
  )
}
