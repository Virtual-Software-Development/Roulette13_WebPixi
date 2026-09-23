import { useEffect, useState } from 'react'
import type { BettingMode } from '../../types/bettingMode'
import type { QuickMoneyGameType, QuickMoneyBetType } from '../../types/quickMoneyBet'
import { QUICK_MONEY_DIGIT_COUNT } from '../../types/quickMoneyBet'
import { useQuickMoneyBetSlipStore } from '../../store/useQuickMoneyBetSlipStore'
import type { QuickMoneyActiveField, QuickMoneyTabValue } from './quickMoneyBettingTypes'
import { GameTypeTabs } from './GameTypeTabs'
import { SharedNumberPad } from './SharedNumberPad'
import { RoundCountdownRow } from './RoundCountdownRow'
import { DigitEntryCard } from './DigitEntryCard'
import { BetAmountCard } from './BetAmountCard'
import { QuickMoneyBetSlip } from './QuickMoneyBetSlip'
import './quickMoneyBettingWorkspace.css'

function emptyDigits(gameType: QuickMoneyGameType): (number | null)[] {
  return Array.from({ length: QUICK_MONEY_DIGIT_COUNT[gameType] }, () => null)
}

function activeGameTypesFor(tab: QuickMoneyTabValue): QuickMoneyGameType[] {
  return tab === 'both' ? ['pick3', 'pick4'] : [tab]
}

