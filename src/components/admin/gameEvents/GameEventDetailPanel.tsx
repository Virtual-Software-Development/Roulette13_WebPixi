import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { StatusBadge } from '../StatusBadge'
import { GameEventTabs, type GameEventTab } from './GameEventTabs'
import { GameEventOverviewTab } from './GameEventOverviewTab'
import { GameEventPayoutsTab } from './GameEventPayoutsTab'
import { DrawLogModal } from './DrawLogModal'
import { HourglassIcon } from './icons'
import { buildMediaUrl } from '../../../utils/media'
import { parseApiDateTime } from '../../../utils/time'
import { GAME_EVENT_GAME_VARIANT, GAME_EVENT_STATUS_VARIANT } from '../../../data/adminGameEventsMockData'
import { GAME_LABEL_KEY } from '../../../data/rtpGameLabels'
import type { GameEvent } from '../../../types/adminGameEvents'
import './gameEventDetail.css'

const CALENDAR_ICON_URL = buildMediaUrl('Website_svg_icons/33_calendar_white.svg')
const CLOCK_ICON_URL = buildMediaUrl('Website_svg_icons/30_clock_white.svg')

const DATE_FORMATTER = new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
const TIME_FORMATTER = new Intl.DateTimeFormat('en-US', { hour: 'numeric', minute: '2-digit' })

interface GameEventDetailPanelProps {
  event: GameEvent | null
}

// Panel derecho (detail) -- se remonta por completo al cambiar `event` (ver key={event.id} en
// GameEventsPage.tsx): así el tab activo y el modal de log siempre vuelven a su estado inicial al
// seleccionar otro evento, sin arrastrar estado del anterior.
export function GameEventDetailPanel({ event }: GameEventDetailPanelProps) {
  const { t } = useTranslation()
  const [tab, setTab] = useState<GameEventTab>('overview')
  const [isLogOpen, setIsLogOpen] = useState(false)

  if (!event) {
    return (
      <section className="admin-panel admin-game-events-detail admin-game-events-detail--empty">
        <p className="admin-game-events-empty-title">{t('admin.gameEvents.detail.emptyTitle')}</p>
        <p className="admin-game-events-empty-description">{t('admin.gameEvents.detail.emptyDescription')}</p>
      </section>
    )
  }

  const startDate = parseApiDateTime(event.startTime)
  const endDate = event.endTime ? parseApiDateTime(event.endTime) : null

  return (
    <section className="admin-panel admin-game-events-detail">
      <div className="admin-game-events-detail-header">
        <div>
          <h2 className="admin-game-events-detail-title">{event.name}</h2>
          {event.description && <p className="admin-game-events-detail-description">{event.description}</p>}
        </div>
        <span className="admin-game-events-detail-id">#{event.id}</span>
      </div>

      <div className="admin-game-events-detail-badges">
        <StatusBadge variant={GAME_EVENT_GAME_VARIANT[event.game]}>{t(GAME_LABEL_KEY[event.game])}</StatusBadge>
        <StatusBadge variant={GAME_EVENT_STATUS_VARIANT[event.status]}>{t(`admin.gameEvents.status.${event.status}`)}</StatusBadge>
      </div>

      <div className="admin-game-events-summary">
        <div className="admin-game-events-summary-item">
          <img src={CALENDAR_ICON_URL} alt="" />
          <span className="admin-game-events-summary-label">{t('admin.gameEvents.metadata.date')}</span>
          <span className="admin-game-events-summary-value">{DATE_FORMATTER.format(startDate)}</span>
        </div>
        <div className="admin-game-events-summary-item">
          <img src={CLOCK_ICON_URL} alt="" />
          <span className="admin-game-events-summary-label">{t('admin.gameEvents.metadata.startTime')}</span>
          <span className="admin-game-events-summary-value">{TIME_FORMATTER.format(startDate)}</span>
        </div>
        <div className="admin-game-events-summary-item">
          <img src={CLOCK_ICON_URL} alt="" />
          <span className="admin-game-events-summary-label">{t('admin.gameEvents.metadata.endTime')}</span>
          <span className="admin-game-events-summary-value">{endDate ? TIME_FORMATTER.format(endDate) : t('admin.gameEvents.metadata.notApplicable')}</span>
        </div>
        <div className="admin-game-events-summary-item">
          <HourglassIcon />
          <span className="admin-game-events-summary-label">{t('admin.gameEvents.metadata.duration')}</span>
          <span className="admin-game-events-summary-value">
            {event.durationMinutes !== null
              ? t('admin.gameEvents.metadata.durationMinutes', { count: event.durationMinutes })
              : t('admin.gameEvents.metadata.notApplicable')}
          </span>
        </div>
      </div>

      <GameEventTabs active={tab} onChange={setTab} />

      {tab === 'overview' && <GameEventOverviewTab event={event} />}
      {tab === 'payouts' && <GameEventPayoutsTab payouts={event.payouts} />}

      <div className="admin-game-events-actions">
        <button type="button" className="admin-game-events-view-log-btn" onClick={() => setIsLogOpen(true)}>
          {t('admin.gameEvents.actions.viewDrawLog')}
        </button>
      </div>

      {isLogOpen && <DrawLogModal event={event} onClose={() => setIsLogOpen(false)} />}
    </section>
  )
}
