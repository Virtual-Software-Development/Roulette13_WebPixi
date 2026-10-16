import { adminFetch, readAdminJson } from './adminSession'
import { BACKEND_GAME, type BackendGame } from './backendGame'
import type { RtpGame } from '../types/rtpDashboard'
import type { RtpSimulationResult, RtpSimulationRiskLevel } from '../types/rtpManagement'

// Sandbox de RTP de quick-money-backend (internal/rtpsim, rutas /rtp-sim/*): un escenario corre
// apuestas falsas por el motor y la liquidación REALES de producción, pero vive solo en memoria
// del backend -- no escribe events/tickets/pagos/auditoría ni publica por MQTT. Exige sesión de
// admin (JWT con rol admin): sin ella adminFetch lanza AdminAuthError.

export type RtpSimGame = BackendGame

// rtpsim.Config -- mismos campos de motor que rtp_settings.
export interface RtpSimConfig {
  targetRtp: number
  minBand: number
  maxBand: number
  ventanaMedicionEventos: number
  topeCorreccionEventoPct: number
  factorSuavizado: number
}

export interface RtpSimLimits {
  maxEscenarios: number
  maxApuestas: number
  maxRondasPorEjecucion: number
  maxApuestasPorRondas: number
  maxRondasEscenario: number
  maxVentana: number
}

// rtpsim.Defaults -- configuración y motor que producción usa AHORA para el juego.
export interface RtpSimDefaults {
  juego: RtpSimGame
  motores: string[]
  motorProduccion: string
  config: RtpSimConfig
  perfiles: string[]
  limites: RtpSimLimits
}

// Subconjunto de rtpsim.ScenarioView que usa el panel.
interface RtpSimScenario {
  id: string
  motor: string
  config: RtpSimConfig
  resumen: {
    rondas: number
    apostado: number
    pagado: number
    rtpAcumulado: number
    rtpVentana: number
    dentroDeBanda: number
  }
}

interface RtpSimGenerator {
  cantidad: number
  perfil: string
  montoMin: number
  montoMax: number
}

export async function fetchRtpSimDefaults(game: RtpGame): Promise<RtpSimDefaults> {
  return readAdminJson(await adminFetch(`/rtp-sim/defaults/${BACKEND_GAME[game]}`), 'rtp-sim defaults')
}

async function createScenario(body: {
  nombre: string
  juego: RtpSimGame
  config: RtpSimConfig
  historial: { modo: 'vacio' | 'produccion' }
}): Promise<RtpSimScenario> {
  const res = await adminFetch('/rtp-sim/scenarios', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  return readAdminJson(res, 'rtp-sim create scenario')
}

async function runRounds(id: string, rondas: number, generador: RtpSimGenerator): Promise<RtpSimScenario> {
  const res = await adminFetch(`/rtp-sim/scenarios/${id}/rounds`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ rondas, modo: 'regenerar', generador }),
  })
  return readAdminJson(res, 'rtp-sim run rounds')
}

export async function deleteRtpSimScenario(id: string): Promise<void> {
  await adminFetch(`/rtp-sim/scenarios/${id}`, { method: 'DELETE' })
}

// Descarga el detalle de cada ronda jugada (resultado, apostado, pagado, RTP...) como CSV. El backend
// lo genera en streaming y comprimido con gzip, que el navegador descomprime solo.
export async function downloadRtpSimRoundsCsv(id: string): Promise<void> {
  const res = await adminFetch(`/rtp-sim/scenarios/${id}/rounds.csv`)
  if (!res.ok) await readAdminJson(res, 'rtp-sim rounds csv') // lanza con el mensaje del backend
  const filename = /filename="([^"]+)"/.exec(res.headers.get('Content-Disposition') ?? '')?.[1] ?? `rtpsim-${id}.csv`
  const url = URL.createObjectURL(await res.blob())
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  link.click()
  URL.revokeObjectURL(url)
}

export interface BackendSimulationInput {
  game: RtpGame
  defaults: RtpSimDefaults
  proposedTargetRtp: number
  minBand: number
  maxBand: number
  rounds: number
  betsPerRound: number
  averageBet: number
}

