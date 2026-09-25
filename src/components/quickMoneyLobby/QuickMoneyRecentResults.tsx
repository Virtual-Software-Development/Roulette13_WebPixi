import { useTranslation } from 'react-i18next'
import type { QuickMoneyGameType } from '../../types/quickMoneyBet'
import type { QuickMoneyLobbyDraw } from '../../data/quickMoneyLobbyMockData'
import { resultFor } from '../../data/quickMoneyLobbyMockData'
import './quickMoneyRecentResults.css'

// Hora, no fecha (pedido explícito): los sorteos de Quick Money se suceden cada pocos minutos (ver
// comentario en quickMoneyLobbyMockData.ts), así que las 5 filas de "recientes" caen siempre el
// mismo día -- la fecha no distingue nada entre ellas, la hora sí.
const ROW_TIME_FORMATTER = new Intl.DateTimeFormat('en-US', { hour: 'numeric', minute: '2-digit' })

// 5 filas por juego (pedido explícito) -- el mismo criterio que admin-recent-reports/admin-recent-
// rounds: acá es una vista resumen, no paginada (a diferencia del modal "All Reports" de Admin).
// Sin botón "View All": no existe todavía ninguna página de historial de Quick Money a la que
// llevar (pedido explícito, para no inventar una ruta nueva sin destino real).
const ROW_LIMIT = 5

function GameResultsTable({ gameType, draws }: { gameType: QuickMoneyGameType; draws: QuickMoneyLobbyDraw[] }) {
  const { t } = useTranslation()

  return (
    <div className="qml-results-table-wrap" data-accent={gameType}>
      <h3 className="qml-results-table-title">{t(`quickMoneyBettingView.gameType.${gameType}`)}</h3>
      <table className="qml-results-table">
        <thead>
          <tr>
            <th>{t('quickMoneyLobby.recentResults.columnNumber')}</th>
            <th>{t('quickMoneyLobby.recentResults.columnTime')}</th>
            <th>{t('quickMoneyLobby.recentResults.columnNumbers')}</th>
          </tr>
        </thead>
        <tbody>
          {draws.slice(0, ROW_LIMIT).map((draw) => (
            <tr key={draw.gameNumber}>
              <td className="qml-results-table-number">#{draw.gameNumber}</td>
              <td className="qml-results-table-date">{ROW_TIME_FORMATTER.format(new Date(draw.drawnAt))}</td>
              <td>
                <div className="qml-results-table-balls">
                  {resultFor(draw, gameType).map((digit, index) => (
                    <span key={index} className="qml-ball qml-ball--sm" data-accent={gameType}>
                      {digit}
                    </span>
                  ))}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

export function QuickMoneyRecentResults({ draws }: { draws: QuickMoneyLobbyDraw[] }) {
  const { t } = useTranslation()

  return (
    <section className="qml-panel qml-recent-results">
      <div className="qml-panel-header">
        <h2 className="qml-panel-title">{t('quickMoneyLobby.recentResults.title')}</h2>
        <p className="qml-panel-subtitle">{t('quickMoneyLobby.recentResults.subtitle')}</p>
      </div>

      <div className="qml-recent-results-columns">
        <GameResultsTable gameType="pick3" draws={draws} />
        <GameResultsTable gameType="pick4" draws={draws} />
      </div>
    </section>
  )
}
