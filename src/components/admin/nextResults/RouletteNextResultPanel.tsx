import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useGameConfigStore } from '../../../store/useGameConfigStore'
import { useCountdown } from '../../../hooks/useCountdown'
import { getRouletteColor } from '../../../utils/rouletteColors'
import { getRouletteParity, getRouletteRange } from '../../../utils/rouletteClassification'
import { parseApiDateTime } from '../../../utils/time'
import { buildMediaUrl } from '../../../utils/media'
import type { WheelPocket } from '../../../types/wheel'
import { ArrowRightIcon, CloseIcon, SpinnerIcon } from './icons'
import './nextResults.css'

const ROULETTE_ICON_URL = buildMediaUrl('Website_svg_icons/14_roulette_red.svg')
const CLOCK_ICON_URL = buildMediaUrl('Website_svg_icons/30_clock_white.svg')
const REFRESH_ICON_URL = buildMediaUrl('Website_svg_icons/39_refresh_white_clean.svg')

const SCHEDULED_TIME_FORMATTER = new Intl.DateTimeFormat('en-US', {
  month: 'short',
  day: 'numeric',
  year: 'numeric',
  hour: 'numeric',
  minute: '2-digit',
})

// 0 y 00 van en su propia columna a la izquierda (mesa americana real); 1-36 se listan acá en
// orden y el grid los acomoda en columnas de 3 (1,2,3 / 4,5,6 / ... / 34,35,36) vía CSS
// grid-auto-flow:column -- ver .admin-next-results-table-grid en nextResults.css.
const ZERO_POCKETS: WheelPocket[] = [0, '00']
const TABLE_NUMBERS = Array.from({ length: 36 }, (_, i) => i + 1)

// Mismos tiempos que PickResultPanel (Quick Money) -- ver su comentario: acá también se retira
// solo el feedback de éxito, y acá también se simula la actualización porque no existe todavía un
// endpoint de escritura real para Roulette.
const SUCCESS_FEEDBACK_MS = 3000
const UPDATE_DURATION_MS = 700

type UpdateStatus = 'idle' | 'confirming' | 'updating' | 'success' | 'error'

