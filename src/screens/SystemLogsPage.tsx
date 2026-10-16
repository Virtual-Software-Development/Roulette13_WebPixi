import { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import type { TFunction } from 'i18next'
import { AdminAuthError } from '../api/adminSession'
import { localizeLogDescription } from '../utils/localizeLogDescription'
import type { SystemLogsQuery } from '../api/systemLogs'
import { AdminSelect, type AdminSelectOption } from '../components/admin/AdminSelect'
import { AdminDetailPopup } from '../components/admin/AdminDetailPopup'
import { AdminTablePagination } from '../components/admin/AdminTablePagination'
import { StatusBadge } from '../components/admin/StatusBadge'
import { SystemLogDetailsPanel } from '../components/admin/systemLogs/SystemLogDetailsPanel'
import { SearchIcon, ChevronRightIcon } from '../components/admin/systemLogs/icons'
import { SYSTEM_LOG_MODULE_ICON_URLS, systemLogActorIconUrl, systemLogActorName, systemLogModuleIconUrl } from '../components/admin/systemLogs/systemLogDisplay'
import { useDetailAsPopup } from '../hooks/useDetailAsPopup'
import { useSystemLogs } from '../hooks/useSystemLogs'
import { parseApiDateTime } from '../utils/time'
import { SYSTEM_LOG_ACTIONS, SYSTEM_LOG_MODULES, systemLogActionVariant, type SystemLogEntry, type SystemLogModule } from '../types/adminSystemLogs'
import './adminSystemLogsPage.css'

const PAGE_SIZE = 10
const SEARCH_DEBOUNCE_MS = 300
const DAY_MS = 24 * 60 * 60 * 1000
const DATE_FORMATTER = new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
const TIME_FORMATTER = new Intl.DateTimeFormat('en-US', { hour: 'numeric', minute: '2-digit', second: '2-digit' })

type ModuleFilter = 'all' | SystemLogModule
type ActionFilter = 'all' | string
// 'all', 'SYSTEM', 'MACHINE' o el uuid de un usuario
type UserFilter = 'all' | string
type DateFilter = 'any' | 'today' | 'last7Days' | 'last30Days'

// Inicio del rango: Today desde la medianoche local, los otros dos rangos móviles.
function dateFilterFrom(filter: DateFilter): string | undefined {
  if (filter === 'any') return undefined
  if (filter === 'today') {
    const midnight = new Date()
    midnight.setHours(0, 0, 0, 0)
    return midnight.toISOString()
  }
  return new Date(Date.now() - (filter === 'last7Days' ? 7 : 30) * DAY_MS).toISOString()
}

function loadErrorMessage(err: unknown, t: TFunction): string {
  if (err instanceof AdminAuthError) return t('admin.systemLogs.table.loginRequired')
  return t('admin.systemLogs.table.loadError', { error: err instanceof Error && err.message ? err.message : String(err) })
}

// Admin > Logs: la tabla log del backend (GET /audit/system-logs), filtrada y paginada allá. Solo
// lectura: sin Export, sin acciones de editar/eliminar. Cada fila abre el detalle completo en un
// panel a la derecha de la lista, que se cierra con su X o Escape; en pantallas angostas
// (tablet/teléfono, ver useDetailAsPopup) ese mismo panel se abre como pop-up.
// Filtros instantáneos (mismo patrón que Video Management), sin botón Apply; la búsqueda espera a
// que se deje de escribir. El backend no registra un estado/severidad por entrada, así que no hay
// columna ni filtro de Status.
export function SystemLogsPage() {
  const { t } = useTranslation()

  const [searchInput, setSearchInput] = useState('')
  const [search, setSearch] = useState('')
  const [dateFilter, setDateFilter] = useState<DateFilter>('any')
  const [userFilter, setUserFilter] = useState<UserFilter>('all')
  const [moduleFilter, setModuleFilter] = useState<ModuleFilter>('all')
  const [actionFilter, setActionFilter] = useState<ActionFilter>('all')
  const [page, setPage] = useState(1)
  const [selectedEntry, setSelectedEntry] = useState<SystemLogEntry | null>(null)
  const detailAsPopup = useDetailAsPopup()

  useEffect(() => {
    const timer = setTimeout(() => setSearch(searchInput.trim()), SEARCH_DEBOUNCE_MS)
    return () => clearTimeout(timer)
  }, [searchInput])

  useEffect(() => setPage(1), [search, dateFilter, userFilter, moduleFilter, actionFilter])

  // from se calcula al elegir el rango, no en cada render (si no, cada render sería otro pedido).
  const from = useMemo(() => dateFilterFrom(dateFilter), [dateFilter])
  const query: SystemLogsQuery = {
    from,
    actor: userFilter === 'all' ? undefined : userFilter,
    module: moduleFilter === 'all' ? undefined : moduleFilter,
    action: actionFilter === 'all' ? undefined : actionFilter,
    search: search || undefined,
    limit: PAGE_SIZE,
    offset: (page - 1) * PAGE_SIZE,
  }
  const { status, data, error } = useSystemLogs(query)

  const total = data?.total ?? 0
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE))
  const pageStart = (page - 1) * PAGE_SIZE
  const rows = status === 'error' ? [] : (data?.entries ?? [])

  // Un filtro dejó la página actual fuera de rango.
  useEffect(() => {
    if (status === 'ready' && page > totalPages) setPage(totalPages)
  }, [status, page, totalPages])

  const dateOptions: AdminSelectOption<DateFilter>[] = [
    { value: 'any', label: t('admin.systemLogs.filters.dateRangeOptions.any') },
    { value: 'today', label: t('admin.systemLogs.filters.dateRangeOptions.today') },
    { value: 'last7Days', label: t('admin.systemLogs.filters.dateRangeOptions.last7Days') },
    { value: 'last30Days', label: t('admin.systemLogs.filters.dateRangeOptions.last30Days') },
  ]
  const actors = data?.actors
  const userOptions: AdminSelectOption<UserFilter>[] = useMemo(() => {
    const options: AdminSelectOption<UserFilter>[] = [{ value: 'all', label: t('admin.systemLogs.filters.allUsers') }]
    if (actors?.system) options.push({ value: 'SYSTEM', label: t('admin.systemLogs.actor.system'), icon: systemLogActorIconUrl('SYSTEM') })
    if (actors?.machine) options.push({ value: 'MACHINE', label: t('admin.systemLogs.actor.machines'), icon: systemLogActorIconUrl('MACHINE') })
    for (const user of actors?.users ?? []) options.push({ value: user.id, label: user.username, icon: systemLogActorIconUrl('USER') })
    return options
  }, [actors, t])
  const moduleOptions: AdminSelectOption<ModuleFilter>[] = [
    { value: 'all', label: t('admin.systemLogs.filters.allModules') },
    ...SYSTEM_LOG_MODULES.map((m) => ({ value: m, label: t(`admin.systemLogs.module.${m}`), icon: SYSTEM_LOG_MODULE_ICON_URLS[m] })),
  ]
  const actionOptions: AdminSelectOption<ActionFilter>[] = [{ value: 'all', label: t('admin.systemLogs.filters.allActions') }, ...SYSTEM_LOG_ACTIONS.map((a) => ({ value: a, label: a }))]

  function clearFilters() {
    setSearchInput('')
    setSearch('')
    setDateFilter('any')
    setUserFilter('all')
    setModuleFilter('all')
    setActionFilter('all')
  }

  let notice: { text: string; error?: boolean } | null = null
  if (status === 'error') notice = { text: loadErrorMessage(error, t), error: true }
  else if (!data) notice = { text: t('admin.systemLogs.table.loading') }
  else if (status === 'ready' && rows.length === 0) notice = { text: t('admin.systemLogs.table.empty') }

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

        <div className="admin-system-logs-search-row">
          <div className="admin-system-logs-search">
            <SearchIcon />
            <input
              type="text"
              className="admin-system-logs-search-input"
              placeholder={t('admin.systemLogs.filters.searchPlaceholder')}
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              aria-label={t('admin.systemLogs.filters.searchPlaceholder')}
            />
          </div>
          <button type="button" className="admin-system-logs-clear-btn" onClick={clearFilters}>
            {t('admin.systemLogs.filters.clear')}
          </button>
        </div>
      </section>

      <div className="admin-system-logs-body">
        <section className="admin-panel admin-system-logs-table-panel">
          <div className="admin-system-logs-table-scroll" aria-busy={status === 'loading'}>
            <table className="admin-system-logs-table">
              <thead>
                <tr>
                  <th>{t('admin.systemLogs.table.dateTime')}</th>
                  <th>{t('admin.systemLogs.table.user')}</th>
                  <th>{t('admin.systemLogs.table.module')}</th>
                  <th>{t('admin.systemLogs.table.action')}</th>
                  <th>{t('admin.systemLogs.table.details')}</th>
                  <th aria-hidden="true"></th>
                </tr>
              </thead>
              <tbody>
                {rows.map((entry) => (
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
                        <img src={systemLogActorIconUrl(entry.actorType)} alt="" />
                        {systemLogActorName(entry, t)}
                      </span>
                    </td>
                    <td className="admin-system-logs-cell-secondary">
                      <span className="admin-system-logs-cell-with-icon">
                        <img src={systemLogModuleIconUrl(entry)} alt="" />
                        {t(`admin.systemLogs.module.${entry.module}`)}
                      </span>
                    </td>
                    <td>
                      <StatusBadge variant={systemLogActionVariant(entry.action)}>{entry.action}</StatusBadge>
                    </td>
                    <td className="admin-system-logs-cell-details">{entry.summary != null ? localizeLogDescription(entry.summary, t) : t('admin.systemLogs.detail.hiddenUntilDraw')}</td>
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
            {notice && (
              <p className="admin-system-logs-empty" data-variant={notice.error ? 'error' : undefined} role={notice.error ? 'alert' : undefined}>
                {notice.text}
              </p>
            )}
          </div>

          <AdminTablePagination
            page={Math.min(page, totalPages)}
            totalPages={totalPages}
            onPageChange={setPage}
            rangeLabel={
              rows.length === 0
                ? t('admin.systemLogs.table.showingCount', { from: 0, to: 0, total: 0 })
                : t('admin.systemLogs.table.showingCount', { from: pageStart + 1, to: pageStart + rows.length, total })
            }
          />
        </section>

        {selectedEntry && !detailAsPopup && <SystemLogDetailsPanel entry={selectedEntry} onClose={() => setSelectedEntry(null)} />}
      </div>

      {selectedEntry && detailAsPopup && (
        <AdminDetailPopup labelledBy="admin-system-log-panel-title" onClose={() => setSelectedEntry(null)}>
          <SystemLogDetailsPanel entry={selectedEntry} onClose={() => setSelectedEntry(null)} />
        </AdminDetailPopup>
      )}
    </>
  )
}
