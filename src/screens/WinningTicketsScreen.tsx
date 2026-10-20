import { memo, useEffect, useLayoutEffect, useMemo, useRef, useState, type CSSProperties, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { getRouletteColor } from '../utils/rouletteColors'
import { getRouletteNumberAttributes } from '../utils/rouletteNumberAttributes'
import { getDirectoPrizes } from '../utils/quickMoneyPayout'
import { WINNING_TICKETS_DURATION_MS, WINNING_TICKETS_SCROLL_HOLD_MS } from '../layout/layout.constants'
import type { WinningTicket, WinningTicketsDraw } from '../types/winningTickets'
import { nextSegment, renderRange, rowAt, type ScrollSegment } from '../utils/winningTicketsScroll'
import './winningTicketsScreen.css'

export type WinningTicketsDoneReason = 'finished' | 'skipped'

interface WinningTicketsScreenProps {
  draw: WinningTicketsDraw
  // machine.id de ESTA terminal (null mientras no se conoce): sus tickets ganadores van en su propia
  // tabla al lado de la lista general durante toda la pantalla.
  localMachineId: number | null
  // Cuánto dura la pantalla (el scroll recorre la lista completa en ese tiempo). En el lobby la fija
  // DrawSummaryHost: el hueco del ciclo que queda hasta la próxima fase, igual en todas las máquinas.
  durationMs?: number
  // Se llama UNA vez: al cumplirse la duración o al saltar.
  onDone: (reason: WinningTicketsDoneReason) => void
}

type Column = 'code' | 'terminal' | 'prize'

// Columnas de cada tabla: constantes (misma referencia en cada render) para que TicketRow memoizado
// no se vuelva a pintar con cada tick de la cuenta regresiva. La tabla local no repite la terminal
// (es siempre esta). Sin columna de juego en Quick Money: un mismo ticket mezcla apuestas que se
// evalúan contra Pick 3 y contra Pick 4.
const ALL_COLUMNS: Column[] = ['code', 'terminal', 'prize']
const LOCAL_COLUMNS: Column[] = ['code', 'prize']

// Lista virtualizada: solo están en el DOM las filas visibles más las que van a entrar en los próximos
// RANGE_LOOKAHEAD_MS (el scroll lo mueve el compositor; React tiene que llegar antes). Con miles de
// ganadores, pintar todas las filas trababa el kiosco (rinde como un CPU 4x más lento).
const INITIAL_RENDERED_ROWS = 30
const RANGE_UPDATE_MS = 100
const RANGE_LOOKAHEAD_MS = 400
const RANGE_OVERSCAN_ROWS = 4

// Ancho de cada columna en el grid de filas y encabezado.
const COLUMN_WIDTHS: Record<Column, string> = {
  code: '1.5fr',
  terminal: '1fr',
  prize: '1.2fr',
}

const MONEY_FORMATTER = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 2 })

