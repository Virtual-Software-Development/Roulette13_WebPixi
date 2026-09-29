import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { StatusBadge } from '../components/admin/StatusBadge'
import { fetchMissingVideoVariants } from '../api/videoLibrary'
import type { MissingVideoVariants } from '../types/videoLibrary'
import '../components/admin/mediaLibraryPage.css'

// Real order (0, 00, 1..36) -- same convention as the root game app's wheel/results ordering
// (src/data/wheelOrder.ts), not the raw key order the API happens to return.
const RESULT_ORDER: string[] = ['0', '00', ...Array.from({ length: 36 }, (_, i) => String(i + 1))]

// GET /video/missing (internal/video/handler.go: "backs the admin 'Video Library' screen's gap
// detection") reports how many MORE variants each result still needs -- it doesn't say how many
// already exist or what the required total is, so this page only shows what it can honestly claim:
// the missing count and whether that result is fully covered (missing === 0).
export function MediaLibraryPage() {
  const { t } = useTranslation()
  const [missing, setMissing] = useState<MissingVideoVariants | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    fetchMissingVideoVariants()
      .then((data) => {
        if (!cancelled) setMissing(data)
      })
      .catch(() => {
        if (!cancelled) setError(t('admin.media.loadError'))
      })
    return () => {
      cancelled = true
    }
  }, [t])

  if (error) {
    return (
      <section className="admin-panel">
        <p>{error}</p>
      </section>
    )
  }

  if (!missing) {
    return (
      <section className="admin-panel">
        <p>{t('admin.media.loading')}</p>
      </section>
    )
  }

  const rows = RESULT_ORDER.filter((key) => key in missing).map((key) => ({ key, missingCount: missing[key] }))
  const incompleteRows = rows.filter((row) => row.missingCount > 0)
  const totalMissing = rows.reduce((sum, row) => sum + row.missingCount, 0)

  return (
    <>
      <div className="admin-main-topbar">
        <div>
          <h1 className="admin-main-title">{t('admin.media.title')}</h1>
          <p className="admin-main-subtitle">{t('admin.media.subtitle')}</p>
        </div>
      </div>

      <section className="admin-panel">
        <div className="admin-media-library-summary">
          <div className="admin-media-library-stat">
            <span className="admin-media-library-stat-value">{rows.length - incompleteRows.length}</span>
            <span className="admin-media-library-stat-label">{t('admin.media.summary.complete', { total: rows.length })}</span>
          </div>
          <div className="admin-media-library-stat">
            <span className="admin-media-library-stat-value">{incompleteRows.length}</span>
            <span className="admin-media-library-stat-label">{t('admin.media.summary.incomplete')}</span>
          </div>
          <div className="admin-media-library-stat">
            <span className="admin-media-library-stat-value">{totalMissing}</span>
            <span className="admin-media-library-stat-label">{t('admin.media.summary.totalMissing')}</span>
          </div>
        </div>
      </section>

      <section className="admin-panel">
        <div className="admin-panel-header">
          <h2 className="admin-panel-title">{t('admin.media.tableTitle')}</h2>
        </div>

        {incompleteRows.length === 0 ? (
          <p className="admin-media-library-empty">{t('admin.media.allComplete')}</p>
        ) : (
          <div className="admin-media-library-table-scroll">
            <table className="admin-media-library-table">
              <thead>
                <tr>
                  <th>{t('admin.media.table.result')}</th>
                  <th>{t('admin.media.table.missing')}</th>
                  <th>{t('admin.media.table.status')}</th>
                </tr>
              </thead>
              <tbody>
                {incompleteRows.map((row) => (
                  <tr key={row.key} data-incomplete="true">
                    <td>{row.key}</td>
                    <td>{row.missingCount}</td>
                    <td>
                      <StatusBadge variant="warning">{t('admin.media.needsMore', { count: row.missingCount })}</StatusBadge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </>
  )
}
