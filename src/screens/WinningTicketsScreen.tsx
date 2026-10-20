import { useEffect, useLayoutEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { getRouletteColor } from '../utils/rouletteColors'
import { getRouletteNumberAttributes } from '../utils/rouletteNumberAttributes'
import { WINNING_TICKETS_DURATION_MS, WINNING_TICKETS_SCROLL_HOLD_MS } from '../layout/layout.constants'
import type { WinningTicket, WinningTicketsDraw } from '../types/winningTickets'
import './winningTicketsScreen.css'

export type WinningTicketsDoneReason = 'finished' | 'skipped'

interface WinningTicketsScreenProps {
  draw: WinningTicketsDraw
  // Códigos de los tickets vendidos en ESTA terminal: si alguno ganó, va en su propia tabla al lado
  // de la lista general durante toda la pantalla.
  localTicketCodes: string[]
  // Cuánto dura la pantalla (el scroll recorre la lista completa en ese tiempo). En el lobby la fija
  // DrawSummaryHost: el hueco del ciclo que queda hasta la próxima fase, igual en todas las máquinas.
  durationMs?: number
  // Se llama UNA vez: al cumplirse la duración o al saltar.
  onDone: (reason: WinningTicketsDoneReason) => void
}

type Column = 'code' | 'terminal' | 'game' | 'prize'

// Ancho de cada columna en el grid de filas y encabezado.
const COLUMN_WIDTHS: Record<Column, string> = {
  code: '1.5fr',
  terminal: '1fr',
  game: '1fr',
  prize: '1.2fr',
}

const MONEY_FORMATTER = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 2 })

// El código impreso es lo que se presenta para cobrar: en una pantalla pública nunca se muestra
// entero, ni siquiera el del ticket local.
function maskCode(code: string): string {
  return `•••• ${code.replace(/\D/g, '').slice(-4)}`
}

function formatClock(totalSeconds: number): string {
  return `${Math.floor(totalSeconds / 60)}:${String(totalSeconds % 60).padStart(2, '0')}`
}

function gridStyle(columns: Column[]): CSSProperties {
  return { gridTemplateColumns: columns.map((column) => COLUMN_WIDTHS[column]).join(' ') }
}

function TrophyIcon() {
  return (
    <svg viewBox="0 0 24 24" className="winning-tickets-trophy" aria-hidden="true" focusable="false">
      <path
        fill="currentColor"
        d="M6 3h12v2h2.5a1.5 1.5 0 0 1 1.5 1.5c0 2.9-1.86 5.32-4.44 5.9C16.6 14.2 14.9 15.6 13 15.93V18h3v2H8v-2h3v-2.07c-1.9-.33-3.6-1.73-4.56-3.53C3.86 11.82 2 9.4 2 6.5A1.5 1.5 0 0 1 3.5 5H6V3zm0 4H4c.2 1.68 1.2 3.1 2.6 3.72A9.6 9.6 0 0 1 6 7zm12 0a9.6 9.6 0 0 1-.6 3.72C18.8 10.1 19.8 8.68 20 7h-2z"
      />
    </svg>
  )
}

function SkipIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path d="M5 6l8 6-8 6V6zm9 0l8 6-8 6V6z" fill="currentColor" />
    </svg>
  )
}

function DrawResult({ draw }: { draw: WinningTicketsDraw }) {
  const { t } = useTranslation()
  if (draw.game === 'roulette' && draw.result.roulette) {
    const pocket = draw.result.roulette === '00' ? '00' : Number(draw.result.roulette)
    return (
      <span className="winning-tickets-result-number" data-color={getRouletteColor(pocket)}>
        {draw.result.roulette}
      </span>
    )
  }
  return (
    <span className="winning-tickets-result-picks">
      {(['pick3', 'pick4'] as const).map((modalidad) =>
        draw.result[modalidad] ? (
          <span key={modalidad} className="winning-tickets-result-pick">
            <span className="winning-tickets-result-pick-label">{t(`winningTickets.games.${modalidad}`)}</span>
            <span className="winning-tickets-result-pick-digits">{draw.result[modalidad]}</span>
          </span>
        ) : null,
      )}
    </span>
  )
}

const COUNT_FORMATTER = new Intl.NumberFormat('en-US')
// Misma referencia en cada render (la lista pendiente no debe rearmar el scroll cada segundo).
const NO_TICKETS: WinningTicket[] = []

