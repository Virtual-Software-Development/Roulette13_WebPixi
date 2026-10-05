import { useEffect, useState, type FormEvent } from 'react'
import { useTranslation } from 'react-i18next'
import { useGameConfigStore } from '../../../store/useGameConfigStore'
import { useCountdown } from '../../../hooks/useCountdown'
import { useNextDrawSync } from '../../../hooks/useNextDrawSync'
import { useRouletteNextResult } from '../../../hooks/useRouletteNextResult'
import { ensureClockTicking, useClockStore } from '../../../store/useClockStore'
import { AdminAuthError } from '../../../api/adminSession'
import { getRouletteColor } from '../../../utils/rouletteColors'
import { getRouletteParity, getRouletteRange } from '../../../utils/rouletteClassification'
import { parseApiDateTime } from '../../../utils/time'
import { buildMediaUrl } from '../../../utils/media'
import type { WheelPocket } from '../../../types/wheel'
import { ArrowRightIcon, CloseIcon, SpinnerIcon } from './icons'
import { ConfirmDialog } from '../ConfirmDialog'
import './nextResults.css'

// Logo real de marca (mismo que Login/Header/Betting Picker) -- pareja directa del ícono que usa
// QuickMoneyNextResultPanel.tsx (43_quick-money-logo.svg, el logo real de Quick Money), en vez de
// un ícono genérico de rueda.
const ROULETTE_ICON_URL = buildMediaUrl('Website_svg_icons/46_logo_option_2.svg')
const CLOCK_ICON_URL = buildMediaUrl('Website_svg_icons/30_clock_white.svg')
const REFRESH_ICON_URL = buildMediaUrl('Website_svg_icons/39_refresh_white_clean.svg')

const SCHEDULED_TIME_FORMATTER = new Intl.DateTimeFormat('en-US', {
  month: 'short',
  day: 'numeric',
  year: 'numeric',
  hour: 'numeric',
  minute: '2-digit',
})
const CLOCK_FORMATTER = new Intl.DateTimeFormat('en-US', { hour: 'numeric', minute: '2-digit', second: '2-digit' })
const MONEY_FORMATTER = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' })

// El backend exige un motivo para cada cambio de resultado (queda auditado); el panel no lo pide
// (pedido explícito) y manda siempre este.
const SUBSTITUTION_REASON = 'Cambio manual desde Next Results'

// 0 y 00 van en su propia columna a la izquierda (mesa americana real); 1-36 se listan acá en
// orden y el grid los acomoda en columnas de 3 (1,2,3 / 4,5,6 / ... / 34,35,36) vía CSS
// grid-auto-flow:column -- ver .admin-next-results-table-grid en nextResults.css.
const ZERO_POCKETS: WheelPocket[] = [0, '00']
const TABLE_NUMBERS = Array.from({ length: 36 }, (_, i) => i + 1)

// Mismo tiempo que PickResultPanel (Quick Money) -- acá también se retira solo el feedback de éxito.
const SUCCESS_FEEDBACK_MS = 3000

type UpdateStatus = 'idle' | 'confirming' | 'updating' | 'success' | 'error'

function toPocket(slot: string): WheelPocket {
  return slot === '00' ? '00' : Number(slot)
}

// 4 decimales, la misma precisión con la que el backend redondea el snapshot: entre números la
// diferencia de RTP suele estar recién en el 3.º-4.º decimal (ej. 94.7357 vs 94.7442), y con 2 se
// verían todos iguales.
function formatRtp(value: number | null | undefined): string {
  return value == null ? '—' : `${value.toFixed(4)}%`
}

function formatClock(iso: string): string {
  return CLOCK_FORMATTER.format(new Date(iso))
}

