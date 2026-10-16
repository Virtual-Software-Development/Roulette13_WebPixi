import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import type { TFunction } from 'i18next'
import { AdminSelect, type AdminSelectOption } from './AdminSelect'
import { AdminFormField } from './AdminFormField'
import { InfoBanner } from './InfoBanner'
import { StatusBadge } from './StatusBadge'
import { RTP_GAME_ICON_URLS } from '../../data/rtpDashboardMockData'
import { SIMULATION_TYPE_OPTIONS } from '../../data/rtpManagementMockData'
import { GAME_LABEL_KEY, RTP_GAMES } from '../../data/rtpGameLabels'
import { AdminAuthError } from '../../api/adminSession'
import {
  deleteRtpSimScenario,
  downloadRtpSimRoundsCsv,
  fetchRtpSimDefaults,
  runBackendRtpSimulation,
  type RtpSimDefaults,
} from '../../api/rtpSimulator'
import type { RtpGame } from '../../types/rtpDashboard'
import type { RtpSimulationResult, SimulationType } from '../../types/rtpManagement'
import './rtpSimulatorPanel.css'

const RISK_VARIANT: Record<RtpSimulationResult['riskLevel'], 'positive' | 'warning' | 'danger'> = {
  low: 'positive',
  medium: 'warning',
  high: 'danger',
}

const CURRENCY_FORMATTER = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 2 })
const INTEGER_FORMATTER = new Intl.NumberFormat('en-US')

// Tope de monto del generador del backend (validateGenerator): montoMax = 1½ × promedio.
const MAX_BET_AMOUNT = 1_000_000

function formatPercent(value: number): string {
  return `${value.toFixed(2)}%`
}

// Sin sesión de admin el backend responde 401 (AdminAuthError); el resto trae el mensaje del
// backend (apperror, en español) o el status.
function errorMessage(err: unknown, t: TFunction): string {
  if (err instanceof AdminAuthError) return t('admin.rtp.management.simulator.errors.login')
  return err instanceof Error && err.message ? err.message : t('admin.rtp.management.simulator.errors.generic')
}

function PlayIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path d="M7 5v14l12-7Z" fill="currentColor" />
    </svg>
  )
}

function DownloadIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path d="M12 4v11m0 0-4.5-4.5M12 15l4.5-4.5M5 19h14" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function CloseIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path d="M6 6 18 18M18 6 6 18" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  )
}

