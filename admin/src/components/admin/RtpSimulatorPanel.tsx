import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { AdminSelect, type AdminSelectOption } from './AdminSelect'
import { AdminFormField } from './AdminFormField'
import { InfoBanner } from './InfoBanner'
import { StatusBadge } from './StatusBadge'
import { RTP_GAME_ICON_URLS } from '../../data/rtpDashboardMockData'
import { SIMULATION_TYPE_OPTIONS, VOLATILITY_MODEL_OPTIONS, runRtpSimulation } from '../../data/rtpManagementMockData'
import { GAME_LABEL_KEY, RTP_GAMES } from '../../data/rtpGameLabels'
import type { RtpGame } from '../../types/rtpDashboard'
import type {
  RtpSettingsData,
  RtpSimulationResult,
  SimulationType,
  VolatilityModel,
} from '../../types/rtpManagement'
import './rtpSimulatorPanel.css'

const RISK_VARIANT: Record<RtpSimulationResult['riskLevel'], 'positive' | 'warning' | 'danger'> = {
  low: 'positive',
  medium: 'warning',
  high: 'danger',
}

const CURRENCY_FORMATTER = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 2 })
const INTEGER_FORMATTER = new Intl.NumberFormat('en-US')

function formatPercent(value: number): string {
  return `${value.toFixed(2)}%`
}

function PlayIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path d="M7 5v14l12-7Z" fill="currentColor" />
    </svg>
  )
}

interface RtpSimulatorPanelProps {
  settingsByGame: Record<RtpGame, RtpSettingsData>
}

