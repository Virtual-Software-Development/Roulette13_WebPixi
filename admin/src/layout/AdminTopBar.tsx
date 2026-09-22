import { useTranslation } from 'react-i18next'
import { useNow } from '../hooks/useNow'
import { buildMediaUrl } from '../utils/media'
import './adminTopBar.css'

const USER_ICON_URL = buildMediaUrl('Website_svg_icons/16_user_white_circle.svg')

const ADMIN_DATE_FORMATTER = new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
const ADMIN_TIME_FORMATTER = new Intl.DateTimeFormat('en-US', {
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
  hour12: false,
})

function LogoutIcon() {
  return (
    <svg viewBox="0 0 24 24" className="admin-topbar-logout-icon-svg" aria-hidden="true" focusable="false">
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

// Adapted from the root app's Header.tsx (AdminHeaderMeta) -- same visual language, but wired to
// the real AuthContext logout instead of the query-string-based navigateToPreview, and without the
// Roulette/Lottery/Admin game tabs (there's no game view to switch to from this standalone app).
export function AdminTopBar({ onLogout }: { onLogout: () => void }) {
  const { t } = useTranslation()
  const now = useNow()

  return (
    <header className="admin-topbar">
      <span className="admin-topbar-brand">{t('admin.nav.sectionTitle')}</span>

      <div className="admin-topbar-meta">
        <div className="admin-topbar-clock">
          <span className="admin-topbar-date">{ADMIN_DATE_FORMATTER.format(now).toUpperCase()}</span>
          <span className="admin-topbar-time">{ADMIN_TIME_FORMATTER.format(now)}</span>
        </div>

        <div className="admin-topbar-divider" />

        <div className="admin-topbar-user">
          <img src={USER_ICON_URL} className="admin-topbar-user-icon" alt="" />
          <div className="admin-topbar-user-text">
            <span className="admin-topbar-user-name">{t('admin.header.userName')}</span>
            <span className="admin-topbar-user-role">{t('admin.header.userRole')}</span>
          </div>
        </div>

        <button
          type="button"
          className="admin-topbar-logout"
          onClick={onLogout}
          aria-label={t('admin.header.logout')}
          title={t('admin.header.logout')}
        >
          <LogoutIcon />
        </button>
      </div>
    </header>
  )
}
