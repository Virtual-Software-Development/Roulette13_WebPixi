import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useGameConfigStore } from '../store/useGameConfigStore'
import { useDrawCycleStore } from '../store/useDrawCycleStore'
import './header.css'

// Única pantalla del proyecto es la ruleta (ver RouletteLobby.tsx) -- no hay router ni una
// segunda screen de lotería todavía, así que no hay nada real a lo que "navegar". El tab
// ROULETTE se deja fijo como activo y LOTTERY se muestra sin onClick (no son <button>, para no
// simular una interacción que hoy no lleva a ningún lado) -- listos para conectarse a rutas el
// día que exista más de una sección.
type HeaderTab = 'roulette' | 'lottery'
const ACTIVE_TAB: HeaderTab = 'roulette'

function RouletteTabIcon() {
  return (
    <svg viewBox="0 0 24 24" className="app-header-tab-icon" aria-hidden="true" focusable="false">
      <circle cx="12" cy="12" r="8.4" fill="none" stroke="currentColor" strokeWidth="1.4" />
      <circle cx="12" cy="12" r="2.1" fill="none" stroke="currentColor" strokeWidth="1.4" />
      <path
        d="M12 3.6v3.2M12 17.2v3.2M20.4 12h-3.2M6.8 12H3.6M17.7 6.3l-2.3 2.3M8.6 15.1l-2.3 2.3M17.7 17.7l-2.3-2.3M8.6 8.9L6.3 6.6"
        stroke="currentColor"
        strokeWidth="1.1"
        strokeLinecap="round"
      />
    </svg>
  )
}

function LotteryTabIcon() {
  return (
    <svg viewBox="0 0 24 24" className="app-header-tab-icon" aria-hidden="true" focusable="false">
      <rect x="3.2" y="3.2" width="17.6" height="17.6" rx="4.2" fill="none" stroke="currentColor" strokeWidth="1.4" />
      <circle cx="8.1" cy="8.1" r="1.3" fill="currentColor" />
      <circle cx="15.9" cy="8.1" r="1.3" fill="currentColor" />
      <circle cx="12" cy="12" r="1.3" fill="currentColor" />
      <circle cx="8.1" cy="15.9" r="1.3" fill="currentColor" />
      <circle cx="15.9" cy="15.9" r="1.3" fill="currentColor" />
    </svg>
  )
}

function CoinsIcon() {
  return (
    <svg viewBox="0 0 24 24" className="app-header-balance-icon" aria-hidden="true" focusable="false">
      <g fill="none" stroke="currentColor" strokeWidth="1.4">
        <path d="M4 8.6c0-1.77 3.58-3.2 8-3.2s8 1.43 8 3.2-3.58 3.2-8 3.2-8-1.43-8-3.2z" />
        <path d="M4 8.6v3.8c0 1.77 3.58 3.2 8 3.2s8-1.43 8-3.2V8.6" />
        <path d="M4 12.4v3.8c0 1.77 3.58 3.2 8 3.2s8-1.43 8-3.2v-3.8" />
      </g>
    </svg>
  )
}

export function Header() {
  const { t } = useTranslation()
  const gameName = useGameConfigStore((state) => state.gameName)
  const logoUrl = useGameConfigStore((state) => state.logoUrl)
  const showLogo = useGameConfigStore((state) => state.showLogo)
  const balance = useGameConfigStore((state) => state.balance)
  // Mismo flag que ya usan Footer/SharedLayout/WinnerPanel: pasa a false apenas arranca el video
  // de sorteo, y vuelve a true recién cuando el panel Winner termina de escalarse a 0 (ver
  // useDrawCycleStore.lobbyInfoVisible). El header sale hacia arriba y vuelve en sync con ellos.
  const lobbyInfoVisible = useDrawCycleStore((state) => state.lobbyInfoVisible)
  const [logoFailed, setLogoFailed] = useState(false)

  // Vuelve a intentar el logo cada vez que cambia la URL (ej: llega una nueva desde /gameInfo) en
  // vez de quedar pegado en el estado de fallo de la URL anterior.
  useEffect(() => {
    setLogoFailed(false)
  }, [logoUrl])

  const formattedBalance = balance.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })

  return (
    <header className="app-header" data-hidden={!lobbyInfoVisible}>
      <div className="app-header-shell">
        <div className="app-header-logo">
          {showLogo && logoUrl && !logoFailed && (
            <img
              src={logoUrl}
              alt={gameName}
              className="app-header-logo-img"
              onError={() => setLogoFailed(true)}
            />
          )}
          {showLogo && (!logoUrl || logoFailed) && (
            <span className="app-header-logo-fallback">{t('media.logoNotFound')}</span>
          )}
        </div>

        <nav className="app-header-nav" aria-label={t('header.roulette')}>
          <div
            className="app-header-tab app-header-tab--roulette"
            data-active={ACTIVE_TAB === 'roulette'}
            role="tab"
            aria-selected={ACTIVE_TAB === 'roulette'}
          >
            <RouletteTabIcon />
            <span className="app-header-tab-label">{t('header.roulette')}</span>
          </div>
          <div
            className="app-header-tab app-header-tab--lottery"
            data-active={ACTIVE_TAB === 'lottery'}
            role="tab"
            aria-selected={ACTIVE_TAB === 'lottery'}
          >
            <LotteryTabIcon />
            <span className="app-header-tab-label">{t('header.lottery')}</span>
          </div>
        </nav>

        <div className="app-header-spacer" />

        <div className="app-header-divider" />

        <div className="app-header-balance">
          <CoinsIcon />
          <div className="app-header-balance-text">
            <span className="app-header-balance-label">{t('header.balanceLabel')}</span>
            <span className="app-header-balance-value">$ {formattedBalance}</span>
          </div>
        </div>
      </div>
    </header>
  )
}
