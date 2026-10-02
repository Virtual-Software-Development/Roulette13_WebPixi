import { useTranslation } from 'react-i18next'
import { parseApiDateTime } from '../../../utils/time'
import type { GameEventGame } from '../../../types/adminGameEvents'
import '../recentRoundsPanel.css'
import './gameEventDetail.css'

const DRAWN_AT_FORMATTER = new Intl.DateTimeFormat('en-US', {
  month: 'short',
  day: 'numeric',
  year: 'numeric',
  hour: 'numeric',
  minute: '2-digit',
})

interface GameEventResultSummaryProps {
  game: GameEventGame
  result: number[] | null
  drawnAt: string | null
}

// Mismo tone por número que ResultPills en RecentRoundsPanel.tsx (Dashboard, "Recent Rounds") --
// Roulette es rojo salvo el 0 (verde), Pick 3/Pick 4 son pelotas blancas con letras negras (pedido
// explícito), reutilizando directamente sus clases .admin-round-pill(-group) en vez de duplicar
// el estilo.
function getTone(game: GameEventGame, value: number): 'red' | 'green' | 'white' {
  if (game === 'roulette') return value === 0 ? 'green' : 'red'
  return 'white'
}

// Primer ítem de la fila de resumen del detalle (a la izquierda de Date -- antes era un panel propio
// arriba de Statistics en el tab Overview, pedido explícito de moverlo acá). El resultado depende
// del juego -- 1 número (Roulette), 3 (Pick 3) o 4 (Pick 4): se mapea `result` tal cual venga.
// La fecha del sorteo ("Drawn on ...") queda como tooltip: la fila ya muestra Date/End Time.
export function GameEventResultSummary({ game, result, drawnAt }: GameEventResultSummaryProps) {
  const { t } = useTranslation()
  const drawnOn = drawnAt
    ? t('admin.gameEvents.overview.result.drawnOn', { date: DRAWN_AT_FORMATTER.format(parseApiDateTime(drawnAt)) })
    : undefined

  return (
    <div className="admin-game-events-summary-item admin-game-events-summary-item--result">
      <span className="admin-game-events-summary-heading">
        <span className="admin-game-events-summary-label">{t('admin.gameEvents.overview.result.title')}</span>
      </span>
      {result && result.length > 0 ? (
        <span className="admin-round-pill-group admin-game-events-summary-result" title={drawnOn}>
          {result.map((value, index) => (
            <span key={index} className="admin-round-pill" data-tone={getTone(game, value)}>
              {value}
            </span>
          ))}
        </span>
      ) : (
        <span className="admin-game-events-summary-value admin-game-events-summary-value--pending">
          {t('admin.gameEvents.overview.result.pending')}
        </span>
      )}
    </div>
  )
}
