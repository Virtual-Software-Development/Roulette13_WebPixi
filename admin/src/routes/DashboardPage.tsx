import { useEffect, useState } from 'react'
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
import { fetchRouletteLastResults } from '../api/rouletteResults'
import { fetchLotteryLastResults } from '../api/lotteryResults'
import { fetchActiveMachineCount } from '../api/organization'
import { fetchRoundsToday } from '../api/roundsToday'
import { isRouletteEngineLive, isLotteryEngineLive } from '../api/events'
import type { AdminStatCardData, GamesDistributionSegment, RecentRound, SystemStatusService } from '../types/adminDashboard'
import './adminDashboardPage.css'

const RECENT_ROUNDS_TIME_FORMATTER = new Intl.DateTimeFormat('en-US', {
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
  hour12: false,
})

// Roulette draws every ~60s (see game-schedule/roulette's intervaloSegundos) -- polling well under
// that keeps a round that just landed visible here within one refresh instead of needing a manual
// reload, without hammering the backend.
const POLL_INTERVAL_MS = 15_000

// Contenido puro (sin Header/Sidebar propios) -- el shell lo monta AdminPanel.tsx una única vez,
// vía AdminLayout, y solo intercambia qué página se renderiza acá adentro (ver conversación: así
// cambiar de sección adentro del Admin Panel no recarga la pestaña ni parpadea).
//
// Todo arranca en los mocks (ADMIN_STAT_CARDS/RECENT_ROUNDS/SYSTEM_STATUS_SERVICES/
// GAMES_DISTRIBUTION) para que la pantalla nunca se vea vacía ni distinta de como se diseñó, y se
// actualiza en segundo plano con datos reales donde existe un endpoint real detrás: Roulette/
// Pick3/Pick4 Rounds y Games Distribution (conteos reales de HOY vía /rounds-today/{juego} --
// deliberadamente NO derivados de /roulette + /lottery last-results, que alimentan
// vw_*_last_results, tope fijo en 100 filas sin importar cuántas rondas hayan corrido en total; ver
// internal/events/repository.go's CountRouletteRoundsToday. Un conteo "de hoy" además calza con la
// propia etiqueta "vs. yesterday" de cada card, cosa que un tope de 100 sobre todo el historial no
// hace), Active Users (terminales distintas con un ticket reciente -- ver
// organization.Handler.ActiveMachines, no hay cuentas de jugador en este sistema), Recent Rounds
// (esos SÍ vienen de last-results -- son una lista acotada de "más recientes", no un conteo, así
// que el tope de 100 no es un problema ahí; ambos juegos intercalados por hora, más recientes
// primero), System Status (Roulette/Lottery Engine + Database, vía /events/{roulette,lottery}/
// current). El chart de Games Activity sigue siendo mock: tiene un eje horario fijo (00:00..20:00
// cada 2hs) que no vale la pena forzar con el historial de auditoría real (cubre como mucho ~16hs a
// razón de un evento por minuto, y no queda alineado a ese eje) -- ver conversación. La tendencia
// "+N% vs. yesterday" en cada stat card también sigue siendo mock: no existe todavía un snapshot
// diario contra el cual comparar (ver conversación).
export function DashboardPage() {
  const { t } = useTranslation()
  const [statCards, setStatCards] = useState<AdminStatCardData[]>(ADMIN_STAT_CARDS)
  const [recentRounds, setRecentRounds] = useState<RecentRound[]>(RECENT_ROUNDS)
  const [systemStatus, setSystemStatus] = useState<SystemStatusService[]>(SYSTEM_STATUS_SERVICES)
  const [distribution, setDistribution] = useState<GamesDistributionSegment[]>(GAMES_DISTRIBUTION)
  const [distributionTotal, setDistributionTotal] = useState(GAMES_DISTRIBUTION_TOTAL)

  useEffect(() => {
    let cancelled = false

    function refresh() {
      Promise.all([
        fetchRouletteLastResults(),
        fetchLotteryLastResults(),
        fetchRoundsToday('roulette'),
        fetchRoundsToday('pick3'),
        fetchRoundsToday('pick4'),
        fetchActiveMachineCount(),
        isRouletteEngineLive(),
        isLotteryEngineLive(),
      ])
        .then(
          ([
            rouletteResults,
            lotteryResults,
            rouletteRoundsToday,
            pick3RoundsToday,
            pick4RoundsToday,
            activeMachines,
            rouletteEngineLive,
            lotteryEngineLive,
          ]) => {
            if (cancelled) return

            setStatCards((prev) =>
              prev.map((card) => {
                if (card.id === 'rouletteRounds') return { ...card, value: rouletteRoundsToday.toLocaleString() }
                if (card.id === 'pick3Rounds') return { ...card, value: pick3RoundsToday.toLocaleString() }
                if (card.id === 'pick4Rounds') return { ...card, value: pick4RoundsToday.toLocaleString() }
                if (card.id === 'activeUsers') return { ...card, value: activeMachines.toLocaleString() }
                return card
              }),
            )

            const total = rouletteRoundsToday + pick3RoundsToday + pick4RoundsToday
            setDistributionTotal(total)
            setDistribution((prev) =>
              prev.map((segment) => {
                const value =
                  segment.id === 'roulette' ? rouletteRoundsToday : segment.id === 'pick3' ? pick3RoundsToday : pick4RoundsToday
                return { ...segment, value, percent: total > 0 ? Math.round((value / total) * 1000) / 10 : 0 }
              }),
            )

            // Both games' rounds merged and interleaved by their real schedule time -- not just
            // roulette's own list -- so a lottery draw that just landed shows up here too. This is
            // a bounded "most recent" list (from last-results), not a count, so the 100-row cap on
            // vw_*_last_results doesn't matter here the way it would for the stat cards above.
            const merged = [
              ...rouletteResults.map((r) => ({
                // numeroEvento alone isn't a safe React key -- the backend explicitly resets it
                // every calendar day ("numero_evento repeats daily", internal/events/repository.go),
                // so the same number can legitimately belong to two different events on two
                // different days. fecha disambiguates that; the displayed roundNumber below still
                // shows the plain per-day number, which is the intended, meaningful label for it.
                id: `${r.fecha}-roulette-${r.numeroEvento}`,
                sortKey: r.horaProgramada,
                game: 'roulette' as const,
                result: [r.resultadoEjecutado],
                roundNumber: `#${r.numeroEvento}`,
              })),
              ...lotteryResults
                .filter((r) => r.resultadoEjecutado !== null)
                .map((r) => ({
                  // pick3 and pick4 share one lottery event (and so one numeroEvento) -- modalidad
                  // disambiguates the two rows that come out of the same draw.
                  id: `${r.fecha}-lottery-${r.numeroEvento}-${r.modalidad}`,
                  sortKey: r.horaProgramada,
                  game: r.modalidad,
                  result: r.resultadoEjecutado!.split('').map(Number),
                  roundNumber: `#${r.numeroEvento}`,
                })),
            ]
              .sort((a, b) => b.sortKey.localeCompare(a.sortKey))
              .slice(0, RECENT_ROUNDS.length)
              .map(({ sortKey, ...round }) => ({ ...round, time: RECENT_ROUNDS_TIME_FORMATTER.format(new Date(sortKey)) }))

            if (merged.length > 0) {
              setRecentRounds(merged)
            }

            setSystemStatus((prev) =>
              prev.map((service) => {
                if (service.id === 'rouletteEngine') return { ...service, online: rouletteEngineLive }
                if (service.id === 'lotteryEngine') return { ...service, online: lotteryEngineLive }
                if (service.id === 'database') return { ...service, online: true }
                return service
              }),
            )
          },
        )
        .catch((err) => console.error('No se pudieron cargar los datos reales del Dashboard', err))
    }

    refresh()
    const interval = setInterval(refresh, POLL_INTERVAL_MS)
    return () => {
      cancelled = true
      clearInterval(interval)
    }
  }, [])

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
        {statCards.map((card) => (
          <AdminStatCard key={card.id} data={card} />
        ))}
      </div>

      <div className="admin-charts-row">
        <GamesActivityChart series={GAMES_ACTIVITY_SERIES} />
        <GamesDistributionChart segments={distribution} total={distributionTotal} />
      </div>

      <div className="admin-bottom-row">
        <RecentRoundsPanel rounds={recentRounds} />
        <SystemStatusPanel services={systemStatus} />
      </div>
    </>
  )
}
