import { useTranslation } from 'react-i18next'
import { useResultsStore } from '../../store/useResultsStore'
import { getRouletteColor, toWheelPocket } from '../../utils/rouletteColors'
import './recentResultsStrip.css'

// Tope propio de este strip -- independiente de maxResults (de /gameInfo), que sigue acotando
// `history` para GameList/LastGame en el lobby Pixi.
const MAX_RECENT_RESULTS = 13

// Misma fuente que ya alimenta GameList/LastGame (useResultsStore) -- solo un render nuevo,
// porque los existentes son Pixi y esta vista es DOM. `currentWinner` se antepone a `history` para
// que el último resultado confirmado aparezca de inmediato, mismo criterio que esos componentes.
export function RecentResultsStrip() {
  const { t } = useTranslation()
  const history = useResultsStore((state) => state.history)
  const currentWinner = useResultsStore((state) => state.currentWinner)
  const results = (currentWinner ? [currentWinner, ...history] : history).slice(0, MAX_RECENT_RESULTS)

  return (
    <div className="recent-results-strip">
      <span className="recent-results-strip-title">{t('bettingView.recentResults.title')}</span>
      <div className="recent-results-strip-row">
        {results.length === 0 && <span className="recent-results-strip-empty">—</span>}
        {results.map((result) => {
          const pocket = toWheelPocket(result.winningNumber)
          const color = getRouletteColor(pocket)
          return (
            <span key={result.id} className="recent-results-strip-pill" data-color={color}>
              {pocket}
            </span>
          )
        })}
      </div>
    </div>
  )
}
