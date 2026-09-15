import { useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { Header } from '../layout/Header'
import { AdminSidebar } from '../components/admin/AdminSidebar'
import { AdminStatCard } from '../components/admin/AdminStatCard'
import { DateRangeControl } from '../components/admin/DateRangeControl'
import { GamesActivityChart } from '../components/admin/GamesActivityChart'
import { GamesDistributionChart } from '../components/admin/GamesDistributionChart'
import { RecentRoundsPanel } from '../components/admin/RecentRoundsPanel'
import { SystemStatusPanel } from '../components/admin/SystemStatusPanel'
import { fetchGameInfo } from '../api/gameInfo'
import { useGameConfigStore } from '../store/useGameConfigStore'
import { buildMediaUrl } from '../utils/media'
import {
  ADMIN_SIDEBAR_ITEMS,
  ADMIN_STAT_CARDS,
  GAMES_ACTIVITY_SERIES,
  GAMES_DISTRIBUTION,
  GAMES_DISTRIBUTION_TOTAL,
  RECENT_ROUNDS,
  SYSTEM_STATUS_SERVICES,
} from '../data/adminDashboardMockData'
import './adminDashboardPage.css'

export function AdminDashboardPage() {
  const { t } = useTranslation()

  // Solo trae gameName/logoUrl (para que el Header no muestre el fallback "Logo not found") --
  // deliberadamente NO reusa applyGameInfo() completo, que además siembra history/i18n/nextDraw,
  // datos que pertenecen al ciclo de sorteo de la lobby y no tienen nada que ver con esta pantalla.
  useEffect(() => {
    let cancelled = false
    fetchGameInfo()
      .then((data) => {
        if (cancelled) return
        useGameConfigStore.getState().setGameConfig({
          gameName: data.gameName,
          logoUrl: buildMediaUrl(data.logo),
        })
      })
      .catch((err) => console.error('No se pudo obtener /gameInfo', err))
    return () => {
      cancelled = true
    }
  }, [])

  return (
    <div className="admin-dashboard">
      <Header activeTab="admin" />

      <div className="admin-body">
        <AdminSidebar items={ADMIN_SIDEBAR_ITEMS} activeId="dashboard" />

        <main className="admin-main">
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
        </main>
      </div>
    </div>
  )
}
