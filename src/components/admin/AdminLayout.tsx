import { useEffect, type ReactNode } from 'react'
import { Header } from '../../layout/Header'
import { AdminSidebar } from './AdminSidebar'
import { fetchGameInfo } from '../../api/gameInfo'
import { useGameConfigStore } from '../../store/useGameConfigStore'
import { buildMediaUrlOrEmpty } from '../../utils/media'
import { ADMIN_SIDEBAR_ITEMS } from '../../data/adminDashboardMockData'
import './adminLayout.css'

interface AdminLayoutProps {
  activeId: string
  onNavigate: (view: string) => void
  children: ReactNode
}

// Shell compartido por TODAS las páginas del Admin Panel (Dashboard, RTP Dashboard, y las que
// vengan después) -- Header real + AdminSidebar real + el mismo fondo/tokens, para no duplicar
// ese armado en cada página nueva (ver AdminDashboardPage.tsx / RtpDashboardPage.tsx, que solo
// aportan su propio contenido; quien monta este layout una única vez es AdminPanel.tsx, dueño del
// estado de navegación -- así el fetch de gameInfo de acá abajo corre una sola vez por sesión de
// Admin Panel, no en cada cambio de vista).
export function AdminLayout({ activeId, onNavigate, children }: AdminLayoutProps) {
  // Solo trae gameName/logoUrl (para que el Header no muestre el fallback "Logo not found") --
  // deliberadamente NO reusa applyGameInfo() completo, que además siembra history/i18n/nextDraw,
  // datos que pertenecen al ciclo de sorteo de la lobby y no tienen nada que ver con el admin panel.
  useEffect(() => {
    let cancelled = false
    fetchGameInfo()
      .then((data) => {
        if (cancelled) return
        useGameConfigStore.getState().setGameConfig({
          gameName: data.gameName,
          logoUrl: buildMediaUrlOrEmpty(data.logo),
        })
      })
      .catch((err) => console.error('No se pudo obtener /gameInfo', err))
    return () => {
      cancelled = true
    }
  }, [])

  return (
    <div className="admin-shell">
      <Header activeTab="admin" />

      <div className="admin-body">
        <AdminSidebar items={ADMIN_SIDEBAR_ITEMS} activeId={activeId} onNavigate={onNavigate} />
        <main className="admin-main">{children}</main>
      </div>
    </div>
  )
}