// Simulator SOLO proyecta -- nunca escribe settings (pedido explícito). Corre en el sandbox del
// backend (api/rtpSimulator.ts): motor y pagos reales de producción, sin registrar eventos,
// tickets ni pagos. Current Target RTP es el que producción usa AHORA (GET /rtp-sim/defaults), no
// el mock de RTP Settings.
export function RtpSimulatorPanel() {
  const { t } = useTranslation()
  const [game, setGame] = useState<RtpGame>('roulette')
  const [simulationType, setSimulationType] = useState<SimulationType>('projectedResults')
  const [defaults, setDefaults] = useState<RtpSimDefaults | null>(null)
  const [defaultsError, setDefaultsError] = useState<string | null>(null)
  const [proposedTargetRtp, setProposedTargetRtp] = useState(0)
  const [minBand, setMinBand] = useState(0)
  const [maxBand, setMaxBand] = useState(0)
  const [sampleSize, setSampleSize] = useState(10000)
  const [betsPerRound, setBetsPerRound] = useState(20)
  const [estimatedAverageBet, setEstimatedAverageBet] = useState(10)
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null)
  const [runError, setRunError] = useState<string | null>(null)
  const [result, setResult] = useState<RtpSimulationResult | null>(null)
  const [downloading, setDownloading] = useState(false)
  const [downloadError, setDownloadError] = useState<string | null>(null)
  const runControllerRef = useRef<AbortController | null>(null)

  // El escenario del último resultado sigue vivo en el backend para poder bajar su CSV: se borra
  // cuando el resultado deja de mostrarse (nueva simulación, cambio de juego, cerrar resultados o
  // salir del tab). Si nada de eso pasa, el backend lo borra solo tras 8h sin uso.
  const scenarioId = result?.scenarioId
  useEffect(() => {
    if (!scenarioId) return
    return () => {
      void deleteRtpSimScenario(scenarioId).catch(() => {})
    }
  }, [scenarioId])

  // Cambiar de juego (o salir del tab) cancela la simulación en curso -- el escenario temporal se
  // borra en el finally de runBackendRtpSimulation.
  useEffect(() => {
    let cancelled = false
    setDefaults(null)
    setDefaultsError(null)
    setRunError(null)
    setResult(null)
    fetchRtpSimDefaults(game)
      .then((d) => {
        if (cancelled) return
        setDefaults(d)
        setProposedTargetRtp(d.config.targetRtp)
        setMinBand(d.config.minBand)
        setMaxBand(d.config.maxBand)
      })
      .catch((err) => {
        if (!cancelled) setDefaultsError(errorMessage(err, t))
      })
    return () => {
      cancelled = true
      runControllerRef.current?.abort()
    }
  }, [game, t])

  const limits = defaults?.limites
  // Mismas reglas que valida el backend (rtpsim validateConfig/validateGenerator/run), para no
  // dejar ejecutar algo que va a rechazar.
  const validateInput = (): string | null => {
    if (!limits) return null
    if (!(proposedTargetRtp > 0 && proposedTargetRtp <= 100)) return t('admin.rtp.management.simulator.errors.proposed')
    if (!(minBand >= 0 && minBand <= proposedTargetRtp && proposedTargetRtp <= maxBand && maxBand <= 100)) {
      return t('admin.rtp.management.simulator.errors.bands')
    }
    if (!(Number.isInteger(sampleSize) && sampleSize >= 1 && sampleSize <= limits.maxRondasEscenario)) {
      return t('admin.rtp.management.simulator.errors.sampleSize', { max: INTEGER_FORMATTER.format(limits.maxRondasEscenario) })
    }
    if (!(Number.isInteger(betsPerRound) && betsPerRound >= 1 && betsPerRound <= limits.maxApuestas)) {
      return t('admin.rtp.management.simulator.errors.betsPerRound', { max: INTEGER_FORMATTER.format(limits.maxApuestas) })
    }
    if (!(estimatedAverageBet > 0 && estimatedAverageBet * 1.5 <= MAX_BET_AMOUNT)) return t('admin.rtp.management.simulator.errors.averageBet')
    return null
  }
  const inputError = validateInput()

  const running = progress !== null
  const bannerMessage = defaultsError ?? inputError ?? runError

  const gameOptions: AdminSelectOption<RtpGame>[] = RTP_GAMES.map((g) => ({
    value: g,
    label: t(GAME_LABEL_KEY[g]),
    icon: RTP_GAME_ICON_URLS[g],
  }))

  const simulationTypeOptions: AdminSelectOption<SimulationType>[] = SIMULATION_TYPE_OPTIONS.map((option) => ({
    value: option,
    label: t(`admin.rtp.management.simulator.simulationTypeOptions.${option}`),
  }))

  const handleRun = async () => {
    if (!defaults || inputError || running) return
    const controller = new AbortController()
    runControllerRef.current = controller
    setRunError(null)
    setResult(null)
    setProgress({ done: 0, total: sampleSize })
    try {
      const simulation = await runBackendRtpSimulation(
        { game, defaults, proposedTargetRtp, minBand, maxBand, rounds: sampleSize, betsPerRound, averageBet: estimatedAverageBet },
        { signal: controller.signal, onProgress: (done, total) => setProgress({ done, total }) },
      )
      setResult(simulation)
      setDownloadError(null)
    } catch (err) {
      if (!controller.signal.aborted) setRunError(errorMessage(err, t))
    } finally {
      if (runControllerRef.current === controller) {
        runControllerRef.current = null
        setProgress(null)
      }
    }
  }

  const handleDownload = async () => {
    if (!result || downloading) return
    setDownloading(true)
    setDownloadError(null)
    try {
      await downloadRtpSimRoundsCsv(result.scenarioId)
    } catch (err) {
      setDownloadError(errorMessage(err, t))
    } finally {
      setDownloading(false)
    }
  }

  // Resultados como panel propio a la derecha del formulario (antes debajo, había que scrollear para
  // verlos). Sin resultado todavía el formulario ocupa todo el ancho.
  return (
    <div className="admin-rtp-simulator-layout" data-has-result={result !== null}>
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
            disabled={running}
          />
        </div>

        <div className="admin-rtp-simulator-row admin-rtp-simulator-row--three">
          <AdminFormField
            id="sim-current-target"
            label={t('admin.rtp.management.simulator.currentTargetRtp')}
            suffix="%"
            readOnly
            value={defaults ? defaults.config.targetRtp.toFixed(2) : '—'}
          />
          <AdminFormField
            id="sim-proposed-target"
            label={t('admin.rtp.management.simulator.proposedTargetRtp')}
            suffix="%"
            emphasized
            type="number"
            step="0.01"
            min="0"
            max="100"
            disabled={!defaults || running}
            value={defaults ? proposedTargetRtp : ''}
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
            step="1000"
            min="1"
            max={limits ? String(limits.maxRondasEscenario) : undefined}
            disabled={running}
            value={sampleSize}
            onChange={(v) => setSampleSize(Number(v))}
          />
        </div>

        {/* Bandas del RTP de prueba -- arrancan en las de producción; el resultado es positivo si el
            RTP simulado termina dentro de ellas. */}
        <div className="admin-rtp-simulator-row">
          <AdminFormField
            id="sim-min-band"
            label={t('admin.rtp.management.simulator.minBand.label')}
            description={defaults ? t('admin.rtp.management.simulator.productionValue', { value: formatPercent(defaults.config.minBand) }) : undefined}
            suffix="%"
            type="number"
            step="0.01"
            min="0"
            max="100"
            disabled={!defaults || running}
            value={defaults ? minBand : ''}
            onChange={(v) => setMinBand(Number(v))}
            stepper={{
              onIncrement: () => setMinBand((v) => Math.round((v + 0.1) * 100) / 100),
              onDecrement: () => setMinBand((v) => Math.round((v - 0.1) * 100) / 100),
            }}
          />
          <AdminFormField
            id="sim-max-band"
            label={t('admin.rtp.management.simulator.maxBand.label')}
            description={defaults ? t('admin.rtp.management.simulator.productionValue', { value: formatPercent(defaults.config.maxBand) }) : undefined}
            suffix="%"
            type="number"
            step="0.01"
            min="0"
            max="100"
            disabled={!defaults || running}
            value={defaults ? maxBand : ''}
            onChange={(v) => setMaxBand(Number(v))}
            stepper={{
              onIncrement: () => setMaxBand((v) => Math.round((v + 0.1) * 100) / 100),
              onDecrement: () => setMaxBand((v) => Math.round((v - 0.1) * 100) / 100),
            }}
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
            min="0"
            disabled={running}
            value={estimatedAverageBet}
            onChange={(v) => setEstimatedAverageBet(Number(v))}
          />
          <AdminFormField
            id="sim-bets-per-round"
            label={t('admin.rtp.management.simulator.betsPerRound.label')}
            description={t('admin.rtp.management.simulator.betsPerRound.description')}
            type="number"
            step="1"
            min="1"
            max={limits ? String(limits.maxApuestas) : undefined}
            disabled={running}
            value={betsPerRound}
            onChange={(v) => setBetsPerRound(Number(v))}
          />
        </div>

        {bannerMessage && <InfoBanner variant="warning" title={bannerMessage} />}

        <div className="admin-rtp-simulator-actions">
          <button
            type="button"
            className="admin-rtp-mgmt-btn admin-rtp-mgmt-btn--primary admin-rtp-simulator-run"
            disabled={!defaults || inputError !== null || running}
            onClick={handleRun}
          >
            <PlayIcon />
            {progress
              ? t('admin.rtp.management.simulator.running', {
                  done: INTEGER_FORMATTER.format(progress.done),
                  total: INTEGER_FORMATTER.format(progress.total),
                })
              : t('admin.rtp.management.simulator.runSimulation')}
          </button>
          {running && (
            <button type="button" className="admin-rtp-mgmt-btn admin-rtp-mgmt-btn--ghost" onClick={() => runControllerRef.current?.abort()}>
              {t('admin.rtp.management.simulator.cancel')}
            </button>
          )}
        </div>
      </section>

      {result && (
        <section className="admin-panel admin-rtp-simulator-results" aria-live="polite">
          <div className="admin-panel-header">
            <div>
              <h3 className="admin-rtp-simulator-results-title">{t('admin.rtp.management.simulator.results.title')}</h3>
              <p className="admin-rtp-simulator-subtitle">
                {t('admin.rtp.management.simulator.results.subtitle', {
                  rounds: INTEGER_FORMATTER.format(result.rounds),
                  engine: result.engine,
                  withinBand: result.roundsWithinBandPct.toFixed(1),
                })}
              </p>
            </div>
            <div className="admin-rtp-simulator-results-actions">
              {/* Detalle de cada ronda (resultado, apostado, pagado, RTP) para analizar fuera. */}
              <button
                type="button"
                className="admin-rtp-mgmt-btn admin-rtp-mgmt-btn--ghost-strong admin-rtp-simulator-download"
                disabled={downloading}
                onClick={handleDownload}
              >
                <DownloadIcon />
                {downloading ? t('admin.rtp.management.simulator.results.downloading') : t('admin.rtp.management.simulator.results.downloadCsv')}
              </button>
              {/* Cierra el panel de resultados -- el formulario vuelve a ocupar todo el ancho. */}
              <button
                type="button"
                className="admin-rtp-simulator-results-close"
                aria-label={t('admin.rtp.management.simulator.results.close')}
                title={t('admin.rtp.management.simulator.results.close')}
                onClick={() => setResult(null)}
              >
                <CloseIcon />
              </button>
            </div>
          </div>

          {downloadError && <InfoBanner variant="warning" title={downloadError} />}

          {/* Veredicto de la prueba: ¿el RTP simulado terminó dentro de la banda de prueba? */}
          <div className="admin-rtp-simulator-verdict" data-outcome={result.withinBand ? 'positive' : 'negative'}>
            <StatusBadge variant={result.withinBand ? 'positive' : 'danger'}>
              {t(`admin.rtp.management.simulator.results.verdict.${result.withinBand ? 'positive' : 'negative'}`)}
            </StatusBadge>
            <span className="admin-rtp-simulator-verdict-text">
              {t(
                result.withinBand
                  ? 'admin.rtp.management.simulator.results.verdict.positiveDetail'
                  : result.simulatedRtp > result.maxBand
                    ? 'admin.rtp.management.simulator.results.verdict.aboveDetail'
                    : 'admin.rtp.management.simulator.results.verdict.belowDetail',
                {
                  rtp: formatPercent(result.simulatedRtp),
                  min: formatPercent(result.minBand),
                  max: formatPercent(result.maxBand),
                  gap: Math.abs(result.simulatedRtp - (result.simulatedRtp > result.maxBand ? result.maxBand : result.minBand)).toFixed(2),
                  deviation: `${result.deviationPp >= 0 ? '+' : ''}${result.deviationPp.toFixed(2)}`,
                },
              )}
            </span>
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
            <div className="admin-rtp-simulator-secondary-metric" data-tone={result.withinBand ? 'green' : 'red'}>
              <span className="admin-rtp-simulator-secondary-value">{formatPercent(result.simulatedRtp)}</span>
              <span className="admin-rtp-simulator-secondary-label">{t('admin.rtp.management.simulator.results.simulatedRtp')}</span>
            </div>
          </div>

          <InfoBanner title={t('admin.rtp.management.simulator.disclaimer')} />
        </section>
      )}
    </div>
  )
}
