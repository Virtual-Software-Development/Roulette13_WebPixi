import type { FC } from 'react'
import { useTranslation } from 'react-i18next'
import { RtpKpiCardShell } from './RtpKpiCardShell'
import { StatusBadge } from './StatusBadge'
import { RTP_GAME_ICON_URLS } from '../../data/rtpGameLabels'
import type { RtpBandStatus, RtpGame, RtpGameOverview, RtpKpiAccent, RtpStatusIcon, StatusBadgeVariant } from '../../types/rtpDashboard'
import './rtpMetricCard.css'

function CheckIcon() {
  return (
    <svg viewBox="0 0 24 24" className="admin-status-badge-icon" aria-hidden="true" focusable="false">
      <path d="M5 12.5 10 17.5 19 7" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function ArrowUpIcon() {
  return (
    <svg viewBox="0 0 24 24" className="admin-status-badge-icon" aria-hidden="true" focusable="false">
      <path d="M12 19V5M12 5 6 11M12 5l6 6" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function ArrowDownIcon() {
  return (
    <svg viewBox="0 0 24 24" className="admin-status-badge-icon" aria-hidden="true" focusable="false">
      <path d="M12 5v14M12 19l-6-6M12 19l6-6" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function DotIcon() {
  return (
    <svg viewBox="0 0 24 24" className="admin-status-badge-icon" aria-hidden="true" focusable="false">
      <circle cx="12" cy="12" r="6" fill="currentColor" />
    </svg>
  )
}

const STATUS_ICONS: Record<RtpStatusIcon, FC> = {
  check: CheckIcon,
  up: ArrowUpIcon,
  down: ArrowDownIcon,
  dot: DotIcon,
}

const STATUS_BADGES: Record<RtpBandStatus, { labelKey: string; variant: StatusBadgeVariant; icon: RtpStatusIcon }> = {
  within: { labelKey: 'admin.rtp.status.withinBand', variant: 'positive', icon: 'check' },
  above: { labelKey: 'admin.rtp.status.aboveBand', variant: 'warning', icon: 'up' },
  below: { labelKey: 'admin.rtp.status.belowBand', variant: 'warning', icon: 'down' },
  noData: { labelKey: 'admin.rtp.status.noData', variant: 'neutral', icon: 'dot' },
}

// Verde = color de marca de Quick Money (ver quickMoneyLobbyTokens.css).
const CARD_BY_GAME: Record<RtpGame, { titleKey: string; accent: RtpKpiAccent }> = {
  roulette: { titleKey: 'admin.rtp.metrics.rouletteTitle', accent: 'red' },
  quickMoney: { titleKey: 'admin.rtp.metrics.quickMoneyTitle', accent: 'green' },
}

function formatPercent(value: number | null): string {
  return value === null ? '—' : `${value.toFixed(1)}%`
}

// Current = RTP medido sobre la ventana de corrección del motor (rondas COMPLETED).
export function RtpMetricCard({ data }: { data: RtpGameOverview }) {
  const { t, i18n } = useTranslation()
  const badge = STATUS_BADGES[data.status]
  const StatusIcon = STATUS_ICONS[badge.icon]
  const card = CARD_BY_GAME[data.game]

  return (
    <RtpKpiCardShell icon={RTP_GAME_ICON_URLS[data.game]} titleKey={card.titleKey} accent={card.accent}>
      <div className="admin-rtp-metric-values">
        <div className="admin-rtp-metric-col">
          <span className="admin-rtp-metric-col-label">{t('admin.rtp.current')}</span>
          <span className="admin-rtp-metric-col-value">{formatPercent(data.currentRtp)}</span>
        </div>
        <span className="admin-rtp-metric-divider" aria-hidden="true" />
        <div className="admin-rtp-metric-col">
          <span className="admin-rtp-metric-col-label">{t('admin.rtp.target')}</span>
          <span className="admin-rtp-metric-col-value">{formatPercent(data.targetRtp)}</span>
        </div>
      </div>

      <span className="admin-rtp-metric-window">
        {t('admin.rtp.metrics.windowRounds', { count: data.windowRounds, formatted: data.windowRounds.toLocaleString(i18n.language) })}
      </span>

      <StatusBadge variant={badge.variant} icon={<StatusIcon />}>
        {t(badge.labelKey)}
      </StatusBadge>
    </RtpKpiCardShell>
  )
}
