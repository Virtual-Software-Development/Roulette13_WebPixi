import { useTranslation } from 'react-i18next'
import { AdminStatCard } from '../components/admin/AdminStatCard'
import { GameEventsOverTimeChart } from '../components/admin/GameEventsOverTimeChart'
import { GamePerformanceChart } from '../components/admin/GamePerformanceChart'
import { RecentRoundsPanel } from '../components/admin/RecentRoundsPanel'
import { ResultFrequencyChart } from '../components/admin/ResultFrequencyChart'
import { ReportMetricCard } from '../components/admin/reports/ReportMetricCard'
import {
  ADMIN_STAT_CARDS,
  GAME_EVENTS_OVER_TIME,
  GAME_PERFORMANCE,
  RECENT_ROUNDS,
  RESULT_FREQUENCY,
} from '../data/adminDashboardMockData'
import { REPORT_KPI_CARDS } from '../data/adminReportsMockData'
import './adminDashboardPage.css'

// Contenido puro (sin Header/Sidebar propios) -- el shell lo monta AdminPanel.tsx una única vez,
// vía AdminLayout, y solo intercambia qué página se renderiza acá adentro (ver conversación: así
// cambiar de sección adentro del Admin Panel no recarga la pestaña ni parpadea).
export function AdminDashboardPage() {
  const { t } = useTranslation()

  return (
    <>
      <div className="admin-main-topbar">
        <div>
          <h1 className="admin-main-title">{t('admin.dashboard.title')}</h1>
          <p className="admin-main-subtitle">{t('admin.dashboard.subtitle')}</p>
        </div>
      </div>

      <div className="admin-kpi-grid">
        {ADMIN_STAT_CARDS.map((card) => (
          <AdminStatCard key={card.id} data={card} />
        ))}
        {REPORT_KPI_CARDS.map((card) => (
          <ReportMetricCard key={card.id} data={card} />
        ))}
      </div>

      <div className="admin-charts-row">
        <GamePerformanceChart rows={GAME_PERFORMANCE} />
        {/* Columna derecha: Result Frequency arriba de Recent Rounds (pedido explícito) -- ambos
            hablan de resultados ya sorteados, uno agregado y otro ronda por ronda. */}
        <div className="admin-dashboard-side-column">
          <ResultFrequencyChart dataByGame={RESULT_FREQUENCY} />
          <RecentRoundsPanel rounds={RECENT_ROUNDS} />
        </div>
        <GameEventsOverTimeChart series={GAME_EVENTS_OVER_TIME} />
      </div>
    </>
  )
}
