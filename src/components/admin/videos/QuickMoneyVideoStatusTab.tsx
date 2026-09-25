import { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { AdminStatCard } from '../AdminStatCard'
import { AdminSelect, type AdminSelectOption } from '../AdminSelect'
import { AdminTablePagination } from '../AdminTablePagination'
import { AdminRowActionsMenu, type AdminRowAction } from '../AdminRowActionsMenu'
import { AdminLogModal } from '../AdminLogModal'
import { StatusBadge } from '../StatusBadge'
import { useAdminVideosStore } from '../../../store/useAdminVideosStore'
import { buildMediaUrl } from '../../../utils/media'
import { parseApiDateTime } from '../../../utils/time'
import {
  QUICK_MONEY_CONTINGENCY_VARIANT,
  QUICK_MONEY_DELIVERY_VARIANT,
  QUICK_MONEY_VALIDATION_VARIANT,
  QUICK_MONEY_VIDEO_SUMMARY,
} from '../../../data/adminVideosMockData'
import type { AdminStatCardData } from '../../../types/adminDashboard'
import type { QuickMoneyDrawVideo } from '../../../types/adminVideos'
import { ReplaceIcon, SearchIcon, UploadCloudIcon } from './icons'
import './adminVideosShared.css'

const PAGE_SIZE = 10
const DATE_FORMATTER = new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })
// Mismo aviso que Roulette: ningún draw de Quick Money tiene un video real en local-media, la
// preview reutiliza el único archivo real del proyecto para cualquier fila Received.
const SAMPLE_VIDEO_URL = buildMediaUrl('Videos/12/12_0.webm')

type DrawTypeFilter = 'all' | 'pick3' | 'pick4'

interface QuickMoneyVideoStatusTabProps {
  onOpenUpload: (targetId?: string) => void
  initialSelectedId?: string | null
}

