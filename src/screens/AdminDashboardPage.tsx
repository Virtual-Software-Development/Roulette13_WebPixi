import { useTranslation } from 'react-i18next'
import { AdminStatCard } from '../components/admin/AdminStatCard'
import { DateRangeControl } from '../components/admin/DateRangeControl'
import { GamesActivityChart } from '../components/admin/GamesActivityChart'
import { GamesDistributionChart } from '../components/admin/GamesDistributionChart'
import { RecentRoundsPanel } from '../components/admin/RecentRoundsPanel'
import { SystemStatusPanel } from '../components/admin/SystemStatusPanel'
import {
  ADMIN_STAT_CARDS,
  GAMES_ACTIVITY_SERIES,
  GAMES_DISTRIBUTION,
  GAMES_DISTRIBUTION_TOTAL,
  RECENT_ROUNDS,
  SYSTEM_STATUS_SERVICES,
} from '../data/adminDashboardMockData'
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
        <DateRangeControl />
      </div>

      <div className="admin-kpi-grid">
        {ADMIN_STAT_CARDS.map((card) => (
          <AdminStatCard key={card.id} data={card} />
        ))}
      </div>

      <div className="admin-charts-row">
        <GamesActivityChart series={GAMES_ACTIVITY_SERIES} />
        <GamesDistributionChart segments={GAMES_DISTRIBUTION} total={GAMES_DISTRIBUTION_TOTAL} />
      </div>

      <div className="admin-bottom-row">
        <RecentRoundsPanel rounds={RECENT_ROUNDS} />
        <SystemStatusPanel services={SYSTEM_STATUS_SERVICES} />
      </div>
    </>
  )
}
