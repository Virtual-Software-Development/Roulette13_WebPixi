import { useEffect, useLayoutEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { useWindowViewport } from '../hooks/useViewport'
import { useCountdown } from '../hooks/useCountdown'
import { useGameConfigStore } from '../store/useGameConfigStore'
import { useResultsStore } from '../store/useResultsStore'
import { useLobbyModeStore, useQuickMoneySplitVisible } from '../store/useLobbyModeStore'
import { useQuickMoneyRoundStore } from '../store/useQuickMoneyRoundStore'
import { useQuickMoneyDrawsStore } from '../store/useQuickMoneyDrawsStore'
import { useQuickMoneyResultTablesStore, type DrawsTable } from '../store/useQuickMoneyResultTablesStore'
import { useRoundHistoryStore } from '../store/useRoundHistoryStore'
import { DESIGN_HEIGHT, DESIGN_WIDTH } from '../layout/layout.constants'
import {
  QUICK_MONEY_SPLIT_TRANSITION_MS,
  RESULTS_PANEL_FADE_MS,
  resultsPanelViewAt,
  type ResultsPanelView,
} from '../config/quickMoneyLobbyCycle'
import { startQuickMoneyResultTables } from '../sync/quickMoneyResultTables'
import { serverNow } from '../time/serverClock'
import { getRouletteColor, toWheelPocket } from '../utils/rouletteColors'
import { buildMediaUrl } from '../utils/media'
import type { QuickMoneyGameType } from '../types/quickMoneyBet'
import './quickMoneySplitOverlay.css'

const QUICK_MONEY_LOGO_URL = buildMediaUrl('Website_svg_icons/43_quick-money-logo.svg')
const ROULETTE_RECENT_LIMIT = 5
const ROW_TIME_FORMATTER = new Intl.DateTimeFormat('en-US', { hour: 'numeric', minute: '2-digit' })
const GAME_TYPES: QuickMoneyGameType[] = ['pick3', 'pick4']
// Últimos segundos del countdown de Quick Money: además del rojo (useCountdown.urgent, <=10s) el
// panel late suave -- ver .qms-center-panel[data-critical].
const CRITICAL_SECONDS = 5

function resultFor(draw: { pick3Result: number[]; pick4Result: number[] }, gameType: QuickMoneyGameType): number[] {
  return gameType === 'pick3' ? draw.pick3Result : draw.pick4Result
}

// Cuánto dura el crossfade de un dígito que cambia -- debe coincidir con las animaciones
// qms-digit-in/qms-digit-out del CSS.
const DIGIT_TRANSITION_MS = 380

// Un dígito del countdown. Solo anima cuando SU valor cambia: el valor viejo queda superpuesto y se
// desvanece hacia arriba mientras el nuevo entra desde abajo (solo opacity/transform, compositor).
// Antes se remontaba el countdown entero cada segundo arrancando en opacidad 0.55, y todos los
// dígitos -- también los que no cambiaban -- parpadeaban de golpe (se veía como un glitch).
function CountdownDigit({ char }: { char: string }) {
  const currentRef = useRef(char)
  const [leaving, setLeaving] = useState<{ char: string; id: number } | null>(null)
  const [animateIn, setAnimateIn] = useState(false)

  useLayoutEffect(() => {
    if (currentRef.current === char) return
    setLeaving({ char: currentRef.current, id: Date.now() })
    setAnimateIn(true)
    currentRef.current = char
    const timer = setTimeout(() => setLeaving(null), DIGIT_TRANSITION_MS)
    return () => clearTimeout(timer)
  }, [char])

  return (
    <span className="qms-digit">
      <span key={char} className="qms-digit-current" data-animate={animateIn}>
        {char}
      </span>
      {leaving && (
        <span key={leaving.id} className="qms-digit-leaving" aria-hidden="true">
          {leaving.char}
        </span>
      )}
    </span>
  )
}

// Countdown MM:SS -- cada posición es un CountdownDigit independiente (los ':' no animan nunca);
// tabular-nums (CSS) mantiene fija la posición de cada dígito.
function CountdownDigits({ display }: { display: string }) {
  return (
    <span className="qms-countdown-digits" aria-label={display}>
      {display.split('').map((char, index) =>
        /\d/.test(char) ? <CountdownDigit key={index} char={char} /> : <span key={index}>{char}</span>,
      )}
    </span>
  )
}

// Título de panel con la barra roja de acento a la izquierda.
function PanelTitle({ children }: { children: ReactNode }) {
  return (
    <h2 className="qms-title">
      <span className="qms-title-bar" aria-hidden="true" />
      {children}
    </h2>
  )
}

// Dígitos en fichas cuadradas. `variant`: 'current' (blanca, número oscuro -- resultado actual:
// Last Winning y la fila más reciente) o 'history' (oscura, más discreta). `pop`: microanimación de
// aparición para un resultado recién llegado -- el caller remonta con key = gameNumber, así corre una
// vez por resultado nuevo y después queda en estado normal.
function Tiles({ digits, size, variant, pop = false }: { digits: number[]; size: 'lg' | 'sm'; variant: 'current' | 'history'; pop?: boolean }) {
  return (
    <div className="qms-tiles" data-pop={pop}>
      {digits.map((digit, index) => (
        <span key={index} className={`qms-tile qms-tile--${size}`} data-variant={variant}>
          {digit}
        </span>
      ))}
    </div>
  )
}

// Countdown + últimos resultados de Roulette, debajo de la rueda. El fondo de este panel lo pinta
// QuickMoneySplitBackdrop (debajo de la rueda); acá solo el contenido, encima del canvas.
function RoulettePanelContent() {
  const { t } = useTranslation()
  const nextDrawStartTime = useGameConfigStore((state) => state.nextDrawStartTime)
  const countdown = useCountdown(nextDrawStartTime)
  const currentWinner = useResultsStore((state) => state.currentWinner)
  const history = useResultsStore((state) => state.history)
  const recent = (currentWinner ? [currentWinner, ...history] : history).slice(0, ROULETTE_RECENT_LIMIT)

  return (
    <div className="qms-roulette-content">
      <span className="qms-label">{t('quickMoneySplit.nextRouletteIn')}</span>
      <span className="qms-roulette-countdown" data-urgent={countdown.urgent}>
        <CountdownDigits display={countdown.display} />
      </span>
      <div className="qms-roulette-recent">
        {recent.map((result) => {
          const pocket = toWheelPocket(result.winningNumber)
          return (
            <span key={result.id} className="qms-roulette-chip" data-color={getRouletteColor(pocket)}>
              {pocket}
            </span>
          )
        })}
      </div>
    </div>
  )
}

// Panel central: próximo sorteo (foco principal) + último resultado.
function CenterPanel() {
  const { t } = useTranslation()
  const nextDrawTime = useQuickMoneyRoundStore((state) => state.nextDrawTime)
  const drawNumber = useQuickMoneyRoundStore((state) => state.drawNumber)
  const pendingDraw = useLobbyModeStore((state) => state.pendingDraw)
  const latest = useQuickMoneyDrawsStore((state) => state.draws[0])
  const countdown = useCountdown(nextDrawTime)
  // Mientras hay un sorteo pendiente (llegó la hora, esperando su video) el reloj ya avanzó al
  // próximo -- se congela en 00:00 con el número del sorteo en curso.
  const display = pendingDraw ? '00:00' : countdown.display
  const gameNumber = pendingDraw ? pendingDraw.gameNumber : drawNumber
  const urgent = pendingDraw ? true : countdown.urgent
  const critical = !pendingDraw && countdown.remainingSeconds > 0 && countdown.remainingSeconds <= CRITICAL_SECONDS

  return (
    <div className="qms-card qms-center-panel" data-critical={critical}>
      <div className="qms-next-draw">
        <img src={QUICK_MONEY_LOGO_URL} className="qms-logo" alt="" />
        <span className="qms-label">{t('quickMoneySplit.nextDrawIn')}</span>
        <span className="qms-next-draw-countdown" data-urgent={urgent}>
          <CountdownDigits display={display} />
        </span>
        <span className="qms-game-number">
          {t('quickMoneyLobby.gameNumber')} #{gameNumber}
        </span>
      </div>

      <span className="qms-center-divider" aria-hidden="true" />

      <div className="qms-last-winning">
        <PanelTitle>{t('quickMoneySplit.lastWinning')}</PanelTitle>
        {latest &&
          GAME_TYPES.map((gameType) => (
            <div key={gameType} className="qms-pick-card">
              <span className="qms-pick-card-label">{t(`quickMoneyBettingView.gameType.${gameType}`)}</span>
              <Tiles key={latest.gameNumber} digits={resultFor(latest, gameType)} size="lg" variant="current" pop />
            </div>
          ))}
      </div>
    </div>
  )
}

// Filas de cada mitad de Winning Numbers (hoy / ayer): con el horario de Quick Money (5 sorteos por
// día) entra el día completo.
const DAY_TABLE_ROWS = 5
const AMOUNT_FORMATTER = new Intl.NumberFormat('en-US', { maximumFractionDigits: 2 })

// Una mitad de Winning Numbers. Grilla de divs (no <table>) para poder redondear y enmarcar la fila
// más reciente. Sin sorteos (o si el backend falló, mientras reintenta) muestra emptyText.
function DayResultsTable({
  title,
  table,
  emptyText,
  highlightLatest,
  popLatest,
}: {
  title: string
  table: DrawsTable
  emptyText: string
  highlightLatest: boolean
  popLatest: boolean
}) {
  const { t } = useTranslation()
  const draws = table.draws.slice(0, DAY_TABLE_ROWS)

  return (
    <div className="qms-day-results">
      <PanelTitle>{title}</PanelTitle>
      <div className="qms-table qms-table--compact" role="table">
        <div className="qms-table-row qms-table-head" role="row">
          <span role="columnheader">{t('quickMoneySplit.columnTime')}</span>
          <span role="columnheader">{t('quickMoneySplit.columnGame')}</span>
          {GAME_TYPES.map((gameType) => (
            <span key={gameType} role="columnheader">
              {t(`quickMoneyBettingView.gameType.${gameType}`)}
            </span>
          ))}
        </div>
        <div className="qms-table-body">
          {draws.length === 0 && table.status !== 'loading' && <p className="qms-table-empty">{emptyText}</p>}
          {draws.map((draw, index) => {
            // La fila más reciente de hoy se distingue (marco rojo tenue, fichas blancas); recién
            // llegada (fase quickMoneyResult) además hace el pop.
            const isLatest = highlightLatest && index === 0
            return (
              <div key={draw.gameNumber} className="qms-table-row" role="row" data-latest={isLatest}>
                <span className="qms-table-time" role="cell">
                  {ROW_TIME_FORMATTER.format(new Date(draw.drawnAt))}
                </span>
                <span className="qms-table-game" role="cell">
                  #{draw.gameNumber}
                </span>
                {GAME_TYPES.map((gameType) => (
                  <span key={gameType} role="cell">
                    <Tiles
                      digits={resultFor(draw, gameType)}
                      size="sm"
                      variant={isLatest ? 'current' : 'history'}
                      pop={popLatest && isLatest}
                    />
                  </span>
                ))}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

// Winning Numbers: los sorteos de hoy arriba, los de ayer abajo.
function WinningNumbersView({ active, popLatest }: { active: boolean; popLatest: boolean }) {
  const { t } = useTranslation()
  const today = useQuickMoneyResultTablesStore((state) => state.today)
  const yesterday = useQuickMoneyResultTablesStore((state) => state.yesterday)
  const openHistory = useRoundHistoryStore((state) => state.open)

  return (
    <div className="qms-results-view" data-active={active} aria-hidden={!active}>
      <DayResultsTable
        title={t('quickMoneySplit.winningNumbers')}
        table={today}
        emptyText={t('quickMoneySplit.noDrawsToday')}
        highlightLatest
        popLatest={popLatest}
      />
      <DayResultsTable
        title={t('quickMoneySplit.yesterdayResults')}
        table={yesterday}
        emptyText={t('quickMoneySplit.noDrawsYesterday')}
        highlightLatest={false}
        popLatest={false}
      />
      {/* Mismo botón que el de la tarjeta de Roulette (GameList), abre el historial de Quick Money. */}
      <button type="button" className="qms-history-button" onClick={() => openHistory('quickMoney')} tabIndex={active ? 0 : -1}>
        <svg className="qms-history-button-icon" viewBox="0 0 21 16" aria-hidden="true" focusable="false">
          <rect x="0" y="9" width="3" height="7" />
          <rect x="6" y="4" width="3" height="12" />
          <rect x="12" y="7" width="3" height="9" />
          <rect x="18" y="1" width="3" height="15" />
        </svg>
        {t('gameList.viewFullHistory')}
      </button>
    </div>
  )
}

// Fast Payments: nombre de la apuesta y lo que paga (de las reglas de pago activas del backend).
function FastPaymentsView({ active }: { active: boolean }) {
  const { t } = useTranslation()
  const rows = useQuickMoneyResultTablesStore((state) => state.paytable.rows)

  return (
    <div className="qms-results-view" data-active={active} aria-hidden={!active}>
      <PanelTitle>{t('quickMoneySplit.fastPayments')}</PanelTitle>
      <div className="qms-paytable" role="table">
        {rows.map((row) => (
          <div key={row.nombre} className="qms-paytable-row" role="row">
            <span className="qms-paytable-name" role="cell">
              {row.nombre}
            </span>
            <span className="qms-paytable-amount" role="cell">
              ${AMOUNT_FORMATTER.format(row.pago)}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}

// Panel derecho: rota Winning Numbers <-> Fast Payments con el reloj del servidor (ver
// resultsPanelViewAt). Con un resultado recién llegado (fase quickMoneyResult) queda en Winning
// Numbers para que se vea su pop. Solo hace polling mientras el split está visible.
function useResultsPanelView(visible: boolean, forceWinning: boolean): ResultsPanelView {
  const [view, setView] = useState<ResultsPanelView>(() => resultsPanelViewAt(serverNow()))

  useEffect(() => {
    if (!visible) return
    const tick = () => setView(resultsPanelViewAt(serverNow()))
    tick()
    const timer = setInterval(tick, 250)
    return () => clearInterval(timer)
  }, [visible])

  return forceWinning ? 'winning' : view
}

function ResultsPanel({ visible, newResult }: { visible: boolean; newResult: boolean }) {
  const view = useResultsPanelView(visible, newResult)

  useEffect(() => startQuickMoneyResultTables(), [])

  return (
    <div className="qms-card qms-winning-numbers">
      <WinningNumbersView active={view === 'winning'} popLatest={newResult} />
      <FastPaymentsView active={view === 'paytable'} />
    </div>
  )
}

// Caja de DESIGN_WIDTH x DESIGN_HEIGHT escalada con el cover-scale de useViewport, así las medidas en
// px de diseño caen donde caerían en Pixi -- compartida con QuickMoneySplitBackdrop para que el
// fondo del panel de Roulette y su contenido queden exactamente superpuestos.
function SplitStage({ children }: { children: ReactNode }) {
  const { scale, offsetX, offsetY } = useWindowViewport()
  return (
    <div
      className="qms-stage"
      style={{
        width: DESIGN_WIDTH,
        height: DESIGN_HEIGHT,
        transform: `translate(${offsetX}px, ${offsetY}px) scale(${scale})`,
      }}
    >
      {children}
    </div>
  )
}

const TRANSITION_STYLE = {
  ['--qms-transition-ms' as string]: `${QUICK_MONEY_SPLIT_TRANSITION_MS}ms`,
  ['--qms-results-fade-ms' as string]: `${RESULTS_PANEL_FADE_MS}ms`,
} as CSSProperties

// Mitad Quick Money del lobby compartido (fases quickMoneySplit/quickMoneyResult, ver
// config/quickMoneyLobbyCycle.ts): tres paneles -- Roulette (la rueda achicada de
// LobbyBackgroundLayer + su countdown/resultados), Quick Money actual y resultados/pagos. DOM puro, fuera de
// Pixi. Oculto mientras hay una ronda de Roulette en pantalla (los videos de sorteo tienen alfa real
// y dejarían ver esto por detrás).
export function QuickMoneySplitOverlay() {
  const phase = useLobbyModeStore((state) => state.phase)
  const visible = useQuickMoneySplitVisible()

  return (
    <div className="qms-overlay" data-visible={visible} style={TRANSITION_STYLE} aria-hidden={!visible}>
      <SplitStage>
        <RoulettePanelContent />
        <CenterPanel />
        <ResultsPanel visible={visible} newResult={phase === 'quickMoneyResult'} />
      </SplitStage>
    </div>
  )
}

// Fondo del panel de Roulette -- se monta DENTRO de LobbyBackgroundLayer, antes de la rueda, para
// quedar debajo de ella (el overlay de arriba va encima del canvas y taparía la rueda). Mismo
// encuadre y misma visibilidad/transición que el overlay.
export function QuickMoneySplitBackdrop() {
  const visible = useQuickMoneySplitVisible()
  return (
    <div className="qms-overlay qms-backdrop" data-visible={visible} style={TRANSITION_STYLE} aria-hidden="true">
      <SplitStage>
        <div className="qms-card qms-roulette-panel" />
      </SplitStage>
    </div>
  )
}
