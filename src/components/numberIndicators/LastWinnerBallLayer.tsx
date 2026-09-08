import { useEffect, useState } from 'react'
import { ACTIVE_WHEEL_TYPE } from '../../data/wheelOrder'
import { getEffectiveWheelRenderMode } from '../../data/wheelRenderMode'
import { WHEEL_CANVAS_HEIGHT, WHEEL_CANVAS_WIDTH, WHEEL_GEOMETRY, WHEEL_SPIN_DURATION_SEC } from '../../layout/wheelGeometry.constants'
import { WHEEL_VIDEO_GEOMETRY } from '../../layout/wheelVideoGeometry.constants'
import { useCountdown } from '../../hooks/useCountdown'
import { useRafProgress } from '../../hooks/useRafProgress'
import { useDrawCycleStore } from '../../store/useDrawCycleStore'
import { useGameConfigStore } from '../../store/useGameConfigStore'
import { useResultsStore } from '../../store/useResultsStore'
import { buildMediaUrl } from '../../utils/media'
import { easeInOutCubic, easeOutCubic } from '../../utils/easing'
import { getPocketAngleDegForGeometry, getPocketPositionForGeometry, getPolarPoint } from '../../utils/wheelPositions'
import type { PocketGeometry } from '../../utils/wheelPositions'
import { WheelRotorGroup } from '../wheel/WheelRotorGroup'
import type { WheelPocket, WheelType } from '../../types/wheel'
import './LastWinnerBallLayer.css'

const BALL_URL = buildMediaUrl('Ball.png')

// --- Modo imagen (canvas 2560x1440, WHEEL_GEOMETRY) -- ajustar a mano viendo el dev server. ---
const BALL_SIZE = 80
const BALL_RADIUS_OFFSET = 0 // 0 = centrada sobre el número impreso

// --- Modo video (canvas 1920x1080, WHEEL_VIDEO_GEOMETRY) -- independiente de arriba, mismo
// criterio que HotColdNumberChip.tsx (las mismas unidades absolutas se ven proporcionalmente más
// grandes en el canvas más chico de video). Ajustar a mano.
const BALL_VIDEO_SIZE = 22
const BALL_VIDEO_RADIUS_OFFSET = 0

// Punto impreso en Base_American.png (la marca fija de la bolita en el borde interno del bowl,
// NO gira -- a diferencia del número ganador, que vive en el rotor) -- medido por centroide de
// píxeles opacos casi-blancos dentro de esa marca (scripts equivalentes a
// measure-wheel-image-angles.py, mismo criterio de medición). Centro medido (1279.5, 1300.0)
// contra WHEEL_GEOMETRY.american.center (1279.53, 719.47): casi exacto en X, la marca cae derecho
// abajo del centro -- ángulo 180°, radio ~580.5. Sin medición propia para 'european' (no está en
// uso, ver ACTIVE_WHEEL_TYPE); el regreso a la base solo corre en modo imagen (ver `returning`
// más abajo), así que no hace falta una entrada para 'video'.
const BALL_DOCK_ANGLE_DEG = 180
const BALL_DOCK_RADIUS = 580.5

// Cuánto antes del próximo sorteo (countdown real, useCountdown -- mismo criterio que
// useHotColdWindow/useSpinStatsCycle) la bolita "despega" del número ganador y empieza a volver a
// la marca de la base.
const BALL_RETURN_AT_REMAINING_SECONDS = 10

// Duración de cada fase del regreso: primero sale disparada hacia el borde interno (radio, ángulo
// fijo, easeOutCubic -- rápida y directa desde el primer instante, ver más abajo), después recorre
// ese borde hasta la marca de la base (ángulo, radio fijo, easeInOutCubic). Ajustar a mano.
const BALL_LIFTOFF_DURATION_MS = 300
const BALL_TRAVEL_DURATION_MS = 3000
const BALL_RETURN_TOTAL_DURATION_MS = BALL_LIFTOFF_DURATION_MS + BALL_TRAVEL_DURATION_MS
const BALL_LIFTOFF_FRACTION = BALL_LIFTOFF_DURATION_MS / BALL_RETURN_TOTAL_DURATION_MS

