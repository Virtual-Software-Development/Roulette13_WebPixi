import { useCallback, useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useTranslation } from 'react-i18next'
import { useFocusTrap } from '../../hooks/useFocusTrap'
import {
  fetchQuickMoneyRoundHistory,
  fetchRouletteRoundHistory,
  type QuickMoneyRoundHistoryEntry,
  type RouletteRoundHistoryEntry,
} from '../../api/roundHistory'
import { useRoundHistoryStore, type RoundHistoryGame } from '../../store/useRoundHistoryStore'
import { getRouletteColor, toWheelPocket } from '../../utils/rouletteColors'
import './roundHistoryModal.css'

const PAGE_SIZE_OPTIONS = [10, 20, 50] as const
type PageSize = (typeof PAGE_SIZE_OPTIONS)[number]

const DATE_FORMATTER = new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
const TIME_FORMATTER = new Intl.DateTimeFormat(undefined, { hour: '2-digit', minute: '2-digit', second: '2-digit' })

const GAMES: RoundHistoryGame[] = ['roulette', 'quickMoney']

type Rounds =
  | { game: 'roulette'; rounds: RouletteRoundHistoryEntry[] }
  | { game: 'quickMoney'; rounds: QuickMoneyRoundHistoryEntry[] }

type LoadState = { status: 'loading' } | { status: 'error' } | ({ status: 'ready' } & Rounds)

function fetchRounds(game: RoundHistoryGame, signal: AbortSignal): Promise<Rounds> {
  return game === 'roulette'
    ? fetchRouletteRoundHistory(signal).then((rounds) => ({ game, rounds }))
    : fetchQuickMoneyRoundHistory(signal).then((rounds) => ({ game, rounds }))
}

// Hasta 7 botones de página: 1 … actual-1 actual actual+1 … última.
function pageButtons(current: number, total: number): (number | 'gap')[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1)
  const pages = new Set([1, total, current - 1, current, current + 1])
  const sorted = [...pages].filter((p) => p >= 1 && p <= total).sort((a, b) => a - b)
  const out: (number | 'gap')[] = []
  sorted.forEach((page, i) => {
    if (i > 0 && page - sorted[i - 1] > 1) out.push('gap')
    out.push(page)
  })
  return out
}

function ResultPill({ raw }: { raw: number }) {
  const pocket = toWheelPocket(raw)
  return (
    <span className="round-history-pill" data-color={getRouletteColor(pocket)}>
      {pocket}
    </span>
  )
}

// Pop-up "View Full History" del lobby (puerto 4100): las últimas rondas liquidadas del juego elegido
// en el selector del header (Roulette o Quick Money), paginadas en el cliente. Se abre desde
// ViewHistoryButton (vía useRoundHistoryStore) y se monta en document.body -- mismo motivo que WheelFrameStepper: fuera del stacking context del
// lobby, así los clicks llegan al pop-up y no al canvas de Pixi. La tabla scrollea DENTRO del panel.
export function RoundHistoryModal() {
  const isOpen = useRoundHistoryStore((state) => state.isOpen)
  if (!isOpen) return null
  return createPortal(<RoundHistoryPanel />, document.body)
}

