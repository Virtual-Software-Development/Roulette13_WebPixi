import { useTranslation } from 'react-i18next'
import { buildMediaUrl } from '../../../utils/media'
import { parseApiDateTime } from '../../../utils/time'
import { StatusBadge } from '../StatusBadge'
import { USER_ROLE_VARIANT } from '../../../data/adminUsersMockData'
import { UserAvatar } from './UserAvatar'
import { ChevronLeftIcon, ChevronRightIcon, TrashIcon } from './icons'
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
  onDeleteRequest: (user: AdminUser) => void
}

// Presentación pura -- UsersPage.tsx es dueño de search/filter/paginación (viven en el header de
// la página, no en esta card, a diferencia de GameEventsList.tsx que sí incluye su propio toolbar);
// este componente solo recibe la página ya calculada y dispara los handlers de Edit/Delete. Mismo
// patrón de tabla/paginación real que GameEventsList.tsx, namespace propio (admin-users-*).
export function UserTable({ users, totalCount, pageStart, pageSize, currentPage, totalPages, onPageChange, onEdit, onDeleteRequest }: UserTableProps) {
  const { t } = useTranslation()

  return (
    <section className="admin-panel admin-users-table-card">
      <div className="admin-panel-header">
        <h2 className="admin-panel-title">{t('admin.users.list.title')}</h2>
      </div>

      <div className="admin-users-table-scroll">
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
              const lastLogin = user.lastLoginAt ? parseApiDateTime(user.lastLoginAt) : null
              return (
                <tr key={user.id}>
                  <td>
                    <div className="admin-users-name-cell">
                      <UserAvatar fullName={user.fullName} accent={user.avatarAccent} />
                      <span className="admin-users-name">{user.fullName}</span>
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
                      <button
                        type="button"
                        className="admin-users-icon-btn admin-users-icon-btn--danger"
                        aria-label={t('admin.users.actions.delete')}
                        onClick={() => onDeleteRequest(user)}
                      >
                        <TrashIcon />
                      </button>
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>

        {users.length === 0 && <p className="admin-users-empty">{t('admin.users.list.empty')}</p>}
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
