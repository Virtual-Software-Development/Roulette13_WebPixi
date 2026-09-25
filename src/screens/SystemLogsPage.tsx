import { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { AdminSelect, type AdminSelectOption } from '../components/admin/AdminSelect'
import { AdminTablePagination } from '../components/admin/AdminTablePagination'
import { StatusBadge } from '../components/admin/StatusBadge'
import { SystemLogDetailsModal } from '../components/admin/systemLogs/SystemLogDetailsModal'
import { SearchIcon, ChevronRightIcon } from '../components/admin/systemLogs/icons'
import { SYSTEM_LOG_ENTRIES, SYSTEM_LOG_MODULE_ICON_URLS, SYSTEM_LOG_HUMAN_ACTOR_ICON_URL, SYSTEM_LOG_SYSTEM_ACTOR_ICON_URL } from '../data/adminSystemLogsMockData'
import { parseApiDateTime } from '../utils/time'
import {
  SYSTEM_LOG_ACTIONS,
  SYSTEM_LOG_ACTION_VARIANT,
  SYSTEM_LOG_MODULES,
  SYSTEM_LOG_STATUS_VARIANT,
  type SystemLogAction,
  type SystemLogEntry,
  type SystemLogModule,
  type SystemLogStatus,
} from '../types/adminSystemLogs'
import './adminSystemLogsPage.css'

const PAGE_SIZE = 10
const DATE_FORMATTER = new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
const TIME_FORMATTER = new Intl.DateTimeFormat('en-US', { hour: 'numeric', minute: '2-digit', second: '2-digit' })

function actorIconUrl(actorRole: string) {
  return actorRole === 'System' ? SYSTEM_LOG_SYSTEM_ACTOR_ICON_URL : SYSTEM_LOG_HUMAN_ACTOR_ICON_URL
}

type ModuleFilter = 'all' | SystemLogModule
type ActionFilter = 'all' | SystemLogAction
type StatusFilter = 'all' | SystemLogStatus
type UserFilter = 'all' | string
type DateFilter = 'any' | 'today' | 'last7Days' | 'last30Days'

// Admin > Logs -- activa el ítem de sidebar "systemLogs" que hasta ahora estaba disabled/sin view
// (ver AdminPanel.tsx / adminDashboardMockData.ts). Solo lectura: sin Export, sin acciones de
// editar/eliminar, sin panel lateral permanente -- cada fila abre un modal con el detalle completo.
// Filtros instantáneos (mismo patrón que Video Management, el más reciente del Admin), sin botón
// Apply -- ver AdminReportsPage para el patrón alternativo con Apply, descartado a pedido explícito.
export function SystemLogsPage() {
  const { t } = useTranslation()

  const [search, setSearch] = useState('')
  const [dateFilter, setDateFilter] = useState<DateFilter>('any')
  const [userFilter, setUserFilter] = useState<UserFilter>('all')
  const [moduleFilter, setModuleFilter] = useState<ModuleFilter>('all')
  const [actionFilter, setActionFilter] = useState<ActionFilter>('all')
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')
  const [page, setPage] = useState(1)
  const [selectedEntry, setSelectedEntry] = useState<SystemLogEntry | null>(null)

  const dateOptions: AdminSelectOption<DateFilter>[] = [
    { value: 'any', label: t('admin.systemLogs.filters.dateRangeOptions.any') },
    { value: 'today', label: t('admin.systemLogs.filters.dateRangeOptions.today') },
    { value: 'last7Days', label: t('admin.systemLogs.filters.dateRangeOptions.last7Days') },
    { value: 'last30Days', label: t('admin.systemLogs.filters.dateRangeOptions.last30Days') },
  ]
  const userOptions: AdminSelectOption<UserFilter>[] = useMemo(() => {
    const actorRoleByName = new Map(SYSTEM_LOG_ENTRIES.map((e) => [e.actor, e.actorRole]))
    return [
      { value: 'all', label: t('admin.systemLogs.filters.allUsers') },
      ...Array.from(actorRoleByName.entries()).map(([actor, role]) => ({ value: actor, label: actor, icon: actorIconUrl(role) })),
    ]
  }, [t])
  const moduleOptions: AdminSelectOption<ModuleFilter>[] = [
    { value: 'all', label: t('admin.systemLogs.filters.allModules') },
    ...SYSTEM_LOG_MODULES.map((m) => ({ value: m, label: t(`admin.systemLogs.module.${m}`), icon: SYSTEM_LOG_MODULE_ICON_URLS[m] })),
  ]
  const actionOptions: AdminSelectOption<ActionFilter>[] = [{ value: 'all', label: t('admin.systemLogs.filters.allActions') }, ...SYSTEM_LOG_ACTIONS.map((a) => ({ value: a, label: a }))]
  const statusOptions: AdminSelectOption<StatusFilter>[] = [
    { value: 'all', label: t('admin.systemLogs.filters.allStatuses') },
    { value: 'success', label: t('admin.systemLogs.status.success') },
    { value: 'warning', label: t('admin.systemLogs.status.warning') },
    { value: 'failed', label: t('admin.systemLogs.status.failed') },
  ]

  const filteredEntries = useMemo(() => {
    const query = search.trim().toLowerCase()
    const cutoffHours = dateFilter === 'today' ? 24 : dateFilter === 'last7Days' ? 24 * 7 : dateFilter === 'last30Days' ? 24 * 30 : null
    return SYSTEM_LOG_ENTRIES.filter((entry) => {
      if (moduleFilter !== 'all' && entry.module !== moduleFilter) return false
      if (actionFilter !== 'all' && entry.action !== actionFilter) return false
      if (statusFilter !== 'all' && entry.status !== statusFilter) return false
      if (userFilter !== 'all' && entry.actor !== userFilter) return false
      if (cutoffHours !== null && Date.now() - parseApiDateTime(entry.timestamp).getTime() > cutoffHours * 60 * 60 * 1000) return false
      if (query && !entry.summary.toLowerCase().includes(query) && !entry.actor.toLowerCase().includes(query) && !entry.action.toLowerCase().includes(query) && !entry.id.includes(query)) {
        return false
      }
      return true
    })
  }, [search, dateFilter, userFilter, moduleFilter, actionFilter, statusFilter])

  useEffect(() => setPage(1), [search, dateFilter, userFilter, moduleFilter, actionFilter, statusFilter])

  const totalPages = Math.max(1, Math.ceil(filteredEntries.length / PAGE_SIZE))
  const currentPage = Math.min(page, totalPages)
  const pageStart = (currentPage - 1) * PAGE_SIZE
  const pageEntries = filteredEntries.slice(pageStart, pageStart + PAGE_SIZE)

  function clearFilters() {
    setSearch('')
    setDateFilter('any')
    setUserFilter('all')
    setModuleFilter('all')
    setActionFilter('all')
    setStatusFilter('all')
  }

  return (
    <>
      <div className="admin-main-topbar">
        <div>
          <h1 className="admin-main-title">{t('admin.systemLogs.title')}</h1>
          <p className="admin-main-subtitle">{t('admin.systemLogs.subtitle')}</p>
        </div>
      </div>

      <section className="admin-panel admin-system-logs-filters">
        <AdminSelect label={t('admin.systemLogs.filters.dateRange')} value={dateFilter} options={dateOptions} onChange={setDateFilter} />
        <AdminSelect label={t('admin.systemLogs.filters.user')} value={userFilter} options={userOptions} onChange={setUserFilter} />
        <AdminSelect label={t('admin.systemLogs.filters.module')} value={moduleFilter} options={moduleOptions} onChange={setModuleFilter} />
        <AdminSelect label={t('admin.systemLogs.filters.action')} value={actionFilter} options={actionOptions} onChange={setActionFilter} />
        <AdminSelect label={t('admin.systemLogs.filters.status')} value={statusFilter} options={statusOptions} onChange={setStatusFilter} />

        <div className="admin-system-logs-search-row">
          <div className="admin-system-logs-search">
            <SearchIcon />
            <input
              type="text"
              className="admin-system-logs-search-input"
              placeholder={t('admin.systemLogs.filters.searchPlaceholder')}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              aria-label={t('admin.systemLogs.filters.searchPlaceholder')}
            />
          </div>
          <button type="button" className="admin-system-logs-clear-btn" onClick={clearFilters}>
            {t('admin.systemLogs.filters.clear')}
          </button>
        </div>
      </section>

      <section className="admin-panel admin-system-logs-table-panel">
        <div className="admin-system-logs-table-scroll">
          <table className="admin-system-logs-table">
            <thead>
              <tr>
                <th>{t('admin.systemLogs.table.dateTime')}</th>
                <th>{t('admin.systemLogs.table.user')}</th>
                <th>{t('admin.systemLogs.table.module')}</th>
                <th>{t('admin.systemLogs.table.action')}</th>
                <th>{t('admin.systemLogs.table.details')}</th>
                <th>{t('admin.systemLogs.table.status')}</th>
                <th aria-hidden="true"></th>
              </tr>
            </thead>
            <tbody>
              {pageEntries.map((entry) => (
                <tr
                  key={entry.id}
                  data-selected={entry.id === selectedEntry?.id}
                  tabIndex={0}
                  aria-selected={entry.id === selectedEntry?.id}
                  onClick={() => setSelectedEntry(entry)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault()
                      setSelectedEntry(entry)
                    }
                  }}
                >
                  <td className="admin-system-logs-cell-datetime">
                    <span className="admin-system-logs-cell-date">{DATE_FORMATTER.format(parseApiDateTime(entry.timestamp))}</span>
                    <span className="admin-system-logs-cell-time">{TIME_FORMATTER.format(parseApiDateTime(entry.timestamp))}</span>
                  </td>
                  <td>
                    <span className="admin-system-logs-cell-with-icon">
                      <img src={actorIconUrl(entry.actorRole)} alt="" />
                      {entry.actor}
                    </span>
                  </td>
                  <td className="admin-system-logs-cell-secondary">
                    <span className="admin-system-logs-cell-with-icon">
                      <img src={SYSTEM_LOG_MODULE_ICON_URLS[entry.module]} alt="" />
                      {t(`admin.systemLogs.module.${entry.module}`)}
                    </span>
                  </td>
                  <td>
                    <StatusBadge variant={SYSTEM_LOG_ACTION_VARIANT[entry.action]}>{entry.action}</StatusBadge>
                  </td>
                  <td className="admin-system-logs-cell-details">{entry.summary}</td>
                  <td>
                    <StatusBadge variant={SYSTEM_LOG_STATUS_VARIANT[entry.status]}>{t(`admin.systemLogs.status.${entry.status}`)}</StatusBadge>
                  </td>
                  <td>
                    <button
                      type="button"
                      className="admin-system-logs-row-chevron"
                      aria-label={t('admin.systemLogs.table.viewDetails')}
                      onClick={(e) => {
                        e.stopPropagation()
                        setSelectedEntry(entry)
                      }}
                    >
                      <ChevronRightIcon />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {filteredEntries.length === 0 && <p className="admin-system-logs-empty">{t('admin.systemLogs.table.empty')}</p>}
        </div>

        <AdminTablePagination
          page={currentPage}
          totalPages={totalPages}
          onPageChange={setPage}
          rangeLabel={
            filteredEntries.length === 0
              ? t('admin.systemLogs.table.showingCount', { from: 0, to: 0, total: 0 })
              : t('admin.systemLogs.table.showingCount', { from: pageStart + 1, to: Math.min(pageStart + PAGE_SIZE, filteredEntries.length), total: filteredEntries.length })
          }
        />
      </section>

      {selectedEntry && <SystemLogDetailsModal entry={selectedEntry} onClose={() => setSelectedEntry(null)} />}
    </>
  )
}
