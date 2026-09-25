import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import type { QuickMoneyLobbyDraw } from '../../data/quickMoneyLobbyMockData'
import { computeQuickMoneyHotCold } from '../../utils/quickMoneyHotCold'
import { buildMediaUrl } from '../../utils/media'
import './quickMoneyFrequencyPanel.css'

const FLAME_ICON_URL = buildMediaUrl('Website_svg_icons/31_flame_red.svg')
const SNOWFLAKE_ICON_URL = buildMediaUrl('Website_svg_icons/32_snowflake_blue.svg')

interface FrequencyGroupProps {
  icon: string
  title: string
  subtitle: string
  pick3Digits: number[]
  pick4Digits: number[]
}

function FrequencyGroup({ icon, title, subtitle, pick3Digits, pick4Digits }: FrequencyGroupProps) {
  const { t } = useTranslation()

  return (
    <div className="qml-frequency-group">
      <div className="qml-frequency-heading">
        <img src={icon} className="qml-frequency-icon" alt="" />
        <div>
          <h3>{title}</h3>
          <p>{subtitle}</p>
        </div>
      </div>
      <div className="qml-frequency-columns">
        <div className="qml-frequency-column" data-accent="pick3">
          <span className="qml-frequency-label">{t('quickMoneyBettingView.gameType.pick3')}</span>
          <div className="qml-frequency-balls">
            {pick3Digits.map((digit, index) => (
              <span key={index} className="qml-ball qml-ball--sm" data-accent="pick3">
                {digit}
              </span>
            ))}
          </div>
        </div>
        <div className="qml-frequency-column" data-accent="pick4">
          <span className="qml-frequency-label">{t('quickMoneyBettingView.gameType.pick4')}</span>
          <div className="qml-frequency-balls">
            {pick4Digits.map((digit, index) => (
              <span key={index} className="qml-ball qml-ball--sm" data-accent="pick4">
                {digit}
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

// Hot/Cold calculado sobre el mismo historial mock que alimenta Recent Results (pedido explícito,
// ver computeQuickMoneyHotCold) -- no hardcodeado, para que ambos paneles queden siempre
// consistentes entre sí. Identidad de color sigue siendo por juego (verde/dorado), Hot/Cold solo
// cambia el ícono (flame/snowflake), nunca el color de los números -- pedido explícito.
export function QuickMoneyFrequencyPanel({ draws }: { draws: QuickMoneyLobbyDraw[] }) {
  const { t } = useTranslation()
  const hotCold = useMemo(() => computeQuickMoneyHotCold(draws), [draws])

  return (
    <section className="qml-panel qml-frequency-panel">
      <FrequencyGroup
        icon={FLAME_ICON_URL}
        title={t('quickMoneyLobby.hotNumbers.title')}
        subtitle={t('quickMoneyLobby.hotNumbers.subtitle')}
        pick3Digits={hotCold.pick3.hot}
        pick4Digits={hotCold.pick4.hot}
      />
      <div className="qml-frequency-divider" />
      <FrequencyGroup
        icon={SNOWFLAKE_ICON_URL}
        title={t('quickMoneyLobby.coldNumbers.title')}
        subtitle={t('quickMoneyLobby.coldNumbers.subtitle')}
        pick3Digits={hotCold.pick3.cold}
        pick4Digits={hotCold.pick4.cold}
      />
    </section>
  )
}
