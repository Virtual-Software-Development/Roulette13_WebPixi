import { useTranslation } from 'react-i18next'
import './adminTablePagination.css'

interface AdminTablePaginationProps {
  page: number
  totalPages: number
  onPageChange: (page: number) => void
  rangeLabel: string
}

function ChevronLeftIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path d="M15.5 5 8.5 12l7 7" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function ChevronRightIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path d="M8.5 5 15.5 12l-7 7" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

// Primera, última, actual +/-1, y "…" para los huecos -- sin esto una tabla de 19 páginas (ver
// referencia: "190 assets") renderizaría 19 botones seguidos.
function getPageNumbers(current: number, total: number): (number | 'ellipsis')[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1)
  const pages = new Set([1, total, current - 1, current, current + 1])
  const sorted = [...pages].filter((p) => p >= 1 && p <= total).sort((a, b) => a - b)
  const result: (number | 'ellipsis')[] = []
  sorted.forEach((p, i) => {
    if (i > 0 && p - sorted[i - 1] > 1) result.push('ellipsis')
    result.push(p)
  })
  return result
}

// Genérico -- la paginación de página-numérica+prev/next estaba duplicada byte a byte en
// UserTable/GameEventsList/AllReportsModal (ver investigación previa); acá no se le suma dominio
// (Roulette/Quick Money/History) alguno, solo recibe page/totalPages, así que extraerla no choca
// con "no crear una tabla universal" -- eso aplica a columnas/filas, no a este control de chrome.
export function AdminTablePagination({ page, totalPages, onPageChange, rangeLabel }: AdminTablePaginationProps) {
  const { t } = useTranslation()

  return (
    <div className="admin-table-pagination-footer">
      <p className="admin-table-pagination-count">{rangeLabel}</p>

      {totalPages > 1 && (
        <nav className="admin-table-pagination" aria-label={t('admin.videos.shared.pagination')}>
          <button
            type="button"
            className="admin-table-pagination-btn"
            disabled={page === 1}
            onClick={() => onPageChange(Math.max(1, page - 1))}
            aria-label={t('admin.videos.shared.previousPage')}
          >
            <ChevronLeftIcon />
          </button>
          {getPageNumbers(page, totalPages).map((entry, i) =>
            entry === 'ellipsis' ? (
              <span key={`ellipsis-${i}`} className="admin-table-pagination-ellipsis">
                …
              </span>
            ) : (
              <button
                key={entry}
                type="button"
                className="admin-table-pagination-btn"
                data-active={entry === page}
                aria-current={entry === page ? 'page' : undefined}
                onClick={() => onPageChange(entry)}
              >
                {entry}
              </button>
            ),
          )}
          <button
            type="button"
            className="admin-table-pagination-btn"
            disabled={page === totalPages}
            onClick={() => onPageChange(Math.min(totalPages, page + 1))}
            aria-label={t('admin.videos.shared.nextPage')}
          >
            <ChevronRightIcon />
          </button>
        </nav>
      )}
    </div>
  )
}
