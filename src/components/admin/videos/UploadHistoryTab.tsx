import { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { AdminSelect, type AdminSelectOption } from '../AdminSelect'
import { AdminTablePagination } from '../AdminTablePagination'
import { AdminRowActionsMenu, type AdminRowAction } from '../AdminRowActionsMenu'
import { AdminLogModal } from '../AdminLogModal'
import { StatusBadge } from '../StatusBadge'
import { useAdminVideosStore } from '../../../store/useAdminVideosStore'
import { parseApiDateTime } from '../../../utils/time'
import { UPLOAD_HISTORY_STATUS_VARIANT, UPLOAD_HISTORY_VALIDATION_VARIANT } from '../../../data/adminVideosMockData'
import type { UploadHistoryGame, UploadHistoryRecord } from '../../../types/adminVideos'
import { LinkIcon, SearchIcon } from './icons'
import './adminVideosShared.css'

const PAGE_SIZE = 10
const DATE_FORMATTER = new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })

type GameFilter = 'all' | UploadHistoryGame
type DateFilter = 'any' | 'today' | 'last7Days' | 'last30Days'

interface UploadHistoryTabProps {
  onOpenRelated: (game: UploadHistoryGame, relatedId: string) => void
}

// Solo lectura (pedido explícito: "no quiero que sea una pantalla desde la cual modificar uploads
// históricos") -- sin summary cards (pedido explícito: "si no aportan información real, prefiero
// Filters/Table/Details", y acá no hay una métrica propia distinta a lo que ya muestran los otros
// dos tabs).
export function UploadHistoryTab({ onOpenRelated }: UploadHistoryTabProps) {
  const { t } = useTranslation()
  const records = useAdminVideosStore((s) => s.uploadHistory)

  const [search, setSearch] = useState('')
  const [gameFilter, setGameFilter] = useState<GameFilter>('all')
  const [statusFilter, setStatusFilter] = useState('all')
  const [validationFilter, setValidationFilter] = useState('all')
  const [uploaderFilter, setUploaderFilter] = useState('all')
  const [dateFilter, setDateFilter] = useState<DateFilter>('any')
  const [page, setPage] = useState(1)
  const [selectedId, setSelectedId] = useState<string | null>(records[0]?.id ?? null)
  const [logRecord, setLogRecord] = useState<UploadHistoryRecord | null>(null)

  const gameOptions: AdminSelectOption<GameFilter>[] = [
    { value: 'all', label: t('admin.videos.uploadHistory.filters.allGames') },
    { value: 'roulette', label: t('admin.videos.shared.uploadModal.gameRoulette') },
    { value: 'quickMoney', label: t('admin.videos.shared.uploadModal.gameQuickMoney') },
  ]
  const statusOptions: AdminSelectOption<string>[] = [
    { value: 'all', label: t('admin.videos.uploadHistory.filters.allStatuses') },
    { value: 'success', label: t('admin.videos.uploadHistory.status.success') },
    { value: 'failed', label: t('admin.videos.uploadHistory.status.failed') },
    { value: 'pending', label: t('admin.videos.uploadHistory.status.pending') },
  ]
  const validationOptions: AdminSelectOption<string>[] = [
    { value: 'all', label: t('admin.videos.roulette.filters.allValidations') },
    { value: 'passed', label: t('admin.videos.shared.validation.passed') },
    { value: 'failed', label: t('admin.videos.shared.validation.failed') },
    { value: 'pending', label: t('admin.videos.shared.validation.pending') },
    { value: 'notApplicable', label: t('admin.videos.shared.validation.notApplicable') },
  ]
  const uploaderOptions: AdminSelectOption<string>[] = useMemo(
    () => [{ value: 'all', label: t('admin.videos.uploadHistory.filters.allUploaders') }, ...Array.from(new Set(records.map((r) => r.uploadedBy))).map((u) => ({ value: u, label: u }))],
    [records, t],
  )
  const dateOptions: AdminSelectOption<DateFilter>[] = [
    { value: 'any', label: t('admin.videos.shared.dateRange.any') },
    { value: 'today', label: t('admin.videos.shared.dateRange.today') },
    { value: 'last7Days', label: t('admin.videos.shared.dateRange.last7Days') },
    { value: 'last30Days', label: t('admin.videos.shared.dateRange.last30Days') },
  ]

  const filteredRecords = useMemo(() => {
    const query = search.trim().toLowerCase()
    const cutoffHours = dateFilter === 'today' ? 24 : dateFilter === 'last7Days' ? 24 * 7 : dateFilter === 'last30Days' ? 24 * 30 : null
    return records.filter((r) => {
      if (gameFilter !== 'all' && r.game !== gameFilter) return false
      if (statusFilter !== 'all' && r.status !== statusFilter) return false
      if (validationFilter !== 'all' && r.validation !== validationFilter) return false
      if (uploaderFilter !== 'all' && r.uploadedBy !== uploaderFilter) return false
      if (cutoffHours !== null && Date.now() - parseApiDateTime(r.uploadedAt).getTime() > cutoffHours * 60 * 60 * 1000) return false
      if (query && !r.filename.toLowerCase().includes(query) && !r.relatedLabel.toLowerCase().includes(query)) return false
      return true
    })
  }, [records, search, gameFilter, statusFilter, validationFilter, uploaderFilter, dateFilter])

  useEffect(() => setPage(1), [search, gameFilter, statusFilter, validationFilter, uploaderFilter, dateFilter])

  const totalPages = Math.max(1, Math.ceil(filteredRecords.length / PAGE_SIZE))
  const currentPage = Math.min(page, totalPages)
  const pageStart = (currentPage - 1) * PAGE_SIZE
  const pageRecords = filteredRecords.slice(pageStart, pageStart + PAGE_SIZE)

  const selected = records.find((r) => r.id === selectedId) ?? null

  function actionsFor(record: UploadHistoryRecord): AdminRowAction[] {
    return [
      { key: 'log', label: t('admin.videos.shared.actions.viewValidationLog'), onSelect: () => setLogRecord(record) },
      { key: 'open', label: t('admin.videos.uploadHistory.actions.openRelated'), icon: <LinkIcon />, onSelect: () => onOpenRelated(record.game, record.relatedId) },
    ]
  }

  return (
    <div className="admin-videos-tab-content">
      <section className="admin-panel admin-videos-filters">
        <div className="admin-videos-search">
          <SearchIcon />
          <input
            type="text"
            className="admin-videos-search-input"
            placeholder={t('admin.videos.uploadHistory.filters.searchPlaceholder')}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            aria-label={t('admin.videos.uploadHistory.filters.searchPlaceholder')}
          />
        </div>
        <AdminSelect label={t('admin.videos.uploadHistory.filters.game')} value={gameFilter} options={gameOptions} onChange={setGameFilter} />
        <AdminSelect label={t('admin.videos.uploadHistory.filters.status')} value={statusFilter} options={statusOptions} onChange={setStatusFilter} />
        <AdminSelect label={t('admin.videos.uploadHistory.filters.validation')} value={validationFilter} options={validationOptions} onChange={setValidationFilter} />
        <AdminSelect label={t('admin.videos.uploadHistory.filters.uploadedBy')} value={uploaderFilter} options={uploaderOptions} onChange={setUploaderFilter} />
        <AdminSelect label={t('admin.videos.uploadHistory.filters.date')} value={dateFilter} options={dateOptions} onChange={setDateFilter} />
        <button
          type="button"
          className="admin-videos-btn admin-videos-btn--ghost admin-videos-clear-btn"
          onClick={() => {
            setSearch('')
            setGameFilter('all')
            setStatusFilter('all')
            setValidationFilter('all')
            setUploaderFilter('all')
            setDateFilter('any')
          }}
        >
          {t('admin.videos.shared.clear')}
        </button>
      </section>

      <div className="admin-videos-layout">
        <section className="admin-panel admin-videos-table-panel">
          <div className="admin-videos-table-scroll">
            <table className="admin-videos-table">
              <thead>
                <tr>
                  <th>{t('admin.videos.uploadHistory.table.dateTime')}</th>
                  <th>{t('admin.videos.uploadHistory.table.game')}</th>
                  <th>{t('admin.videos.uploadHistory.table.related')}</th>
                  <th>{t('admin.videos.uploadHistory.table.filename')}</th>
                  <th>{t('admin.videos.uploadHistory.table.uploadedBy')}</th>
                  <th>{t('admin.videos.uploadHistory.table.status')}</th>
                  <th>{t('admin.videos.uploadHistory.table.validation')}</th>
                  <th>{t('admin.videos.uploadHistory.table.fileSize')}</th>
                  <th>{t('admin.videos.uploadHistory.table.actions')}</th>
                </tr>
              </thead>
              <tbody>
                {pageRecords.map((record) => (
                  <tr
                    key={record.id}
                    data-selected={record.id === selectedId}
                    tabIndex={0}
                    aria-selected={record.id === selectedId}
                    onClick={() => setSelectedId(record.id)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault()
                        setSelectedId(record.id)
                      }
                    }}
                  >
                    <td className="admin-videos-cell-secondary">{DATE_FORMATTER.format(parseApiDateTime(record.uploadedAt))}</td>
                    <td>{record.game === 'roulette' ? t('admin.videos.shared.uploadModal.gameRoulette') : t('admin.videos.shared.uploadModal.gameQuickMoney')}</td>
                    <td className="admin-videos-cell-secondary">
                      {record.relatedLabel}
                      {record.isReplacement && <span className="admin-videos-replacement-tag"> · {t('admin.videos.uploadHistory.table.replacement')}</span>}
                    </td>
                    <td className="admin-videos-cell-secondary">{record.filename}</td>
                    <td className="admin-videos-cell-secondary">{record.uploadedBy}</td>
                    <td>
                      <StatusBadge variant={UPLOAD_HISTORY_STATUS_VARIANT[record.status]}>{t(`admin.videos.uploadHistory.status.${record.status}`)}</StatusBadge>
                    </td>
                    <td>
                      <StatusBadge variant={UPLOAD_HISTORY_VALIDATION_VARIANT[record.validation]}>{t(`admin.videos.shared.validation.${record.validation}`)}</StatusBadge>
                    </td>
                    <td className="admin-videos-cell-secondary">{record.fileSizeMb} MB</td>
                    <td>
                      <AdminRowActionsMenu actions={actionsFor(record)} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {filteredRecords.length === 0 && <p className="admin-videos-empty">{t('admin.videos.uploadHistory.table.empty')}</p>}
          </div>

          <AdminTablePagination
            page={currentPage}
            totalPages={totalPages}
            onPageChange={setPage}
            rangeLabel={
              filteredRecords.length === 0
                ? t('admin.videos.uploadHistory.table.showingCount', { from: 0, to: 0, total: 0 })
                : t('admin.videos.uploadHistory.table.showingCount', { from: pageStart + 1, to: Math.min(pageStart + PAGE_SIZE, filteredRecords.length), total: filteredRecords.length })
            }
          />
        </section>

        <section className="admin-panel admin-videos-detail">
          {!selected ? (
            <>
              <p className="admin-videos-detail-empty-title">{t('admin.videos.shared.detail.emptyTitle')}</p>
              <p className="admin-videos-detail-empty-description">{t('admin.videos.shared.detail.emptyDescription')}</p>
            </>
          ) : (
            <>
              <div className="admin-videos-detail-header">
                <span className="admin-videos-detail-eyebrow">{t('admin.videos.uploadHistory.detail.title')}</span>
                <StatusBadge variant={UPLOAD_HISTORY_STATUS_VARIANT[selected.status]}>{t(`admin.videos.uploadHistory.status.${selected.status}`)}</StatusBadge>
              </div>
              <h2 className="admin-videos-detail-title">{selected.filename}</h2>
              <p className="admin-videos-detail-subtitle">{selected.relatedLabel}</p>

              <dl className="admin-videos-detail-grid">
                <div>
                  <dt>{t('admin.videos.uploadHistory.table.dateTime')}</dt>
                  <dd>{DATE_FORMATTER.format(parseApiDateTime(selected.uploadedAt))}</dd>
                </div>
                <div>
                  <dt>{t('admin.videos.uploadHistory.table.uploadedBy')}</dt>
                  <dd>{selected.uploadedBy}</dd>
                </div>
                <div>
                  <dt>{t('admin.videos.uploadHistory.table.game')}</dt>
                  <dd>{selected.game === 'roulette' ? t('admin.videos.shared.uploadModal.gameRoulette') : t('admin.videos.shared.uploadModal.gameQuickMoney')}</dd>
                </div>
                <div>
                  <dt>{t('admin.videos.uploadHistory.table.fileSize')}</dt>
                  <dd>{selected.fileSizeMb} MB</dd>
                </div>
                <div>
                  <dt>{t('admin.videos.roulette.table.validation')}</dt>
                  <dd>{t(`admin.videos.shared.validation.${selected.validation}`)}</dd>
                </div>
                <div>
                  <dt>{t('admin.videos.shared.detail.checksum')}</dt>
                  <dd>{selected.checksum ?? '—'}</dd>
                </div>
                <div>
                  <dt>{t('admin.videos.uploadHistory.table.replacement')}</dt>
                  <dd>{selected.isReplacement ? t('admin.videos.shared.yes') : t('admin.videos.shared.no')}</dd>
                </div>
              </dl>

              <div className="admin-videos-detail-actions">
                <button type="button" className="admin-videos-btn admin-videos-btn--ghost" onClick={() => setLogRecord(selected)}>
                  {t('admin.videos.shared.actions.viewValidationLog')}
                </button>
                <button type="button" className="admin-videos-btn admin-videos-btn--ghost" onClick={() => onOpenRelated(selected.game, selected.relatedId)}>
                  <LinkIcon />
                  {t('admin.videos.uploadHistory.actions.openRelated')}
                </button>
              </div>
            </>
          )}
        </section>
      </div>

      {logRecord && (
        <AdminLogModal
          title={t('admin.videos.shared.validationLog.title')}
          subtitle={`${logRecord.filename} · ${logRecord.relatedLabel}`}
          entries={logRecord.validationLog}
          onClose={() => setLogRecord(null)}
        />
      )}
    </div>
  )
}
