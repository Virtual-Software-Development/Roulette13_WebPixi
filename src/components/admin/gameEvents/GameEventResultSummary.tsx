import { useTranslation } from 'react-i18next'
import { parseApiDateTime } from '../../../utils/time'
import type { GameEventDraw } from '../../../types/adminGameEvents'
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
  draw: GameEventDraw
  drawnAt: string | null
}

type PillTone = 'red' | 'green' | 'white'

// Mismo tone por número que ResultPills en RecentRoundsPanel.tsx (Dashboard, "Recent Rounds") --
// Roulette es rojo salvo el 0/00 (verde), Quick Money son pelotas blancas con letras negras,
// reutilizando directamente sus clases .admin-round-pill(-group)/.admin-round-draw.
function Pills({ values, tone, title }: { values: (number | string)[]; tone: (value: number | string) => PillTone; title?: string }) {
  return (
    <span className="admin-round-pill-group admin-game-events-summary-result" title={title}>
      {values.map((value, index) => (
        <span key={index} className="admin-round-pill" data-tone={tone(value)}>
          {value}
        </span>
      ))}
    </span>
  )
}

function hasResult(draw: GameEventDraw): boolean {
  return draw.result !== null
}

// El resultado de una ronda (o de un cambio manual): la casilla de ruleta o Pick 3 · Pick 4.
export function DrawResult({ draw, title }: { draw: GameEventDraw; title?: string }) {
  if (draw.game === 'roulette') {
    if (draw.result === null) return null
    return <Pills values={[draw.result]} tone={(value) => (value === '0' || value === '00' ? 'green' : 'red')} title={title} />
  }
  if (!draw.result) return null
  return (
    <span className="admin-round-draw admin-game-events-summary-result" title={title}>
      <Pills values={draw.result.pick3} tone={() => 'white'} />
      <span className="admin-round-draw-separator" aria-hidden="true">·</span>
      <Pills values={draw.result.pick4} tone={() => 'white'} />
    </span>
  )
}

// Primer ítem de la fila de resumen del detalle (a la izquierda de Date). La fecha del sorteo
// ("Drawn on ...") queda como tooltip: la fila ya muestra Date/End Time. Las rondas que no se
// sortearon (abiertas, canceladas) no traen resultado: el backend nunca manda el pendiente.
export function GameEventResultSummary({ draw, drawnAt }: GameEventResultSummaryProps) {
  const { t } = useTranslation()
  const drawnOn = drawnAt
    ? t('admin.gameEvents.overview.result.drawnOn', { date: DRAWN_AT_FORMATTER.format(parseApiDateTime(drawnAt)) })
    : undefined

  return (
    <div className="admin-game-events-summary-item admin-game-events-summary-item--result">
      <span className="admin-game-events-summary-heading">
        <span className="admin-game-events-summary-label">{t('admin.gameEvents.overview.result.title')}</span>
      </span>
      {hasResult(draw) ? (
        <DrawResult draw={draw} title={drawnOn} />
      ) : (
        <span className="admin-game-events-summary-value admin-game-events-summary-value--pending">
          {t('admin.gameEvents.overview.result.pending')}
        </span>
      )}
    </div>
  )
}
