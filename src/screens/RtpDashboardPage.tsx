import { useTranslation } from 'react-i18next'
import { RtpMetricCard } from '../components/admin/RtpMetricCard'
import { HouseMarginCard } from '../components/admin/HouseMarginCard'
import { ManualOverridesCard } from '../components/admin/ManualOverridesCard'
import { RtpTrendChart } from '../components/admin/RtpTrendChart'
import { CurrentBandsPanel } from '../components/admin/CurrentBandsPanel'
import { RecentRtpChanges } from '../components/admin/RecentRtpChanges'
import { RtpImportantNote } from '../components/admin/RtpImportantNote'
import { useNow } from '../hooks/useNow'
import {
  HOUSE_MARGIN,
  MANUAL_OVERRIDES,
  RTP_BANDS,
  RTP_CHANGES,
  RTP_CHANGES_TOTAL_COUNT,
  RTP_HISTORY_BY_RANGE,
  RTP_METRIC_CARDS,
} from '../data/rtpDashboardMockData'
import './rtpDashboardPage.css'

const LAST_UPDATED_DATE_FORMATTER = new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
const LAST_UPDATED_TIME_FORMATTER = new Intl.DateTimeFormat('en-US', {
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
  hour12: false,
})

function formatTimezoneOffset(date: Date): string {
  const offsetMinutes = -date.getTimezoneOffset()
  const sign = offsetMinutes >= 0 ? '+' : '-'
  const abs = Math.abs(offsetMinutes)
  const hours = String(Math.floor(abs / 60)).padStart(2, '0')
  const minutes = String(abs % 60).padStart(2, '0')
  return `UTC${sign}${hours}:${minutes}`
}

// RTP DASHBOARD -- solo monitoreo (pedido explícito): sin controles que editen target/bands, sin
// Date Range / Game Scope / Open Settings / Open Simulator, sin RTP Distribution by Game. Esta
// pantalla no es RTP Settings ni RTP Simulator. Contenido puro (sin Header/Sidebar propios) -- el
// shell lo monta AdminPanel.tsx una única vez, vía AdminLayout (ver AdminDashboardPage.tsx).
export function RtpDashboardPage() {
  const { t } = useTranslation()
  const now = useNow()

  return (
    <>
      <div className="admin-main-topbar">
        <div>
          <h1 className="admin-main-title">{t('admin.rtp.title')}</h1>
          <p className="admin-main-subtitle">{t('admin.rtp.subtitle')}</p>
        </div>
      </div>

      <div className="admin-rtp-kpi-grid">
        {RTP_METRIC_CARDS.map((card) => (
          <RtpMetricCard key={card.id} data={card} />
        ))}
        <HouseMarginCard data={HOUSE_MARGIN} />
        <ManualOverridesCard data={MANUAL_OVERRIDES} />
      </div>

      <div className="admin-rtp-trend-row">
        <RtpTrendChart historyByRange={RTP_HISTORY_BY_RANGE} />
        <CurrentBandsPanel bands={RTP_BANDS} />
      </div>

      <div className="admin-rtp-bottom-row">
        <RecentRtpChanges changes={RTP_CHANGES} totalCount={RTP_CHANGES_TOTAL_COUNT} />
        <RtpImportantNote />
      </div>

      <div className="admin-rtp-footer">
        <span>{t('admin.rtp.footer.timezone', { value: formatTimezoneOffset(now) })}</span>
        <span className="admin-rtp-footer-sep" aria-hidden="true" />
        <span>
          {t('admin.rtp.footer.lastUpdated', {
            value: `${LAST_UPDATED_DATE_FORMATTER.format(now)} ${LAST_UPDATED_TIME_FORMATTER.format(now)}`,
          })}
        </span>
        <span className="admin-rtp-footer-sep" aria-hidden="true" />
        <span className="admin-rtp-footer-live">
          <span className="admin-rtp-footer-live-dot" aria-hidden="true" />
          {t('admin.rtp.footer.live')}
        </span>
      </div>
    </>
  )
}
