import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import type { QuickMoneyLobbyDraw } from '../../data/quickMoneyLobbyMockData'
import type { QuickMoneyGameType } from '../../types/quickMoneyBet'
import { computeQuickMoneyHotCold } from '../../utils/quickMoneyHotCold'
import { buildMediaUrl } from '../../utils/media'
import './quickMoneyFrequencyPanel.css'

const FLAME_ICON_URL = buildMediaUrl('Website_svg_icons/31_flame_red.svg')
const SNOWFLAKE_ICON_URL = buildMediaUrl('Website_svg_icons/32_snowflake_blue.svg')

interface FrequencyGroupProps {
  icon: string
  title: string
  subtitle: string
  pick3: number[]
  pick4: number[]
}

// Una columna por juego (Pick 3 | Pick 4, lado a lado con divisor vertical -- referencia visual):
// etiqueta del juego y sus bolas. Sin conteo de apariciones debajo de cada bola (pedido explícito,
// se sacó después de agregarlo).
function FrequencyColumn({ gameType, digits }: { gameType: QuickMoneyGameType; digits: number[] }) {
  const { t } = useTranslation()

  return (
    <div className="qml-frequency-column" data-accent={gameType}>
      <span className="qml-frequency-label">{t(`quickMoneyBettingView.gameType.${gameType}`)}</span>
      <div className="qml-frequency-balls">
        {digits.map((digit) => (
          <span key={digit} className="qml-ball" data-accent={gameType}>
            {digit}
          </span>
        ))}
      </div>
    </div>
  )
}

function FrequencyGroup({ icon, title, subtitle, pick3, pick4 }: FrequencyGroupProps) {
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
        <FrequencyColumn gameType="pick3" digits={pick3} />
        <FrequencyColumn gameType="pick4" digits={pick4} />
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
        pick3={hotCold.pick3.hot}
        pick4={hotCold.pick4.hot}
      />
      <div className="qml-frequency-divider" />
      <FrequencyGroup
        icon={SNOWFLAKE_ICON_URL}
        title={t('quickMoneyLobby.coldNumbers.title')}
        subtitle={t('quickMoneyLobby.coldNumbers.subtitle')}
        pick3={hotCold.pick3.cold}
        pick4={hotCold.pick4.cold}
      />
    </section>
  )
}
