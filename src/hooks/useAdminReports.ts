import type { TFunction } from 'i18next'
import { fetchReportActivity, fetchReportRtp } from '../api/adminReports'
import { AdminAuthError } from '../api/adminSession'
import type { ReportActivity, ReportRtpData } from '../types/adminReports'
import { toIsoDate, type ReportPeriod } from '../utils/reportPeriod'
import { useAdminLoad, type AdminLoad } from './useAdminRounds'

export interface ReportScreenData {
  activity: ReportActivity
  rtp: ReportRtpData
}

// Lo que muestra la pantalla de Reports (gráficas y tabla por juego) para el período elegido.
export function useReportScreenData(period: ReportPeriod): AdminLoad<ReportScreenData> {
  return useAdminLoad(`${toIsoDate(period.start)}|${toIsoDate(period.end)}`, async (signal) => {
    const [activity, rtp] = await Promise.all([fetchReportActivity(period, signal), fetchReportRtp(period, signal)])
    return { activity, rtp }
  })
}

// Mensaje de un error de Reports: el del backend si lo hay.
export function describeReportError(err: unknown, t: TFunction): string {
  if (err instanceof AdminAuthError) return t('admin.reports.errors.login')
  return err instanceof Error && err.message ? err.message : t('admin.reports.errors.load')
}