// Atributos del número ganador (solo Roulette). 0 y 00 no pertenecen a ningún grupo exterior: "—".
function NumberAttributes({ result }: { result: string }) {
  const { t } = useTranslation()
  const attributes = getRouletteNumberAttributes(result === '00' ? '00' : Number(result))
  const notApplicable = t('winningTickets.summary.notApplicable')
  const items: Array<{ key: string; value: string; color?: string }> = [
    { key: 'color', value: t(`winningTickets.summary.colors.${attributes.color}`), color: attributes.color },
    { key: 'dozen', value: attributes.dozen ? t(`winningTickets.summary.dozens.${attributes.dozen}`) : notApplicable },
    { key: 'column', value: attributes.column ? t('winningTickets.summary.columnValue', { column: attributes.column }) : notApplicable },
    { key: 'parity', value: attributes.parity ? t(`winningTickets.summary.parities.${attributes.parity}`) : notApplicable },
    { key: 'range', value: attributes.range ? t(`winningTickets.summary.ranges.${attributes.range}`) : notApplicable },
  ]
  return (
    <dl className="winning-tickets-attributes">
      {items.map((item) => (
        <div key={item.key} className="winning-tickets-attribute">
          <dt className="winning-tickets-stat-label">{t(`winningTickets.summary.attributes.${item.key}`)}</dt>
          <dd className="winning-tickets-attribute-value" data-color={item.color}>
            {item.value}
          </dd>
        </div>
      ))}
    </dl>
  )
}

// Métricas agregadas del sorteo. Total pagado y tickets ganadores salen de la lista si el backend no
// las manda pero la lista sí está; sin ninguna de las dos, "Pendiente".
function SummaryMetrics({ draw }: { draw: WinningTicketsDraw }) {
  const { t } = useTranslation()
  const { metrics, tickets } = draw
  const totalPaid = metrics.totalPaid ?? (tickets ? tickets.reduce((sum, ticket) => sum + ticket.prize, 0) : null)
  const winningTickets = metrics.winningTickets ?? (tickets ? tickets.length : null)
  const cards: Array<{ key: string; value: string | null; money?: boolean }> = [
    { key: 'totalWagered', value: metrics.totalWagered === null ? null : MONEY_FORMATTER.format(metrics.totalWagered), money: true },
    { key: 'totalPaid', value: totalPaid === null ? null : MONEY_FORMATTER.format(totalPaid), money: true },
    { key: 'participatingTickets', value: metrics.participatingTickets === null ? null : COUNT_FORMATTER.format(metrics.participatingTickets) },
    { key: 'winningTickets', value: winningTickets === null ? null : COUNT_FORMATTER.format(winningTickets) },
  ]
  return (
    <div className="winning-tickets-metrics">
      {cards.map((card) => (
        <div key={card.key} className="winning-tickets-metric" data-pending={card.value === null}>
          <span className="winning-tickets-stat-label">{t(`winningTickets.summary.metrics.${card.key}`)}</span>
          <span className={`winning-tickets-stat-value${card.money && card.value !== null ? ' winning-tickets-stat-value--money' : ''}`}>
            {card.value ?? t('winningTickets.summary.pending')}
          </span>
        </div>
      ))}
    </div>
  )
}

function ColumnHeaders({ columns }: { columns: Column[] }) {
  const { t } = useTranslation()
  return (
    <div className="winning-tickets-columns" style={gridStyle(columns)}>
      {columns.map((column) => (
        <span key={column} data-column={column}>
          {t(`winningTickets.columns.${column}`)}
        </span>
      ))}
    </div>
  )
}

function TicketRow({ ticket, local, columns }: { ticket: WinningTicket; local: boolean; columns: Column[] }) {
  const { t } = useTranslation()
  const cell: Record<Column, ReactNode> = {
    code: maskCode(ticket.code),
    terminal: ticket.terminal,
    game: t(`winningTickets.games.${ticket.game}`),
    prize: MONEY_FORMATTER.format(ticket.prize),
  }
  return (
    <div className="winning-tickets-row" data-local={local} style={gridStyle(columns)}>
      {columns.map((column) => (
        <span key={column} className="winning-tickets-cell" data-column={column}>
          {cell[column]}
        </span>
      ))}
    </div>
  )
}

