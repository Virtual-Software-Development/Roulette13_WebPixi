import { useEffect, useState } from 'react'
import { AdminLayout } from '../components/admin/AdminLayout'
import { AdminDashboardPage } from './AdminDashboardPage'
import { RtpDashboardPage } from './RtpDashboardPage'
import { RtpManagementPage } from './RtpManagementPage'

type AdminView = 'admin' | 'admin-rtp-dashboard' | 'admin-rtp-management'

// Los valores acá son ids de SUB-item (rtpDashboard/rtpManagement), no del padre 'rtp' -- así
// AdminSidebar puede resaltar cuál de los dos hijos de RTP está activo (antes solo resaltaba la
// fila padre). AdminSidebar sigue resaltando el padre también cuando alguno de sus hijos coincide
// (ver hasActiveChild ahí).
const ACTIVE_SIDEBAR_ID_BY_VIEW: Record<AdminView, string> = {
  admin: 'dashboard',
  'admin-rtp-dashboard': 'rtpDashboard',
  'admin-rtp-management': 'rtpManagement',
}

function isAdminView(value: string | null): value is AdminView {
  return value === 'admin' || value === 'admin-rtp-dashboard' || value === 'admin-rtp-management'
}

function getInitialView(): AdminView {
  const preview = new URLSearchParams(window.location.search).get('preview')
  return isAdminView(preview) ? preview : 'admin'
}

// Dueño de la navegación DENTRO del Admin Panel (Dashboard <-> RTP Dashboard) -- a diferencia de
// Header.tsx (que sigue navegando con reload completo entre Roulette/Lottery/Admin, sin tocar),
// acá el cambio de vista es puramente en memoria (useState): AdminLayout se monta una sola vez y
// solo se intercambia qué página vive adentro, así la pestaña no parpadea ni se pierde el estado
// de los stores en cada click del sidebar (ver conversación).
export function AdminPanel() {
  const [view, setView] = useState<AdminView>(getInitialView)

  // Mantiene `?preview=` sincronizado sin disparar un reload (history.replaceState en vez de
  // location.href) -- así refrescar la página o copiar el link conserva la vista actual.
  useEffect(() => {
    const url = new URL(window.location.href)
    url.searchParams.set('preview', view)
    window.history.replaceState(null, '', url)
  }, [view])

  const handleNavigate = (target: string) => {
    if (isAdminView(target)) {
      setView(target)
    }
  }

  return (
    <AdminLayout activeId={ACTIVE_SIDEBAR_ID_BY_VIEW[view]} onNavigate={handleNavigate}>
      {view === 'admin' && <AdminDashboardPage />}
      {view === 'admin-rtp-dashboard' && <RtpDashboardPage />}
      {view === 'admin-rtp-management' && <RtpManagementPage onNavigate={handleNavigate} />}
    </AdminLayout>
  )
}