export function RouletteNextResultPanel() {
  const { t } = useTranslation()

  // Mismo feed que alimenta el lobby (/gameInfo -> nextDraw en useGameConfigStore) --
  // useNextDrawSync lo puebla y lo vuelve a pedir después de cada sorteo, así la cuenta atrás y el
  // número de ronda siguen al backend en vez de quedarse en "Due now" tras la primera ronda.
  useNextDrawSync()
  const drawNumber = useGameConfigStore((state) => state.drawNumber)
  const nextDrawStartTime = useGameConfigStore((state) => state.nextDrawStartTime)
  const countdown = useCountdown(nextDrawStartTime)
  const isDue = nextDrawStartTime !== '' && countdown.remainingSeconds <= 0
  const timerState = isDue ? 'due' : countdown.urgent ? 'urgent' : 'normal'
  const scheduledTimeLabel = nextDrawStartTime
    ? SCHEDULED_TIME_FORMATTER.format(parseApiDateTime(nextDrawStartTime))
    : t('winnerPanel.notApplicable')

  // Próximo resultado real (admin): RouletteRTPSnapshot del backend + resultado definitivo desde la
  // congelación (T-2:30) -- ver useRouletteNextResult.
  const { status: loadStatus, data, error: loadError, login, substitute } = useRouletteNextResult()
  const snapshot = data?.snapshot ?? null
  const rtpBySlot = snapshot?.rtpResultantePorNumero ?? null
  // numeroPendiente (lectura auditada, desde la congelación); si no viene, el numeroElegido del
  // propio snapshot (el backend lo llena recién al ejecutar).
  const pendingSlot = data?.numeroPendiente ?? snapshot?.numeroElegido ?? null
  const pendingPocket = pendingSlot != null ? toPocket(pendingSlot) : null
  const rtpFor = (pocket: WheelPocket | null) => (pocket == null || !rtpBySlot ? null : rtpBySlot[String(pocket)])

  ensureClockTicking()
  const now = useClockStore((state) => state.now)
  const changeOpen = data != null && now < new Date(data.sustitucionHasta).getTime()

  const [selectedNumber, setSelectedNumber] = useState<WheelPocket | null>(null)
  const [status, setStatus] = useState<UpdateStatus>('idle')
  const [updateError, setUpdateError] = useState('')

  // Cada evento (o cada cambio del resultado decidido) arranca con la selección en el resultado
  // actual.
  const eventId = data?.event.id
  const pendingKey = pendingSlot
  useEffect(() => {
    setSelectedNumber(pendingKey != null ? toPocket(pendingKey) : null)
  }, [eventId, pendingKey])

  useEffect(() => {
    if (status !== 'success') return
    const timer = setTimeout(() => setStatus('idle'), SUCCESS_FEEDBACK_MS)
    return () => clearTimeout(timer)
  }, [status])

  const hasChanges = selectedNumber != null && selectedNumber !== pendingPocket
  const actionsDisabled = !hasChanges || status === 'updating' || !changeOpen

  async function handleConfirmUpdate() {
    if (!data || selectedNumber == null) return
    setStatus('updating')
    try {
      await substitute(data.event.id, String(selectedNumber), SUBSTITUTION_REASON)
      setStatus('success')
    } catch (err) {
      setUpdateError(err instanceof AdminAuthError ? t('admin.nextResults.loginTitle') : err instanceof Error ? err.message : String(err))
      setStatus('error')
    }
  }

  function handleReset() {
    if (actionsDisabled) return
    setSelectedNumber(pendingPocket)
  }

  const selectedColor = selectedNumber != null ? getRouletteColor(selectedNumber) : null
  const selectedParity = selectedNumber != null ? getRouletteParity(selectedNumber) : null
  const selectedRange = selectedNumber != null ? getRouletteRange(selectedNumber) : null
  const currentColor = pendingPocket != null ? getRouletteColor(pendingPocket) : null
  const currentParity = pendingPocket != null ? getRouletteParity(pendingPocket) : null
  const currentRange = pendingPocket != null ? getRouletteRange(pendingPocket) : null

  const betsByNumber = data?.betsByNumber ?? null

  function renderCell(n: WheelPocket) {
    const bet = betsByNumber ? (betsByNumber[String(n)] ?? 0) : null
    return (
      <button
        key={n}
        type="button"
        className="admin-next-results-number-cell"
        data-color={getRouletteColor(n)}
        data-selected={n === selectedNumber}
        data-current={n === pendingPocket}
        // RTP que dejaría este número si saliera -- se muestra al pasar el mouse (ver CSS).
        data-rtp={rtpBySlot ? `${t('admin.nextResults.rtpResulting')}: ${formatRtp(rtpFor(n))}` : undefined}
        disabled={!changeOpen}
        onClick={() => setSelectedNumber(n)}
      >
        <span className="admin-next-results-cell-number">{n}</span>
        {/* Monto apostado a pleno en este número. */}
        <span className="admin-next-results-cell-bet">{bet == null ? '—' : MONEY_FORMATTER.format(bet)}</span>
      </button>
    )
  }

  return (
    <div className="admin-next-results-panel" data-accent="red">
      <div className="admin-next-results-panel-header">
        <div className="admin-next-results-header-left">
          <span className="admin-next-results-icon-halo" data-accent="red">
            <img src={ROULETTE_ICON_URL} alt="" />
          </span>
          <div>
            <h2 className="admin-next-results-title">{t('admin.nextResults.roulette.title')}</h2>
            <p className="admin-next-results-subtitle">{t('admin.nextResults.roulette.subtitle')}</p>
          </div>
        </div>
        {/* Feedback de Update en la esquina superior derecha del panel (antes debajo de los botones,
            empujando el panel hacia abajo). */}
        {status === 'success' && (
          <div className="admin-next-results-feedback admin-next-results-feedback--header" data-variant="success">
            {t('admin.nextResults.updateSuccess', { game: t('admin.nextResults.roulette.title') })}
          </div>
        )}
        {status === 'error' && (
          <div className="admin-next-results-feedback admin-next-results-feedback--header" data-variant="error">
            {t('admin.nextResults.updateError', { game: t('admin.nextResults.roulette.title') })}
            {updateError && ` ${updateError}`}
          </div>
        )}
      </div>

      {/* Current Next Result a la izquierda + Next Round card a la derecha en una sola fila (antes
          apilados) -- ahorra altura para que el panel entre sin scroll. */}
      <div className="admin-next-results-top-row">
        <div className="admin-next-results-section">
          <h3 className="admin-next-results-section-heading">
            {t('admin.nextResults.currentNextResult')}
            {snapshot?.manual && <span className="admin-next-results-changed-tag">{t('admin.nextResults.manualTag')}</span>}
          </h3>
          <div className="admin-next-results-current-result">
            <span className="admin-next-results-number-box" data-color={currentColor ?? 'none'}>
              {pendingPocket ?? '—'}
            </span>
            <div className="admin-next-results-detail-row">
              {pendingPocket != null ? (
                <>
                  <div className="admin-next-results-detail">
                    <span className="admin-next-results-detail-label">{t('winnerPanel.color')}</span>
                    <span className="admin-next-results-detail-value">
                      <span className="admin-next-results-color-dot" data-color={currentColor ?? undefined} />
                      {currentColor && t(`admin.nextResults.colorValues.${currentColor}`)}
                    </span>
                  </div>
                  <div className="admin-next-results-detail">
                    <span className="admin-next-results-detail-label">{t('winnerPanel.parity')}</span>
                    <span className="admin-next-results-detail-value">
                      {currentParity ? t(`admin.nextResults.parityValues.${currentParity}`) : t('winnerPanel.notApplicable')}
                    </span>
                  </div>
                  <div className="admin-next-results-detail">
                    <span className="admin-next-results-detail-label">{t('winnerPanel.range')}</span>
                    <span className="admin-next-results-detail-value">
                      {currentRange ? t(`admin.nextResults.rangeValues.${currentRange}`) : t('winnerPanel.notApplicable')}
                    </span>
                  </div>
                </>
              ) : (
                data && (
                  <div className="admin-next-results-detail">
                    <span className="admin-next-results-detail-value">
                      {t('admin.nextResults.decidedAtFreeze', {
                        time: formatClock(data.event.horaCongelacion),
                        close: formatClock(data.event.horaCierreApuestas),
                      })}
                    </span>
                  </div>
                )
              )}
            </div>
            <div className="admin-next-results-detail-row">
              <div className="admin-next-results-detail">
                <span className="admin-next-results-detail-label">{t('admin.nextResults.rtpCurrent')}</span>
                <span className="admin-next-results-detail-value">{formatRtp(snapshot?.rtpActual)}</span>
              </div>
              <div className="admin-next-results-detail">
                <span className="admin-next-results-detail-label">{t('admin.nextResults.rtpResulting')}</span>
                <span className="admin-next-results-detail-value">{formatRtp(rtpFor(pendingPocket))}</span>
              </div>
            </div>
          </div>
        </div>
        {/* De dónde salen los RTP (snapshot de la congelación o calculado en vivo), arriba a la
            derecha justo encima de la card de la ronda. */}
        <div className="admin-next-results-round-column">
          {data && (
            <span className="admin-next-results-detail-value admin-next-results-source">
              {data.fuente === 'congelacion' ? t('admin.nextResults.sourceFrozen') : t('admin.nextResults.sourceLive')}
            </span>
          )}
          <div className="admin-next-results-round-card">
            <div className="admin-next-results-round-left">
              <div className="admin-next-results-round-label">
                <img src={CLOCK_ICON_URL} alt="" />
                {t('admin.nextResults.nextRound')}
              </div>
              <span className="admin-next-results-timer" data-state={timerState}>
                {isDue ? t('admin.nextResults.dueNow') : countdown.display}
              </span>
              <div className="admin-next-results-timer-units">
                <span>{t('admin.nextResults.minutes')}</span>
                <span>{t('admin.nextResults.seconds')}</span>
              </div>
            </div>
            <div className="admin-next-results-round-divider" />
            <div className="admin-next-results-round-right">
              <div className="admin-next-results-info-block">
                <span className="admin-next-results-info-label">{t('admin.nextResults.roundNumber')}</span>
                <span className="admin-next-results-info-value admin-next-results-info-value--emphasis">
                  {drawNumber ? `#${drawNumber}` : t('winnerPanel.notApplicable')}
                </span>
              </div>
              <div className="admin-next-results-info-block">
                <span className="admin-next-results-info-label">{t('admin.nextResults.scheduledTime')}</span>
                <span className="admin-next-results-info-value">{scheduledTimeLabel}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="admin-next-results-divider" />

      {loadStatus === 'needsLogin' ? (
        <AdminLoginForm onLogin={login} />
      ) : (
        <div className="admin-next-results-section">
          <h3 className="admin-next-results-section-heading">
            {t('admin.nextResults.changeNextResult')}
            {data && (
              <span className="admin-next-results-change-window" data-open={changeOpen}>
                {changeOpen
                  ? t('admin.nextResults.changeUntil', { time: formatClock(data.sustitucionHasta) })
                  : t('admin.nextResults.changeClosed')}
              </span>
            )}
          </h3>

          {loadStatus === 'noEvent' && <p className="admin-next-results-notice">{t('admin.nextResults.noPendingEvent')}</p>}
          {loadStatus === 'error' && (
            <p className="admin-next-results-notice" data-variant="error">
              {t('admin.nextResults.loadError', { error: loadError })}
            </p>
          )}

          <div className="admin-next-results-table">
            <div className="admin-next-results-table-zero">{ZERO_POCKETS.map(renderCell)}</div>
            <div className="admin-next-results-table-grid">{TABLE_NUMBERS.map(renderCell)}</div>
          </div>

          <div className="admin-next-results-selected-summary">
            <span className="admin-next-results-selected-label">{t('admin.nextResults.selectedNumber')}</span>
            <span className="admin-next-results-selected-box" data-color={selectedColor ?? 'none'} data-changed={hasChanges}>
              {selectedNumber ?? '—'}
            </span>
            {hasChanges && <span className="admin-next-results-changed-tag" data-changed="true">{t('admin.nextResults.changedTag')}</span>}

            <div className="admin-next-results-detail">
              <span className="admin-next-results-detail-label">{t('winnerPanel.color')}</span>
              <span className="admin-next-results-detail-value">
                {selectedColor && <span className="admin-next-results-color-dot" data-color={selectedColor} />}
                {selectedColor ? t(`admin.nextResults.colorValues.${selectedColor}`) : t('winnerPanel.notApplicable')}
              </span>
            </div>
            <div className="admin-next-results-detail">
              <span className="admin-next-results-detail-label">{t('winnerPanel.parity')}</span>
              <span className="admin-next-results-detail-value">
                {selectedParity ? t(`admin.nextResults.parityValues.${selectedParity}`) : t('winnerPanel.notApplicable')}
              </span>
            </div>
            <div className="admin-next-results-detail">
              <span className="admin-next-results-detail-label">{t('winnerPanel.range')}</span>
              <span className="admin-next-results-detail-value">
                {selectedRange ? t(`admin.nextResults.rangeValues.${selectedRange}`) : t('winnerPanel.notApplicable')}
              </span>
            </div>
            <div className="admin-next-results-detail">
              <span className="admin-next-results-detail-label">{t('admin.nextResults.rtpResulting')}</span>
              <span className="admin-next-results-detail-value">{formatRtp(rtpFor(selectedNumber))}</span>
            </div>
          </div>

          <div className="admin-next-results-actions">
            <button
              type="button"
              className="admin-next-results-btn-update"
              data-accent="red"
              disabled={actionsDisabled}
              onClick={() => setStatus('confirming')}
            >
              {status === 'updating' ? (
                <>
                  <SpinnerIcon className="admin-next-results-spinner" />
                  {t('admin.nextResults.updating')}
                </>
              ) : (
                <>
                  <img src={REFRESH_ICON_URL} alt="" />
                  {t('admin.nextResults.updateRoulette')}
                </>
              )}
            </button>
            <button type="button" className="admin-next-results-btn-clear" disabled={actionsDisabled} onClick={handleReset}>
              <CloseIcon />
              {t('admin.nextResults.reset')}
            </button>
          </div>

          {/* Confirmación como pop-up modal de aviso -- cambiar el próximo resultado afecta una ronda
              real. Cancel descarta la selección y vuelve al resultado actual (mismo criterio que
              Cancel en RTP Settings). */}
          {status === 'confirming' && (
            <ConfirmDialog
              warning
              accent="red"
              title={t('admin.nextResults.confirmTitle')}
              description={t('admin.nextResults.confirmDescription', { game: t('admin.nextResults.roulette.title') })}
              cancelLabel={t('admin.nextResults.cancel')}
              confirmLabel={t('admin.nextResults.confirmUpdate')}
              onCancel={() => {
                setSelectedNumber(pendingPocket)
                setStatus('idle')
              }}
              onConfirm={handleConfirmUpdate}
            >
              <div className="admin-next-results-confirm-row admin-next-results-confirm-row--dialog">
                <div className="admin-next-results-confirm-col">
                  <span className="admin-next-results-result-label">{t('admin.nextResults.currentResult')}</span>
                  <span className="admin-next-results-confirm-value">{pendingPocket ?? '—'}</span>
                  <span className="admin-next-results-confirm-rtp">{formatRtp(rtpFor(pendingPocket))}</span>
                </div>
                <ArrowRightIcon />
                <div className="admin-next-results-confirm-col">
                  <span className="admin-next-results-result-label">{t('admin.nextResults.newResult')}</span>
                  <span className="admin-next-results-confirm-value admin-next-results-confirm-value--accent" data-accent="red">
                    {selectedNumber}
                  </span>
                  <span className="admin-next-results-confirm-rtp">{formatRtp(rtpFor(selectedNumber))}</span>
                </div>
              </div>
            </ConfirmDialog>
          )}
        </div>
      )}
    </div>
  )
}

