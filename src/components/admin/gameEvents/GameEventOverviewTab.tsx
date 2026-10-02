import { GameEventStatusTimeline } from './GameEventStatusTimeline'
import { GameEventStatisticsPanel } from './GameEventStatisticsPanel'
import type { GameEvent } from '../../../types/adminGameEvents'
import './gameEventDetail.css'

interface GameEventOverviewTabProps {
  event: GameEvent
}

// Layout: Status Timeline (entradas del Draw Log) a la izquierda, Statistics a la derecha. El Result ya no vive acá: se
// muestra en la fila de resumen del detalle, a la izquierda de Date (ver GameEventResultSummary).
export function GameEventOverviewTab({ event }: GameEventOverviewTabProps) {
  return (
    <div className="admin-game-events-overview">
      <div className="admin-game-events-overview-panel">
        <GameEventStatusTimeline entries={event.logEntries} />
      </div>
      <div className="admin-game-events-overview-side">
        <div className="admin-game-events-overview-panel">
          <GameEventStatisticsPanel statistics={event.statistics} status={event.status} />
        </div>
      </div>
    </div>
  )
}
