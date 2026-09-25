import { useEffect, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { useFocusTrap } from '../hooks/useFocusTrap'
import { buildMediaUrl } from '../utils/media'
import { navigateToPreview } from '../utils/navigatePreview'
import type { ActiveBettingGame } from './Header'
import './bettingGamePicker.css'

// Mismos assets ya usados como identidad de cada juego en Admin (RtpDashboard/NextResults/
// VideoLibrarySettings, ver adminReportsMockData.ts/rtpDashboardMockData.ts) -- 43_quick-money-
// logo.svg es el único asset del set con un logo real (texto "Quick Money" integrado a la marca),
// más distintivo que el ícono de dado genérico que ya usa el tab del Header.
const ROULETTE_ICON_URL = buildMediaUrl('Website_svg_icons/46_logo_option_2.svg')
const QUICK_MONEY_LOGO_URL = buildMediaUrl('Website_svg_icons/43_quick-money-logo.svg')

interface BettingGamePickerModalProps {
  // Si el usuario ya está en Roulette o Quick Money Betting, esa opción se bloquea (pedido
  // explícito) -- solo `disabled`, SIN ningún estilo de "seleccionado" (pedido explícito: "que no
  // se vea seleccionado también"). undefined desde Lobby/Admin: ninguna opción bloqueada.
  activeGame?: ActiveBettingGame
  onClose: () => void
}

// Mismo mecanismo de backdrop/Escape/focus trap que TicketPreviewModal.tsx (rouletteBetting/) --
// ese es el precedente más cercano: vive FUERA de Admin Panel, así que usa valores literales
// (calcados 1:1 de --admin-* / --betting-*) en vez de depender de tokens que no existen en todas
// las pantallas donde puede aparecer este selector (Lobby, Admin, la otra vista de Betting), ver
// bettingGamePicker.css. Shape de "elección" (dos opciones + Cancel abajo), no de confirmación
// simple -- mismo criterio que ConfirmDialog.tsx, sin botón X (ese patrón lo usan los modales de
// solo-lectura tipo DrawLogModal, este no lo es).
export function BettingGamePickerModal({ activeGame, onClose }: BettingGamePickerModalProps) {
  const { t } = useTranslation()
  const dialogRef = useRef<HTMLDivElement>(null)
  const rouletteOptionRef = useRef<HTMLButtonElement>(null)
  const quickMoneyOptionRef = useRef<HTMLButtonElement>(null)
  const cancelButtonRef = useRef<HTMLButtonElement>(null)
  const previouslyFocusedRef = useRef<HTMLElement | null>(null)

  const isRouletteDisabled = activeGame === 'roulette'
  const isQuickMoneyDisabled = activeGame === 'quickMoney'

  useFocusTrap(dialogRef, true)

  useEffect(() => {
    previouslyFocusedRef.current = document.activeElement as HTMLElement | null
    // Un <button disabled> nunca puede recibir foco -- si la opción de Roulette está bloqueada
    // (activeGame='roulette'), el foco inicial cae en Quick Money, y viceversa; si por algún
    // motivo las dos estuvieran bloqueadas, cae en Cancel.
    if (!isRouletteDisabled) rouletteOptionRef.current?.focus()
    else if (!isQuickMoneyDisabled) quickMoneyOptionRef.current?.focus()
    else cancelButtonRef.current?.focus()
    return () => previouslyFocusedRef.current?.focus()
  }, [isRouletteDisabled, isQuickMoneyDisabled])

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [onClose])

  return (
    <div className="betting-game-picker-backdrop" onClick={onClose}>
      <div
        ref={dialogRef}
        className="betting-game-picker"
        role="dialog"
        aria-modal="true"
        aria-labelledby="betting-game-picker-title"
        aria-describedby="betting-game-picker-subtitle"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 id="betting-game-picker-title" className="betting-game-picker-title">
          {t('header.bettingPicker.title')}
        </h2>
        <p id="betting-game-picker-subtitle" className="betting-game-picker-subtitle">
          {t('header.bettingPicker.subtitle')}
        </p>

        <div className="betting-game-picker-options">
          <button
            ref={rouletteOptionRef}
            type="button"
            className="betting-game-picker-option"
            disabled={isRouletteDisabled}
            onClick={() => navigateToPreview('roulette-betting')}
          >
            <img src={ROULETTE_ICON_URL} className="betting-game-picker-option-icon" alt="" />
            <span className="betting-game-picker-option-label">{t('header.bettingPicker.roulette')}</span>
          </button>
          <button
            ref={quickMoneyOptionRef}
            type="button"
            className="betting-game-picker-option"
            disabled={isQuickMoneyDisabled}
            onClick={() => navigateToPreview('quick-money-betting')}
          >
            <img src={QUICK_MONEY_LOGO_URL} className="betting-game-picker-option-icon betting-game-picker-option-icon--logo" alt="" />
            <span className="betting-game-picker-option-label">{t('header.bettingPicker.quickMoney')}</span>
          </button>
        </div>

        <div className="betting-game-picker-actions">
          <button ref={cancelButtonRef} type="button" className="betting-game-picker-cancel" onClick={onClose}>
            {t('header.bettingPicker.cancel')}
          </button>
        </div>
      </div>
    </div>
  )
}
