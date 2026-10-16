import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { AdminSelect, type AdminSelectOption } from '../AdminSelect'
import { StatusBadge } from '../StatusBadge'
import { GAME_EVENT_GAME_VARIANT, GAME_EVENT_STATUSES, GAME_EVENT_STATUS_VARIANT, gameEventName } from '../../../data/gameEventBadges'
import { GAME_LABEL_KEY, RTP_GAMES } from '../../../data/rtpGameLabels'
import { parseApiDateTime } from '../../../utils/time'
import { ChevronLeftIcon, ChevronRightIcon, SearchIcon } from './icons'
import type { GameEvent, GameEventGame, GameEventStatus } from '../../../types/adminGameEvents'
import './gameEventsList.css'

export type GameEventStatusFilter = 'all' | GameEventStatus
export type GameEventGameFilter = 'all' | GameEventGame

const DATE_FORMATTER = new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
const TIME_FORMATTER = new Intl.DateTimeFormat('en-US', { hour: 'numeric', minute: '2-digit' })

interface GameEventsListProps {
  events: GameEvent[]
  total: number
  page: number
  pageSize: number
  onPageChange: (page: number) => void
  search: string
  onSearchChange: (value: string) => void
  statusFilter: GameEventStatusFilter
  onStatusFilterChange: (value: GameEventStatusFilter) => void
  gameFilter: GameEventGameFilter
  onGameFilterChange: (value: GameEventGameFilter) => void
  loading: boolean
  // Carga/vacío/error -- reemplaza a las filas.
  notice: { text: string; error?: boolean } | null
  selectedId: string | null
  onSelect: (id: string) => void
}

// Páginas a mostrar: la primera, la última y las vecinas de la actual; null = "…".
function visiblePages(current: number, total: number): (number | null)[] {
  const pages: (number | null)[] = []
  for (let p = 1; p <= total; p++) {
    if (p === 1 || p === total || Math.abs(p - current) <= 1) pages.push(p)
    else if (pages[pages.length - 1] !== null) pages.push(null)
  }
  return pages
}

