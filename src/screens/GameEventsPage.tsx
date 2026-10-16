import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import type { TFunction } from 'i18next'
import { AdminAuthError } from '../api/adminSession'
import { AdminDetailPopup } from '../components/admin/AdminDetailPopup'
import { GameEventsList, type GameEventGameFilter, type GameEventStatusFilter } from '../components/admin/gameEvents/GameEventsList'
import { GameEventDetailPanel } from '../components/admin/gameEvents/GameEventDetailPanel'
import { useDetailAsPopup } from '../hooks/useDetailAsPopup'
import { useGameEventDetail, useGameEvents } from '../hooks/useAdminRounds'
import './gameEventsPage.css'

const PAGE_SIZE = 10
const SEARCH_DEBOUNCE_MS = 300

function gameEventsLoadError(err: unknown, t: TFunction): string {
  if (err instanceof AdminAuthError) return t('admin.gameEvents.loginRequired')
  return t('admin.gameEvents.loadError', { error: err instanceof Error && err.message ? err.message : String(err) })
}

// Contenido puro (sin Header/Sidebar propios, ver AdminDashboardPage.tsx) -- master/detail: esta
// página es dueña de los filtros (resueltos en el backend, GET /rounds) y de `selectedId`; el
// detalle se pide aparte (GET /rounds/{id}). En desktop se preselecciona el primer evento de la
// página; en pantallas angostas (ver useDetailAsPopup) el detalle se abre como pop-up solo cuando el
// usuario elige un evento.
export function GameEventsPage() {
  const { t } = useTranslation()
  const [searchInput, setSearchInput] = useState('')
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<GameEventStatusFilter>('all')
  const [gameFilter, setGameFilter] = useState<GameEventGameFilter>('all')
  const [page, setPage] = useState(1)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [popupOpen, setPopupOpen] = useState(false)
  const detailAsPopup = useDetailAsPopup()

  useEffect(() => {
    const timer = setTimeout(() => setSearch(searchInput.trim()), SEARCH_DEBOUNCE_MS)
    return () => clearTimeout(timer)
  }, [searchInput])

  // Otra búsqueda/filtro es otro resultado: vuelve a la página 1.
  useEffect(() => {
    setPage(1)
  }, [search, statusFilter, gameFilter])

  const list = useGameEvents({
    search: search || undefined,
    status: statusFilter === 'all' ? undefined : statusFilter,
    game: gameFilter === 'all' ? undefined : gameFilter,
    limit: PAGE_SIZE,
    offset: (page - 1) * PAGE_SIZE,
  })
  const events = list.data?.events ?? []

  useEffect(() => {
    if (selectedId === null && list.status === 'ready' && list.data && list.data.events.length > 0) {
      setSelectedId(list.data.events[0].id)
    }
  }, [selectedId, list.status, list.data])

  // Al pasar a desktop el detalle vuelve inline: el pop-up queda cerrado para no reaparecer solo si
  // la ventana se vuelve a achicar.
  useEffect(() => {
    if (!detailAsPopup) setPopupOpen(false)
  }, [detailAsPopup])

  const detail = useGameEventDetail(selectedId)
  const detailError = detail.status === 'error' ? gameEventsLoadError(detail.error, t) : null
  const detailEvent = detail.status === 'ready' ? detail.data : null

  let notice: { text: string; error?: boolean } | null = null
  if (list.status === 'error') notice = { text: gameEventsLoadError(list.error, t), error: true }
  else if (!list.data) notice = { text: t('admin.gameEvents.list.loading') }
  else if (list.status === 'ready' && events.length === 0) notice = { text: t('admin.gameEvents.list.empty') }

  const renderDetail = (onClose?: () => void) => (
    <GameEventDetailPanel
      key={selectedId ?? 'none'}
      event={detailEvent}
      loading={selectedId !== null && detail.status === 'loading'}
      error={detailError}
      onRetry={detail.reload}
      onClose={onClose}
    />
  )

  return (
    <>
      <div className="admin-main-topbar">
        <div>
          <h1 className="admin-main-title">{t('admin.nav.gameEvents')}</h1>
          <p className="admin-main-subtitle">{t('admin.gameEvents.subtitle')}</p>
        </div>
      </div>

      <div className="admin-game-events-layout">
        <GameEventsList
          events={events}
          total={list.data?.total ?? 0}
          page={page}
          pageSize={PAGE_SIZE}
          onPageChange={setPage}
          search={searchInput}
          onSearchChange={setSearchInput}
          statusFilter={statusFilter}
          onStatusFilterChange={setStatusFilter}
          gameFilter={gameFilter}
          onGameFilterChange={setGameFilter}
          loading={list.status === 'loading'}
          notice={notice}
          selectedId={selectedId}
          onSelect={(id) => {
            setSelectedId(id)
            setPopupOpen(true)
          }}
        />
        {!detailAsPopup && renderDetail()}
      </div>

      {detailAsPopup && popupOpen && selectedId && (
        <AdminDetailPopup labelledBy="admin-game-events-detail-title" onClose={() => setPopupOpen(false)}>
          {renderDetail(() => setPopupOpen(false))}
        </AdminDetailPopup>
      )}
    </>
  )
}
