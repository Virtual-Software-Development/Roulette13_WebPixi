import { useTranslation } from 'react-i18next'
import { DrawResult } from './GameEventResultSummary'
import { parseApiDateTime } from '../../../utils/time'
import type { GameEventOverride } from '../../../types/adminGameEvents'
import './gameEventDetail.css'

const TIMESTAMP_FORMATTER = new Intl.DateTimeFormat('en-US', {
  month: 'short',
  day: 'numeric',
  hour: 'numeric',
  minute: '2-digit',
  second: '2-digit',
})

// Cambios manuales del resultado (result_override) -- el backend solo los manda de rondas ya
// sorteadas: el de una ronda abierta revelaría el próximo resultado.
export function GameEventOverridesPanel({ overrides }: { overrides: GameEventOverride[] }) {
  const { t } = useTranslation()

  return (
    <div className="admin-game-events-overrides">
      <h3 className="admin-game-events-panel-title">{t('admin.gameEvents.overview.overrides.title')}</h3>
      <ul className="admin-game-events-override-list">
        {overrides.map((override, index) => (
          <li key={index} className="admin-game-events-override">
            <span className="admin-game-events-override-results">
              <DrawResult draw={override.originalResult} />
              <span className="admin-game-events-override-arrow" aria-label={t('admin.gameEvents.overview.overrides.changedTo')}>
                →
              </span>
              <DrawResult draw={override.newResult} />
            </span>
            <span className="admin-game-events-override-reason">{override.reason}</span>
            <span className="admin-game-events-override-meta">
              {override.user ? t('admin.gameEvents.overview.overrides.by', { user: override.user }) : t('admin.gameEvents.overview.overrides.anonymous')}
              {' · '}
              {TIMESTAMP_FORMATTER.format(parseApiDateTime(override.createdAt))}
            </span>
          </li>
        ))}
      </ul>
    </div>
  )
}