export function QuickMoneyVideoStatusTab({ onOpenUpload, initialSelectedId }: QuickMoneyVideoStatusTabProps) {
  const { t } = useTranslation()
  const rows = useAdminVideosStore((s) => s.quickMoneyRows)

  const [search, setSearch] = useState('')
  const [drawTypeFilter, setDrawTypeFilter] = useState<DrawTypeFilter>('all')
  const [deliveryFilter, setDeliveryFilter] = useState('all')
  const [validationFilter, setValidationFilter] = useState('all')
  const [page, setPage] = useState(1)
  const [selectedId, setSelectedId] = useState<string | null>(initialSelectedId ?? rows[0]?.id ?? null)
  const [logRow, setLogRow] = useState<QuickMoneyDrawVideo | null>(null)

  const drawTypeOptions: AdminSelectOption<DrawTypeFilter>[] = [
    { value: 'all', label: t('admin.videos.quickMoney.filters.allTypes') },
    { value: 'pick3', label: t('admin.videos.quickMoney.filters.pick3') },
    { value: 'pick4', label: t('admin.videos.quickMoney.filters.pick4') },
  ]
  const deliveryOptions: AdminSelectOption<string>[] = [
    { value: 'all', label: t('admin.videos.quickMoney.filters.allStatuses') },
    { value: 'received', label: t('admin.videos.quickMoney.delivery.received') },
    { value: 'pending', label: t('admin.videos.quickMoney.delivery.pending') },
    { value: 'late', label: t('admin.videos.quickMoney.delivery.late') },
    { value: 'missing', label: t('admin.videos.quickMoney.delivery.missing') },
  ]
  const validationOptions: AdminSelectOption<string>[] = [
    { value: 'all', label: t('admin.videos.quickMoney.filters.allValidations') },
    { value: 'ready', label: t('admin.videos.quickMoney.validation.ready') },
    { value: 'pending', label: t('admin.videos.quickMoney.validation.pending') },
    { value: 'failed', label: t('admin.videos.quickMoney.validation.failed') },
    { value: 'notApplicable', label: t('admin.videos.quickMoney.validation.notApplicable') },
  ]

  const filteredRows = useMemo(() => {
    const query = search.trim().toLowerCase()
    return rows.filter((r) => {
      if (drawTypeFilter !== 'all' && r.drawType !== drawTypeFilter) return false
      if (deliveryFilter !== 'all' && r.deliveryStatus !== deliveryFilter) return false
      if (validationFilter !== 'all' && r.validationStatus !== validationFilter) return false
      if (query && !r.drawNumber.includes(query) && !(r.filename ?? '').toLowerCase().includes(query)) return false
      return true
    })
  }, [rows, search, drawTypeFilter, deliveryFilter, validationFilter])

  useEffect(() => setPage(1), [search, drawTypeFilter, deliveryFilter, validationFilter])

  const totalPages = Math.max(1, Math.ceil(filteredRows.length / PAGE_SIZE))
  const currentPage = Math.min(page, totalPages)
  const pageStart = (currentPage - 1) * PAGE_SIZE
  const pageRows = filteredRows.slice(pageStart, pageStart + PAGE_SIZE)

  const selected = rows.find((r) => r.id === selectedId) ?? null

  // Igual que RouletteVideoLibraryTab.tsx: derivado de `rows` (store vivo), no del
  // QUICK_MONEY_VIDEO_SUMMARY precalculado del mock, que quedaría congelado tras un Upload/Refresh.
  const summary = useMemo(() => {
    const expectedPick3 = rows.filter((r) => r.drawType === 'pick3').length
    const expectedPick4 = rows.filter((r) => r.drawType === 'pick4').length
    const received = rows.filter((r) => r.deliveryStatus === 'received').length
    const pendingValidation = rows.filter((r) => r.validationStatus === 'pending' || r.deliveryStatus === 'pending').length
    const lateOrMissing = rows.filter((r) => r.deliveryStatus === 'late' || r.deliveryStatus === 'missing').length
    const storageUsedGb = Math.round((rows.reduce((sum, r) => sum + (r.fileSizeMb ?? 0), 0) / 1024) * 10) / 10
    return { expectedToday: expectedPick3 + expectedPick4, received, pendingValidation, lateOrMissing, storageUsedGb, storageTotalGb: QUICK_MONEY_VIDEO_SUMMARY.storageTotalGb }
  }, [rows])

  const summaryCards: AdminStatCardData[] = [
    {
      id: 'expectedToday',
      titleKey: 'admin.videos.quickMoney.summary.expectedToday',
      value: String(summary.expectedToday),
      icon: buildMediaUrl('Website_svg_icons/33_calendar_white.svg'),
      accent: 'blue',
    },
    { id: 'received', titleKey: 'admin.videos.quickMoney.summary.received', value: String(summary.received), icon: buildMediaUrl('Website_svg_icons/22_shield_check_gold_thinner.svg'), accent: 'green' },
    {
      id: 'pendingValidation',
      titleKey: 'admin.videos.quickMoney.summary.pendingValidation',
      value: String(summary.pendingValidation),
      icon: buildMediaUrl('Website_svg_icons/01_refresh_clock_white.svg'),
      accent: 'purple',
    },
    { id: 'lateOrMissing', titleKey: 'admin.videos.quickMoney.summary.lateOrMissing', value: String(summary.lateOrMissing), icon: buildMediaUrl('Website_svg_icons/40_warning_amber.svg'), accent: 'red' },
    {
      id: 'storage',
      titleKey: 'admin.videos.quickMoney.summary.storage',
      value: `${summary.storageUsedGb} / ${summary.storageTotalGb} GB`,
      icon: buildMediaUrl('Website_svg_icons/42_database.svg'),
      accent: 'purple',
    },
  ]

  function actionsFor(row: QuickMoneyDrawVideo): AdminRowAction[] {
    if (row.deliveryStatus === 'missing' || row.deliveryStatus === 'late') {
      return [{ key: 'upload', label: t('admin.videos.shared.actions.uploadVideo'), icon: <UploadCloudIcon />, onSelect: () => onOpenUpload(row.id) }]
    }
    if (row.validationStatus === 'failed') {
      return [
        { key: 'replace', label: t('admin.videos.shared.actions.replaceFile'), icon: <ReplaceIcon />, onSelect: () => onOpenUpload(row.id) },
        { key: 'log', label: t('admin.videos.shared.actions.viewValidationLog'), onSelect: () => setLogRow(row) },
      ]
    }
    if (row.deliveryStatus === 'received') {
      return [
        { key: 'replace', label: t('admin.videos.shared.actions.replaceFile'), icon: <ReplaceIcon />, onSelect: () => onOpenUpload(row.id) },
        { key: 'log', label: t('admin.videos.shared.actions.viewValidationLog'), onSelect: () => setLogRow(row) },
      ]
    }
    // Pending (todavía no llegó y no venció) -- nada que hacer todavía, ver criterios: "No
    // inventes acciones que el sistema actualmente no soporte."
    return []
  }

  return (
    <div className="admin-videos-tab-content">
      <div className="admin-videos-summary-grid">
        {summaryCards.map((card) => (
          <AdminStatCard key={card.id} data={card} />
        ))}
      </div>

      <section className="admin-panel admin-videos-filters">
        <div className="admin-videos-search">
          <SearchIcon />
          <input
            type="text"
            className="admin-videos-search-input"
            placeholder={t('admin.videos.quickMoney.filters.searchPlaceholder')}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            aria-label={t('admin.videos.quickMoney.filters.searchPlaceholder')}
          />
        </div>
        <AdminSelect label={t('admin.videos.quickMoney.filters.drawType')} value={drawTypeFilter} options={drawTypeOptions} onChange={setDrawTypeFilter} />
        <AdminSelect label={t('admin.videos.quickMoney.filters.eventStatus')} value={deliveryFilter} options={deliveryOptions} onChange={setDeliveryFilter} />
        <AdminSelect label={t('admin.videos.quickMoney.filters.validationStatus')} value={validationFilter} options={validationOptions} onChange={setValidationFilter} />
        <button
          type="button"
          className="admin-videos-btn admin-videos-btn--ghost admin-videos-clear-btn"
          onClick={() => {
            setSearch('')
            setDrawTypeFilter('all')
            setDeliveryFilter('all')
            setValidationFilter('all')
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
                  <th>{t('admin.videos.quickMoney.table.drawType')}</th>
                  <th>{t('admin.videos.quickMoney.table.drawNumber')}</th>
                  <th>{t('admin.videos.quickMoney.table.scheduledTime')}</th>
                  <th>{t('admin.videos.quickMoney.table.videoFile')}</th>
                  <th>{t('admin.videos.quickMoney.table.deliveryStatus')}</th>
                  <th>{t('admin.videos.quickMoney.table.validation')}</th>
                  <th>{t('admin.videos.quickMoney.table.receivedAt')}</th>
                  <th>{t('admin.videos.quickMoney.table.deadline')}</th>
                  <th>{t('admin.videos.quickMoney.table.contingency')}</th>
                  <th>{t('admin.videos.quickMoney.table.actions')}</th>
                </tr>
              </thead>
              <tbody>
                {pageRows.map((row) => (
                  <tr
                    key={row.id}
                    data-selected={row.id === selectedId}
                    tabIndex={0}
                    aria-selected={row.id === selectedId}
                    onClick={() => setSelectedId(row.id)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault()
                        setSelectedId(row.id)
                      }
                    }}
                  >
                    <td>{row.drawType === 'pick3' ? t('admin.videos.quickMoney.filters.pick3') : t('admin.videos.quickMoney.filters.pick4')}</td>
                    <td className="admin-videos-cell-number">#{row.drawNumber}</td>
                    <td className="admin-videos-cell-secondary">{DATE_FORMATTER.format(parseApiDateTime(row.scheduledTime))}</td>
                    <td className="admin-videos-cell-secondary">{row.filename ?? t('admin.videos.shared.notApplicable')}</td>
                    <td>
                      <StatusBadge variant={QUICK_MONEY_DELIVERY_VARIANT[row.deliveryStatus]}>{t(`admin.videos.quickMoney.delivery.${row.deliveryStatus}`)}</StatusBadge>
                    </td>
                    <td>
                      <StatusBadge variant={QUICK_MONEY_VALIDATION_VARIANT[row.validationStatus]}>{t(`admin.videos.quickMoney.validation.${row.validationStatus}`)}</StatusBadge>
                    </td>
                    <td className="admin-videos-cell-secondary">{row.receivedAt ? DATE_FORMATTER.format(parseApiDateTime(row.receivedAt)) : '—'}</td>
                    <td className="admin-videos-cell-secondary">{DATE_FORMATTER.format(parseApiDateTime(row.deadline))}</td>
                    <td>
                      <StatusBadge variant={QUICK_MONEY_CONTINGENCY_VARIANT[row.contingencyStatus]}>{t(`admin.videos.quickMoney.contingency.${row.contingencyStatus}`)}</StatusBadge>
                    </td>
                    <td>
                      <AdminRowActionsMenu actions={actionsFor(row)} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {filteredRows.length === 0 && <p className="admin-videos-empty">{t('admin.videos.quickMoney.table.empty')}</p>}
          </div>

          <AdminTablePagination
            page={currentPage}
            totalPages={totalPages}
            onPageChange={setPage}
            rangeLabel={
              filteredRows.length === 0
                ? t('admin.videos.quickMoney.table.showingCount', { from: 0, to: 0, total: 0 })
                : t('admin.videos.quickMoney.table.showingCount', { from: pageStart + 1, to: Math.min(pageStart + PAGE_SIZE, filteredRows.length), total: filteredRows.length })
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
                <span className="admin-videos-detail-eyebrow">{t('admin.videos.quickMoney.detail.selectedDraw')}</span>
                <StatusBadge variant={QUICK_MONEY_DELIVERY_VARIANT[selected.deliveryStatus]}>{t(`admin.videos.quickMoney.delivery.${selected.deliveryStatus}`)}</StatusBadge>
              </div>
              <h2 className="admin-videos-detail-title">{selected.filename ?? t('admin.videos.quickMoney.detail.noFile')}</h2>
              <p className="admin-videos-detail-subtitle">
                {selected.drawType === 'pick3' ? t('admin.videos.quickMoney.filters.pick3') : t('admin.videos.quickMoney.filters.pick4')} · #{selected.drawNumber}
              </p>

              {selected.deliveryStatus === 'received' && (
                <div className="admin-videos-detail-preview">
                  <video controls preload="metadata" src={SAMPLE_VIDEO_URL} className="admin-videos-detail-video" />
                </div>
              )}

              <dl className="admin-videos-detail-grid">
                <div>
                  <dt>{t('admin.videos.quickMoney.table.scheduledTime')}</dt>
                  <dd>{DATE_FORMATTER.format(parseApiDateTime(selected.scheduledTime))}</dd>
                </div>
                <div>
                  <dt>{t('admin.videos.roulette.table.duration')}</dt>
                  <dd>{selected.durationSeconds ? `00:${String(selected.durationSeconds).padStart(2, '0')}` : '—'}</dd>
                </div>
                <div>
                  <dt>{t('admin.videos.roulette.table.resolution')}</dt>
                  <dd>{selected.resolution ?? '—'}</dd>
                </div>
                <div>
                  <dt>{t('admin.videos.quickMoney.table.validation')}</dt>
                  <dd>{t(`admin.videos.quickMoney.validation.${selected.validationStatus}`)}</dd>
                </div>
                <div>
                  <dt>{t('admin.videos.quickMoney.table.receivedAt')}</dt>
                  <dd>{selected.receivedAt ? DATE_FORMATTER.format(parseApiDateTime(selected.receivedAt)) : '—'}</dd>
                </div>
                <div>
                  <dt>{t('admin.videos.quickMoney.table.deadline')}</dt>
                  <dd>{DATE_FORMATTER.format(parseApiDateTime(selected.deadline))}</dd>
                </div>
                <div>
                  <dt>{t('admin.videos.quickMoney.table.contingency')}</dt>
                  <dd>{t(`admin.videos.quickMoney.contingency.${selected.contingencyStatus}`)}</dd>
                </div>
                <div>
                  <dt>{t('admin.videos.roulette.table.fileSize')}</dt>
                  <dd>{selected.fileSizeMb ? `${selected.fileSizeMb} MB` : '—'}</dd>
                </div>
                <div>
                  <dt>{t('admin.videos.shared.detail.codecFormat')}</dt>
                  <dd>{selected.codec ?? '—'}</dd>
                </div>
                <div>
                  <dt>{t('admin.videos.shared.detail.checksum')}</dt>
                  <dd>{selected.checksum ?? '—'}</dd>
                </div>
              </dl>

              <div className="admin-videos-detail-actions">
                {selected.deliveryStatus === 'missing' || selected.deliveryStatus === 'late' ? (
                  <button type="button" className="admin-videos-btn admin-videos-btn--primary" onClick={() => onOpenUpload(selected.id)}>
                    <UploadCloudIcon />
                    {t('admin.videos.shared.actions.uploadVideo')}
                  </button>
                ) : selected.deliveryStatus === 'received' ? (
                  <>
                    <button type="button" className="admin-videos-btn admin-videos-btn--ghost" onClick={() => onOpenUpload(selected.id)}>
                      <ReplaceIcon />
                      {t('admin.videos.shared.actions.replaceFile')}
                    </button>
                    <button type="button" className="admin-videos-btn admin-videos-btn--ghost" onClick={() => setLogRow(selected)}>
                      {t('admin.videos.shared.actions.viewValidationLog')}
                    </button>
                  </>
                ) : null}
              </div>
            </>
          )}
        </section>
      </div>

      {logRow && (
        <AdminLogModal
          title={t('admin.videos.shared.validationLog.title')}
          subtitle={`${logRow.drawType === 'pick3' ? 'Pick 3' : 'Pick 4'} · #${logRow.drawNumber}`}
          entries={logRow.validationLog}
          onClose={() => setLogRow(null)}
        />
      )}
    </div>
  )
}
