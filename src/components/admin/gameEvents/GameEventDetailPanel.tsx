import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { InfoBanner } from '../InfoBanner'
import { StatusBadge } from '../StatusBadge'
import { GameEventTabs, type GameEventTab } from './GameEventTabs'
import { GameEventOverviewTab } from './GameEventOverviewTab'
import { GameEventPayoutsTab } from './GameEventPayoutsTab'
import { GameEventResultSummary } from './GameEventResultSummary'
import { CloseIcon, HourglassIcon } from './icons'
import { buildMediaUrl } from '../../../utils/media'
import { parseApiDateTime } from '../../../utils/time'
import { GAME_EVENT_GAME_VARIANT, GAME_EVENT_STATUS_VARIANT, gameEventName } from '../../../data/gameEventBadges'
import { GAME_LABEL_KEY } from '../../../data/rtpGameLabels'
import type { GameEventDetail } from '../../../types/adminGameEvents'
import './gameEventDetail.css'

const CALENDAR_ICON_URL = buildMediaUrl('Website_svg_icons/33_calendar_white.svg')
const CLOCK_ICON_URL = buildMediaUrl('Website_svg_icons/30_clock_white.svg')

const DATE_FORMATTER = new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
const TIME_FORMATTER = new Intl.DateTimeFormat('en-US', { hour: 'numeric', minute: '2-digit', second: '2-digit' })

interface GameEventDetailPanelProps {
  // null mientras carga, si falló o si no hay ninguno seleccionado.
  event: GameEventDetail | null
  loading?: boolean
  error?: string | null
  onRetry?: () => void
  // Solo cuando el panel se abre como pop-up (pantallas angostas, ver GameEventsPage.tsx): muestra
  // el botón X en la esquina superior derecha. Inline en desktop el panel siempre está visible.
  onClose?: () => void
}

// aria-labelledby del pop-up (GameEventsPage.tsx usa el mismo id).
const GAME_EVENT_DETAIL_TITLE_ID = 'admin-game-events-detail-title'

function durationSeconds(event: GameEventDetail): number | null {
  if (!event.startTime || !event.endTime) return null
  const ms = parseApiDateTime(event.endTime).getTime() - parseApiDateTime(event.startTime).getTime()
  return ms >= 0 ? Math.round(ms / 1000) : null
}

// Panel derecho (detail) -- se remonta por completo al cambiar de evento (ver key en
// GameEventsPage.tsx): así el tab activo siempre vuelve a su estado inicial.
export function GameEventDetailPanel({ event, loading = false, error = null, onRetry, onClose }: GameEventDetailPanelProps) {
  const { t } = useTranslation()
  const [tab, setTab] = useState<GameEventTab>('overview')

  if (!event) {
    return (
      <section className="admin-panel admin-game-events-detail admin-game-events-detail--empty" aria-busy={loading}>
        {error ? (
          <>
            <InfoBanner variant="warning" title={error} />
            {onRetry && (
              <button type="button" className="admin-game-events-retry-btn" onClick={onRetry}>
                {t('admin.gameEvents.retry')}
              </button>
            )}
          </>
        ) : loading ? (
          <p className="admin-game-events-empty-description">{t('admin.gameEvents.detail.loading')}</p>
        ) : (
          <>
            <p className="admin-game-events-empty-title">{t('admin.gameEvents.detail.emptyTitle')}</p>
            <p className="admin-game-events-empty-description">{t('admin.gameEvents.detail.emptyDescription')}</p>
          </>
        )}
        {onClose && (
          <button type="button" className="admin-game-events-detail-close" aria-label={t('admin.gameEvents.detail.close')} onClick={onClose}>
            <CloseIcon />
          </button>
        )}
      </section>
    )
  }

  const startDate = parseApiDateTime(event.startTime ?? event.scheduledAt)
  const endDate = event.endTime ? parseApiDateTime(event.endTime) : null
  const duration = durationSeconds(event)

  return (
    <section className="admin-panel admin-game-events-detail">
      <div className="admin-game-events-detail-header">
        <div>
          <h2 id={GAME_EVENT_DETAIL_TITLE_ID} className="admin-game-events-detail-title">
            {gameEventName(event, t)}
          </h2>
        </div>
        <div className="admin-game-events-detail-header-aside">
          <span className="admin-game-events-detail-id">{event.code}</span>
          {onClose && (
            <button type="button" className="admin-game-events-detail-close" aria-label={t('admin.gameEvents.detail.close')} onClick={onClose}>
              <CloseIcon />
            </button>
          )}
        </div>
      </div>

      <div className="admin-game-events-detail-badges">
        <StatusBadge variant={GAME_EVENT_GAME_VARIANT[event.game]}>{t(GAME_LABEL_KEY[event.game])}</StatusBadge>
        <StatusBadge variant={GAME_EVENT_STATUS_VARIANT[event.status]}>{t(`admin.gameEvents.status.${event.status}`)}</StatusBadge>
        {event.resultMethod === 'manual' && <StatusBadge variant="purple">{t('admin.gameEvents.resultMethod.manual')}</StatusBadge>}
      </div>

      <div className="admin-game-events-summary">
        <GameEventResultSummary draw={event} drawnAt={event.resultDrawnAt} />
        <div className="admin-game-events-summary-item">
          <span className="admin-game-events-summary-heading">
            <img src={CALENDAR_ICON_URL} alt="" />
            <span className="admin-game-events-summary-label">{t('admin.gameEvents.metadata.date')}</span>
          </span>
          <span className="admin-game-events-summary-value">{DATE_FORMATTER.format(startDate)}</span>
        </div>
        <div className="admin-game-events-summary-item">
          <span className="admin-game-events-summary-heading">
            <img src={CLOCK_ICON_URL} alt="" />
            <span className="admin-game-events-summary-label">{t('admin.gameEvents.metadata.startTime')}</span>
          </span>
          <span className="admin-game-events-summary-value">{TIME_FORMATTER.format(startDate)}</span>
        </div>
        <div className="admin-game-events-summary-item">
          <span className="admin-game-events-summary-heading">
            <img src={CLOCK_ICON_URL} alt="" />
            <span className="admin-game-events-summary-label">{t('admin.gameEvents.metadata.endTime')}</span>
          </span>
          <span className="admin-game-events-summary-value">{endDate ? TIME_FORMATTER.format(endDate) : t('admin.gameEvents.metadata.notApplicable')}</span>
        </div>
        <div className="admin-game-events-summary-item">
          <span className="admin-game-events-summary-heading">
            <HourglassIcon />
            <span className="admin-game-events-summary-label">{t('admin.gameEvents.metadata.duration')}</span>
          </span>
          <span className="admin-game-events-summary-value">
            {duration === null
              ? t('admin.gameEvents.metadata.notApplicable')
              : duration < 60
                ? t('admin.gameEvents.metadata.durationSeconds', { count: duration })
                : t('admin.gameEvents.metadata.durationMinutesSeconds', { minutes: Math.floor(duration / 60), seconds: duration % 60 })}
          </span>
        </div>
      </div>

      <GameEventTabs active={tab} onChange={setTab} />

      {tab === 'overview' && <GameEventOverviewTab event={event} />}
      {tab === 'payouts' && <GameEventPayoutsTab payouts={event.payouts} totalWinningTickets={event.statistics?.winningTickets ?? 0} />}
    </section>
  )
}
