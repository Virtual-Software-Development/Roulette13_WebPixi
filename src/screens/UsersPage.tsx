import { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { UserStatCard } from '../components/admin/users/UserStatCard'
import { UserTable } from '../components/admin/users/UserTable'
import { UserModal, type UserModalMode } from '../components/admin/users/UserModal'
import { UserFilterPopover, type RoleFilter, type StatusFilter } from '../components/admin/users/UserFilterPopover'
import { ConfirmDialog } from '../components/admin/ConfirmDialog'
import { PlusIcon, SearchIcon, ShieldIcon } from '../components/admin/users/icons'
import { buildMediaUrl } from '../utils/media'
import { ADMIN_USERS, DEFAULT_USER_FORM } from '../data/adminUsersMockData'
import type { AdminUser, AdminUserFormData, UserAvatarAccent } from '../types/adminUsers'
import '../components/admin/users/adminUsers.css'

const TOTAL_ICON_URL = buildMediaUrl('Website_svg_icons/16_user_white_circle.svg')
const ACTIVE_ICON_URL = buildMediaUrl('Website_svg_icons/36_users_green.svg')
const INACTIVE_ICON_URL = buildMediaUrl('Website_svg_icons/25_user_red_circle.svg')

const PAGE_SIZE = 10
const AVATAR_ACCENT_CYCLE: UserAvatarAccent[] = ['blue', 'green', 'orange', 'purple']

// Sin backend real de usuarios (ver adminUsersMockData.ts) -- Create/Edit/Delete simulan el flujo
// visual loading->success con el mismo criterio mock ya establecido en Settings (setTimeout,
// comentado explícitamente), mutando este estado local en vez de llamar a un endpoint.
const ACTION_DURATION_MS = 700

function simulateAction(): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ACTION_DURATION_MS))
}

type ModalState = { mode: UserModalMode; user: AdminUser | null } | null

