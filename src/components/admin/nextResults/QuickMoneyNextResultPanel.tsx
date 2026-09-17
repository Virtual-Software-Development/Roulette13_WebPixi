import { useTranslation } from 'react-i18next'
import { buildMediaUrl } from '../../../utils/media'
import { PickResultPanel } from './PickResultPanel'
import './nextResults.css'

// Logo/branding real de Quick Money ya existente en el proyecto (Website_svg_icons) -- no se usa
// el dado genérico del header (LOTTERY_TAB_ICON_URL) para no reintroducir la palabra "Lottery" ni
// depender de un ícono pensado para el header.
const QUICK_MONEY_ICON_URL = buildMediaUrl('Website_svg_icons/43_quick-money-logo.svg')

// "LOTTERY" en la referencia visual == "Quick Money" en este proyecto (ver i18n admin.nav.lottery
// / header.lottery) -- este panel nunca muestra el texto "Lottery", solo "Quick Money".
export function QuickMoneyNextResultPanel() {
  const { t } = useTranslation()

  return (
    <div className="admin-next-results-panel" data-accent="purple">
      <div className="admin-next-results-panel-header">
        <div className="admin-next-results-header-left">
          <span className="admin-next-results-icon-halo" data-accent="purple">
            <img src={QUICK_MONEY_ICON_URL} alt="" />
          </span>
          <div>
            <h2 className="admin-next-results-title">{t('admin.nextResults.quickMoney.title')}</h2>
            <p className="admin-next-results-subtitle">{t('admin.nextResults.quickMoney.subtitle')}</p>
          </div>
        </div>
      </div>

      <div className="admin-next-results-picks-row">
        <PickResultPanel
          accent="purple"
          title={t('admin.nextResults.quickMoney.pick3')}
          subtitle={t('admin.nextResults.quickMoney.pick3Subtitle')}
          updateLabel={t('admin.nextResults.updatePick3')}
          seedSeconds={18}
          seedDrawNumber="0563"
          seedDigits={[8, 4, 1]}
        />

        <PickResultPanel
          accent="blue"
          title={t('admin.nextResults.quickMoney.pick4')}
          subtitle={t('admin.nextResults.quickMoney.pick4Subtitle')}
          updateLabel={t('admin.nextResults.updatePick4')}
          seedSeconds={33}
          seedDrawNumber="0421"
          seedDigits={[2, 7, 3, 9]}
        />
      </div>
    </div>
  )
}
