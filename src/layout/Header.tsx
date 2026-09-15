import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useGameConfigStore } from '../store/useGameConfigStore'
import { useDrawCycleStore } from '../store/useDrawCycleStore'
import { useNow } from '../hooks/useNow'
import { buildMediaUrl } from '../utils/media'
import './header.css'

// Íconos del set Website_svg_icons (ver local-media/) -- reemplazan a los SVG inline dibujados a
// mano que tenía antes el header.
const ROULETTE_TAB_ICON_URL = buildMediaUrl('Website_svg_icons/19_wheel_white_detailed.svg')
const LOTTERY_TAB_ICON_URL = buildMediaUrl('Website_svg_icons/12_dice_white.svg')
const ADMIN_TAB_ICON_URL = buildMediaUrl('Website_svg_icons/17_gear_white.svg')
const BALANCE_ICON_URL = buildMediaUrl('Website_svg_icons/41_payouts.svg')
const USER_ICON_URL = buildMediaUrl('Website_svg_icons/16_user_white_circle.svg')

// Única pantalla real del proyecto sigue siendo la ruleta (ver RouletteLobby.tsx) -- todavía no
// hay router, así que "navegar" entre tabs se resuelve reescribiendo window.location.search (
// mismo mecanismo ad-hoc que ya usa main.tsx para ?preview=login). ROULETTE y ADMIN sí tienen un
// destino real hoy (lobby / AdminDashboardPage) y son clickeables; LOTTERY sigue sin una segunda
// pantalla a la que ir, así que se muestra sin onClick -- lista para conectarse el día que exista.
export type HeaderTab = 'roulette' | 'lottery' | 'admin'

function navigateToPreview(preview: string | null) {
  const url = new URL(window.location.href)
  if (preview) {
    url.searchParams.set('preview', preview)
  } else {
    url.searchParams.delete('preview')
  }
  window.location.href = url.toString()
}

function RouletteTabIcon() {
  return <img src={ROULETTE_TAB_ICON_URL} className="app-header-tab-icon" alt="" />
}

function LotteryTabIcon() {
  return <img src={LOTTERY_TAB_ICON_URL} className="app-header-tab-icon" alt="" />
}

function AdminTabIcon() {
  return <img src={ADMIN_TAB_ICON_URL} className="app-header-tab-icon" alt="" />
}

function CoinsIcon() {
  return <img src={BALANCE_ICON_URL} className="app-header-balance-icon" alt="" />
}

function LogoutIcon() {
  return (
    <svg viewBox="0 0 24 24" className="app-header-logout-icon-svg" aria-hidden="true" focusable="false">
      <path
        d="M9 4H6.5A2.5 2.5 0 0 0 4 6.5v11A2.5 2.5 0 0 0 6.5 20H9"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M14.5 16.5 19 12l-4.5-4.5M19 12H9"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

const ADMIN_DATE_FORMATTER = new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
const ADMIN_TIME_FORMATTER = new Intl.DateTimeFormat('en-US', {
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
  hour12: false,
})

function AdminHeaderMeta() {
  const { t } = useTranslation()
  const now = useNow()

  return (
    <div className="app-header-admin-meta">
      <div className="app-header-admin-clock">
        <span className="app-header-admin-date">{ADMIN_DATE_FORMATTER.format(now).toUpperCase()}</span>
        <span className="app-header-admin-time">{ADMIN_TIME_FORMATTER.format(now)}</span>
      </div>

      <div className="app-header-divider" />

      <div className="app-header-admin-user">
        <img src={USER_ICON_URL} className="app-header-admin-user-icon" alt="" />
        <div className="app-header-admin-user-text">
          <span className="app-header-admin-user-name">{t('admin.header.userName')}</span>
          <span className="app-header-admin-user-role">{t('admin.header.userRole')}</span>
        </div>
      </div>

      <button
        type="button"
        className="app-header-admin-logout"
        onClick={() => navigateToPreview(null)}
        aria-label={t('admin.header.logout')}
        title={t('admin.header.logout')}
      >
        <LogoutIcon />
      </button>
    </div>
  )
}

export function Header({ activeTab = 'roulette' }: { activeTab?: HeaderTab } = {}) {
  const { t } = useTranslation()
  const gameName = useGameConfigStore((state) => state.gameName)
  const logoUrl = useGameConfigStore((state) => state.logoUrl)
  const showLogo = useGameConfigStore((state) => state.showLogo)
  const balance = useGameConfigStore((state) => state.balance)
  // Mismo flag que ya usan Footer/SharedLayout/WinnerPanel: pasa a false apenas arranca el video
  // de sorteo, y vuelve a true recién cuando el panel Winner termina de escalarse a 0 (ver
  // useDrawCycleStore.lobbyInfoVisible). El header sale hacia arriba y vuelve en sync con ellos.
  // En AdminDashboardPage este store nunca cambia (queda en su default `true`), así que el header
  // simplemente no se oculta ahí.
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

  const isAdmin = activeTab === 'admin'

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
            className={`app-header-tab app-header-tab--roulette${activeTab === 'roulette' ? '' : ' app-header-tab--clickable'}`}
            data-active={activeTab === 'roulette'}
            role="tab"
            aria-selected={activeTab === 'roulette'}
            onClick={activeTab === 'roulette' ? undefined : () => navigateToPreview(null)}
          >
            <RouletteTabIcon />
            <span className="app-header-tab-label">{t('header.roulette')}</span>
          </div>
          <div
            className="app-header-tab app-header-tab--lottery"
            data-active={activeTab === 'lottery'}
            role="tab"
            aria-selected={activeTab === 'lottery'}
          >
            <LotteryTabIcon />
            <span className="app-header-tab-label">{t('header.lottery')}</span>
          </div>
          <div
            className={`app-header-tab app-header-tab--admin${activeTab === 'admin' ? '' : ' app-header-tab--clickable'}`}
            data-active={activeTab === 'admin'}
            role="tab"
            aria-selected={activeTab === 'admin'}
            onClick={activeTab === 'admin' ? undefined : () => navigateToPreview('admin')}
          >
            <AdminTabIcon />
            <span className="app-header-tab-label">{t('header.admin')}</span>
          </div>
        </nav>

        <div className="app-header-spacer" />

        {isAdmin ? (
          <AdminHeaderMeta />
        ) : (
          <>
            <div className="app-header-divider" />
            <div className="app-header-balance">
              <CoinsIcon />
              <div className="app-header-balance-text">
                <span className="app-header-balance-label">{t('header.balanceLabel')}</span>
                <span className="app-header-balance-value">$ {formattedBalance}</span>
              </div>
            </div>
          </>
        )}
      </div>
    </header>
  )
}
