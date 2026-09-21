import { useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useClickOutside } from '../../../hooks/useClickOutside'
import { AdminSelect, type AdminSelectOption } from '../AdminSelect'
import { USER_ROLES } from '../../../data/adminUsersMockData'
import { FilterIcon } from './icons'
import type { UserRole, UserStatus } from '../../../types/adminUsers'
import './adminUsers.css'

export type RoleFilter = 'all' | UserRole
export type StatusFilter = 'all' | UserStatus

interface UserFilterPopoverProps {
  role: RoleFilter
  status: StatusFilter
  onChangeRole: (value: RoleFilter) => void
  onChangeStatus: (value: StatusFilter) => void
}

// Botón + panel flotante (mismo shell .admin-dropdown/.admin-dropdown-menu que DateRangeControl.tsx,
// ver adminLayout.css) en vez de un dropdown de opción única como AdminSelect -- acá el trigger abre
// un panel con dos filtros independientes (Role/Status, los únicos dos campos que el modelo de
// usuario mock soporta -- pedido explícito: no inventar filtros que el modelo no tiene). Aplican al
// cambiar, sin botón "Apply", mismo criterio que el status filter de GameEventsList.
export function UserFilterPopover({ role, status, onChangeRole, onChangeStatus }: UserFilterPopoverProps) {
  const { t } = useTranslation()
  const [isOpen, setIsOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)
  useClickOutside(containerRef, () => setIsOpen(false))

  const roleOptions: AdminSelectOption<RoleFilter>[] = [
    { value: 'all', label: t('admin.users.filter.allRoles') },
    ...USER_ROLES.map((value) => ({ value, label: t(`admin.users.role.${value}`) })),
  ]

  const statusOptions: AdminSelectOption<StatusFilter>[] = [
    { value: 'all', label: t('admin.users.filter.allStatuses') },
    { value: 'active', label: t('admin.users.status.active') },
    { value: 'inactive', label: t('admin.users.status.inactive') },
  ]

  const hasActiveFilters = role !== 'all' || status !== 'all'

  return (
    <div className="admin-dropdown" ref={containerRef}>
      <button
        type="button"
        className="admin-users-btn admin-users-btn--ghost"
        aria-expanded={isOpen}
        data-active={hasActiveFilters}
        onClick={() => setIsOpen((v) => !v)}
      >
        <FilterIcon />
        {t('admin.users.filter.label')}
      </button>

      {isOpen && (
        <div className="admin-dropdown-menu admin-users-filter-menu">
          <AdminSelect value={role} options={roleOptions} onChange={onChangeRole} label={t('admin.users.filter.role')} />
          <AdminSelect value={status} options={statusOptions} onChange={onChangeStatus} label={t('admin.users.filter.status')} />
          {hasActiveFilters && (
            <button
              type="button"
              className="admin-users-filter-clear"
              onClick={() => {
                onChangeRole('all')
                onChangeStatus('all')
              }}
            >
              {t('admin.users.filter.clear')}
            </button>
          )}
        </div>
      )}
    </div>
  )
}