function AdminLoginForm({ onLogin }: { onLogin: (username: string, password: string) => Promise<void> }) {
  const { t } = useTranslation()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setSubmitting(true)
    setError('')
    try {
      await onLogin(username, password)
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <form className="admin-next-results-section admin-next-results-login" onSubmit={handleSubmit}>
      <h3 className="admin-next-results-section-heading">{t('admin.nextResults.loginTitle')}</h3>
      <p className="admin-next-results-notice">{t('admin.nextResults.loginDescription')}</p>
      <label className="admin-next-results-field">
        <span className="admin-next-results-detail-label">{t('admin.nextResults.username')}</span>
        <input type="text" autoComplete="username" value={username} onChange={(e) => setUsername(e.target.value)} required />
      </label>
      <label className="admin-next-results-field">
        <span className="admin-next-results-detail-label">{t('admin.nextResults.password')}</span>
        <input type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} required />
      </label>
      {error && (
        <p className="admin-next-results-notice" data-variant="error">
          {error}
        </p>
      )}
      <div className="admin-next-results-actions">
        <button type="submit" className="admin-next-results-btn-update" data-accent="red" disabled={submitting}>
          {submitting ? t('admin.nextResults.signingIn') : t('admin.nextResults.signIn')}
        </button>
      </div>
    </form>
  )
}