// rawResults / /api/results reporta 37 para la casilla '00' (ver useResultsStore.ts) -- el mismo
// endpoint de sorteo alimenta currentWinner, así que se traduce acá antes de buscar la casilla:
// getPocketPositionForGeometry/getPocketAngleDegForGeometry TIRAN (no devuelven un fallback) si
// el pocket no existe en getWheelOrder, a diferencia de getRouletteColor.
function toBallPocket(raw: number): WheelPocket {
  return raw === 37 ? '00' : raw
}

// Delta angular más corto de `fromDeg` a `toDeg`, en (-180, 180] -- para que el recorrido por el
// borde interno tome siempre el camino más corto entre el ángulo donde quedó "congelada" la
// bolita y la marca fija de la base, nunca la vuelta larga.
function shortestAngleDeltaDeg(fromDeg: number, toDeg: number): number {
  let delta = (toDeg - fromDeg) % 360
  if (delta > 180) delta -= 360
  if (delta < -180) delta += 360
  return delta
}

interface LastWinnerBallLayerProps {
  wheelType?: WheelType
}

// Imagen de la bolita (Ball.png, ver local-media/) anclada a la casilla del último número ganador
// (useResultsStore.currentWinner) y girando en sync con la rueda -- mismo WheelRotorGroup que usa
// HotColdNumberChipLayer (CSS-phase-sync en modo imagen, video.currentTime en modo video). A los
// BALL_RETURN_AT_REMAINING_SECONDS del próximo sorteo, "despega" del número y anima (por su
// cuenta, fuera del rotor que sigue girando) hasta la marca fija de la bolita impresa en la base
// -- ver LastWinnerBallReturning. Oculta mientras el sorteo está en curso (`active`): la rueda de
// imagen se traslada fuera de pantalla durante ese momento (ver LobbyBackgroundLayer), y este
// layer -- un hermano fuera de ese wrapper -- quedaría visualmente despegado si siguiera
// mostrándose.
export function LastWinnerBallLayer({ wheelType = ACTIVE_WHEEL_TYPE }: LastWinnerBallLayerProps) {
  const winningNumber = useResultsStore((state) => state.currentWinner?.winningNumber)
  const active = useDrawCycleStore((state) => state.active)
  const nextDrawStartTime = useGameConfigStore((state) => state.nextDrawStartTime)
  const { remainingSeconds } = useCountdown(nextDrawStartTime)

  const mode = getEffectiveWheelRenderMode(wheelType)
  const videoGeometry = WHEEL_VIDEO_GEOMETRY[wheelType]
  const canvasWidth = mode === 'video' && videoGeometry ? videoGeometry.canvasWidth : WHEEL_CANVAS_WIDTH
  const canvasHeight = mode === 'video' && videoGeometry ? videoGeometry.canvasHeight : WHEEL_CANVAS_HEIGHT

  if (active || winningNumber === undefined) return null

  const pocket = toBallPocket(winningNumber)
  // La marca de la base solo está medida en modo imagen (ver comentario de BALL_DOCK_ANGLE_DEG) --
  // en modo video la bolita se queda pinneada al número ganador todo el tiempo, sin el regreso.
  const returning = mode !== 'video' && remainingSeconds <= BALL_RETURN_AT_REMAINING_SECONDS

  return (
    <svg className="last-winner-ball-layer" viewBox={`0 0 ${canvasWidth} ${canvasHeight}`} preserveAspectRatio="xMidYMid meet">
      {returning ? (
        <LastWinnerBallReturning pocket={pocket} wheelType={wheelType} />
      ) : (
        <WheelRotorGroup wheelType={wheelType} className="last-winner-ball-rotor-group">
          {(geometry) => <LastWinnerBall pocket={pocket} wheelType={wheelType} geometry={geometry} />}
        </WheelRotorGroup>
      )}
    </svg>
  )
}

interface LastWinnerBallProps {
  pocket: WheelPocket
  wheelType: WheelType
  geometry: PocketGeometry
}

