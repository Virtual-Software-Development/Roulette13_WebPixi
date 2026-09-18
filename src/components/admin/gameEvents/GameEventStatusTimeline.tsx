import { useTranslation } from 'react-i18next'
import { parseApiDateTime } from '../../../utils/time'
import type { GameEventTimelineStep } from '../../../types/adminGameEvents'
import './gameEventDetail.css'

const TIMESTAMP_FORMATTER = new Intl.DateTimeFormat('en-US', {
  month: 'short',
  day: 'numeric',
  year: 'numeric',
  hour: 'numeric',
  minute: '2-digit',
})

interface GameEventStatusTimelineProps {
  steps: GameEventTimelineStep[]
}

// Lifecycle real del evento (Created -> Started -> Draw Completed -> Results Published, ver
// GameEvent.timeline) -- un step con timestamp null todavía no fue alcanzado, nunca se inventa una
// fecha para él (ver adminGameEventsMockData.ts: los eventos scheduled/live dejan steps futuros en
// null a propósito).
export function GameEventStatusTimeline({ steps }: GameEventStatusTimelineProps) {
  const { t } = useTranslation()

  return (
    <div className="admin-game-events-timeline">
      <h3 className="admin-game-events-panel-title">{t('admin.gameEvents.overview.statusTimeline.title')}</h3>
      <ol className="admin-game-events-timeline-list">
        {steps.map((step, index) => {
          const reached = step.timestamp !== null
          return (
            <li key={step.id} className="admin-game-events-timeline-step" data-reached={reached}>
              <span className="admin-game-events-timeline-marker" aria-hidden="true">
                <span className="admin-game-events-timeline-dot" />
                {index < steps.length - 1 && <span className="admin-game-events-timeline-connector" />}
              </span>
              <span className="admin-game-events-timeline-content">
                <span className="admin-game-events-timeline-label">{t(`admin.gameEvents.overview.statusTimeline.steps.${step.id}`)}</span>
                <span className="admin-game-events-timeline-timestamp">
                  {reached ? TIMESTAMP_FORMATTER.format(parseApiDateTime(step.timestamp!)) : t('admin.gameEvents.overview.statusTimeline.pending')}
                </span>
              </span>
            </li>
          )
        })}
      </ol>
    </div>
  )
}
