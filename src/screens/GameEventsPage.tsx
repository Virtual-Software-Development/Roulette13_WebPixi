import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { GameEventsList } from '../components/admin/gameEvents/GameEventsList'
import { GameEventDetailPanel } from '../components/admin/gameEvents/GameEventDetailPanel'
import { GAME_EVENTS } from '../data/adminGameEventsMockData'
import './gameEventsPage.css'

// Contenido puro (sin Header/Sidebar propios, ver AdminDashboardPage.tsx) -- primer master/detail
// del Admin Panel (no había precedente, ver investigación previa): esta página es la única dueña de
// `selectedId`, la lista solo filtra/busca localmente y notifica selección, el panel derecho solo
// renderiza el evento recibido. Selecciona automáticamente el primer evento de la lista al montar.
export function GameEventsPage() {
  const { t } = useTranslation()
  const [selectedId, setSelectedId] = useState<string | null>(GAME_EVENTS[0]?.id ?? null)

  const selectedEvent = GAME_EVENTS.find((event) => event.id === selectedId) ?? null

  return (
    <>
      <div className="admin-main-topbar">
        <div>
          <h1 className="admin-main-title">{t('admin.nav.gameEvents')}</h1>
          <p className="admin-main-subtitle">{t('admin.gameEvents.subtitle')}</p>
        </div>
      </div>

      <div className="admin-game-events-layout">
        <GameEventsList events={GAME_EVENTS} selectedId={selectedId} onSelect={setSelectedId} />
        <GameEventDetailPanel key={selectedEvent?.id ?? 'none'} event={selectedEvent} />
      </div>
    </>
  )
}