// Orquesta el flujo completo de la referencia: tabs -> pad compartido -> panel de entrada (paso 1
// dígitos, paso 2 monto+tipo) -> bet slip. Todo el estado de "qué se está armando todavía" (no
// confirmado) vive acá, local al workspace -- solo cuando se confirma con Add to Bet Slip pasa a
// useQuickMoneyBetSlipStore (mismo criterio que RouletteBettingWorkspace/BettingBoard: estado de
// interacción en memoria del componente, estado de negocio en la store).
export function QuickMoneyBettingWorkspace({ mode }: { mode: BettingMode }) {
  const addBet = useQuickMoneyBetSlipStore((state) => state.addBet)

  const [tab, setTab] = useState<QuickMoneyTabValue>('pick3')
  const [digitsByGame, setDigitsByGame] = useState<Record<QuickMoneyGameType, (number | null)[]>>({
    pick3: emptyDigits('pick3'),
    pick4: emptyDigits('pick4'),
  })
  const [activeField, setActiveField] = useState<QuickMoneyActiveField>({ kind: 'digit', gameType: 'pick3', index: 0 })
  const [amountCents, setAmountCents] = useState(0)
  // Multi-selección -- ver comentario en BetAmountCard: se puede marcar Box y Combo a la vez y
  // Add to Bet Slip genera una entrada por cada tipo marcado, todas con el mismo monto/dígitos.
  const [betTypes, setBetTypes] = useState<QuickMoneyBetType[]>(['straight'])

  const activeGameTypes = activeGameTypesFor(tab)

  function handleTabChange(nextTab: QuickMoneyTabValue) {
    setTab(nextTab)
    const nextGameTypes = activeGameTypesFor(nextTab)
    if (activeField?.kind === 'digit' && !nextGameTypes.includes(activeField.gameType)) {
      setActiveField({ kind: 'digit', gameType: nextGameTypes[0], index: 0 })
    }
  }

  function focusDigit(gameType: QuickMoneyGameType, index: number) {
    setActiveField({ kind: 'digit', gameType, index })
  }

  function focusAmount() {
    setActiveField({ kind: 'amount' })
  }

  // Auto-advance: al llenar un casillero salta al siguiente del mismo grupo; al terminar el
  // último grupo activo, el foco pasa solo al campo de monto (flujo natural: números -> monto).
  function advanceFocusAfterDigit(gameType: QuickMoneyGameType, index: number) {
    const groupLength = QUICK_MONEY_DIGIT_COUNT[gameType]
    if (index + 1 < groupLength) {
      setActiveField({ kind: 'digit', gameType, index: index + 1 })
      return
    }
    const groupPos = activeGameTypes.indexOf(gameType)
    const nextGameType = activeGameTypes[groupPos + 1]
    if (nextGameType) {
      setActiveField({ kind: 'digit', gameType: nextGameType, index: 0 })
      return
    }
    setActiveField({ kind: 'amount' })
  }

  function handleDigit(digit: number) {
    if (!activeField) return
    if (activeField.kind === 'amount') {
      setAmountCents((prev) => Math.min(9_999_999, prev * 10 + digit))
      return
    }
    const { gameType, index } = activeField
    setDigitsByGame((prev) => ({ ...prev, [gameType]: prev[gameType].map((d, i) => (i === index ? digit : d)) }))
    advanceFocusAfterDigit(gameType, index)
  }

  function handleBackspace() {
    if (!activeField) return
    if (activeField.kind === 'amount') {
      setAmountCents((prev) => Math.floor(prev / 10))
      return
    }
    const { gameType, index } = activeField
    const current = digitsByGame[gameType][index]
    if (current !== null) {
      setDigitsByGame((prev) => ({ ...prev, [gameType]: prev[gameType].map((d, i) => (i === index ? null : d)) }))
      return
    }
    if (index > 0) {
      setDigitsByGame((prev) => ({ ...prev, [gameType]: prev[gameType].map((d, i) => (i === index - 1 ? null : d)) }))
      setActiveField({ kind: 'digit', gameType, index: index - 1 })
    }
  }

  // Reset completo (dígitos de TODOS los grupos + monto) -- distinto de backspace, que solo toca
  // el campo activo. Mismo criterio que el ícono de refresh/reset del pad en la referencia.
  function handleClear() {
    setDigitsByGame({ pick3: emptyDigits('pick3'), pick4: emptyDigits('pick4') })
    setAmountCents(0)
  }

  function handleStepAmount(deltaCents: number) {
    setAmountCents((prev) => Math.max(0, prev + deltaCents))
  }

  function handleToggleBetType(type: QuickMoneyBetType) {
    setBetTypes((prev) => (prev.includes(type) ? prev.filter((t) => t !== type) : [...prev, type]))
  }

  // Teclado físico -- los casilleros/campo de monto son <button>, no <input> (ver
  // DigitEntryCard/BetAmountCard: el pad en pantalla es la interacción "oficial" pensada para
  // kiosco táctil), así que sin esto no reaccionan a que alguien tipee en un teclado real.
  // Reusa exactamente los mismos handlers que SharedNumberPad -- una sola fuente de verdad para
  // "qué pasa cuando entra un dígito/backspace", sea cual sea el origen del toque. Se ignora
  // mientras el Ticket Preview está abierto (role="alertdialog") para no escribir "detrás" del
  // modal. Sin dependency array a propósito: se re-suscribe en cada render para que el closure
  // siempre vea el activeField/digitsByGame/amountCents actuales (handleDigit/handleBackspace no
  // están memoizados), evita el bug clásico de closure stale sin necesitar useCallback acá.
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

  const completeGameTypes = activeGameTypes.filter((gameType) => digitsByGame[gameType].every((d) => d !== null))
  const canAdd = completeGameTypes.length > 0 && amountCents > 0 && betTypes.length > 0

  function handleAddToSlip() {
    if (!canAdd) return
    const stake = amountCents / 100
    // Un split por cada tipo marcado -- si hay Box y Combo seleccionados, cada grupo completo
    // (pick3/pick4) genera dos entradas separadas en el slip, no una sola apuesta "combinada".
    for (const gameType of completeGameTypes) {
      const digits = digitsByGame[gameType].filter((d): d is number => d !== null)
      for (const betType of betTypes) {
        addBet({ gameType, betType, digits }, stake)
      }
    }
    setDigitsByGame((prev) => {
      const next = { ...prev }
      for (const gameType of completeGameTypes) next[gameType] = emptyDigits(gameType)
      return next
    })
    // Reset también el monto -- sin esto, la SIGUIENTE apuesta que se escriba arranca de encima
    // del monto anterior en vez de $0.00 (ej. $1.00 ya cargado + tipear "100" de nuevo da $1001.00
    // en vez de $1.00), porque activeField vuelve al primer casillero de dígitos, no al monto.
    setAmountCents(0)
    setActiveField({ kind: 'digit', gameType: activeGameTypes[0], index: 0 })
  }

  return (
    <div className="qm-workspace">
      <GameTypeTabs active={tab} onChange={handleTabChange} />

      <div className="qm-workspace-pad-col">
        <SharedNumberPad onDigit={handleDigit} onBackspace={handleBackspace} onClear={handleClear} />
      </div>

      <div className="qm-workspace-entry-col">
        <RoundCountdownRow gameTypes={activeGameTypes} />
        <DigitEntryCard gameTypes={activeGameTypes} digitsByGame={digitsByGame} activeField={activeField} onFocusField={focusDigit} />
        <BetAmountCard
          amountCents={amountCents}
          isActive={activeField?.kind === 'amount'}
          onFocus={focusAmount}
          onStep={handleStepAmount}
          betTypes={betTypes}
          onToggleBetType={handleToggleBetType}
          onAdd={handleAddToSlip}
          canAdd={canAdd}
        />
      </div>

      <div className="qm-workspace-slip-col">
        <QuickMoneyBetSlip mode={mode} />
      </div>
    </div>
  )
}
