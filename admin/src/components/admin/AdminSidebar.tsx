import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import type { AdminSidebarItem } from '../../types/adminDashboard'
import './adminSidebar.css'

function ChevronDownIcon() {
  return (
    <svg viewBox="0 0 24 24" className="admin-sidebar-item-chevron-svg" aria-hidden="true" focusable="false">
      <path d="M5 8.5 12 15.5 19 8.5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

interface AdminSidebarProps {
  items: AdminSidebarItem[]
  activeId: string
  // Navegación en memoria (ver AdminPanel.tsx: useState) -- ya no reescribe window.location, así
  // que cambiar de sección adentro del Admin Panel no recarga la pestaña.
  onNavigate: (view: string) => void
}

export function AdminSidebar({ items, activeId, onNavigate }: AdminSidebarProps) {
  const { t } = useTranslation()
  // Expand/collapse para items con hijos (ej. RTP, Videos) -- un item con hijos SIEMPRE solo
  // expande/colapsa al hacer click en su fila, nunca navega él mismo (pedido explícito: "RTP solo
  // debe desplegar las opciones internas"). Quien navega es el sub-item concreto (ver RTP >
  // Dashboard, con su propio `view`).
  const [expandedId, setExpandedId] = useState<string | null>(null)

  // activeId ahora puede ser el id de un SUB-item (ej. 'rtpManagement', ver AdminPanel.tsx) --
  // auto-expande el padre correspondiente para que su submenú se vea abierto sin que el usuario
  // tenga que hacer click en RTP primero (ej. entrar directo a RTP > Management vía el botón
  // "View RTP Dashboard" en sentido inverso, o al recargar con ?preview=admin-rtp-management).
  useEffect(() => {
    const parentWithActiveChild = items.find((item) => item.children?.some((child) => child.id === activeId))
    if (parentWithActiveChild) {
      setExpandedId(parentWithActiveChild.id)
    }
  }, [activeId, items])

  return (
    <aside className="admin-sidebar">
      <span className="admin-sidebar-title">{t('admin.nav.sectionTitle')}</span>
      <nav className="admin-sidebar-nav">
        {items.map((item) => {
          const hasChildren = !!item.children?.length
          const hasActiveChild = hasChildren && item.children!.some((child) => child.id === activeId)
          const isActive = item.id === activeId || hasActiveChild
          const expanded = hasChildren && expandedId === item.id
          const isInteractive = hasChildren || (!!item.view && !isActive)

          const handleClick = () => {
            if (hasChildren) {
              setExpandedId(expanded ? null : item.id)
              return
            }
            if (item.view && !isActive) {
              onNavigate(item.view)
            }
          }

          return (
            <div key={item.id} className="admin-sidebar-group">
              <div
                className={`admin-sidebar-item${isInteractive ? ' admin-sidebar-item--expandable' : ''}`}
                data-active={isActive}
                role="tab"
                aria-selected={isActive}
                aria-disabled={item.disabled}
                aria-expanded={hasChildren ? expanded : undefined}
                onClick={isInteractive ? handleClick : undefined}
              >
                <img src={item.icon} className="admin-sidebar-item-icon" alt="" />
                <span className="admin-sidebar-item-label">{t(item.labelKey)}</span>
                {hasChildren && (
                  <span className={`admin-sidebar-item-chevron${expanded ? ' admin-sidebar-item-chevron--open' : ''}`}>
                    <ChevronDownIcon />
                  </span>
                )}
              </div>

              {expanded && (
                <div className="admin-sidebar-submenu">
                  {item.children!.map((child) => {
                    const childInteractive = !!child.view
                    const childActive = child.id === activeId
                    return (
                      <div
                        key={child.id}
                        className={`admin-sidebar-subitem${childInteractive ? ' admin-sidebar-subitem--clickable' : ''}`}
                        data-active={childActive}
                        role={childInteractive ? 'tab' : undefined}
                        aria-selected={childInteractive ? childActive : undefined}
                        onClick={childInteractive ? () => onNavigate(child.view!) : undefined}
                      >
                        {child.indicator && <span className="admin-sidebar-subitem-dot" aria-hidden="true" />}
                        <span className="admin-sidebar-subitem-label">{t(child.labelKey)}</span>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          )
        })}
      </nav>

      <div className="admin-sidebar-footer">
        <div className="admin-sidebar-status">
          <span className="admin-sidebar-status-dot" aria-hidden="true" />
          <span className="admin-sidebar-status-text">{t('admin.dashboard.systemStatus.allOperational')}</span>
          <svg viewBox="0 0 60 16" className="admin-sidebar-status-wave" aria-hidden="true" focusable="false">
            <polyline
              points="0,8 8,8 12,3 16,13 20,5 24,8 60,8"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.6"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </div>
        <span className="admin-sidebar-version">v1.0.0</span>
      </div>
    </aside>
  )
}