// Simulator SOLO proyecta -- nunca escribe RTP_SETTINGS_BY_GAME/settingsByGame (pedido explícito).
// Current Target RTP sí refleja el estado vivo de Settings (mismo prop settingsByGame que recibe
// RtpSettingsPanel), para que ambos tabs no muestren números desincronizados.
export function RtpSimulatorPanel({ settingsByGame }: RtpSimulatorPanelProps) {
  const { t } = useTranslation()
  const [game, setGame] = useState<RtpGame>('roulette')
  const [simulationType, setSimulationType] = useState<SimulationType>('projectedResults')
  const [proposedTargetRtp, setProposedTargetRtp] = useState(settingsByGame.roulette.targetRtp)
  const [sampleSize, setSampleSize] = useState(100000)
  const [estimatedAverageBet, setEstimatedAverageBet] = useState(10)
  const [volatilityModel, setVolatilityModel] = useState<VolatilityModel>('standard')
  const [result, setResult] = useState<RtpSimulationResult | null>(null)

  const currentTargetRtp = settingsByGame[game].targetRtp

  useEffect(() => {
    setProposedTargetRtp(settingsByGame[game].targetRtp)
    setResult(null)
  }, [game, settingsByGame])

  const gameOptions: AdminSelectOption<RtpGame>[] = RTP_GAMES.map((g) => ({
    value: g,
    label: t(GAME_LABEL_KEY[g]),
    icon: RTP_GAME_ICON_URLS[g],
  }))

  const simulationTypeOptions: AdminSelectOption<SimulationType>[] = SIMULATION_TYPE_OPTIONS.map((option) => ({
    value: option,
    label: t(`admin.rtp.management.simulator.simulationTypeOptions.${option}`),
  }))

  const volatilityOptions: AdminSelectOption<VolatilityModel>[] = VOLATILITY_MODEL_OPTIONS.map((option) => ({
    value: option,
    label: t(`admin.rtp.management.simulator.volatilityModelOptions.${option}`),
  }))

  const handleRun = () => {
    setResult(
      runRtpSimulation({
        game,
        simulationType,
        currentTargetRtp,
        proposedTargetRtp,
        sampleSize,
        estimatedAverageBet,
        volatilityModel,
      }),
    )
  }

  return (
    <section className="admin-panel admin-rtp-simulator">
      <div className="admin-panel-header">
        <div>
          <h2 className="admin-panel-title">{t('admin.rtp.management.simulator.title')}</h2>
          <p className="admin-rtp-simulator-subtitle">{t('admin.rtp.management.simulator.subtitle')}</p>
        </div>
      </div>

      <div className="admin-rtp-simulator-row">
        <AdminSelect value={game} options={gameOptions} onChange={setGame} label={t('admin.rtp.management.gameSelectLabel')} />
        <AdminSelect
          value={simulationType}
          options={simulationTypeOptions}
          onChange={setSimulationType}
          label={t('admin.rtp.management.simulator.simulationType')}
        />
      </div>

      <div className="admin-rtp-simulator-row admin-rtp-simulator-row--three">
        <AdminFormField id="sim-current-target" label={t('admin.rtp.management.simulator.currentTargetRtp')} suffix="%" readOnly value={currentTargetRtp.toFixed(2)} />
        <AdminFormField
          id="sim-proposed-target"
          label={t('admin.rtp.management.simulator.proposedTargetRtp')}
          suffix="%"
          emphasized
          type="number"
          step="0.01"
          value={proposedTargetRtp}
          onChange={(v) => setProposedTargetRtp(Number(v))}
          stepper={{
            onIncrement: () => setProposedTargetRtp((v) => Math.round((v + 0.1) * 100) / 100),
            onDecrement: () => setProposedTargetRtp((v) => Math.round((v - 0.1) * 100) / 100),
          }}
        />
        <AdminFormField
          id="sim-sample-size"
          label={t('admin.rtp.management.simulator.sampleSize.label')}
          description={t('admin.rtp.management.simulator.sampleSize.description')}
          suffix={t('admin.rtp.management.simulator.sampleSize.unit')}
          type="number"
          step="10000"
          value={sampleSize}
          onChange={(v) => setSampleSize(Number(v))}
        />
      </div>

      <div className="admin-rtp-simulator-row">
        <AdminFormField
          id="sim-avg-bet"
          label={t('admin.rtp.management.simulator.estimatedAverageBet.label')}
          description={t('admin.rtp.management.simulator.estimatedAverageBet.description')}
          prefix="$"
          type="number"
          step="0.5"
          value={estimatedAverageBet}
          onChange={(v) => setEstimatedAverageBet(Number(v))}
        />
        <AdminSelect
          value={volatilityModel}
          options={volatilityOptions}
          onChange={setVolatilityModel}
          label={t('admin.rtp.management.simulator.volatilityModel.label')}
        />
      </div>

      <button type="button" className="admin-rtp-mgmt-btn admin-rtp-mgmt-btn--primary admin-rtp-simulator-run" onClick={handleRun}>
        <PlayIcon />
        {t('admin.rtp.management.simulator.runSimulation')}
      </button>

      {result && (
        <div className="admin-rtp-simulator-results">
          <div className="admin-panel-header">
            <div>
              <h3 className="admin-rtp-simulator-results-title">{t('admin.rtp.management.simulator.results.title')}</h3>
              <p className="admin-rtp-simulator-subtitle">{t('admin.rtp.management.simulator.results.subtitle')}</p>
            </div>
          </div>

          <div className="admin-rtp-simulator-results-primary">
            <div className="admin-rtp-simulator-metric">
              <span className="admin-rtp-simulator-metric-value">{formatPercent(result.currentRtp)}</span>
              <span className="admin-rtp-simulator-metric-label">{t('admin.rtp.management.simulator.results.currentRtp')}</span>
            </div>
            <div className="admin-rtp-simulator-metric" data-tone="blue">
              <span className="admin-rtp-simulator-metric-value">{formatPercent(result.proposedRtp)}</span>
              <span className="admin-rtp-simulator-metric-label">{t('admin.rtp.management.simulator.results.proposedRtp')}</span>
            </div>
            <div className="admin-rtp-simulator-metric" data-tone={result.differencePp >= 0 ? 'green' : 'red'}>
              <span className="admin-rtp-simulator-metric-value">
                {result.differencePp >= 0 ? '+' : ''}
                {result.differencePp.toFixed(2)} pp
              </span>
              <span className="admin-rtp-simulator-metric-label">{t('admin.rtp.management.simulator.results.difference')}</span>
            </div>
            <div className="admin-rtp-simulator-metric">
              <StatusBadge variant={RISK_VARIANT[result.riskLevel]}>{t(`admin.rtp.management.simulator.results.risk.${result.riskLevel}`)}</StatusBadge>
              <span className="admin-rtp-simulator-metric-label">{t('admin.rtp.management.simulator.results.riskLevel')}</span>
            </div>
          </div>

          <div className="admin-rtp-simulator-results-secondary">
            <div className="admin-rtp-simulator-secondary-metric">
              <span className="admin-rtp-simulator-secondary-value">{INTEGER_FORMATTER.format(result.totalBetsCount)}</span>
              <span className="admin-rtp-simulator-secondary-sub">{CURRENCY_FORMATTER.format(result.totalBetsAmount)}</span>
              <span className="admin-rtp-simulator-secondary-label">{t('admin.rtp.management.simulator.results.totalBets')}</span>
            </div>
            <span className="admin-rtp-simulator-secondary-divider" aria-hidden="true" />
            <div className="admin-rtp-simulator-secondary-metric">
              <span className="admin-rtp-simulator-secondary-value">{CURRENCY_FORMATTER.format(result.projectedPayout)}</span>
              <span className="admin-rtp-simulator-secondary-label">{t('admin.rtp.management.simulator.results.projectedPayout')}</span>
            </div>
            <span className="admin-rtp-simulator-secondary-divider" aria-hidden="true" />
            <div className="admin-rtp-simulator-secondary-metric">
              <span className="admin-rtp-simulator-secondary-value">{CURRENCY_FORMATTER.format(result.projectedHouseReturn)}</span>
              <span className="admin-rtp-simulator-secondary-label">{t('admin.rtp.management.simulator.results.projectedHouseReturn')}</span>
            </div>
            <span className="admin-rtp-simulator-secondary-divider" aria-hidden="true" />
            <div className="admin-rtp-simulator-secondary-metric">
              <span className="admin-rtp-simulator-secondary-value">{formatPercent(result.expectedRtp)}</span>
              <span className="admin-rtp-simulator-secondary-label">{t('admin.rtp.management.simulator.results.expectedRtp')}</span>
            </div>
          </div>

          <InfoBanner title={t('admin.rtp.management.simulator.disclaimer')} />
        </div>
      )}
    </section>
  )
}
