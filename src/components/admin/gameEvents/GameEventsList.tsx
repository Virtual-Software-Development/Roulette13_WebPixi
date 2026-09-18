import { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { AdminSelect, type AdminSelectOption } from '../AdminSelect'
import { StatusBadge } from '../StatusBadge'
import { GAME_EVENT_GAME_VARIANT, GAME_EVENT_STATUS_VARIANT } from '../../../data/adminGameEventsMockData'
import { GAME_LABEL_KEY } from '../../../data/rtpGameLabels'
import { parseApiDateTime } from '../../../utils/time'
import { ChevronLeftIcon, ChevronRightIcon, SearchIcon } from './icons'
import type { GameEvent, GameEventStatus } from '../../../types/adminGameEvents'
import './gameEventsList.css'

type StatusFilter = 'all' | GameEventStatus

const DATE_FORMATTER = new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
const TIME_FORMATTER = new Intl.DateTimeFormat('en-US', { hour: 'numeric', minute: '2-digit' })

// 5 por página -- con el dataset de mock actual (9 eventos) ya alcanza para demostrar una
// paginación real (2 páginas), no decorativa.
const PAGE_SIZE = 10

interface GameEventsListProps {
  events: GameEvent[]
  selectedId: string | null
  onSelect: (id: string) => void
}

// Listado izquierdo (master) -- búsqueda/filtro son estado puramente local de este componente
// (mismo criterio que RtpManagementPage: el padre -- GameEventsPage -- solo es dueño de qué evento
// está seleccionado, no de cómo se filtra la lista).
export function GameEventsList({ events, selectedId, onSelect }: GameEventsListProps) {
  const { t } = useTranslation()
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')
  const [page, setPage] = useState(1)

  const statusOptions: AdminSelectOption<StatusFilter>[] = useMemo(
    () => [
      { value: 'all', label: t('admin.gameEvents.filter.allStatuses') },
      { value: 'completed', label: t('admin.gameEvents.status.completed') },
      { value: 'live', label: t('admin.gameEvents.status.live') },
      { value: 'scheduled', label: t('admin.gameEvents.status.scheduled') },
    ],
    [t],
  )

  const filteredEvents = useMemo(() => {
    const query = search.trim().toLowerCase()
    return events.filter((event) => {
      if (statusFilter !== 'all' && event.status !== statusFilter) return false
      if (!query) return true
      return event.id.toLowerCase().includes(query) || event.name.toLowerCase().includes(query)
    })
  }, [events, search, statusFilter])

  // Cambiar de búsqueda/filtro invalida la página actual (el resultado filtrado es otro) -- vuelve
  // siempre a la página 1 en vez de dejar una página vacía o fuera de rango.
  useEffect(() => {
    setPage(1)
  }, [search, statusFilter])

  const totalPages = Math.max(1, Math.ceil(filteredEvents.length / PAGE_SIZE))
  const currentPage = Math.min(page, totalPages)
  const pageStart = (currentPage - 1) * PAGE_SIZE
  const pageEvents = filteredEvents.slice(pageStart, pageStart + PAGE_SIZE)

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
            onChange={(e) => setSearch(e.target.value)}
            aria-label={t('admin.gameEvents.search.placeholder')}
          />
        </div>
        <AdminSelect
          value={statusFilter}
          options={statusOptions}
          onChange={setStatusFilter}
          ariaLabel={t('admin.gameEvents.filter.allStatuses')}
        />
      </div>

      <div className="admin-game-events-table-scroll">
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
            {pageEvents.map((event) => {
              const isSelected = event.id === selectedId
              const startDate = parseApiDateTime(event.startTime)
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
                  <td className="admin-game-events-id">#{event.id}</td>
                  <td className="admin-game-events-name">{event.name}</td>
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

        {filteredEvents.length === 0 && <p className="admin-game-events-empty">{t('admin.gameEvents.list.empty')}</p>}
      </div>

      <div className="admin-game-events-footer">
        <p className="admin-game-events-count">
          {filteredEvents.length === 0
            ? t('admin.gameEvents.list.showingCount', { from: 0, to: 0, total: 0 })
            : t('admin.gameEvents.list.showingCount', {
                from: pageStart + 1,
                to: Math.min(pageStart + PAGE_SIZE, filteredEvents.length),
                total: filteredEvents.length,
              })}
        </p>

        {totalPages > 1 && (
          <nav className="admin-game-events-pagination" aria-label={t('admin.gameEvents.list.pagination')}>
            <button
              type="button"
              className="admin-game-events-page-btn"
              disabled={currentPage === 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              aria-label={t('admin.gameEvents.list.previousPage')}
            >
              <ChevronLeftIcon />
            </button>
            {Array.from({ length: totalPages }, (_, i) => i + 1).map((pageNumber) => (
              <button
                key={pageNumber}
                type="button"
                className="admin-game-events-page-btn"
                data-active={pageNumber === currentPage}
                aria-current={pageNumber === currentPage ? 'page' : undefined}
                onClick={() => setPage(pageNumber)}
              >
                {pageNumber}
              </button>
            ))}
            <button
              type="button"
              className="admin-game-events-page-btn"
              disabled={currentPage === totalPages}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
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
