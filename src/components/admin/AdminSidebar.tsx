import { useState } from 'react'
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
}

export function AdminSidebar({ items, activeId }: AdminSidebarProps) {
  const { t } = useTranslation()
  // Expand/collapse puramente visual (ver RTP/Videos en la referencia) -- no hay routing real
  // todavía para esos sub-items, así que solo controla si el submenú se muestra o no.
  const [expandedId, setExpandedId] = useState<string | null>(null)

  return (
    <aside className="admin-sidebar">
      <span className="admin-sidebar-title">{t('admin.nav.sectionTitle')}</span>
      <nav className="admin-sidebar-nav">
        {items.map((item) => {
          const hasChildren = !!item.children?.length
          const expanded = hasChildren && expandedId === item.id

          return (
            <div key={item.id} className="admin-sidebar-group">
              <div
                className={`admin-sidebar-item${hasChildren ? ' admin-sidebar-item--expandable' : ''}`}
                data-active={item.id === activeId}
                role="tab"
                aria-selected={item.id === activeId}
                aria-disabled={item.disabled}
                aria-expanded={hasChildren ? expanded : undefined}
                onClick={hasChildren ? () => setExpandedId(expanded ? null : item.id) : undefined}
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
                  {item.children!.map((child) => (
                    <div key={child.id} className="admin-sidebar-subitem">
                      {child.indicator && <span className="admin-sidebar-subitem-dot" aria-hidden="true" />}
                      <span className="admin-sidebar-subitem-label">{t(child.labelKey)}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )
        })}
      </nav>
    </aside>
  )
}