function RoundHistoryPanel() {
  const { t } = useTranslation()
  const close = useRoundHistoryStore((state) => state.close)
  const game = useRoundHistoryStore((state) => state.game)
  const setGame = useRoundHistoryStore((state) => state.setGame)
  const [loadState, setLoadState] = useState<LoadState>({ status: 'loading' })
  const [reloadKey, setReloadKey] = useState(0)
  const [pageSize, setPageSize] = useState<PageSize>(10)
  const [page, setPage] = useState(1)
  const dialogRef = useRef<HTMLDivElement>(null)
  const scrollRef = useRef<HTMLDivElement>(null)

  useFocusTrap(dialogRef, true)

  useEffect(() => {
    const previouslyFocused = document.activeElement as HTMLElement | null
    dialogRef.current?.focus()
    return () => previouslyFocused?.focus()
  }, [])

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') close()
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [close])

  useEffect(() => {
    const controller = new AbortController()
    setLoadState({ status: 'loading' })
    setPage(1)
    fetchRounds(game, controller.signal)
      .then((data) => setLoadState({ status: 'ready', ...data }))
      .catch(() => {
        if (!controller.signal.aborted) setLoadState({ status: 'error' })
      })
    return () => controller.abort()
  }, [reloadKey, game])

  const rounds: readonly unknown[] = loadState.status === 'ready' ? loadState.rounds : []
  const totalPages = Math.max(1, Math.ceil(rounds.length / pageSize))
  const currentPage = Math.min(page, totalPages)
  const pageStart = (currentPage - 1) * pageSize
  const pageRounds = rounds.slice(pageStart, pageStart + pageSize)

  const goToPage = useCallback((next: number) => {
    setPage(next)
    scrollRef.current?.scrollTo({ top: 0 })
  }, [])

  return (
    <div
      className="round-history-backdrop"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) close()
      }}
    >
      <div ref={dialogRef} className="round-history" role="dialog" aria-modal="true" aria-labelledby="round-history-title" tabIndex={-1}>
        <div className="round-history-header">
          <div>
            <div className="round-history-heading">
              <h2 id="round-history-title" className="round-history-title">
                {t('roundHistory.title')}
              </h2>
              <label className="round-history-game">
                <span className="round-history-sr-only">{t('roundHistory.gameLabel')}</span>
                <select value={game} onChange={(e) => setGame(e.target.value as RoundHistoryGame)}>
                  {GAMES.map((g) => (
                    <option key={g} value={g}>
                      {t(`roundHistory.games.${g}`)}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            <p className="round-history-subtitle">{t('roundHistory.subtitle', { count: rounds.length })}</p>
          </div>
          <button type="button" className="round-history-close" aria-label={t('roundHistory.close')} onClick={close}>
            <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
              <path d="M6 6 18 18M18 6 6 18" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
            </svg>
          </button>
        </div>

        <div ref={scrollRef} className="round-history-scroll">
          {loadState.status === 'loading' && <p className="round-history-message">{t('roundHistory.loading')}</p>}
          {loadState.status === 'error' && (
            <div className="round-history-message">
              <p>{t('roundHistory.error')}</p>
              <button type="button" className="round-history-btn" onClick={() => setReloadKey((k) => k + 1)}>
                {t('roundHistory.retry')}
              </button>
            </div>
          )}
          {loadState.status === 'ready' && rounds.length === 0 && <p className="round-history-message">{t('roundHistory.empty')}</p>}
          {loadState.status === 'ready' && loadState.game === 'quickMoney' && rounds.length > 0 && (
            <QuickMoneyTable rounds={loadState.rounds.slice(pageStart, pageStart + pageSize)} />
          )}
          {loadState.status === 'ready' && loadState.game === 'roulette' && rounds.length > 0 && (
            <table className="round-history-table">
              <thead>
                <tr>
                  <th>{t('roundHistory.columns.round')}</th>
                  <th>{t('roundHistory.columns.date')}</th>
                  <th>{t('roundHistory.columns.time')}</th>
                  <th>{t('roundHistory.columns.result')}</th>
                  <th>{t('roundHistory.columns.color')}</th>
                  <th>{t('roundHistory.columns.parity')}</th>
                  <th>{t('roundHistory.columns.range')}</th>
                </tr>
              </thead>
              <tbody>
                {(pageRounds as RouletteRoundHistoryEntry[]).map((round) => {
                  const scheduled = new Date(round.horaProgramada)
                  const raw = round.resultadoEjecutado
                  const pocket = raw === null ? null : toWheelPocket(raw)
                  const isZero = pocket === 0 || pocket === '00'
                  const number = typeof pocket === 'number' ? pocket : 0
                  return (
                    <tr key={`${round.numeroEvento}-${round.horaProgramada}`}>
                      <td className="round-history-round">{t('roundHistory.roundLabel', { round: round.numeroEvento })}</td>
                      <td>{DATE_FORMATTER.format(scheduled)}</td>
                      <td className="round-history-muted">{TIME_FORMATTER.format(scheduled)}</td>
                      <td>{raw === null ? '—' : <ResultPill raw={raw} />}</td>
                      <td>{pocket === null ? '—' : t(`roundHistory.colors.${getRouletteColor(pocket)}`)}</td>
                      <td>{pocket === null ? '—' : isZero ? '—' : t(number % 2 === 0 ? 'roundHistory.even' : 'roundHistory.odd')}</td>
                      <td>{pocket === null ? '—' : isZero ? '—' : t(number <= 18 ? 'roundHistory.low' : 'roundHistory.high')}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          )}
        </div>

        {loadState.status === 'ready' && rounds.length > 0 && (
          <div className="round-history-footer">
            <label className="round-history-page-size">
              {t('roundHistory.rowsPerPage')}
              <select
                value={pageSize}
                onChange={(e) => {
                  setPageSize(Number(e.target.value) as PageSize)
                  goToPage(1)
                }}
              >
                {PAGE_SIZE_OPTIONS.map((size) => (
                  <option key={size} value={size}>
                    {size}
                  </option>
                ))}
              </select>
            </label>

            <span className="round-history-range">
              {t('roundHistory.showing', { from: pageStart + 1, to: Math.min(pageStart + pageSize, rounds.length), total: rounds.length })}
            </span>

            <nav className="round-history-pages" aria-label={t('roundHistory.pagination')}>
              <button
                type="button"
                className="round-history-page-btn"
                disabled={currentPage === 1}
                onClick={() => goToPage(currentPage - 1)}
                aria-label={t('roundHistory.previous')}
              >
                ‹
              </button>
              {pageButtons(currentPage, totalPages).map((entry, i) =>
                entry === 'gap' ? (
                  <span key={`gap-${i}`} className="round-history-page-gap">
                    …
                  </span>
                ) : (
                  <button
                    key={entry}
                    type="button"
                    className="round-history-page-btn"
                    data-active={entry === currentPage}
                    aria-current={entry === currentPage ? 'page' : undefined}
                    onClick={() => goToPage(entry)}
                  >
                    {entry}
                  </button>
                ),
              )}
              <button
                type="button"
                className="round-history-page-btn"
                disabled={currentPage === totalPages}
                onClick={() => goToPage(currentPage + 1)}
                aria-label={t('roundHistory.next')}
              >
                ›
              </button>
            </nav>
          </div>
        )}
      </div>
    </div>
  )
}

// Sorteos de Quick Money: los dígitos de Pick 3 y Pick 4 de cada uno (verde y amarillo, los colores
// de cada juego en el lobby de Quick Money).
function QuickMoneyTable({ rounds }: { rounds: QuickMoneyRoundHistoryEntry[] }) {
  const { t } = useTranslation()
  return (
    <table className="round-history-table">
      <thead>
        <tr>
          <th>{t('roundHistory.columns.round')}</th>
          <th>{t('roundHistory.columns.date')}</th>
          <th>{t('roundHistory.columns.time')}</th>
          <th>{t('roundHistory.columns.pick3')}</th>
          <th>{t('roundHistory.columns.pick4')}</th>
        </tr>
      </thead>
      <tbody>
        {rounds.map((round) => {
          const scheduled = new Date(round.horaProgramada)
          return (
            <tr key={`${round.numeroEvento}-${round.horaProgramada}`}>
              <td className="round-history-round">{t('roundHistory.roundLabel', { round: round.numeroEvento })}</td>
              <td>{DATE_FORMATTER.format(scheduled)}</td>
              <td className="round-history-muted">{TIME_FORMATTER.format(scheduled)}</td>
              <td>{round.pick3 ? <span className="round-history-pill" data-draw="pick3">{round.pick3}</span> : '—'}</td>
              <td>{round.pick4 ? <span className="round-history-pill" data-draw="pick4">{round.pick4}</span> : '—'}</td>
            </tr>
          )
        })}
      </tbody>
    </table>
  )
}
