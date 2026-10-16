import { buildMediaUrl } from '../utils/media'
import type { ReportGame, ReportGameFilter, ReportShortcutData, ReportType } from '../types/adminReports'

export const REPORT_GAME_ICON_URLS: Record<ReportGame, string> = {
  roulette: buildMediaUrl('Website_svg_icons/46_logo_option_2.svg'),
  quickMoney: buildMediaUrl('Website_svg_icons/43_quick-money-logo.svg'),
}

// Opciones fijas de la pantalla de Reports (filtros y shortcuts); los datos vienen del backend
// (api/adminReports.ts).

export const REPORT_GAME_FILTER_OPTIONS: ReportGameFilter[] = ['all', 'roulette', 'quickMoney']
export const REPORT_TYPE_OPTIONS: ReportType[] = [
  'summary',
  'weeklyReport',
  'monthlyReport',
  'gameReport',
  'salesActivity',
  'financialReport',
  'rtpAnalysis',
  'manualSubstitutions',
]

export const REPORT_SHORTCUTS: ReportShortcutData[] = [
  {
    id: 'gameReport',
    icon: buildMediaUrl('Website_svg_icons/09_analytics_white.svg'),
    titleKey: 'admin.reports.shortcuts.gamePerformance.title',
    descriptionKey: 'admin.reports.shortcuts.gamePerformance.description',
  },
  {
    id: 'salesActivity',
    icon: buildMediaUrl('Website_svg_icons/24_users_gray.svg'),
    titleKey: 'admin.reports.shortcuts.salesActivity.title',
    descriptionKey: 'admin.reports.shortcuts.salesActivity.description',
  },
  {
    id: 'financialReport',
    icon: buildMediaUrl('Website_svg_icons/11_document_white.svg'),
    titleKey: 'admin.reports.shortcuts.financialReport.title',
    descriptionKey: 'admin.reports.shortcuts.financialReport.description',
  },
  {
    id: 'rtpAnalysis',
    icon: buildMediaUrl('Website_svg_icons/05_target_white.svg'),
    titleKey: 'admin.reports.shortcuts.rtpAnalysis.title',
    descriptionKey: 'admin.reports.shortcuts.rtpAnalysis.description',
  },
  // Semanal/Mensual abren en la última semana/mes cerrado (ver AdminReportsPage.handleShortcutSelect).
  {
    id: 'weeklyReport',
    icon: buildMediaUrl('Website_svg_icons/30_clock_white.svg'),
    titleKey: 'admin.reports.shortcuts.weeklyReport.title',
    descriptionKey: 'admin.reports.shortcuts.weeklyReport.description',
  },
  {
    id: 'monthlyReport',
    icon: buildMediaUrl('Website_svg_icons/33_calendar_white.svg'),
    titleKey: 'admin.reports.shortcuts.monthlyReport.title',
    descriptionKey: 'admin.reports.shortcuts.monthlyReport.description',
  },
  // Historial de sustituciones manuales de resultado (solo ruleta) -- respeta el período actual.
  {
    id: 'manualSubstitutions',
    icon: buildMediaUrl('Website_svg_icons/15_pencil_white.svg'),
    titleKey: 'admin.reports.shortcuts.manualSubstitutions.title',
    descriptionKey: 'admin.reports.shortcuts.manualSubstitutions.description',
  },
]
