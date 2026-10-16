import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import type { TFunction } from 'i18next'
import { UserStatCard } from '../components/admin/users/UserStatCard'
import { UserTable } from '../components/admin/users/UserTable'
import { UserFormPanel, type UserFormMode } from '../components/admin/users/UserFormPanel'
import { UserFilterPopover, type RoleFilter, type StatusFilter } from '../components/admin/users/UserFilterPopover'
import { ConfirmDialog } from '../components/admin/ConfirmDialog'
import { AdminDetailPopup } from '../components/admin/AdminDetailPopup'
import { PlusIcon, SearchIcon, ShieldIcon } from '../components/admin/users/icons'
import { DEFAULT_USER_FORM } from '../components/admin/users/userRoles'
import { AdminAuthError } from '../api/adminSession'
import { buildUserPatch, createAdminUser, updateAdminUser, type AdminUsersQuery } from '../api/adminUsers'
import { useAdminUsers } from '../hooks/useAdminUsers'
import { buildMediaUrl } from '../utils/media'
import { useDetailAsPopup } from '../hooks/useDetailAsPopup'
import type { AdminUser, AdminUserFormData } from '../types/adminUsers'
import '../components/admin/users/adminUsers.css'

const TOTAL_ICON_URL = buildMediaUrl('Website_svg_icons/16_user_white_circle.svg')
const ACTIVE_ICON_URL = buildMediaUrl('Website_svg_icons/36_users_green.svg')
const INACTIVE_ICON_URL = buildMediaUrl('Website_svg_icons/25_user_red_circle.svg')

const PAGE_SIZE = 10
const SEARCH_DEBOUNCE_MS = 300
// Mismo criterio que Settings: el éxito se retira solo, el error queda hasta la próxima acción.
const SUCCESS_FEEDBACK_MS = 3000

// Add/Edit User: panel a la derecha de la tabla en desktop, pop-up en pantallas angostas.
type FormState = { mode: UserFormMode; user: AdminUser | null } | null
type Feedback = { variant: 'success' | 'error'; message: string }

// Sin sesión de admin el backend responde 401 (AdminAuthError); el resto trae el mensaje del
// backend (apperror, en español) o el status.
function actionErrorMessage(err: unknown, t: TFunction): string {
  if (err instanceof AdminAuthError) return t('admin.users.errors.login')
  return t('admin.users.errors.action', { error: err instanceof Error && err.message ? err.message : String(err) })
}

function loadErrorMessage(err: unknown, t: TFunction): string {
  if (err instanceof AdminAuthError) return t('admin.users.errors.login')
  return t('admin.users.errors.load', { error: err instanceof Error && err.message ? err.message : String(err) })
}

