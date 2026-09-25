import { useTranslation } from 'react-i18next'
import { buildMediaUrl } from '../../../utils/media'
import { useQuickMoneyRoundStore } from '../../../store/useQuickMoneyRoundStore'
import { useCountdown } from '../../../hooks/useCountdown'
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
export function QuickMoneyNextResultPanel() {
  const { t } = useTranslation()

  // Pick 3 y Pick 4 comparten un único draw cycle -- mismo drawNumber/nextDrawTime para los dos
  // (decisión de negocio confirmada, ver useQuickMoneyRoundStore.ts: el mismo store que ya
  // consumen RoundCountdownRow.tsx en el Betting Workspace y QuickMoneyDrawCountdown.tsx en el
  // Lobby). Antes cada PickResultPanel armaba su propio countdown/Draw # local e independiente,
  // que nunca coincidía entre sí -- ahora es una sola card compartida, igual que "Next Round" en
  // RouletteNextResultPanel.
  const nextDrawTime = useQuickMoneyRoundStore((state) => state.nextDrawTime)
  const drawNumber = useQuickMoneyRoundStore((state) => state.drawNumber)
  const countdown = useCountdown(nextDrawTime)
  const isDue = countdown.remainingSeconds <= 0
  const timerState = isDue ? 'due' : countdown.urgent ? 'urgent' : 'normal'

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
      </div>

      <div className="admin-next-results-round-card">
        <div className="admin-next-results-round-left">
          <div className="admin-next-results-round-label">
            <img src={CLOCK_ICON_URL} alt="" />
            {t('admin.nextResults.nextDraw')}
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
            <span className="admin-next-results-info-label">{t('admin.nextResults.drawNumber')}</span>
            <span className="admin-next-results-info-value admin-next-results-info-value--emphasis">#{drawNumber}</span>
          </div>
          <div className="admin-next-results-info-block">
            <span className="admin-next-results-info-label">{t('admin.nextResults.scheduledTime')}</span>
            <span className="admin-next-results-info-value">{SCHEDULED_TIME_FORMATTER.format(new Date(nextDrawTime))}</span>
          </div>
        </div>
      </div>

      <div className="admin-next-results-divider" />

      <div className="admin-next-results-picks-row">
        <PickResultPanel
          accent="green"
          icon={PICK3_ICON_URL}
          title={t('admin.nextResults.quickMoney.pick3')}
          subtitle={t('admin.nextResults.quickMoney.pick3Subtitle')}
          updateLabel={t('admin.nextResults.updatePick3')}
          seedDigits={[8, 4, 1]}
        />

        <PickResultPanel
          accent="amber"
          icon={PICK4_ICON_URL}
          title={t('admin.nextResults.quickMoney.pick4')}
          subtitle={t('admin.nextResults.quickMoney.pick4Subtitle')}
          updateLabel={t('admin.nextResults.updatePick4')}
          seedDigits={[2, 7, 3, 9]}
        />
      </div>
    </div>
  )
}