export function RouletteNextResultPanel() {
  const { t } = useTranslation()

  // Mismo feed que alimenta el lobby (RouletteLobby/LastGame, ver App.tsx: fetchGameInfo ->
  // applyGameInfo) -- AdminLayout.tsx puebla estos dos campos en el mismo useGameConfigStore
  // compartido (sin sembrar history/i18n, que sí pertenecen al ciclo de video de la lobby).
  const drawNumber = useGameConfigStore((state) => state.drawNumber)
  const nextDrawStartTime = useGameConfigStore((state) => state.nextDrawStartTime)
  const countdown = useCountdown(nextDrawStartTime)
  const isDue = nextDrawStartTime !== '' && countdown.remainingSeconds <= 0
  const timerState = isDue ? 'due' : countdown.urgent ? 'urgent' : 'normal'
  const scheduledTimeLabel = nextDrawStartTime
    ? SCHEDULED_TIME_FORMATTER.format(parseApiDateTime(nextDrawStartTime))
    : t('winnerPanel.notApplicable')

  // Estado local puro (sin backend de escritura -- no existe endpoint para fijar el próximo
  // resultado, ver investigación previa): Update mueve la selección al resultado "actual" recién
  // después de confirmar, Reset descarta la selección y vuelve a lo que ya estaba configurado.
  const [currentResult, setCurrentResult] = useState<WheelPocket>(17)
  const [selectedNumber, setSelectedNumber] = useState<WheelPocket>(17)
  const [status, setStatus] = useState<UpdateStatus>('idle')

  const hasChanges = selectedNumber !== currentResult
  const actionsDisabled = !hasChanges || status === 'updating'

  useEffect(() => {
    if (status !== 'success') return
    const timer = setTimeout(() => setStatus('idle'), SUCCESS_FEEDBACK_MS)
    return () => clearTimeout(timer)
  }, [status])

  const currentColor = getRouletteColor(currentResult)
  const currentParity = getRouletteParity(currentResult)
  const currentRange = getRouletteRange(currentResult)

  const selectedColor = getRouletteColor(selectedNumber)
  const selectedParity = getRouletteParity(selectedNumber)
  const selectedRange = getRouletteRange(selectedNumber)

  // No existe todavía un endpoint real de escritura para Roulette (ver comentario de arriba) --
  // esta función demuestra el flujo confirming -> updating -> success/error tal cual lo vería el
  // usuario final. Reemplazar el cuerpo por el fetch/mutation real no requiere tocar el resto del
  // componente: el try/catch ya está listo para que un rechazo real dispare el estado 'error'.
  function performUpdate(value: WheelPocket): Promise<void> {
    return new Promise((resolve) => {
      setTimeout(resolve, UPDATE_DURATION_MS, value)
    })
  }

  async function handleConfirmUpdate() {
    setStatus('updating')
    try {
      await performUpdate(selectedNumber)
      setCurrentResult(selectedNumber)
      setStatus('success')
    } catch {
      setStatus('error')
    }
  }

  function handleReset() {
    if (actionsDisabled) return
    setSelectedNumber(currentResult)
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
      </div>

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

      <div className="admin-next-results-section">
        <h3 className="admin-next-results-section-heading">{t('admin.nextResults.currentNextResult')}</h3>
        <div className="admin-next-results-current-result">
          <span className="admin-next-results-number-box" data-color={currentColor}>
            {currentResult}
          </span>
          <div className="admin-next-results-detail-row">
            <div className="admin-next-results-detail">
              <span className="admin-next-results-detail-label">{t('winnerPanel.color')}</span>
              <span className="admin-next-results-detail-value">
                <span className="admin-next-results-color-dot" data-color={currentColor} />
                {t(`admin.nextResults.colorValues.${currentColor}`)}
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
          </div>
        </div>
      </div>

      <div className="admin-next-results-divider" />

      <div className="admin-next-results-section">
        <h3 className="admin-next-results-section-heading">{t('admin.nextResults.changeNextResult')}</h3>

        <div className="admin-next-results-table">
          <div className="admin-next-results-table-zero">
            {ZERO_POCKETS.map((n) => {
              const color = getRouletteColor(n)
              return (
                <button
                  key={n}
                  type="button"
                  className="admin-next-results-number-cell"
                  data-color={color}
                  data-selected={n === selectedNumber}
                  onClick={() => setSelectedNumber(n)}
                >
                  {n}
                </button>
              )
            })}
          </div>
          <div className="admin-next-results-table-grid">
            {TABLE_NUMBERS.map((n) => {
              const color = getRouletteColor(n)
              return (
                <button
                  key={n}
                  type="button"
                  className="admin-next-results-number-cell"
                  data-color={color}
                  data-selected={n === selectedNumber}
                  onClick={() => setSelectedNumber(n)}
                >
                  {n}
                </button>
              )
            })}
          </div>
        </div>

        <div className="admin-next-results-selected-summary">
          <span className="admin-next-results-selected-label">{t('admin.nextResults.selectedNumber')}</span>
          <span className="admin-next-results-selected-box" data-color={selectedColor} data-changed={hasChanges}>
            {selectedNumber}
          </span>
          {hasChanges && <span className="admin-next-results-changed-tag" data-changed="true">{t('admin.nextResults.changedTag')}</span>}

          <div className="admin-next-results-detail">
            <span className="admin-next-results-detail-label">{t('winnerPanel.color')}</span>
            <span className="admin-next-results-detail-value">
              <span className="admin-next-results-color-dot" data-color={selectedColor} />
              {t(`admin.nextResults.colorValues.${selectedColor}`)}
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
        </div>

        {status === 'confirming' ? (
          <div className="admin-next-results-confirm" data-accent="red">
            <p className="admin-next-results-confirm-title">{t('admin.nextResults.confirmTitle')}</p>
            <div className="admin-next-results-confirm-row">
              <div className="admin-next-results-confirm-col">
                <span className="admin-next-results-result-label">{t('admin.nextResults.currentResult')}</span>
                <span className="admin-next-results-confirm-value">{currentResult}</span>
              </div>
              <ArrowRightIcon />
              <div className="admin-next-results-confirm-col">
                <span className="admin-next-results-result-label">{t('admin.nextResults.newResult')}</span>
                <span className="admin-next-results-confirm-value admin-next-results-confirm-value--accent" data-accent="red">
                  {selectedNumber}
                </span>
              </div>
            </div>
            <div className="admin-next-results-actions">
              <button type="button" className="admin-next-results-btn-clear" onClick={() => setStatus('idle')}>
                {t('admin.nextResults.cancel')}
              </button>
              <button type="button" className="admin-next-results-btn-update" data-accent="red" onClick={handleConfirmUpdate}>
                {t('admin.nextResults.confirmUpdate')}
              </button>
            </div>
          </div>
        ) : (
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
        )}

        {status === 'success' && (
          <div className="admin-next-results-feedback" data-variant="success">
            {t('admin.nextResults.updateSuccess', { game: t('admin.nextResults.roulette.title') })}
          </div>
        )}
        {status === 'error' && (
          <div className="admin-next-results-feedback" data-variant="error">
            {t('admin.nextResults.updateError', { game: t('admin.nextResults.roulette.title') })}
          </div>
        )}
      </div>
    </div>
  )
}