// Admin > Users contra GET/POST/PATCH /users: búsqueda, filtros y paginación se resuelven en el
// backend; las stats son conteos globales que vienen en la misma respuesta. No hay borrado: la
// baja es desactivar (el backend además le cierra la sesión), y se puede reactivar.
export function UsersPage() {
  const { t } = useTranslation()
  const [searchInput, setSearchInput] = useState('')
  const [search, setSearch] = useState('')
  const [roleFilter, setRoleFilter] = useState<RoleFilter>('all')
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')
  const [page, setPage] = useState(1)
  const [formState, setFormState] = useState<FormState>(null)
  const [saving, setSaving] = useState(false)
  const detailAsPopup = useDetailAsPopup()
  const [deactivateTarget, setDeactivateTarget] = useState<AdminUser | null>(null)
  const [deactivating, setDeactivating] = useState(false)
  const [feedback, setFeedback] = useState<Feedback | null>(null)

  useEffect(() => {
    const timer = setTimeout(() => setSearch(searchInput.trim()), SEARCH_DEBOUNCE_MS)
    return () => clearTimeout(timer)
  }, [searchInput])

  useEffect(() => setPage(1), [search, roleFilter, statusFilter])

  useEffect(() => {
    if (feedback?.variant !== 'success') return
    const timer = setTimeout(() => setFeedback(null), SUCCESS_FEEDBACK_MS)
    return () => clearTimeout(timer)
  }, [feedback])

  const query: AdminUsersQuery = {
    search: search || undefined,
    role: roleFilter === 'all' ? undefined : roleFilter,
    status: statusFilter === 'all' ? undefined : statusFilter,
    limit: PAGE_SIZE,
    offset: (page - 1) * PAGE_SIZE,
  }
  const { status, data, error, reload } = useAdminUsers(query)

  const total = data?.total ?? 0
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE))
  const pageStart = (page - 1) * PAGE_SIZE
  const users = status === 'error' ? [] : (data?.users ?? [])

  // Un filtro o una desactivación dejó la página actual fuera de rango.
  useEffect(() => {
    if (status === 'ready' && page > totalPages) setPage(totalPages)
  }, [status, page, totalPages])

  let notice: { text: string; error?: boolean } | null = null
  if (status === 'error') notice = { text: loadErrorMessage(error, t), error: true }
  else if (!data) notice = { text: t('admin.users.list.loading') }
  else if (status === 'ready' && users.length === 0) notice = { text: t('admin.users.list.empty') }

  const stats = data?.stats ?? { total: 0, active: 0, inactive: 0, admins: 0 }
  const pct = (n: number) => (stats.total === 0 ? 0 : Math.round((n / stats.total) * 100))
  const activePct = pct(stats.active)
  const inactivePct = pct(stats.inactive)
  const adminPct = pct(stats.admins)

  const handleCreate = () => setFormState({ mode: 'create', user: null })
  const handleEdit = (user: AdminUser) => setFormState({ mode: 'edit', user })
  const closeForm = () => setFormState(null)

  // Los errores se propagan: UserFormPanel muestra el mensaje del backend sin cerrar el panel.
  const handleFormSubmit = async (data: AdminUserFormData) => {
    setSaving(true)
    try {
      if (formState?.mode === 'create') {
        const created = await createAdminUser(data)
        setFeedback({ variant: 'success', message: t('admin.users.feedback.created', { name: created.fullName }) })
      } else if (formState?.user) {
        const patch = buildUserPatch(formState.user, data)
        if (Object.keys(patch).length > 0) {
          const updated = await updateAdminUser(formState.user.id, patch)
          setFeedback({ variant: 'success', message: t('admin.users.feedback.saved', { name: updated.fullName }) })
        }
      }
    } finally {
      setSaving(false)
    }
    setFormState(null)
    reload()
  }

  const setActive = async (user: AdminUser, isActive: boolean) => {
    setFeedback(null)
    try {
      await updateAdminUser(user.id, { isActive })
      setFeedback({
        variant: 'success',
        message: t(isActive ? 'admin.users.feedback.activated' : 'admin.users.feedback.deactivated', { name: user.fullName }),
      })
      if (formState?.user?.id === user.id) setFormState(null)
      reload()
    } catch (err) {
      setFeedback({ variant: 'error', message: actionErrorMessage(err, t) })
    }
  }

  const handleToggleActive = (user: AdminUser) => {
    if (user.status === 'active') setDeactivateTarget(user)
    else void setActive(user, true)
  }

  const handleDeactivateConfirm = async () => {
    if (!deactivateTarget) return
    setDeactivating(true)
    await setActive(deactivateTarget, false)
    setDeactivating(false)
    setDeactivateTarget(null)
  }

  // Mismo elemento en los dos modos (inline o dentro del pop-up). key = usuario/modo: elegir otro
  // usuario con el panel abierto remonta el formulario con sus datos, sin arrastrar el draft anterior.
  const userForm = formState && (
    <UserFormPanel
      key={formState.user?.id ?? 'new'}
      mode={formState.mode}
      isSelf={formState.user?.isSelf}
      initialData={
        formState.mode === 'edit' && formState.user
          ? {
              fullName: formState.user.fullName,
              username: formState.user.username,
              email: formState.user.email,
              password: '',
              role: formState.user.role,
              status: formState.user.status,
            }
          : DEFAULT_USER_FORM
      }
      onClose={closeForm}
      onSubmit={handleFormSubmit}
    />
  )

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
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
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

      {feedback && (
        <div className="admin-users-feedback" data-variant={feedback.variant} role={feedback.variant === 'error' ? 'alert' : 'status'}>
          {feedback.message}
        </div>
      )}

      <div className="admin-users-stats-row">
        <UserStatCard title={t('admin.users.stats.total')} value={stats.total} icon={<img src={TOTAL_ICON_URL} alt="" />} accent="blue" />
        <UserStatCard
          title={t('admin.users.stats.active')}
          value={stats.active}
          icon={<img src={ACTIVE_ICON_URL} alt="" />}
          accent="green"
          progress={{ percent: activePct, label: `${activePct}%` }}
        />
        <UserStatCard
          title={t('admin.users.stats.inactive')}
          value={stats.inactive}
          icon={<img src={INACTIVE_ICON_URL} alt="" />}
          accent="red"
          progress={{ percent: inactivePct, label: `${inactivePct}%` }}
        />
        <UserStatCard
          title={t('admin.users.stats.admins')}
          value={stats.admins}
          icon={<ShieldIcon />}
          accent="purple"
          progress={{ percent: adminPct, label: `${adminPct}%` }}
        />
      </div>

      <div className="admin-users-body">
        <UserTable
          users={users}
          totalCount={status === 'error' ? 0 : total}
          pageStart={pageStart}
          pageSize={PAGE_SIZE}
          currentPage={Math.min(page, totalPages)}
          totalPages={totalPages}
          onPageChange={setPage}
          onEdit={handleEdit}
          onToggleActive={handleToggleActive}
          notice={notice}
          busy={status === 'loading'}
        />
        {!detailAsPopup && userForm}
      </div>

      {userForm && detailAsPopup && (
        <AdminDetailPopup labelledBy="admin-users-form-title" onClose={closeForm} dismissible={!saving}>
          {userForm}
        </AdminDetailPopup>
      )}

      {deactivateTarget && (
        <ConfirmDialog
          title={t('admin.users.deactivateConfirm.title')}
          description={t('admin.users.deactivateConfirm.description', { name: deactivateTarget.fullName })}
          confirmLabel={t('admin.users.deactivateConfirm.confirm')}
          confirmLoadingLabel={t('admin.users.deactivateConfirm.deactivating')}
          cancelLabel={t('admin.users.deactivateConfirm.cancel')}
          danger
          loading={deactivating}
          onCancel={() => setDeactivateTarget(null)}
          onConfirm={() => void handleDeactivateConfirm()}
        />
      )}
    </>
  )
}
