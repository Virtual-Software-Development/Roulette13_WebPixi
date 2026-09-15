import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useGameConfigStore } from '../store/useGameConfigStore'
import { useDrawCycleStore } from '../store/useDrawCycleStore'
import { buildMediaUrl } from '../utils/media'
import './header.css'

// Íconos del set Website_svg_icons (ver local-media/) -- reemplazan a los SVG inline dibujados a
// mano que tenía antes el header.
const ROULETTE_TAB_ICON_URL = buildMediaUrl('Website_svg_icons/19_wheel_white_detailed.svg')
const LOTTERY_TAB_ICON_URL = buildMediaUrl('Website_svg_icons/12_dice_white.svg')
const BALANCE_ICON_URL = buildMediaUrl('Website_svg_icons/41_payouts.svg')

// Única pantalla del proyecto es la ruleta (ver RouletteLobby.tsx) -- no hay router ni una
// segunda screen de lotería todavía, así que no hay nada real a lo que "navegar". El tab
// ROULETTE se deja fijo como activo y LOTTERY se muestra sin onClick (no son <button>, para no
// simular una interacción que hoy no lleva a ningún lado) -- listos para conectarse a rutas el
// día que exista más de una sección.
type HeaderTab = 'roulette' | 'lottery'
const ACTIVE_TAB: HeaderTab = 'roulette'

function RouletteTabIcon() {
  return <img src={ROULETTE_TAB_ICON_URL} className="app-header-tab-icon" alt="" />
}

function LotteryTabIcon() {
  return <img src={LOTTERY_TAB_ICON_URL} className="app-header-tab-icon" alt="" />
}

function CoinsIcon() {
  return <img src={BALANCE_ICON_URL} className="app-header-balance-icon" alt="" />
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