// Rondas por request: tandas cortas para poder mostrar progreso y cancelar entre una y otra, y
// siempre dentro de los límites por ejecución del backend.
const ROUNDS_PER_REQUEST = 5000

// Perfil "mixto" del generador del backend: plenos, interiores y exteriores (roulette) o la mezcla
// de tipos de apuesta de Quick Money, con los pesos de un público típico.
const BET_PROFILE = 'mixto'

function riskLevelFor(differencePp: number): RtpSimulationRiskLevel {
  const abs = Math.abs(differencePp)
  if (abs < 0.5) return 'low'
  if (abs < 1.5) return 'medium'
  return 'high'
}

// Montos uniformes en [½, 1½] × promedio: el generador del backend sortea uniforme en
// [montoMin, montoMax], así que la media queda en el promedio pedido.
function generatorFor(betsPerRound: number, averageBet: number): RtpSimGenerator {
  return { cantidad: betsPerRound, perfil: BET_PROFILE, montoMin: averageBet / 2, montoMax: (averageBet * 3) / 2 }
}

// Crea un escenario temporal con la config de producción y el RTP objetivo + bandas de prueba, arrancando
// desde la ventana de medición REAL de producción (solo lectura) y juega `rounds` rondas con
// apuestas nuevas cada ronda. Si falla o se cancela lo borra; si termina lo deja (para descargar el
// CSV) y devuelve su id en el resultado.
export async function runBackendRtpSimulation(
  input: BackendSimulationInput,
  options: { signal?: AbortSignal; onProgress?: (done: number, total: number) => void } = {},
): Promise<RtpSimulationResult> {
  const { defaults } = input
  const generador = generatorFor(input.betsPerRound, input.averageBet)
  const perRequest = Math.max(
    1,
    Math.min(
      ROUNDS_PER_REQUEST,
      defaults.limites.maxRondasPorEjecucion,
      Math.floor(defaults.limites.maxApuestasPorRondas / input.betsPerRound),
    ),
  )

  const scenario = await createScenario({
    nombre: `Simulator ${input.game} ${input.proposedTargetRtp}%`,
    juego: BACKEND_GAME[input.game],
    // Ventana, tope y suavizado de producción; target y bandas los de la prueba (el backend exige
    // minBand ≤ targetRtp ≤ maxBand).
    config: { ...defaults.config, targetRtp: input.proposedTargetRtp, minBand: input.minBand, maxBand: input.maxBand },
    historial: { modo: 'produccion' },
  })

  try {
    let view = scenario
    let done = 0
    options.onProgress?.(0, input.rounds)
    while (done < input.rounds) {
      options.signal?.throwIfAborted()
      const rondas = Math.min(perRequest, input.rounds - done)
      view = await runRounds(scenario.id, rondas, generador)
      done += rondas
      options.onProgress?.(done, input.rounds)
    }

    const { resumen } = view
    const currentRtp = defaults.config.targetRtp
    const differencePp = Math.round((input.proposedTargetRtp - currentRtp) * 100) / 100
    const simulatedRtp = resumen.rtpAcumulado
    return {
      currentRtp,
      proposedRtp: input.proposedTargetRtp,
      differencePp,
      riskLevel: riskLevelFor(differencePp),
      engine: view.motor,
      scenarioId: scenario.id,
      rounds: resumen.rondas,
      roundsWithinBandPct: resumen.rondas > 0 ? (resumen.dentroDeBanda / resumen.rondas) * 100 : 0,
      totalBetsCount: resumen.rondas * input.betsPerRound,
      totalBetsAmount: resumen.apostado,
      projectedPayout: resumen.pagado,
      projectedHouseReturn: resumen.apostado - resumen.pagado,
      simulatedRtp,
      minBand: input.minBand,
      maxBand: input.maxBand,
      // Positivo = el RTP de las rondas simuladas terminó dentro de la banda de prueba.
      withinBand: simulatedRtp >= input.minBand && simulatedRtp <= input.maxBand,
      deviationPp: simulatedRtp - input.proposedTargetRtp,
    }
  } catch (err) {
    // El backend limita los escenarios por admin (y los borra solo tras 8h sin uso): no dejar basura.
    void deleteRtpSimScenario(scenario.id).catch(() => {})
    throw err
  }
}
