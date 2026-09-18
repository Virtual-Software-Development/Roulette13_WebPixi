import { GameEventStatusTimeline } from './GameEventStatusTimeline'
import { GameEventResultPanel } from './GameEventResultPanel'
import { GameEventStatisticsPanel } from './GameEventStatisticsPanel'
import type { GameEvent } from '../../../types/adminGameEvents'
import './gameEventDetail.css'

interface GameEventOverviewTabProps {
  event: GameEvent
}

// Layout: Status Timeline a la izquierda, Result (arriba) + Statistics (abajo) a la derecha --
// mismo criterio de la referencia. El Result sigue viviendo acá adentro aunque el tab "Results" se
// haya eliminado (pedido explícito).
export function GameEventOverviewTab({ event }: GameEventOverviewTabProps) {
  return (
    <div className="admin-game-events-overview">
      <div className="admin-game-events-overview-panel">
        <GameEventStatusTimeline steps={event.timeline} />
      </div>
      <div className="admin-game-events-overview-side">
        <div className="admin-game-events-overview-panel">
          <GameEventResultPanel game={event.game} result={event.result} drawnAt={event.resultDrawnAt} />
        </div>
        <div className="admin-game-events-overview-panel">
          <GameEventStatisticsPanel statistics={event.statistics} status={event.status} />
        </div>
      </div>
    </div>
  )
}
