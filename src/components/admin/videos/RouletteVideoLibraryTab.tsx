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
import { ROULETTE_STATUS_VARIANT, ROULETTE_VALIDATION_VARIANT, ROULETTE_VIDEO_SUMMARY } from '../../../data/adminVideosMockData'
import { getRouletteColor } from '../../../utils/rouletteColors'
import type { AdminStatCardData } from '../../../types/adminDashboard'
import type { RouletteVideoAsset } from '../../../types/adminVideos'
import { RefreshIcon, ReplaceIcon, SearchIcon, UploadCloudIcon } from './icons'
import './adminVideosShared.css'

const PAGE_SIZE = 10
const VERIFIED_FORMATTER = new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })
// Único archivo real de la library en local-media (ver adminVideosMockData.ts) -- se reutiliza
// para previsualizar CUALQUIER fila Available, ya que no hay un backend que sirva el resto.
const SAMPLE_VIDEO_URL = buildMediaUrl('Videos/12/12_0.webm')
const HAS_REAL_SAMPLE = (asset: RouletteVideoAsset) => asset.resultNumber === '12' && asset.variant === 'A'

// Mismo clasificador que usa el resto del proyecto (getRouletteColor, ver utils/rouletteColors.ts)
// -- no se reinterpreta qué número es rojo/negro/verde acá. resultNumber llega como string ('00'
// incluido) porque así vive en el modelo de la library, se convierte a WheelPocket recién acá.
function resultNumberColor(resultNumber: string) {
  return getRouletteColor(resultNumber === '00' ? '00' : Number(resultNumber))
}

type LastVerifiedFilter = 'any' | 'today' | 'last7Days' | 'last30Days'

interface RouletteVideoLibraryTabProps {
  onOpenUpload: (targetId?: string) => void
  // Preselección al llegar desde Upload History > Open Related Video (ver VideoManagementPage.tsx)
  // -- este tab solo está montado mientras está activo, así que un valor inicial alcanza, no hace
  // falta sincronizarlo después.
  initialSelectedId?: string | null
}

