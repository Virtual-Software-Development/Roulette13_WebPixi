import { useTranslation } from 'react-i18next'
import { RtpMetricCard } from '../components/admin/RtpMetricCard'
import { HouseMarginCard } from '../components/admin/HouseMarginCard'
import { ManualOverridesCard } from '../components/admin/ManualOverridesCard'
import { RtpTrendChart } from '../components/admin/RtpTrendChart'
import { CurrentBandsPanel } from '../components/admin/CurrentBandsPanel'
import { RecentRtpChanges } from '../components/admin/RecentRtpChanges'
import { RtpImportantNote } from '../components/admin/RtpImportantNote'
import { RtpStabilityChart } from '../components/admin/RtpStabilityChart'
import { RtpLoadState } from '../components/admin/RtpLoadState'
import { InfoBanner } from '../components/admin/InfoBanner'
import { describeRtpError } from '../hooks/useRtpManagement'
import { useRtpDashboard } from '../hooks/useRtpDashboard'
import type { RtpBand } from '../types/rtpDashboard'
import '../components/admin/rtpManagementShared.css'
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
// Datos: internal/rtpstats del backend, solo de rondas COMPLETED; se refrescan cada minuto.
export function RtpDashboardPage() {
  const { t } = useTranslation()
  const { status, data, error, reload } = useRtpDashboard()

  const header = (
    <div className="admin-main-topbar">
      <div>
        <h1 className="admin-main-title">{t('admin.rtp.title')}</h1>
        <p className="admin-main-subtitle">{t('admin.rtp.subtitle')}</p>
      </div>
    </div>
  )

  // Sin datos todavía: carga inicial o error. Con datos, un error de refresco deja los últimos.
  if (!data) {
    return (
      <>
        {header}
        <section className="admin-panel">
          <RtpLoadState error={status === 'error' ? describeRtpError(error, t) : null} onRetry={reload} />
        </section>
      </>
    )
  }

  const { overview, history, stability, loadedAt } = data
  const bands: RtpBand[] = overview.games.map((g) => ({ id: g.game, min: g.minBand, max: g.maxBand }))

  return (
    <>
      {header}

      {status === 'error' && <InfoBanner variant="warning" title={describeRtpError(error, t)} />}

      <div className="admin-rtp-kpi-grid">
        {overview.games.map((game) => (
          <RtpMetricCard key={game.game} data={game} />
        ))}
        <HouseMarginCard data={overview.houseMargin} />
        <ManualOverridesCard count={overview.manualResults} />
      </div>

      {/* Dos columnas: izquierda chart + Recent RTP Changes, derecha Current Bands + RTP Stability +
          Important Note. RTP Stability toma el alto que sobra, así ninguna columna queda con espacio
          vacío (antes eran dos filas separadas y los paneles de la derecha se estiraban vacíos). */}
      <div className="admin-rtp-main-grid">
        <div className="admin-rtp-main-column">
          <RtpTrendChart history={history} bands={bands} />
          <RecentRtpChanges changes={overview.changes} totalCount={overview.changesTotal} />
        </div>
        <div className="admin-rtp-main-column admin-rtp-main-column--side">
          <CurrentBandsPanel bands={bands} />
          <RtpStabilityChart dataByGame={stability} />
          <RtpImportantNote />
        </div>
      </div>

      <div className="admin-rtp-footer">
        <span>{t('admin.rtp.footer.timezone', { value: formatTimezoneOffset(loadedAt) })}</span>
        <span className="admin-rtp-footer-sep" aria-hidden="true" />
        <span>
          {t('admin.rtp.footer.lastUpdated', {
            value: `${LAST_UPDATED_DATE_FORMATTER.format(loadedAt)} ${LAST_UPDATED_TIME_FORMATTER.format(loadedAt)}`,
          })}
        </span>
        {status !== 'error' && (
          <>
            <span className="admin-rtp-footer-sep" aria-hidden="true" />
            <span className="admin-rtp-footer-live">
              <span className="admin-rtp-footer-live-dot" aria-hidden="true" />
              {t('admin.rtp.footer.live')}
            </span>
          </>
        )}
      </div>
    </>
  )
}
