import { useEffect, useRef, useState } from 'react'
import { ACTIVE_WHEEL_TYPE } from '../../data/wheelOrder'
import { getEffectiveWheelRenderMode } from '../../data/wheelRenderMode'
import { WHEEL_CANVAS_HEIGHT, WHEEL_CANVAS_WIDTH, WHEEL_GEOMETRY, WHEEL_SPIN_DURATION_SEC } from '../../layout/wheelGeometry.constants'
import { WHEEL_VIDEO_GEOMETRY } from '../../layout/wheelVideoGeometry.constants'
import { useCountdown } from '../../hooks/useCountdown'
import { useDrawCycleStore } from '../../store/useDrawCycleStore'
import { useGameConfigStore } from '../../store/useGameConfigStore'
import { useResultsStore } from '../../store/useResultsStore'
import { buildMediaUrl } from '../../utils/media'
import { easeOutCubic } from '../../utils/easing'
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

// Pedido explícito: deshabilitada por ahora -- la bolita se queda pinneada al número ganador
// (LastWinnerBall) hasta el próximo sorteo, sin despegar ni animar el regreso a la base. Volver a
// `true` reactiva LastWinnerBallReturning tal cual estaba (sin tocar el resto de esta lógica).
const BALL_RETURN_ANIMATION_ENABLED = false

// Cuánto antes del próximo sorteo (countdown real, useCountdown -- mismo criterio que
// useHotColdWindow/useSpinStatsCycle) la bolita "despega" del número ganador y empieza a volver a
// la marca de la base.
const BALL_RETURN_AT_REMAINING_SECONDS = 10

// Duración total del regreso. A diferencia de un diseño anterior (dos fases con sus propias
// duraciones, incluso con una ventana de superposición entre ambas) esto ya NO se reparte en
// tramos de tiempo independientes -- ver el comentario largo en LastWinnerBallReturning sobre por
// qué (verificado numéricamente: cualquier corte por TIEMPO entre "salir disparada" y "bordear el
// rin", superpuesto o no, seguía produciendo una caída de velocidad real a mitad de camino, se
// notaba como un tirón). Ajustar a mano.
const BALL_RETURN_TOTAL_DURATION_MS = 3300

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
  const returning = BALL_RETURN_ANIMATION_ENABLED && mode !== 'video' && remainingSeconds <= BALL_RETURN_AT_REMAINING_SECONDS

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
// rotante de WheelRotorGroup). Recorre dos tramos geométricos -- recto (número -> borde interno) y
// luego de arco (borde interno -> marca de la base) -- pero a diferencia de un diseño anterior
// (cada tramo con su propia duración/easing en el tiempo, con o sin superposición entre ambos) acá
// se miden las DISTANCIAS de los dos tramos, se sacan un total, y UNA sola curva de easing
// (easeOutCubic, ver más abajo) controla cuánta distancia total ya se recorrió en cada instante.
// Cortar por tiempo entre dos curvas independientes (con easeOutCubic terminando en velocidad cero
// y easeInOutCubic arrancando en velocidad cero) seguía produciendo una caída de velocidad real
// justo en el corte, superposición mediante -- confirmado numéricamente antes de este cambio. Con
// una sola curva sobre la distancia total, la velocidad (derivada de easeOutCubic, que es
// monótonamente decreciente) es continua de punta a punta: nunca sube ni baja de golpe a mitad de
// camino, solo cambia de dirección en el punto donde el tramo recto termina y arranca el de arco
// (a velocidad constante ahí, sin frenar) -- mismo criterio físico que un objeto que sale
// disparado y se va frenando hasta encastrar en su lugar, en vez de acelerar de nuevo a mitad de
// camino.
//
// Posicionamiento 100% imperativo (ref + rAF propio escribiendo `transform` directo por DOM), NO
// vía React state -- a diferencia de un diseño anterior (useRafProgress, que hacía forceRender en
// cada frame). Bajo CPU normal ambos enfoques se ven idénticos, pero confirmado con CPU throttling
// 4x (mismo que usa el usuario en DevTools): re-renderizar TODO el componente + reescribir x/y del
// <image> en cada frame competía por el mismo hilo principal ya reducido a 1/4, así que el
// navegador terminaba pintando menos frames de los que el propio rAF pedía (el trayecto llegaba
// bien al destino, pero con saltos perceptibles entre frames). Mover el trabajo por frame a una
// sola escritura de atributo sobre un <g> (sin pasar por render de React) saca esa competencia del
// medio.
function LastWinnerBallReturning({ pocket, wheelType }: LastWinnerBallReturningProps) {
  const geometry = WHEEL_GEOMETRY[wheelType]
  const groupRef = useRef<SVGGElement>(null)

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

  useEffect(() => {
    // Distancias de cada tramo, en px lineales -- se miden una sola vez al montar (dependen solo
    // de los valores "congelados" de arriba). arcDeltaDeg puede ser 0 (la bolita ya arrancó justo
    // en el ángulo de la marca) -- Math.sign(...|| 1) evita un NaN al no dividir por 0 más abajo en
    // ese caso límite, sin afectar el resultado (arcDistance también da 0 ahí).
    const arcDeltaDeg = shortestAngleDeltaDeg(startAngleDeg, BALL_DOCK_ANGLE_DEG)
    const liftoffDistance = BALL_DOCK_RADIUS - startRadius
    const arcDistance = BALL_DOCK_RADIUS * Math.abs(arcDeltaDeg) * (Math.PI / 180)
    const totalDistance = liftoffDistance + arcDistance
    const arcSign = Math.sign(arcDeltaDeg || 1)

    let rafId: number
    const startTime = performance.now()

    const tick = (now: number) => {
      const rawProgress = Math.min((now - startTime) / BALL_RETURN_TOTAL_DURATION_MS, 1)
      const traveledDistance = easeOutCubic(rawProgress) * totalDistance

      let radius: number
      let angleDeg: number
      if (traveledDistance <= liftoffDistance) {
        radius = startRadius + traveledDistance
        angleDeg = startAngleDeg
      } else {
        radius = BALL_DOCK_RADIUS
        const arcTraveled = traveledDistance - liftoffDistance
        angleDeg = startAngleDeg + (arcTraveled / BALL_DOCK_RADIUS) * (180 / Math.PI) * arcSign
      }

      const { x, y } = getPolarPoint(geometry.center, radius, angleDeg)
      groupRef.current?.setAttribute('transform', `translate(${x}, ${y})`)

      if (rawProgress < 1) rafId = requestAnimationFrame(tick)
    }

    rafId = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(rafId)
  }, [geometry, startAngleDeg, startRadius])

  return (
    <g ref={groupRef} data-number={pocket}>
      <image href={BALL_URL} x={-BALL_SIZE / 2} y={-BALL_SIZE / 2} width={BALL_SIZE} height={BALL_SIZE} />
    </g>
  )
}
