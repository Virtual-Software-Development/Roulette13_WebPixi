import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { AdminDetailPopup } from '../components/admin/AdminDetailPopup'
import { GameEventsList } from '../components/admin/gameEvents/GameEventsList'
import { GameEventDetailPanel } from '../components/admin/gameEvents/GameEventDetailPanel'
import { GAME_EVENTS } from '../data/adminGameEventsMockData'
import { useDetailAsPopup } from '../hooks/useDetailAsPopup'
import './gameEventsPage.css'

// Contenido puro (sin Header/Sidebar propios, ver AdminDashboardPage.tsx) -- primer master/detail
// del Admin Panel (no había precedente, ver investigación previa): esta página es la única dueña de
// `selectedId`, la lista solo filtra/busca localmente y notifica selección, el panel derecho solo
// renderiza el evento recibido. Selecciona automáticamente el primer evento de la lista al montar.
// En pantallas angostas (tablet/teléfono, ver useDetailAsPopup) el detalle no va al lado: se abre
// como pop-up solo cuando el usuario elige un evento (nunca por la preselección inicial).
export function GameEventsPage() {
  const { t } = useTranslation()
  const [selectedId, setSelectedId] = useState<string | null>(GAME_EVENTS[0]?.id ?? null)
  const [popupOpen, setPopupOpen] = useState(false)
  const detailAsPopup = useDetailAsPopup()

  // Al pasar a desktop el detalle vuelve inline: el pop-up queda cerrado para no reaparecer solo si
  // la ventana se vuelve a achicar.
  useEffect(() => {
    if (!detailAsPopup) setPopupOpen(false)
  }, [detailAsPopup])

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
        <GameEventsList
          events={GAME_EVENTS}
          selectedId={selectedId}
          onSelect={(id) => {
            setSelectedId(id)
            setPopupOpen(true)
          }}
        />
        {!detailAsPopup && <GameEventDetailPanel key={selectedEvent?.id ?? 'none'} event={selectedEvent} />}
      </div>

      {detailAsPopup && popupOpen && selectedEvent && (
        <AdminDetailPopup labelledBy="admin-game-events-detail-title" onClose={() => setPopupOpen(false)}>
          <GameEventDetailPanel key={selectedEvent.id} event={selectedEvent} onClose={() => setPopupOpen(false)} />
        </AdminDetailPopup>
      )}
    </>
  )
}