function LastWinnerBall({ pocket, wheelType, geometry }: LastWinnerBallProps) {
  // El <g ref> de WheelRotorGroup (useWheelRotationSync) ya corre su sync al montar más un
  // reintento en el próximo rAF (ver ese hook) -- pero en una recarga completa de la página,
  // .lobby-wheel-rotor también está montando recién en ese mismo instante, así que ese primer
  // intento puede caer en una posición todavía no representativa. Esperar un segundo frame más
  // (uno después del rAF de reintento del hook) antes de revelar la imagen evita mostrar ese
  // instante transitorio -- el <g> exterior sigue montado igual mientras tanto (el sync sigue
  // corriendo detrás), esto solo oculta el resultado visual hasta entonces.
  const [ready, setReady] = useState(false)
  useEffect(() => {
    let secondFrame = 0
    const firstFrame = requestAnimationFrame(() => {
      secondFrame = requestAnimationFrame(() => setReady(true))
    })
    return () => {
      cancelAnimationFrame(firstFrame)
      cancelAnimationFrame(secondFrame)
    }
  }, [])

  if (!ready) return null

  const isVideoMode = getEffectiveWheelRenderMode(wheelType) === 'video'
  const size = isVideoMode ? BALL_VIDEO_SIZE : BALL_SIZE
  const radiusOffset = isVideoMode ? BALL_VIDEO_RADIUS_OFFSET : BALL_RADIUS_OFFSET

  const { x, y } = getPocketPositionForGeometry(pocket, wheelType, geometry, radiusOffset)
  const angleDeg = getPocketAngleDegForGeometry(pocket, wheelType, geometry)

  return (
    <g transform={`translate(${x}, ${y}) rotate(${angleDeg})`} data-number={pocket}>
      <image href={BALL_URL} x={-size / 2} y={-size / 2} width={size} height={size} />
    </g>
  )
}

interface LastWinnerBallReturningProps {
  pocket: WheelPocket
  wheelType: WheelType
}

// Bolita "despegada" del rotor -- vive en el frame FIJO del <svg> (mismas coordenadas que la marca
// impresa en Base_American.png, que no gira), a diferencia de LastWinnerBall (dentro del <g>
// rotante de WheelRotorGroup). Anima en dos fases sobre un único progreso 0..1 (useRafProgress,
// no depende de Pixi -- este layer vive fuera de <Application>): primero el radio (número ->
// borde interno, ángulo fijo), después el ángulo (borde interno -> marca de la base, radio fijo).
function LastWinnerBallReturning({ pocket, wheelType }: LastWinnerBallReturningProps) {
  const geometry = WHEEL_GEOMETRY[wheelType]

  // Ángulo/radio de partida, "congelados" una sola vez al montar (lazy initializer -- corre
  // sincrónico en el primer render, no en un efecto) -- captura dónde estaba la bolita DE VERDAD
  // en pantalla en este instante (ángulo impreso del pocket + rotación actual del rotor real,
  // mismo cálculo que useWheelRotationSync), porque a partir de acá esta bolita ya no gira más
  // con el rotor.
  const [startAngleDeg] = useState(() => {
    const pocketAngleDeg = getPocketAngleDegForGeometry(pocket, wheelType, geometry)
    const durationMs = WHEEL_SPIN_DURATION_SEC * 1000
    const rotorAnimation = document.querySelector('.lobby-wheel-rotor')?.getAnimations()[0]
    const rotorCurrentTimeMs = Number(rotorAnimation?.currentTime ?? 0)
    const rotorAngleDeg = ((rotorCurrentTimeMs % durationMs) / durationMs) * 360
    return (pocketAngleDeg + rotorAngleDeg) % 360
  })
  const [startRadius] = useState(() => geometry.radius + BALL_RADIUS_OFFSET)

  const rawProgress = useRafProgress(1, BALL_RETURN_TOTAL_DURATION_MS)

  let radius: number
  let angleDeg: number
  if (rawProgress <= BALL_LIFTOFF_FRACTION) {
    const phaseProgress = easeOutCubic(rawProgress / BALL_LIFTOFF_FRACTION)
    radius = startRadius + (BALL_DOCK_RADIUS - startRadius) * phaseProgress
    angleDeg = startAngleDeg
  } else {
    const phaseProgress = easeInOutCubic((rawProgress - BALL_LIFTOFF_FRACTION) / (1 - BALL_LIFTOFF_FRACTION))
    radius = BALL_DOCK_RADIUS
    angleDeg = startAngleDeg + shortestAngleDeltaDeg(startAngleDeg, BALL_DOCK_ANGLE_DEG) * phaseProgress
  }

  const { x, y } = getPolarPoint(geometry.center, radius, angleDeg)

  return (
    <g data-number={pocket}>
      <image href={BALL_URL} x={x - BALL_SIZE / 2} y={y - BALL_SIZE / 2} width={BALL_SIZE} height={BALL_SIZE} />
    </g>
  )
}
