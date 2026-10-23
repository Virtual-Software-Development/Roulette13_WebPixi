import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { buildMediaUrl } from '../../../utils/media'
import { useCountdown } from '../../../hooks/useCountdown'
import { useQuickMoneyNextResult } from '../../../hooks/useQuickMoneyNextResult'
import { ensureClockTicking, useClockStore } from '../../../store/useClockStore'
import { PickResultPanel } from './PickResultPanel'
import './nextResults.css'

// Logo/branding real de Quick Money ya existente en el proyecto (Website_svg_icons) -- no se usa
// el dado genérico del header (LOTTERY_TAB_ICON_URL) para no reintroducir la palabra "Lottery" ni
// depender de un ícono pensado para el header.
const QUICK_MONEY_ICON_URL = buildMediaUrl('Website_svg_icons/43_quick-money-logo.svg')
// Logos reales de cada juego (mismo criterio ya aplicado en RTP Dashboard/Reports/System Logs --
// pedido explícito de reemplazar pictogramas genéricos por el logo de marca de cada uno), no el
// dado genérico blanco que tenían antes.
const PICK3_ICON_URL = buildMediaUrl('Website_svg_icons/49_pick-3-logo-option-2.svg')
const PICK4_ICON_URL = buildMediaUrl('Website_svg_icons/51_pick-4-logo-option-2.svg')
const CLOCK_ICON_URL = buildMediaUrl('Website_svg_icons/30_clock_white.svg')

const SCHEDULED_TIME_FORMATTER = new Intl.DateTimeFormat('en-US', {
  month: 'short',
  day: 'numeric',
  year: 'numeric',
  hour: 'numeric',
  minute: '2-digit',
})

// "LOTTERY" en la referencia visual == "Quick Money" en este proyecto (ver i18n admin.nav.lottery
// / header.lottery) -- este panel nunca muestra el texto "Lottery", solo "Quick Money".
// Mismo tiempo visible que el feedback de Roulette/PickResultPanel (SUCCESS_FEEDBACK_MS).
const FEEDBACK_MS = 3000
const CLOCK_FORMATTER = new Intl.DateTimeFormat('en-US', { hour: 'numeric', minute: '2-digit', second: '2-digit' })

// El backend exige un motivo para cada cambio de resultado (queda auditado); como en Roulette, el
// panel no lo pide y manda siempre este.
const SUBSTITUTION_REASON = 'Manual change from Next Results'

function toDigits(value: string | null): number[] | null {
  return value == null ? null : value.split('').map(Number)
}

type PickGame = 'pick3' | 'pick4'

interface UpdateFeedback {
  game: PickGame
  variant: 'success' | 'error'
  // Cambia en cada Update para reiniciar el timer aunque se repita el mismo juego/variante.
  key: number
}

