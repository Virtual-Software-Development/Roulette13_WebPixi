import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useGameConfigStore } from '../../store/useGameConfigStore'
import { useBetSlipStore } from '../../store/useBetSlipStore'
import { calculateSlipTotals } from '../../utils/rouletteBetPayout'
import { formatMoney } from '../../utils/moneyFormat'
import { useBettingRoundPhase } from '../../hooks/useBettingRoundPhase'
import './playerPanel.css'

// Sin backend de apuestas/balance real todavía (ver investigación: useGameConfigStore.balance no
// lo escribe ningún endpoint hoy) -- mismo criterio mock que el resto del Admin (setTimeout +
// comentario explícito). Confirmar debita el balance vía el setter genérico ya existente
// (setGameConfig), sin tocar la forma del store -- ese es el único punto a reemplazar el día que
// exista un POST /api/placeBet real.
const ACTION_DURATION_MS = 700

function simulateAction(): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ACTION_DURATION_MS))
}

export function PlayerPanel() {
  const { t } = useTranslation()
  const balance = useGameConfigStore((state) => state.balance)
  const setGameConfig = useGameConfigStore((state) => state.setGameConfig)
  const entries = useBetSlipStore((state) => state.entries)
  const clearAll = useBetSlipStore((state) => state.clearAll)
  const { phase } = useBettingRoundPhase()
  const [submitting, setSubmitting] = useState(false)
  const [justPlaced, setJustPlaced] = useState(false)

  const [showInsufficientPopup, setShowInsufficientPopup] = useState(false)

  const { totalStake } = useMemo(() => calculateSlipTotals(entries), [entries])
  const insufficientBalance = totalStake > balance
  // insufficientBalance queda AFUERA de canPlaceBet a propósito -- el botón sigue habilitado en
  // ese caso, para que el click dispare el popup de aviso (ver handlePlaceBet) en vez de quedar
  // silenciosamente disabled sin explicar por qué (mismo requisito de siempre: no depender solo
  // de disabled). Las demás condiciones (nada seleccionado, ronda cerrada, ya enviando) sí lo
  // deshabilitan -- ahí no hay nada que "intentar", no aplica mostrar un popup.
  const canPlaceBet = phase === 'open' && entries.length > 0 && totalStake > 0 && !submitting

  async function handlePlaceBet() {
    if (!canPlaceBet) return
    if (insufficientBalance) {
      setShowInsufficientPopup(true)
      setTimeout(() => setShowInsufficientPopup(false), 3000)
      return
    }
    setSubmitting(true)
    await simulateAction()
    setGameConfig({ balance: balance - totalStake })
    clearAll()
    setSubmitting(false)
    setJustPlaced(true)
    setTimeout(() => setJustPlaced(false), 2500)
  }

  return (
    <div className="player-panel">
      <div className="player-panel-balance">
        <span className="player-panel-balance-label">{t('bettingView.player.balanceLabel')}</span>
        <span className="player-panel-balance-value">{formatMoney(balance)}</span>
      </div>

      {justPlaced && (
        <p className="player-panel-success" role="status">
          {t('bettingView.player.betPlacedSuccess')}
        </p>
      )}

      <div className="player-panel-place-bet-wrap">
        {showInsufficientPopup && (
          <p className="player-panel-popup" role="alert">
            {t('bettingView.player.insufficientBalance')}
          </p>
        )}
        <button type="button" className="player-panel-place-bet" disabled={!canPlaceBet} onClick={handlePlaceBet}>
          {submitting ? t('bettingView.player.placing') : t('bettingView.player.placeBet')}
        </button>
      </div>
    </div>
  )
}