// El código impreso es lo que se presenta para cobrar: en una pantalla pública nunca se muestra
// entero, ni siquiera el del ticket local. El backend ya lo manda enmascarado (••••1234); esto solo
// le da el formato de la pantalla.
function maskCode(code: string): string {
  return `•••• ${code.replace(/^•+/, '').slice(-4)}`
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
  const { pick3, pick4 } = draw.result
  // Primera / segunda / tercera (ver getDirectoPrizes): solo con los dos resultados completos.
  const prizes = pick3?.length === 3 && pick4?.length === 4 ? getDirectoPrizes(pick3, pick4) : null
  return (
    <>
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
      {prizes && (
        <dl className="winning-tickets-attributes winning-tickets-prizes">
          {(['first', 'second', 'third'] as const).map((place) => (
            <div key={place} className="winning-tickets-attribute">
              <dt className="winning-tickets-stat-label">{t(`winningTickets.summary.prizes.${place}`)}</dt>
              <dd className="winning-tickets-prize-digits">{prizes[place]}</dd>
            </div>
          ))}
        </dl>
      )}
    </>
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
// las manda pero la lista sí está completa; sin ninguna de las dos, "Pendiente".
function SummaryMetrics({ draw }: { draw: WinningTicketsDraw }) {
  const { t } = useTranslation()
  const { metrics } = draw
  const tickets = draw.ticketsComplete === false ? null : draw.tickets
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

interface TicketRowProps {
  ticket: WinningTicket
  local: boolean
  columns: Column[]
  // Posición en la lista completa (la general): da el zebra, que con la lista virtualizada ya no puede
  // salir de :nth-child.
  index?: number
}

const TicketRow = memo(function TicketRow({ ticket, local, columns, index }: TicketRowProps) {
  const cell: Record<Column, ReactNode> = {
    code: maskCode(ticket.code),
    terminal: ticket.terminal,
    prize: MONEY_FORMATTER.format(ticket.prize),
  }
  return (
    <div
      className="winning-tickets-row"
      data-local={local}
      data-index={index}
      data-alt={index !== undefined && index % 2 === 1}
      style={gridStyle(columns)}
    >
      {columns.map((column) => (
        <span key={column} className="winning-tickets-cell" data-column={column}>
          {cell[column]}
        </span>
      ))}
    </div>
  )
})

// Pantalla completa del lobby después de cada sorteo: arriba el número ganador con sus atributos
// (color, docena, columna, par/impar, falta/pasa) en un cuadro del encabezado y, debajo, las
// métricas de apuestas y premios a todo el ancho,
// abajo TODOS los tickets ganadores. La lista se desplaza sola de principio a fin en `durationMs` (con
// una pausa al empezar y otra al terminar) y un botón permite salir antes. Si un ticket de esta
// terminal ganó, va en una tabla propia a la izquierda, fija; si no, la lista general ocupa todo el
// ancho. Sin ganadores, o con la lista todavía no disponible para el lobby, el resumen se muestra igual.
//
// La lista puede llegar por páginas (api/drawWinners.ts) y tener miles de filas: se abre con la
// primera página, las siguientes se agregan al final y el recorrido sigue desde donde está, más
// rápido, para llegar igual al último ganador antes de cerrar. Solo las filas cercanas a la vista
// están en el DOM.
//
// El desplazamiento es una animación de transform (Web Animations API), no scrollTop por frame: la
// mueve el compositor, sin layout ni JS por frame -- importante en el hardware del kiosco (rinde como
// un CPU 4x más lento que el de desarrollo). El único JS periódico es elegir qué filas montar.
export function WinningTicketsScreen({
  draw,
  localMachineId,
  durationMs = WINNING_TICKETS_DURATION_MS,
  onDone,
}: WinningTicketsScreenProps) {
  const { t } = useTranslation()
  // null = la lista no está disponible para el lobby (todavía no hay endpoint público): no es "sin ganadores".
  const listPending = draw.tickets === null
  const tickets = draw.tickets ?? NO_TICKETS
  const count = tickets.length
  // Siguen llegando páginas: [] todavía no es "sin ganadores".
  const loading = !listPending && draw.ticketsComplete === false
  const empty = !listPending && !loading && count === 0
  const showList = !listPending && !empty
  const totalMs = durationMs

  // Se recalcula solo cuando llega una página nueva (no con cada tick de la cuenta regresiva).
  const localWinners = useMemo(
    () => (localMachineId === null ? NO_TICKETS : tickets.filter((ticket) => ticket.machineId === localMachineId)),
    [tickets, localMachineId],
  )
  const split = localWinners.length > 0

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

  // --- Lista general: virtualizada + auto-scroll ---
  const viewportRef = useRef<HTMLDivElement>(null)
  const trackRef = useRef<HTMLDivElement>(null)
  // Paso entre filas (alto + separación) y alto visible, en px. null hasta medir la primera fila.
  const [rowLayout, setRowLayout] = useState<{ pitch: number; viewportHeight: number } | null>(null)
  const segmentRef = useRef<ScrollSegment | null>(null)
  const [range, setRange] = useState<[number, number]>([0, INITIAL_RENDERED_ROWS])
  const hasRows = count > 0

  // Medición: con la primera fila montada y en cada resize del viewport.
  useLayoutEffect(() => {
    const viewport = viewportRef.current
    const track = trackRef.current
    if (!showList || !hasRows || !viewport || !track) return
    const measure = () => {
      const row = track.firstElementChild as HTMLElement | null
      if (!row) return
      const pitch = row.offsetHeight + parseFloat(getComputedStyle(row).marginBottom || '0')
      const viewportHeight = viewport.clientHeight
      if (pitch <= 0) return
      setRowLayout((prev) => (prev && prev.pitch === pitch && prev.viewportHeight === viewportHeight ? prev : { pitch, viewportHeight }))
    }
    measure()
    const observer = new ResizeObserver(measure)
    observer.observe(viewport)
    return () => observer.disconnect()
  }, [showList, hasRows, split])

  // Auto-scroll: un tramo nuevo cada vez que cambia el largo de la lista (llegó una página) o el
  // tamaño. Sigue desde la fila actual -- sin salto -- y llega a la última al empezar la pausa final.
  useLayoutEffect(() => {
    const track = trackRef.current
    if (!track || !rowLayout) return
    const { pitch, viewportHeight } = rowLayout
    const elapsed = performance.now() - startRef.current
    const hold = Math.min(WINNING_TICKETS_SCROLL_HOLD_MS, totalMs / 4)
    const segment = nextSegment(segmentRef.current, elapsed, count - viewportHeight / pitch, hold, totalMs)
    segmentRef.current = segment
    if (!segment) return
    const animation = track.animate(
      [
        { transform: `translate3d(0, ${-segment.fromRow * pitch}px, 0)` },
        { transform: `translate3d(0, ${-segment.toRow * pitch}px, 0)` },
      ],
      { duration: segment.endMs - segment.startMs, delay: segment.startMs, easing: 'linear', fill: 'both' },
    )
    animation.currentTime = elapsed
    return () => animation.cancel()
  }, [rowLayout, count, totalMs])

  // Qué filas montar: las visibles y las que van a entrar en los próximos RANGE_LOOKAHEAD_MS. Solo
  // re-renderiza cuando el rango cambia.
  useEffect(() => {
    if (!rowLayout) return
    const visibleRows = rowLayout.viewportHeight / rowLayout.pitch
    const update = () => {
      const elapsed = performance.now() - startRef.current
      const segment = segmentRef.current
      const next = renderRange(rowAt(segment, elapsed), rowAt(segment, elapsed + RANGE_LOOKAHEAD_MS), visibleRows, count, RANGE_OVERSCAN_ROWS)
      setRange((prev) => (prev[0] === next[0] && prev[1] === next[1] ? prev : next))
    }
    update()
    const timer = setInterval(update, RANGE_UPDATE_MS)
    return () => clearInterval(timer)
  }, [rowLayout, count])

  const [rangeStart, rangeEnd] = rowLayout ? range : [0, Math.min(count, INITIAL_RENDERED_ROWS)]
  const trackStyle: CSSProperties | undefined = rowLayout
    ? { height: count * rowLayout.pitch, paddingTop: rangeStart * rowLayout.pitch }
    : undefined

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

          {/* Cuadro del resultado: el número y sus atributos juntos, así la fila del resumen queda
              entera para los totales (con montos grandes se cortaban). */}
          <div className="winning-tickets-result">
            <span className="winning-tickets-stat-label">{t('winningTickets.result')}</span>
            <div className="winning-tickets-result-body">
              <DrawResult draw={draw} />
              {draw.game === 'roulette' && draw.result.roulette && <NumberAttributes result={draw.result.roulette} />}
            </div>
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
                <ColumnHeaders columns={LOCAL_COLUMNS} />
                <div className="winning-tickets-local-rows">
                  {/* Por posición: enmascarados, dos códigos pueden verse iguales. */}
                  {localWinners.map((ticket, i) => (
                    <TicketRow key={i} ticket={ticket} local columns={LOCAL_COLUMNS} />
                  ))}
                </div>
              </aside>
            )}

            <div className="winning-tickets-table winning-tickets-table--all">
              {split && <h2 className="winning-tickets-table-title">{t('winningTickets.allWinners')}</h2>}
              <ColumnHeaders columns={ALL_COLUMNS} />
              <div className="winning-tickets-viewport" ref={viewportRef}>
                <div className="winning-tickets-track" ref={trackRef} style={trackStyle}>
                  {tickets.slice(rangeStart, rangeEnd).map((ticket, offset) => (
                    <TicketRow
                      key={rangeStart + offset}
                      ticket={ticket}
                      local={ticket.machineId === localMachineId}
                      columns={ALL_COLUMNS}
                      index={rangeStart + offset}
                    />
                  ))}
                </div>
                {/* Degradés fijos arriba/abajo (capas propias, no mask-image: un mask sobre el
                    contenedor se repinta en cada frame del scroll). */}
                <div className="winning-tickets-fade winning-tickets-fade--top" aria-hidden="true" />
                <div className="winning-tickets-fade winning-tickets-fade--bottom" aria-hidden="true" />
                {loading && (
                  <div className="winning-tickets-receiving" role="status">
                    {draw.metrics.winningTickets === null
                      ? t('winningTickets.receiving')
                      : t('winningTickets.receivingCount', {
                          received: COUNT_FORMATTER.format(count),
                          total: COUNT_FORMATTER.format(draw.metrics.winningTickets),
                        })}
                  </div>
                )}
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