export function QuickMoneyNextResultPanel() {
  const { t } = useTranslation()

  // Feedback del último Update de Pick 3 o Pick 4, mostrado en la esquina superior derecha del panel
  // (mismo lugar/ancho que en Roulette) con el nombre del juego actualizado.
  const [feedback, setFeedback] = useState<UpdateFeedback | null>(null)
  useEffect(() => {
    if (!feedback) return
    const timer = setTimeout(() => setFeedback(null), FEEDBACK_MS)
    return () => clearTimeout(timer)
  }, [feedback])
  const handleResult = (game: PickGame) => (variant: 'success' | 'error') => setFeedback({ game, variant, key: Date.now() })
  const feedbackGame = feedback ? t(`admin.nextResults.quickMoney.${feedback.game}`) : ''

  // Un sorteo produce el Pick 3 y el Pick 4 a la vez: un solo countdown/Draw # para los dos, del
  // sorteo pendiente real del backend (ver useQuickMoneyNextResult).
  const { status: loadStatus, data, error: loadError, substitute } = useQuickMoneyNextResult()
  const nextDrawTime = data?.event.horaProgramada ?? ''
  const countdown = useCountdown(nextDrawTime)
  const isDue = nextDrawTime !== '' && countdown.remainingSeconds <= 0
  const timerState = isDue ? 'due' : countdown.urgent ? 'urgent' : 'normal'

  ensureClockTicking()
  const now = useClockStore((state) => state.now)
  const changeOpen = data != null && now < new Date(data.sustitucionHasta).getTime()
  const pick3 = toDigits(data?.pick3 ?? null)
  const pick4 = toDigits(data?.pick4 ?? null)

  // El backend guarda los 7 dígitos juntos: cambiar uno de los dos números manda el otro tal cual.
  const updatePick = (game: PickGame) => async (digits: number[]) => {
    if (!data || data.pick3 == null || data.pick4 == null) throw new Error('no pending result')
    const value = digits.join('')
    await substitute(data.event.id, game === 'pick3' ? value : data.pick3, game === 'pick4' ? value : data.pick4, SUBSTITUTION_REASON)
  }

  return (
    <div className="admin-next-results-panel" data-accent="blue">
      <div className="admin-next-results-panel-header">
        <div className="admin-next-results-header-left">
          <span className="admin-next-results-icon-halo" data-accent="blue">
            <img src={QUICK_MONEY_ICON_URL} alt="" />
          </span>
          <div>
            <h2 className="admin-next-results-title">{t('admin.nextResults.quickMoney.title')}</h2>
            <p className="admin-next-results-subtitle">{t('admin.nextResults.quickMoney.subtitle')}</p>
          </div>
        </div>
        {feedback && (
          <div key={feedback.key} className="admin-next-results-feedback admin-next-results-feedback--header" data-variant={feedback.variant}>
            {feedback.variant === 'success'
              ? t('admin.nextResults.updateSuccess', { game: feedbackGame })
              : t('admin.nextResults.updateError', { game: feedbackGame })}
          </div>
        )}
      </div>

      <div className="admin-next-results-round-card">
        <div className="admin-next-results-round-left">
          <div className="admin-next-results-round-label">
            <img src={CLOCK_ICON_URL} alt="" />
            {t('admin.nextResults.nextDraw')}
          </div>
          <span className="admin-next-results-timer" data-state={timerState}>
            {isDue ? t('admin.nextResults.dueNow') : nextDrawTime ? countdown.display : '--:--'}
          </span>
          <div className="admin-next-results-timer-units">
            {countdown.remainingSeconds >= 3600 && !isDue && <span>{t('admin.nextResults.hours')}</span>}
            <span>{t('admin.nextResults.minutes')}</span>
            <span>{t('admin.nextResults.seconds')}</span>
          </div>
        </div>
        <div className="admin-next-results-round-divider" />
        <div className="admin-next-results-round-right">
          <div className="admin-next-results-info-block">
            <span className="admin-next-results-info-label">{t('admin.nextResults.drawNumber')}</span>
            <span className="admin-next-results-info-value admin-next-results-info-value--emphasis">
              {data ? `#${data.event.numeroEvento}` : '—'}
            </span>
          </div>
          <div className="admin-next-results-info-block">
            <span className="admin-next-results-info-label">{t('admin.nextResults.scheduledTime')}</span>
            <span className="admin-next-results-info-value">
              {nextDrawTime ? SCHEDULED_TIME_FORMATTER.format(new Date(nextDrawTime)) : '—'}
            </span>
          </div>
        </div>
      </div>

      {data && (
        <span className="admin-next-results-change-window" data-open={changeOpen}>
          {changeOpen
            ? t('admin.nextResults.changeUntil', { time: CLOCK_FORMATTER.format(new Date(data.sustitucionHasta)) })
            : t('admin.nextResults.changeClosed')}
        </span>
      )}
      {loadStatus === 'noEvent' && <p className="admin-next-results-notice">{t('admin.nextResults.quickMoney.noPendingDraw')}</p>}
      {loadStatus === 'error' && (
        <p className="admin-next-results-notice" data-variant="error">
          {t('admin.nextResults.loadError', { error: loadError })}
        </p>
      )}

      <div className="admin-next-results-divider" />

      {pick3 && pick4 && (
        <div className="admin-next-results-picks-row">
          <PickResultPanel
            accent="green"
            icon={PICK3_ICON_URL}
            title={t('admin.nextResults.quickMoney.pick3')}
            subtitle={t('admin.nextResults.quickMoney.pick3Subtitle')}
            updateLabel={t('admin.nextResults.updatePick3')}
            currentDigits={pick3}
            disabled={!changeOpen}
            onUpdate={updatePick('pick3')}
            onResult={handleResult('pick3')}
          />

          <PickResultPanel
            accent="amber"
            icon={PICK4_ICON_URL}
            title={t('admin.nextResults.quickMoney.pick4')}
            subtitle={t('admin.nextResults.quickMoney.pick4Subtitle')}
            updateLabel={t('admin.nextResults.updatePick4')}
            currentDigits={pick4}
            disabled={!changeOpen}
            onUpdate={updatePick('pick4')}
            onResult={handleResult('pick4')}
          />
        </div>
      )}
    </div>
  )
}
