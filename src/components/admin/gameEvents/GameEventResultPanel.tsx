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

interface GameEventResultPanelProps {
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

// El resultado depende del juego -- 1 número (Roulette), 3 (Pick 3) o 4 (Pick 4): el componente
// solo mapea `result` tal cual venga, nunca asume una cantidad fija de círculos.
export function GameEventResultPanel({ game, result, drawnAt }: GameEventResultPanelProps) {
  const { t } = useTranslation()

  return (
    <div className="admin-game-events-result">
      <h3 className="admin-game-events-panel-title">{t('admin.gameEvents.overview.result.title')}</h3>
      {result && result.length > 0 ? (
        <>
          <span className="admin-round-pill-group">
            {result.map((value, index) => (
              <span key={index} className="admin-round-pill" data-tone={getTone(game, value)}>
                {value}
              </span>
            ))}
          </span>
          {drawnAt && (
            <p className="admin-game-events-result-caption">
              {t('admin.gameEvents.overview.result.drawnOn', { date: DRAWN_AT_FORMATTER.format(parseApiDateTime(drawnAt)) })}
            </p>
          )}
        </>
      ) : (
        <p className="admin-game-events-result-caption">{t('admin.gameEvents.overview.result.pending')}</p>
      )}
    </div>
  )
}
