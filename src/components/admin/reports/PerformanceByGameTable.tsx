import { useTranslation } from 'react-i18next'
import { formatMoney } from '../../../utils/moneyFormat'
import { REPORT_GAME_ICON_URLS } from '../../../data/adminReportsMockData'
import type { GamePerformanceRow } from '../../../types/adminReports'
import './performanceByGameTable.css'

interface PerformanceByGameTableProps {
  rows: GamePerformanceRow[]
  total: { totalBets: number; totalPayout: number; grossRevenue: number; rtp: number }
}

export function PerformanceByGameTable({ rows, total }: PerformanceByGameTableProps) {
  const { t } = useTranslation()

  return (
    <section className="admin-panel admin-performance-by-game">
      <div className="admin-panel-header">
        <h2 className="admin-panel-title">{t('admin.reports.performanceByGame.title')}</h2>
      </div>

      <table className="admin-performance-by-game-table">
        <thead>
          <tr>
            <th>{t('admin.reports.performanceByGame.game')}</th>
            <th className="admin-performance-by-game-numeric">{t('admin.reports.performanceByGame.totalBets')}</th>
            <th className="admin-performance-by-game-numeric">{t('admin.reports.performanceByGame.totalPayout')}</th>
            <th className="admin-performance-by-game-numeric">{t('admin.reports.performanceByGame.grossRevenue')}</th>
            <th className="admin-performance-by-game-numeric">{t('admin.reports.performanceByGame.rtp')}</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.id}>
              <td>
                <span className="admin-performance-by-game-name">
                  <img src={REPORT_GAME_ICON_URLS[row.id]} className="admin-performance-by-game-icon" alt="" />
                  {t(row.labelKey)}
                </span>
              </td>
              <td className="admin-performance-by-game-numeric">{row.totalBets.toLocaleString('en-US')}</td>
              <td className="admin-performance-by-game-numeric">{formatMoney(row.totalPayout)}</td>
              <td className="admin-performance-by-game-numeric">{formatMoney(row.grossRevenue)}</td>
              <td className="admin-performance-by-game-numeric">{row.rtp.toFixed(2)}%</td>
            </tr>
          ))}
          <tr className="admin-performance-by-game-total-row">
            <td>{t('admin.reports.performanceByGame.total')}</td>
            <td className="admin-performance-by-game-numeric">{total.totalBets.toLocaleString('en-US')}</td>
            <td className="admin-performance-by-game-numeric">{formatMoney(total.totalPayout)}</td>
            <td className="admin-performance-by-game-numeric">{formatMoney(total.grossRevenue)}</td>
            <td className="admin-performance-by-game-numeric">{total.rtp.toFixed(2)}%</td>
          </tr>
        </tbody>
      </table>
    </section>
  )
}