// Listado izquierdo (master) -- búsqueda, filtros y paginación los resuelve el backend (GET /rounds);
// el estado vive en GameEventsPage, que también es dueña de qué evento está seleccionado.
export function GameEventsList({
  events,
  total,
  page,
  pageSize,
  onPageChange,
  search,
  onSearchChange,
  statusFilter,
  onStatusFilterChange,
  gameFilter,
  onGameFilterChange,
  loading,
  notice,
  selectedId,
  onSelect,
}: GameEventsListProps) {
  const { t } = useTranslation()

  const statusOptions: AdminSelectOption<GameEventStatusFilter>[] = useMemo(
    () => [
      { value: 'all', label: t('admin.gameEvents.filter.allStatuses') },
      ...GAME_EVENT_STATUSES.map((status) => ({ value: status, label: t(`admin.gameEvents.status.${status}`) })),
    ],
    [t],
  )

  const gameOptions: AdminSelectOption<GameEventGameFilter>[] = useMemo(
    () => [{ value: 'all', label: t('admin.gameEvents.filter.allGames') }, ...RTP_GAMES.map((game) => ({ value: game, label: t(GAME_LABEL_KEY[game]) }))],
    [t],
  )

  const totalPages = Math.max(1, Math.ceil(total / pageSize))
  const currentPage = Math.min(page, totalPages)
  const pageStart = (currentPage - 1) * pageSize

  return (
    <section className="admin-panel admin-game-events-list">
      <div className="admin-game-events-list-toolbar">
        <div className="admin-game-events-search">
          <SearchIcon />
          <input
            type="text"
            className="admin-game-events-search-input"
            placeholder={t('admin.gameEvents.search.placeholder')}
            value={search}
            maxLength={30}
            onChange={(e) => onSearchChange(e.target.value)}
            aria-label={t('admin.gameEvents.search.placeholder')}
          />
        </div>
        <AdminSelect value={gameFilter} options={gameOptions} onChange={onGameFilterChange} ariaLabel={t('admin.gameEvents.filter.allGames')} />
        <AdminSelect value={statusFilter} options={statusOptions} onChange={onStatusFilterChange} ariaLabel={t('admin.gameEvents.filter.allStatuses')} />
      </div>

      <div className="admin-game-events-table-scroll" aria-busy={loading}>
        <table className="admin-game-events-table">
          <thead>
            <tr>
              <th>{t('admin.gameEvents.table.id')}</th>
              <th>{t('admin.gameEvents.table.name')}</th>
              <th>{t('admin.gameEvents.table.game')}</th>
              <th>{t('admin.gameEvents.table.startTime')}</th>
              <th>{t('admin.gameEvents.table.status')}</th>
            </tr>
          </thead>
          <tbody>
            {!notice &&
              events.map((event) => {
                const isSelected = event.id === selectedId
                const startDate = parseApiDateTime(event.startTime ?? event.scheduledAt)
                return (
                  <tr
                    key={event.id}
                    data-selected={isSelected}
                    tabIndex={0}
                    aria-selected={isSelected}
                    onClick={() => onSelect(event.id)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault()
                        onSelect(event.id)
                      }
                    }}
                  >
                    <td className="admin-game-events-id">{event.code}</td>
                    <td className="admin-game-events-name">{gameEventName(event, t)}</td>
                    <td>
                      <StatusBadge variant={GAME_EVENT_GAME_VARIANT[event.game]}>{t(GAME_LABEL_KEY[event.game])}</StatusBadge>
                    </td>
                    <td className="admin-game-events-secondary">
                      {DATE_FORMATTER.format(startDate)}
                      <br />
                      {TIME_FORMATTER.format(startDate)}
                    </td>
                    <td>
                      <StatusBadge variant={GAME_EVENT_STATUS_VARIANT[event.status]}>{t(`admin.gameEvents.status.${event.status}`)}</StatusBadge>
                    </td>
                  </tr>
                )
              })}
          </tbody>
        </table>

        {notice && (
          <p className="admin-game-events-empty" data-error={notice.error ? 'true' : undefined} role={notice.error ? 'alert' : undefined}>
            {notice.text}
          </p>
        )}
      </div>

      <div className="admin-game-events-footer">
        <p className="admin-game-events-count">
          {total === 0 || notice
            ? t('admin.gameEvents.list.showingCount', { from: 0, to: 0, total: notice ? 0 : total })
            : t('admin.gameEvents.list.showingCount', {
                from: pageStart + 1,
                to: Math.min(pageStart + pageSize, total),
                total,
              })}
        </p>

        {totalPages > 1 && !notice && (
          <nav className="admin-game-events-pagination" aria-label={t('admin.gameEvents.list.pagination')}>
            <button
              type="button"
              className="admin-game-events-page-btn"
              disabled={currentPage === 1}
              onClick={() => onPageChange(currentPage - 1)}
              aria-label={t('admin.gameEvents.list.previousPage')}
            >
              <ChevronLeftIcon />
            </button>
            {visiblePages(currentPage, totalPages).map((pageNumber, index) =>
              pageNumber === null ? (
                <span key={`gap-${index}`} className="admin-game-events-page-gap" aria-hidden="true">
                  …
                </span>
              ) : (
                <button
                  key={pageNumber}
                  type="button"
                  className="admin-game-events-page-btn"
                  data-active={pageNumber === currentPage}
                  aria-current={pageNumber === currentPage ? 'page' : undefined}
                  onClick={() => onPageChange(pageNumber)}
                >
                  {pageNumber}
                </button>
              ),
            )}
            <button
              type="button"
              className="admin-game-events-page-btn"
              disabled={currentPage === totalPages}
              onClick={() => onPageChange(currentPage + 1)}
              aria-label={t('admin.gameEvents.list.nextPage')}
            >
              <ChevronRightIcon />
            </button>
          </nav>
        )}
      </div>
    </section>
  )
}
