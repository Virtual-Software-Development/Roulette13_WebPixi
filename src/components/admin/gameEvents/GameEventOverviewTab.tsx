import { GameEventStatusTimeline } from './GameEventStatusTimeline'
import { GameEventStatisticsPanel } from './GameEventStatisticsPanel'
import { GameEventOverridesPanel } from './GameEventOverridesPanel'
import type { GameEventDetail } from '../../../types/adminGameEvents'
import './gameEventDetail.css'

interface GameEventOverviewTabProps {
  event: GameEventDetail
}

// Layout: Status Timeline (log de la ronda) a la izquierda, Statistics (y los cambios manuales del
// resultado, si hubo) a la derecha. El Result vive en la fila de resumen del detalle.
export function GameEventOverviewTab({ event }: GameEventOverviewTabProps) {
  return (
    <div className="admin-game-events-overview">
      <div className="admin-game-events-overview-panel">
        <GameEventStatusTimeline entries={event.logEntries} />
      </div>
      <div className="admin-game-events-overview-side">
        <div className="admin-game-events-overview-panel">
          <GameEventStatisticsPanel statistics={event.statistics} status={event.status} resultMethod={event.resultMethod} />
        </div>
        {event.overrides.length > 0 && (
          <div className="admin-game-events-overview-panel">
            <GameEventOverridesPanel overrides={event.overrides} />
          </div>
        )}
      </div>
    </div>
  )
}
