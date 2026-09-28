import { Outlet, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext'
import { AdminSidebar } from '../components/admin/AdminSidebar'
import { AdminTopBar } from './AdminTopBar'
import { ADMIN_SIDEBAR_ITEMS } from '../data/adminDashboardMockData'
import './adminShell.css'

// AdminSidebar (ported as-is from the root app's mockup) navigates via an onNavigate(view: string)
// callback with the same view ids the root app's in-memory AdminPanel used to switch between --
// mapped here to real routes instead, so the ported component doesn't need any changes of its own.
const VIEW_TO_PATH: Record<string, string> = {
  admin: '/',
  'admin-rtp-dashboard': '/rtp-dashboard',
  'admin-rtp-management': '/rtp-management',
  gameConfig: '/game-config',
  mediaLibrary: '/media',
}

const PATH_TO_ACTIVE_ID: Record<string, string> = {
  '/': 'dashboard',
  '/rtp-dashboard': 'rtpDashboard',
  '/rtp-management': 'rtpManagement',
  '/game-config': 'settings',
  '/media': 'mediaLibrary',
}

export function AdminShell() {
  const { logout } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const activeId = PATH_TO_ACTIVE_ID[location.pathname] ?? 'dashboard'

  const handleNavigate = (view: string) => {
    const path = VIEW_TO_PATH[view]
    if (path) navigate(path)
  }

  return (
    <div className="admin-shell">
      <AdminTopBar onLogout={logout} />
      <div className="admin-body">
        <AdminSidebar items={ADMIN_SIDEBAR_ITEMS} activeId={activeId} onNavigate={handleNavigate} />
        <main className="admin-main">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