// Dueña de search/filtros/paginación (a diferencia de GameEventsList, que los posee internamente,
// acá viven en el header de la página -- ver UserFilterPopover/search input abajo -- así que el
// padre que los renderiza también necesita el estado, ver conversación) y del array de usuarios
// (mock, mutado localmente por Create/Edit/Delete). UserTable es presentación pura: solo recibe la
// página ya calculada.
export function UsersPage() {
  const { t } = useTranslation()
  const [users, setUsers] = useState<AdminUser[]>(ADMIN_USERS)
  const [search, setSearch] = useState('')
  const [roleFilter, setRoleFilter] = useState<RoleFilter>('all')
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')
  const [page, setPage] = useState(1)
  const [modalState, setModalState] = useState<ModalState>(null)
  const [deleteTarget, setDeleteTarget] = useState<AdminUser | null>(null)
  const [deleteLoading, setDeleteLoading] = useState(false)

  const filteredUsers = useMemo(() => {
    const query = search.trim().toLowerCase()
    return users.filter((user) => {
      if (roleFilter !== 'all' && user.role !== roleFilter) return false
      if (statusFilter !== 'all' && user.status !== statusFilter) return false
      if (!query) return true
      return user.fullName.toLowerCase().includes(query) || user.username.toLowerCase().includes(query) || user.email.toLowerCase().includes(query)
    })
  }, [users, search, roleFilter, statusFilter])

  // Búsqueda/filtro cambiando invalida la página actual -- mismo criterio que GameEventsList.tsx.
  useEffect(() => {
    setPage(1)
  }, [search, roleFilter, statusFilter])

  const totalPages = Math.max(1, Math.ceil(filteredUsers.length / PAGE_SIZE))
  const currentPage = Math.min(page, totalPages)
  const pageStart = (currentPage - 1) * PAGE_SIZE
  const pageUsers = filteredUsers.slice(pageStart, pageStart + PAGE_SIZE)

  // Las 4 stats se derivan de TODOS los usuarios (no de filteredUsers) -- son conteos globales,
  // igual que Total/Active/Inactive/Admin Users de la referencia, no "resultados de la búsqueda
  // actual". Los porcentajes sí son datos reales (count/total), a diferencia de un trend de
  // crecimiento que no existe (ver UserStatCard.tsx).
  const stats = useMemo(() => {
    const total = users.length
    const active = users.filter((u) => u.status === 'active').length
    const inactive = total - active
    const admins = users.filter((u) => u.role === 'admin').length
    const pct = (n: number) => (total === 0 ? 0 : Math.round((n / total) * 100))
    return { total, active, inactive, admins, activePct: pct(active), inactivePct: pct(inactive), adminPct: pct(admins) }
  }, [users])

  const handleCreate = () => setModalState({ mode: 'create', user: null })
  const handleEdit = (user: AdminUser) => setModalState({ mode: 'edit', user })

  const handleModalSubmit = async (data: AdminUserFormData) => {
    await simulateAction()
    if (modalState?.mode === 'create') {
      const newUser: AdminUser = {
        id: `usr-${Date.now()}`,
        fullName: data.fullName,
        username: data.username,
        email: data.email,
        role: data.role,
        status: data.status,
        avatarAccent: AVATAR_ACCENT_CYCLE[users.length % AVATAR_ACCENT_CYCLE.length],
        lastLoginAt: null,
      }
      setUsers((prev) => [newUser, ...prev])
    } else if (modalState?.user) {
      const targetId = modalState.user.id
      setUsers((prev) =>
        prev.map((u) => (u.id === targetId ? { ...u, fullName: data.fullName, username: data.username, email: data.email, role: data.role, status: data.status } : u)),
      )
    }
    setModalState(null)
  }

  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return
    setDeleteLoading(true)
    await simulateAction()
    setUsers((prev) => prev.filter((u) => u.id !== deleteTarget.id))
    setDeleteLoading(false)
    setDeleteTarget(null)
  }

  return (
    <>
      <div className="admin-main-topbar">
        <div>
          <h1 className="admin-main-title">{t('admin.users.title')}</h1>
          <p className="admin-main-subtitle">{t('admin.users.subtitle')}</p>
        </div>

        <div className="admin-users-toolbar">
          <div className="admin-users-search">
            <SearchIcon />
            <input
              type="text"
              className="admin-users-search-input"
              placeholder={t('admin.users.search.placeholder')}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              aria-label={t('admin.users.search.placeholder')}
            />
          </div>
          <UserFilterPopover role={roleFilter} status={statusFilter} onChangeRole={setRoleFilter} onChangeStatus={setStatusFilter} />
          <button type="button" className="admin-users-btn admin-users-btn--primary" onClick={handleCreate}>
            <PlusIcon />
            {t('admin.users.addUser')}
          </button>
        </div>
      </div>

      <div className="admin-users-stats-row">
        <UserStatCard title={t('admin.users.stats.total')} value={stats.total} icon={<img src={TOTAL_ICON_URL} alt="" />} accent="blue" />
        <UserStatCard
          title={t('admin.users.stats.active')}
          value={stats.active}
          icon={<img src={ACTIVE_ICON_URL} alt="" />}
          accent="green"
          progress={{ percent: stats.activePct, label: `${stats.activePct}%` }}
        />
        <UserStatCard
          title={t('admin.users.stats.inactive')}
          value={stats.inactive}
          icon={<img src={INACTIVE_ICON_URL} alt="" />}
          accent="red"
          progress={{ percent: stats.inactivePct, label: `${stats.inactivePct}%` }}
        />
        <UserStatCard
          title={t('admin.users.stats.admins')}
          value={stats.admins}
          icon={<ShieldIcon />}
          accent="purple"
          progress={{ percent: stats.adminPct, label: `${stats.adminPct}%` }}
        />
      </div>

      <UserTable
        users={pageUsers}
        totalCount={filteredUsers.length}
        pageStart={pageStart}
        pageSize={PAGE_SIZE}
        currentPage={currentPage}
        totalPages={totalPages}
        onPageChange={setPage}
        onEdit={handleEdit}
        onDeleteRequest={setDeleteTarget}
      />

      {modalState && (
        <UserModal
          mode={modalState.mode}
          editingName={modalState.user?.fullName}
          initialData={
            modalState.mode === 'edit' && modalState.user
              ? {
                  fullName: modalState.user.fullName,
                  username: modalState.user.username,
                  email: modalState.user.email,
                  password: '',
                  role: modalState.user.role,
                  status: modalState.user.status,
                }
              : DEFAULT_USER_FORM
          }
          onClose={() => setModalState(null)}
          onSubmit={handleModalSubmit}
        />
      )}

      {deleteTarget && (
        <ConfirmDialog
          title={t('admin.users.deleteConfirm.title')}
          description={t('admin.users.deleteConfirm.description', { name: deleteTarget.fullName })}
          confirmLabel={t('admin.users.deleteConfirm.confirm')}
          confirmLoadingLabel={t('admin.users.deleteConfirm.deleting')}
          cancelLabel={t('admin.users.deleteConfirm.cancel')}
          danger
          loading={deleteLoading}
          onCancel={() => setDeleteTarget(null)}
          onConfirm={handleDeleteConfirm}
        />
      )}
    </>
  )
}