// Pantalla completa del lobby después de cada sorteo: arriba el resumen (número ganador con sus
// atributos -- color, docena, columna, par/impar, falta/pasa -- y las métricas de apuestas y premios),
// abajo TODOS los tickets ganadores. La lista se desplaza sola de principio a fin en `durationMs` (con
// una pausa al empezar y otra al terminar) y un botón permite salir antes. Si un ticket de esta
// terminal ganó, va en una tabla propia a la izquierda, fija; si no, la lista general ocupa todo el
// ancho. Sin ganadores, o con la lista todavía no disponible para el lobby, el resumen se muestra igual.
//
// El desplazamiento es una animación de transform (Web Animations API), no scrollTop por frame: la
// mueve el compositor, sin layout ni JS por frame -- importante en el hardware del kiosco (rinde como
// un CPU 4x más lento que el de desarrollo).
export function WinningTicketsScreen({
  draw,
  localTicketCodes,
  durationMs = WINNING_TICKETS_DURATION_MS,
  onDone,
}: WinningTicketsScreenProps) {
  const { t } = useTranslation()
  // null = la lista no está disponible para el lobby (todavía no hay endpoint público): no es "sin ganadores".
  const listPending = draw.tickets === null
  const tickets = draw.tickets ?? NO_TICKETS
  const empty = !listPending && tickets.length === 0
  const totalMs = durationMs

  const localCodes = new Set(localTicketCodes)
  const localWinners = tickets.filter((ticket) => localCodes.has(ticket.code))
  const split = localWinners.length > 0
  const showGame = draw.game === 'quickMoney'
  const allColumns: Column[] = showGame ? ['code', 'terminal', 'game', 'prize'] : ['code', 'terminal', 'prize']
  // La terminal de los tickets locales es siempre esta: no se repite.
  const localColumns: Column[] = showGame ? ['code', 'game', 'prize'] : ['code', 'prize']

  const startRef = useRef(performance.now())
  const doneRef = useRef(false)
  const onDoneRef = useRef(onDone)
  onDoneRef.current = onDone
  const [remainingSeconds, setRemainingSeconds] = useState(Math.ceil(totalMs / 1000))

  function finish(reason: WinningTicketsDoneReason) {
    if (doneRef.current) return
    doneRef.current = true
    onDoneRef.current(reason)
  }

  // Cuenta regresiva y fin. Un solo intervalo de 250ms: el número cambia una vez por segundo, así que
  // React solo re-renderiza cuando cambia de verdad.
  useEffect(() => {
    const tick = () => {
      const left = totalMs - (performance.now() - startRef.current)
      setRemainingSeconds(Math.max(0, Math.ceil(left / 1000)))
      if (left <= 0) finish('finished')
    }
    tick()
    const timer = setInterval(tick, 250)
    return () => clearInterval(timer)
  }, [totalMs])

  // Salir antes también con Escape/Enter (teclado o control remoto del kiosco).
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape' || event.key === 'Enter') finish('skipped')
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  // Barra de progreso: scaleX 1 -> 0 en el compositor.
  const progressRef = useRef<HTMLDivElement>(null)
  useLayoutEffect(() => {
    const bar = progressRef.current
    if (!bar) return
    const animation = bar.animate([{ transform: 'scaleX(1)' }, { transform: 'scaleX(0)' }], {
      duration: totalMs,
      easing: 'linear',
      fill: 'forwards',
    })
    animation.currentTime = performance.now() - startRef.current
    return () => animation.cancel()
  }, [totalMs])

  // Auto-scroll: recorre (alto de la lista - alto visible) en el tiempo que queda entre las dos
  // pausas. Si el tamaño cambia (resize), se rearma en el mismo punto del recorrido.
  const viewportRef = useRef<HTMLDivElement>(null)
  const trackRef = useRef<HTMLDivElement>(null)
  useLayoutEffect(() => {
    const viewport = viewportRef.current
    const track = trackRef.current
    if (!viewport || !track) return
    let animation: Animation | null = null
    const build = () => {
      animation?.cancel()
      animation = null
      const overflow = track.scrollHeight - viewport.clientHeight
      if (overflow <= 0) return
      const hold = Math.min(WINNING_TICKETS_SCROLL_HOLD_MS, totalMs / 4)
      animation = track.animate([{ transform: 'translate3d(0, 0, 0)' }, { transform: `translate3d(0, ${-overflow}px, 0)` }], {
        duration: Math.max(totalMs - 2 * hold, 1),
        delay: hold,
        easing: 'linear',
        fill: 'forwards',
      })
      animation.currentTime = performance.now() - startRef.current
    }
    build()
    const observer = new ResizeObserver(build)
    observer.observe(viewport)
    return () => {
      observer.disconnect()
      animation?.cancel()
    }
  }, [totalMs, tickets, split])

  return (
    <div className="winning-tickets-screen">
      <section className="winning-tickets-panel" data-empty={empty || listPending}>
        <header className="winning-tickets-header">
          <div className="winning-tickets-heading">
            <TrophyIcon />
            <div>
              <h1 className="winning-tickets-title">{t('winningTickets.summaryTitle')}</h1>
              <p className="winning-tickets-subtitle">
                {t(`winningTickets.gameNames.${draw.game}`)} · {t('winningTickets.draw', { number: draw.drawNumber })}
              </p>
            </div>
          </div>

          <div className="winning-tickets-result">
            <span className="winning-tickets-stat-label">{t('winningTickets.result')}</span>
            <DrawResult draw={draw} />
          </div>

          <div className="winning-tickets-controls">
            <div className="winning-tickets-countdown">
              <span className="winning-tickets-countdown-label">{t('winningTickets.continuingIn')}</span>
              <span className="winning-tickets-countdown-value" role="timer">
                {formatClock(remainingSeconds)}
              </span>
            </div>
            <button type="button" className="winning-tickets-skip" onClick={() => finish('skipped')}>
              {t('winningTickets.skip')}
              <SkipIcon />
            </button>
          </div>
        </header>

        <section className="winning-tickets-summary" aria-label={t('winningTickets.summaryTitle')}>
          {draw.game === 'roulette' && draw.result.roulette && <NumberAttributes result={draw.result.roulette} />}
          <SummaryMetrics draw={draw} />
        </section>

        {listPending ? (
          <div className="winning-tickets-empty winning-tickets-empty--pending">
            <TrophyIcon />
            <h2 className="winning-tickets-empty-title">{t('winningTickets.listPendingTitle')}</h2>
            <p className="winning-tickets-empty-message">{t('winningTickets.listPendingMessage')}</p>
          </div>
        ) : empty ? (
          <div className="winning-tickets-empty">
            <TrophyIcon />
            <h2 className="winning-tickets-empty-title">{t('winningTickets.emptyTitle')}</h2>
            <p className="winning-tickets-empty-message">{t('winningTickets.emptyMessage', { number: draw.drawNumber })}</p>
          </div>
        ) : (
          <div className="winning-tickets-body" data-split={split}>
            {split && (
              <aside className="winning-tickets-table winning-tickets-table--local">
                <h2 className="winning-tickets-table-title">
                  <TrophyIcon />
                  {t('winningTickets.localTickets', { count: localWinners.length })}
                </h2>
                <ColumnHeaders columns={localColumns} />
                <div className="winning-tickets-local-rows">
                  {localWinners.map((ticket) => (
                    <TicketRow key={ticket.code} ticket={ticket} local columns={localColumns} />
                  ))}
                </div>
              </aside>
            )}

            <div className="winning-tickets-table winning-tickets-table--all">
              {split && <h2 className="winning-tickets-table-title">{t('winningTickets.allWinners')}</h2>}
              <ColumnHeaders columns={allColumns} />
              <div className="winning-tickets-viewport" ref={viewportRef}>
                <div className="winning-tickets-track" ref={trackRef}>
                  {tickets.map((ticket) => (
                    <TicketRow key={ticket.code} ticket={ticket} local={localCodes.has(ticket.code)} columns={allColumns} />
                  ))}
                </div>
                {/* Degradés fijos arriba/abajo (capas propias, no mask-image: un mask sobre el
                    contenedor se repinta en cada frame del scroll). */}
                <div className="winning-tickets-fade winning-tickets-fade--top" aria-hidden="true" />
                <div className="winning-tickets-fade winning-tickets-fade--bottom" aria-hidden="true" />
              </div>
            </div>
          </div>
        )}

        <div className="winning-tickets-progress" aria-hidden="true">
          <div className="winning-tickets-progress-bar" ref={progressRef} />
        </div>
      </section>
    </div>
  )
}
