import type { FC } from 'react'
import { useTranslation } from 'react-i18next'
import { RtpKpiCardShell } from './RtpKpiCardShell'
import { StatusBadge } from './StatusBadge'
import type { RtpMetricCardData, RtpStatusIcon } from '../../types/rtpDashboard'
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
  dot: DotIcon,
}

function formatPercent(value: number): string {
  return `${value.toFixed(1)}%`
}

export function RtpMetricCard({ data }: { data: RtpMetricCardData }) {
  const { t } = useTranslation()
  const StatusIcon = STATUS_ICONS[data.statusIcon]

  return (
    <RtpKpiCardShell icon={data.icon} titleKey={data.titleKey} accent={data.accent}>
      <div className="admin-rtp-metric-values">
        <div className="admin-rtp-metric-col">
          <span className="admin-rtp-metric-col-label">{t('admin.rtp.current')}</span>
          <span className="admin-rtp-metric-col-value">{formatPercent(data.current)}</span>
        </div>
        <span className="admin-rtp-metric-divider" aria-hidden="true" />
        <div className="admin-rtp-metric-col">
          <span className="admin-rtp-metric-col-label">{t('admin.rtp.target')}</span>
          <span className="admin-rtp-metric-col-value">{formatPercent(data.target)}</span>
        </div>
      </div>

      <StatusBadge variant={data.statusVariant} icon={<StatusIcon />}>
        {t(data.statusLabelKey)}
      </StatusBadge>
    </RtpKpiCardShell>
  )
}
