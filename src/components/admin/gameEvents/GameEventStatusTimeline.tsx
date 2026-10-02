import { useTranslation } from 'react-i18next'
import { parseApiDateTime } from '../../../utils/time'
import type { GameEventLogEntry } from '../../../types/adminGameEvents'
import './gameEventDetail.css'

// Con segundos: varias entradas del log caen en el mismo minuto.
const TIMESTAMP_FORMATTER = new Intl.DateTimeFormat('en-US', {
  month: 'short',
  day: 'numeric',
  year: 'numeric',
  hour: 'numeric',
  minute: '2-digit',
  second: '2-digit',
})

interface GameEventStatusTimelineProps {
  entries: GameEventLogEntry[]
}

// Muestra las entradas del Draw Log (GameEvent.logEntries -- antes solo visibles en un modal "View
// Draw Log", ya eliminado) con el look de timeline -- pedido explícito de reemplazar los 4 pasos fijos del lifecycle
// (GameEvent.timeline) por el log real. Cada entrada ya ocurrió, así que todas van "reached".
export function GameEventStatusTimeline({ entries }: GameEventStatusTimelineProps) {
  const { t } = useTranslation()

  return (
    <div className="admin-game-events-timeline">
      <h3 className="admin-game-events-panel-title">{t('admin.gameEvents.overview.statusTimeline.title')}</h3>
      {entries.length === 0 ? (
        <p className="admin-game-events-result-caption">{t('admin.gameEvents.drawLog.empty')}</p>
      ) : (
        <ol className="admin-game-events-timeline-list">
          {entries.map((entry, index) => (
            <li key={entry.id} className="admin-game-events-timeline-step" data-reached="true">
              <span className="admin-game-events-timeline-marker" aria-hidden="true">
                <span className="admin-game-events-timeline-dot" />
                {index < entries.length - 1 && <span className="admin-game-events-timeline-connector" />}
              </span>
              <span className="admin-game-events-timeline-content">
                <span className="admin-game-events-timeline-label">{entry.message}</span>
                <span className="admin-game-events-timeline-timestamp">{TIMESTAMP_FORMATTER.format(parseApiDateTime(entry.timestamp))}</span>
              </span>
            </li>
          ))}
        </ol>
      )}
    </div>
  )
}
