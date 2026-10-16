import { useTranslation } from 'react-i18next'
import { buildMediaUrl } from '../../../utils/media'
import { StatusBadge } from '../StatusBadge'
import { USER_ROLE_VARIANT } from './userRoles'
import { UserAvatar } from './UserAvatar'
import { BanIcon, CheckCircleIcon, ChevronLeftIcon, ChevronRightIcon } from './icons'
import type { AdminUser } from '../../../types/adminUsers'
import './adminUsers.css'

const EDIT_ICON_URL = buildMediaUrl('Website_svg_icons/15_pencil_white.svg')

const DATE_FORMATTER = new Intl.DateTimeFormat('en-US', { year: 'numeric', month: '2-digit', day: '2-digit' })
const TIME_FORMATTER = new Intl.DateTimeFormat('en-US', { hour: 'numeric', minute: '2-digit' })

interface UserTableProps {
  users: AdminUser[]
  totalCount: number
  pageStart: number
  pageSize: number
  currentPage: number
  totalPages: number
  onPageChange: (page: number) => void
  onEdit: (user: AdminUser) => void
  onToggleActive: (user: AdminUser) => void
  // Cargando / error / sin resultados, en lugar de las filas.
  notice: { text: string; error?: boolean } | null
  busy: boolean
}

// Presentación pura -- UsersPage.tsx es dueño de search/filter/paginación (viven en el header de
// la página, no en esta card) y de los pedidos al backend; este componente solo recibe la página
// ya cargada y dispara los handlers de Edit/Desactivar/Activar. No hay borrado: la baja es lógica.
export function UserTable({
  users,
  totalCount,
  pageStart,
  pageSize,
  currentPage,
  totalPages,
  onPageChange,
  onEdit,
  onToggleActive,
  notice,
  busy,
}: UserTableProps) {
  const { t } = useTranslation()

  return (
    <section className="admin-panel admin-users-table-card">
      <div className="admin-panel-header">
        <h2 className="admin-panel-title">{t('admin.users.list.title')}</h2>
      </div>

      <div className="admin-users-table-scroll" aria-busy={busy}>
        <table className="admin-users-table">
          <thead>
            <tr>
              <th>{t('admin.users.table.name')}</th>
              <th>{t('admin.users.table.username')}</th>
              <th>{t('admin.users.table.email')}</th>
              <th>{t('admin.users.table.role')}</th>
              <th>{t('admin.users.table.status')}</th>
              <th>{t('admin.users.table.lastLogin')}</th>
              <th>{t('admin.users.table.actions')}</th>
            </tr>
          </thead>
          <tbody>
            {users.map((user) => {
              const lastLogin = user.lastLoginAt ? new Date(user.lastLoginAt) : null
              return (
                <tr key={user.id}>
                  <td>
                    <div className="admin-users-name-cell">
                      <UserAvatar fullName={user.fullName} accent={user.avatarAccent} />
                      <span className="admin-users-name">{user.fullName}</span>
                      {user.isSelf && <span className="admin-users-self-tag">{t('admin.users.table.you')}</span>}
                    </div>
                  </td>
                  <td className="admin-users-secondary">{user.username}</td>
                  <td className="admin-users-secondary">{user.email}</td>
                  <td>
                    <StatusBadge variant={USER_ROLE_VARIANT[user.role]}>{t(`admin.users.role.${user.role}`)}</StatusBadge>
                  </td>
                  <td>
                    <span className="admin-users-status" data-status={user.status}>
                      <span className="admin-users-status-dot" />
                      {t(`admin.users.status.${user.status}`)}
                    </span>
                  </td>
                  <td className="admin-users-secondary admin-users-last-login">
                    {lastLogin ? (
                      <>
                        {DATE_FORMATTER.format(lastLogin)}
                        <br />
                        {TIME_FORMATTER.format(lastLogin)}
                      </>
                    ) : (
                      t('admin.users.table.neverLoggedIn')
                    )}
                  </td>
                  <td>
                    <div className="admin-users-row-actions">
                      <button type="button" className="admin-users-icon-btn" aria-label={t('admin.users.actions.edit')} onClick={() => onEdit(user)}>
                        <img src={EDIT_ICON_URL} alt="" />
                      </button>
                      {user.status === 'active' ? (
                        <button
                          type="button"
                          className="admin-users-icon-btn admin-users-icon-btn--danger"
                          aria-label={t('admin.users.actions.deactivate')}
                          title={user.isSelf ? t('admin.users.actions.cannotDeactivateSelf') : t('admin.users.actions.deactivate')}
                          disabled={user.isSelf}
                          onClick={() => onToggleActive(user)}
                        >
                          <BanIcon />
                        </button>
                      ) : (
                        <button
                          type="button"
                          className="admin-users-icon-btn admin-users-icon-btn--success"
                          aria-label={t('admin.users.actions.activate')}
                          title={t('admin.users.actions.activate')}
                          onClick={() => onToggleActive(user)}
                        >
                          <CheckCircleIcon />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>

        {notice && (
          <p className="admin-users-empty" data-variant={notice.error ? 'error' : undefined} role={notice.error ? 'alert' : 'status'}>
            {notice.text}
          </p>
        )}
      </div>

      <div className="admin-users-footer">
        <p className="admin-users-count">
          {totalCount === 0
            ? t('admin.users.list.showingCount', { from: 0, to: 0, total: 0 })
            : t('admin.users.list.showingCount', { from: pageStart + 1, to: Math.min(pageStart + pageSize, totalCount), total: totalCount })}
        </p>

        {totalPages > 1 && (
          <nav className="admin-users-pagination" aria-label={t('admin.users.list.pagination')}>
            <button
              type="button"
              className="admin-users-page-btn"
              disabled={currentPage === 1}
              onClick={() => onPageChange(Math.max(1, currentPage - 1))}
              aria-label={t('admin.users.list.previousPage')}
            >
              <ChevronLeftIcon />
            </button>
            {Array.from({ length: totalPages }, (_, i) => i + 1).map((pageNumber) => (
              <button
                key={pageNumber}
                type="button"
                className="admin-users-page-btn"
                data-active={pageNumber === currentPage}
                aria-current={pageNumber === currentPage ? 'page' : undefined}
                onClick={() => onPageChange(pageNumber)}
              >
                {pageNumber}
              </button>
            ))}
            <button
              type="button"
              className="admin-users-page-btn"
              disabled={currentPage === totalPages}
              onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))}
              aria-label={t('admin.users.list.nextPage')}
            >
              <ChevronRightIcon />
            </button>
          </nav>
        )}
      </div>
    </section>
  )
}
