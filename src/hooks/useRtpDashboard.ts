import { useEffect } from 'react'
import { fetchRtpHistory, fetchRtpOverview, fetchRtpStability } from '../api/rtpStats'
import { useAdminLoad, type AdminLoad } from './useAdminRounds'
import type { RtpGame, RtpHistoryPoint, RtpOverview, RtpStabilityData } from '../types/rtpDashboard'
import { RTP_TREND_RANGE_DAYS } from '../types/rtpDashboard'

export interface RtpDashboardData {
  overview: RtpOverview
  // Rango más largo del selector; RtpTrendChart recorta los últimos N días.
  history: RtpHistoryPoint[]
  stability: Record<RtpGame, RtpStabilityData>
  loadedAt: Date
}

const HISTORY_DAYS = Math.max(...Object.values(RTP_TREND_RANGE_DAYS))
// Refresco del dashboard (pantalla de monitoreo): se conserva el último dato mientras recarga.
const REFRESH_MS = 60_000

export function useRtpDashboard(): AdminLoad<RtpDashboardData> {
  const load = useAdminLoad('rtp-dashboard', async (signal) => {
    const [overview, history, roulette, quickMoney] = await Promise.all([
      fetchRtpOverview(signal),
      fetchRtpHistory(HISTORY_DAYS, signal),
      fetchRtpStability('roulette', signal),
      fetchRtpStability('quickMoney', signal),
    ])
    return { overview, history, stability: { roulette, quickMoney }, loadedAt: new Date() }
  })

  const { reload } = load
  useEffect(() => {
    const id = setInterval(reload, REFRESH_MS)
    return () => clearInterval(id)
  }, [reload])

  return load
}