export function RouletteVideoLibraryTab({ onOpenUpload, initialSelectedId }: RouletteVideoLibraryTabProps) {
  const { t } = useTranslation()
  const assets = useAdminVideosStore((s) => s.rouletteAssets)
  const rescanRouletteLibrary = useAdminVideosStore((s) => s.rescanRouletteLibrary)

  const [search, setSearch] = useState('')
  const [numberFilter, setNumberFilter] = useState('all')
  const [variantFilter, setVariantFilter] = useState('all')
  const [statusFilter, setStatusFilter] = useState('all')
  const [validationFilter, setValidationFilter] = useState('all')
  const [lastVerifiedFilter, setLastVerifiedFilter] = useState<LastVerifiedFilter>('any')
  const [page, setPage] = useState(1)
  const [selectedId, setSelectedId] = useState<string | null>(initialSelectedId ?? assets[0]?.id ?? null)
  const [logAsset, setLogAsset] = useState<RouletteVideoAsset | null>(null)

  const numberOptions: AdminSelectOption<string>[] = useMemo(
    () => [{ value: 'all', label: t('admin.videos.roulette.filters.allNumbers') }, ...Array.from(new Set(assets.map((a) => a.resultNumber))).map((n) => ({ value: n, label: `#${n}` }))],
    [assets, t],
  )
  const variantOptions: AdminSelectOption<string>[] = useMemo(
    () => [{ value: 'all', label: t('admin.videos.roulette.filters.allVariants') }, ...Array.from(new Set(assets.map((a) => a.variant))).map((v) => ({ value: v, label: v }))],
    [assets, t],
  )
  const statusOptions: AdminSelectOption<string>[] = [
    { value: 'all', label: t('admin.videos.roulette.filters.allStatuses') },
    { value: 'available', label: t('admin.videos.roulette.status.available') },
    { value: 'missing', label: t('admin.videos.roulette.status.missing') },
    { value: 'invalid', label: t('admin.videos.roulette.status.invalid') },
    { value: 'pendingScan', label: t('admin.videos.roulette.status.pendingScan') },
  ]
  const validationOptions: AdminSelectOption<string>[] = [
    { value: 'all', label: t('admin.videos.roulette.filters.allValidations') },
    { value: 'passed', label: t('admin.videos.shared.validation.passed') },
    { value: 'failed', label: t('admin.videos.shared.validation.failed') },
    { value: 'pending', label: t('admin.videos.shared.validation.pending') },
    { value: 'notApplicable', label: t('admin.videos.shared.validation.notApplicable') },
  ]
  const lastVerifiedOptions: AdminSelectOption<LastVerifiedFilter>[] = [
    { value: 'any', label: t('admin.videos.shared.dateRange.any') },
    { value: 'today', label: t('admin.videos.shared.dateRange.today') },
    { value: 'last7Days', label: t('admin.videos.shared.dateRange.last7Days') },
    { value: 'last30Days', label: t('admin.videos.shared.dateRange.last30Days') },
  ]

  const filteredAssets = useMemo(() => {
    const query = search.trim().toLowerCase()
    const cutoffMs = lastVerifiedFilter === 'today' ? 24 : lastVerifiedFilter === 'last7Days' ? 24 * 7 : lastVerifiedFilter === 'last30Days' ? 24 * 30 : null
    return assets.filter((a) => {
      if (numberFilter !== 'all' && a.resultNumber !== numberFilter) return false
      if (variantFilter !== 'all' && a.variant !== variantFilter) return false
      if (statusFilter !== 'all' && a.status !== statusFilter) return false
      if (validationFilter !== 'all' && a.validation !== validationFilter) return false
      if (cutoffMs !== null && Date.now() - parseApiDateTime(a.lastVerifiedAt).getTime() > cutoffMs * 60 * 60 * 1000) return false
      if (query && !`#${a.resultNumber}`.includes(query) && !(a.filename ?? '').toLowerCase().includes(query)) return false
      return true
    })
  }, [assets, search, numberFilter, variantFilter, statusFilter, validationFilter, lastVerifiedFilter])

  useEffect(() => setPage(1), [search, numberFilter, variantFilter, statusFilter, validationFilter, lastVerifiedFilter])

  const totalPages = Math.max(1, Math.ceil(filteredAssets.length / PAGE_SIZE))
  const currentPage = Math.min(page, totalPages)
  const pageStart = (currentPage - 1) * PAGE_SIZE
  const pageAssets = filteredAssets.slice(pageStart, pageStart + PAGE_SIZE)

  const selected = assets.find((a) => a.id === selectedId) ?? null

  // Derivado de `assets` (el store vivo), NO del ROULETTE_VIDEO_SUMMARY precalculado del mock --
  // ese queda congelado en su snapshot inicial, así que subir/reemplazar un video nunca movería
  // estas cards si se leyeran de ahí (ver useAdminVideosStore.ts: mismo criterio que expectedAssets
  // en adminVideosMockData.ts, pero recalculado en cada render en vez de una sola vez al cargar).
  const summary = useMemo(() => {
    const expectedAssets = assets.length
    const missing = assets.filter((a) => a.status === 'missing').length
    const invalid = assets.filter((a) => a.status === 'invalid').length
    const available = expectedAssets - missing - invalid
    const storageUsedGb = Math.round((assets.reduce((sum, a) => sum + (a.fileSizeMb ?? 0), 0) / 1024) * 10) / 10
    return { expectedAssets, available, missing, invalid, storageUsedGb, storageTotalGb: ROULETTE_VIDEO_SUMMARY.storageTotalGb }
  }, [assets])

  const summaryCards: AdminStatCardData[] = [
    { id: 'expected', titleKey: 'admin.videos.roulette.summary.expected', value: String(summary.expectedAssets), icon: buildMediaUrl('Website_svg_icons/33_calendar_white.svg'), accent: 'blue' },
    {
      id: 'available',
      titleKey: 'admin.videos.roulette.summary.available',
      value: String(summary.available),
      icon: buildMediaUrl('Website_svg_icons/22_shield_check_gold_thinner.svg'),
      accent: 'green',
    },
    { id: 'missing', titleKey: 'admin.videos.roulette.summary.missing', value: String(summary.missing), icon: buildMediaUrl('Website_svg_icons/40_warning_amber.svg'), accent: 'red' },
    { id: 'invalid', titleKey: 'admin.videos.roulette.summary.invalid', value: String(summary.invalid), icon: buildMediaUrl('Website_svg_icons/40_warning_amber.svg'), accent: 'red' },
    {
      id: 'storage',
      titleKey: 'admin.videos.roulette.summary.storage',
      value: `${summary.storageUsedGb} / ${summary.storageTotalGb} GB`,
      icon: buildMediaUrl('Website_svg_icons/42_database.svg'),
      accent: 'purple',
    },
  ]

  function actionsFor(asset: RouletteVideoAsset): AdminRowAction[] {
    if (asset.status === 'missing') {
      return [{ key: 'upload', label: t('admin.videos.shared.actions.uploadFile'), icon: <UploadCloudIcon />, onSelect: () => onOpenUpload(asset.id) }]
    }
    if (asset.status === 'invalid') {
      return [
        { key: 'replace', label: t('admin.videos.shared.actions.replaceFile'), icon: <ReplaceIcon />, onSelect: () => onOpenUpload(asset.id) },
        { key: 'log', label: t('admin.videos.shared.actions.viewValidationLog'), onSelect: () => setLogAsset(asset) },
      ]
    }
    if (asset.status === 'pendingScan') {
      return [{ key: 'rescan', label: t('admin.videos.shared.actions.retryValidation'), icon: <RefreshIcon />, onSelect: rescanRouletteLibrary }]
    }
    return [
      { key: 'replace', label: t('admin.videos.shared.actions.replaceFile'), icon: <ReplaceIcon />, onSelect: () => onOpenUpload(asset.id) },
      { key: 'log', label: t('admin.videos.shared.actions.viewValidationLog'), onSelect: () => setLogAsset(asset) },
    ]
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
            placeholder={t('admin.videos.roulette.filters.searchPlaceholder')}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            aria-label={t('admin.videos.roulette.filters.searchPlaceholder')}
          />
        </div>
        <AdminSelect label={t('admin.videos.roulette.filters.number')} value={numberFilter} options={numberOptions} onChange={setNumberFilter} />
        <AdminSelect label={t('admin.videos.roulette.filters.variant')} value={variantFilter} options={variantOptions} onChange={setVariantFilter} />
        <AdminSelect label={t('admin.videos.roulette.filters.status')} value={statusFilter} options={statusOptions} onChange={setStatusFilter} />
        <AdminSelect label={t('admin.videos.roulette.filters.validation')} value={validationFilter} options={validationOptions} onChange={setValidationFilter} />
        <AdminSelect label={t('admin.videos.roulette.filters.lastVerified')} value={lastVerifiedFilter} options={lastVerifiedOptions} onChange={setLastVerifiedFilter} />
        <button
          type="button"
          className="admin-videos-btn admin-videos-btn--ghost admin-videos-clear-btn"
          onClick={() => {
            setSearch('')
            setNumberFilter('all')
            setVariantFilter('all')
            setStatusFilter('all')
            setValidationFilter('all')
            setLastVerifiedFilter('any')
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
                  <th>{t('admin.videos.roulette.table.resultNumber')}</th>
                  <th>{t('admin.videos.roulette.table.variant')}</th>
                  <th>{t('admin.videos.roulette.table.filename')}</th>
                  <th>{t('admin.videos.roulette.table.status')}</th>
                  <th>{t('admin.videos.roulette.table.validation')}</th>
                  <th>{t('admin.videos.roulette.table.fileSize')}</th>
                  <th>{t('admin.videos.roulette.table.duration')}</th>
                  <th>{t('admin.videos.roulette.table.resolution')}</th>
                  <th>{t('admin.videos.roulette.table.lastVerified')}</th>
                  <th>{t('admin.videos.roulette.table.actions')}</th>
                </tr>
              </thead>
              <tbody>
                {pageAssets.map((asset) => (
                  <tr
                    key={asset.id}
                    data-selected={asset.id === selectedId}
                    tabIndex={0}
                    aria-selected={asset.id === selectedId}
                    onClick={() => setSelectedId(asset.id)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault()
                        setSelectedId(asset.id)
                      }
                    }}
                  >
                    <td className="admin-videos-cell-number" data-color={resultNumberColor(asset.resultNumber)}>
                      {asset.resultNumber}
                    </td>
                    <td>{asset.variant}</td>
                    <td className="admin-videos-cell-secondary">{asset.filename ?? t('admin.videos.shared.notApplicable')}</td>
                    <td>
                      <StatusBadge variant={ROULETTE_STATUS_VARIANT[asset.status]}>{t(`admin.videos.roulette.status.${asset.status}`)}</StatusBadge>
                    </td>
                    <td>
                      <StatusBadge variant={ROULETTE_VALIDATION_VARIANT[asset.validation]}>{t(`admin.videos.shared.validation.${asset.validation}`)}</StatusBadge>
                    </td>
                    <td className="admin-videos-cell-secondary">{asset.fileSizeMb ? `${asset.fileSizeMb} MB` : '—'}</td>
                    <td className="admin-videos-cell-secondary">{asset.durationSeconds ? `00:${String(asset.durationSeconds).padStart(2, '0')}` : '—'}</td>
                    <td className="admin-videos-cell-secondary">{asset.resolution ?? '—'}</td>
                    <td className="admin-videos-cell-secondary">{VERIFIED_FORMATTER.format(parseApiDateTime(asset.lastVerifiedAt))}</td>
                    <td>
                      <AdminRowActionsMenu actions={actionsFor(asset)} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {filteredAssets.length === 0 && <p className="admin-videos-empty">{t('admin.videos.roulette.table.empty')}</p>}
          </div>

          <AdminTablePagination
            page={currentPage}
            totalPages={totalPages}
            onPageChange={setPage}
            rangeLabel={
              filteredAssets.length === 0
                ? t('admin.videos.roulette.table.showingCount', { from: 0, to: 0, total: 0 })
                : t('admin.videos.roulette.table.showingCount', { from: pageStart + 1, to: Math.min(pageStart + PAGE_SIZE, filteredAssets.length), total: filteredAssets.length })
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
                <span className="admin-videos-detail-eyebrow">{t('admin.videos.roulette.detail.selectedAsset')}</span>
                <StatusBadge variant={ROULETTE_STATUS_VARIANT[selected.status]}>{t(`admin.videos.roulette.status.${selected.status}`)}</StatusBadge>
              </div>
              <h2 className="admin-videos-detail-title">{selected.filename ?? t('admin.videos.roulette.detail.noFile')}</h2>
              <p className="admin-videos-detail-subtitle">
                #{selected.resultNumber} · {t('admin.videos.roulette.table.variant')} {selected.variant}
              </p>

              {selected.status !== 'missing' && (
                <div className="admin-videos-detail-preview">
                  {HAS_REAL_SAMPLE(selected) ? (
                    <video controls preload="metadata" src={SAMPLE_VIDEO_URL} className="admin-videos-detail-video" />
                  ) : (
                    <p className="admin-videos-detail-preview-fallback">{t('admin.videos.shared.previewUnavailable')}</p>
                  )}
                </div>
              )}

              <dl className="admin-videos-detail-grid">
                <div>
                  <dt>{t('admin.videos.roulette.table.validation')}</dt>
                  <dd>{t(`admin.videos.shared.validation.${selected.validation}`)}</dd>
                </div>
                <div>
                  <dt>{t('admin.videos.roulette.table.fileSize')}</dt>
                  <dd>{selected.fileSizeMb ? `${selected.fileSizeMb} MB` : '—'}</dd>
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
                  <dt>{t('admin.videos.shared.detail.codec')}</dt>
                  <dd>{selected.codec ?? '—'}</dd>
                </div>
                <div>
                  <dt>{t('admin.videos.roulette.table.lastVerified')}</dt>
                  <dd>{VERIFIED_FORMATTER.format(parseApiDateTime(selected.lastVerifiedAt))}</dd>
                </div>
              </dl>

              <div className="admin-videos-detail-actions">
                {selected.status === 'missing' ? (
                  <button type="button" className="admin-videos-btn admin-videos-btn--primary" onClick={() => onOpenUpload(selected.id)}>
                    <UploadCloudIcon />
                    {t('admin.videos.shared.actions.uploadFile')}
                  </button>
                ) : (
                  <button type="button" className="admin-videos-btn admin-videos-btn--ghost" onClick={() => onOpenUpload(selected.id)}>
                    <ReplaceIcon />
                    {t('admin.videos.shared.actions.replaceFile')}
                  </button>
                )}
                {selected.status !== 'missing' && (
                  <button type="button" className="admin-videos-btn admin-videos-btn--ghost" onClick={() => setLogAsset(selected)}>
                    {t('admin.videos.shared.actions.viewValidationLog')}
                  </button>
                )}
              </div>
            </>
          )}
        </section>
      </div>

      {logAsset && (
        <AdminLogModal
          title={t('admin.videos.shared.validationLog.title')}
          subtitle={`#${logAsset.resultNumber} · ${t('admin.videos.roulette.table.variant')} ${logAsset.variant}`}
          entries={logAsset.validationLog}
          onClose={() => setLogAsset(null)}
        />
      )}
    </div>
  )
}
