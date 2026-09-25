import { useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { useCountdown } from '../../hooks/useCountdown'
import { useQuickMoneyRoundStore } from '../../store/useQuickMoneyRoundStore'
import { buildMediaUrl } from '../../utils/media'
import './quickMoneyCenterFrame.css'
import './quickMoneyDrawCountdown.css'

const QUICK_MONEY_LOGO_URL = buildMediaUrl('Website_svg_icons/43_quick-money-logo.svg')

interface QuickMoneyDrawCountdownProps {
  gameNumber: string
}

// Panel central entre las dos game cards -- única fuente de verdad del countdown (useQuickMoneyRoundStore,
// compartido por Pick 3 y Pick 4, ver store). Mismo store que ya consume RoundCountdownRow.tsx en
// el Betting Workspace, así que el número que se ve acá y el que se ve ahí adentro son siempre el
// mismo sorteo -- no se toca esa lógica en este rediseño, solo la presentación.
//
// `gameNumber` se muestra UNA sola vez acá (pedido explícito): antes se repetía igual en los dos
// paneles laterales (mismo draw para Pick 3 y Pick 4, ver QuickMoneyGameCard.tsx), pura
// duplicación visual -- viene de `latestDraw.gameNumber` (QuickMoneyLobbyHero.tsx), no hardcodeado.
export function QuickMoneyDrawCountdown({ gameNumber }: QuickMoneyDrawCountdownProps) {
  const { t } = useTranslation()
  const nextDrawTime = useQuickMoneyRoundStore((state) => state.nextDrawTime)
  const advanceRound = useQuickMoneyRoundStore((state) => state.advanceRound)
  const countdown = useCountdown(nextDrawTime)

  useEffect(() => {
    if (countdown.remainingSeconds <= 0) advanceRound()
  }, [countdown.remainingSeconds, advanceRound])

  return (
    <div className="qml-center-panel">
      <div className="qml-frame-center" aria-hidden="true">
        <span className="qml-frame-center-mist" />
        <div className="qml-frame-center-top">
          <span className="qml-frame-center-top-line" />
          <span className="qml-frame-center-top-fill" />
        </div>
        <span className="qml-frame-center-middle-line" />
        <div className="qml-frame-center-bottom">
          <span className="qml-frame-center-bottom-fill" />
          <span className="qml-frame-center-bottom-line" />
        </div>
      </div>

      <div className="qml-center-content">
        <div className="qml-center-game-number">
          <span className="qml-center-game-number-label">{t('quickMoneyLobby.gameNumber')}</span>
          <span className="qml-center-game-number-value">#{gameNumber}</span>
        </div>

        <div className="qml-center-logo-wrap">
          <span className="qml-center-logo-ring qml-center-logo-ring--outer" aria-hidden="true" />
          <span className="qml-center-logo-ring qml-center-logo-ring--inner" aria-hidden="true" />
          <img src={QUICK_MONEY_LOGO_URL} className="qml-center-logo" alt={t('header.lottery')} />
        </div>

        <p className="qml-center-tagline">{t('quickMoneyLobby.tagline')}</p>

        <div className="qml-center-choose">
          <span className="qml-center-choose-line" aria-hidden="true" />
          <span className="qml-center-choose-text">{t('quickMoneyLobby.chooseGame')}</span>
          <span className="qml-center-choose-line" aria-hidden="true" />
        </div>

        <span className="qml-center-countdown" data-urgent={countdown.urgent}>
          {countdown.display}
        </span>
        <span className="qml-center-countdown-label">{t('quickMoneyLobby.nextDraw')}</span>
        <span className="qml-center-bottom-line" aria-hidden="true" />
      </div>
    </div>
  )
}
