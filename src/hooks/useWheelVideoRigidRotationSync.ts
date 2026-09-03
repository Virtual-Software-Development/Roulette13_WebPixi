import { useLayoutEffect } from 'react'
import type { RefObject } from 'react'
import type { WheelVideoGeometry } from '../layout/wheelVideoGeometry.constants'
import { getActiveWheelVideoElement, onWheelVideoSwap } from '../video/wheelVideoActive'

// Aproximación DELIBERADA: en vez de recalcular la posición medida de cada casilla en cada
// frame (ver useWheelVideoPocketGeometry.ts), este hook resume el giro del frame actual en UN
// solo número (ver buildAverageRotationTable más abajo) y lo aplica como rotación rígida de todo
// el contenedor -- un solo transform por frame en vez de recalcular 12-38 posiciones.
//
// A cambio de ese ahorro se reintroduce un desvío medido en los datos: la cámara está centrada y
// a 90° (sin perspectiva), así que un giro rígido DEBERÍA ser exacto -- pero la tabla medida
// (wheelVideoGeometry.american.frames.ts) no es 100% consistente con ninguna rotación rígida
// única. Promediar las 38 casillas en vez de trackear una sola cancela buena parte de ese
// desvío estático (bajó el peor caso medido de ~23px a ~17px), pero no todo: lo que queda es una
// variación genuinamente no-rígida en la medición en sí (ruido de sub-píxel del pipeline de
// clasificación de color, compresión del video, o un leve tambaleo/precesión de la rueda física
// sobre su eje), no un error de cálculo -- no hay forma de cancelarlo del todo solo con
// matemática sobre esta tabla; requeriría re-medir con un pipeline más preciso.
//
// Ese residuo estático (~17px en el peor frame) resultó ser imperceptible cuadro a cuadro
// (confirmado a mano con WheelFrameStepper.tsx: en pausa, sobre CUALQUIER frame, la posición se
// ve correcta) -- pero en movimiento SÍ se nota como "drift". La causa no es la magnitud del
// desvío sino su naturaleza: no es un offset fijo, varía de forma ruidosa cuadro a cuadro (medido:
// el delta de rotación entre frames consecutivos tiene ~0.75°/frame de promedio pero ~0.35° de
// desvío estándar -- casi la mitad, con algún frame donde la rotación llega a ir momentáneamente
// hacia atrás). El ojo es mucho más sensible al JITTER frame a frame durante el movimiento que a
// un offset estático al mirar una imagen quieta -- por eso "para quieto se ve bien, en movimiento
// no". buildAverageRotationTable suaviza esos deltas con un promedio móvil circular antes de
// acumularlos (ver smoothRotationDeltas) -- el promedio general de velocidad no cambia (sigue
// dando la misma vuelta completa en el mismo tiempo), pero el salto entre frames consecutivos se
// vuelve mucho más parejo. El costo es que el desvío ESTÁTICO máximo crece un poco (~17px ->
// ~26px en el peor frame) -- aceptable: ya establecimos que un desvío estático de esa magnitud no
// se nota parado, así que cambiar "invisible + parejo" por "invisible + con saltos" es una
// pérdida neta, no una ganancia.
function angleDeltaDeg(a: number, b: number): number {
  let delta = (b - a) % 360
  if (delta > 180) delta -= 360
  if (delta < -180) delta += 360
  return delta
}

// Cuántos frames a cada lado entran en el promedio móvil que suaviza el jitter (ver comentario
// grande arriba) -- ventana total de ROTATION_SMOOTHING_HALF_WINDOW*2+1 frames (11 @ valor
// actual, ~183ms a 60fps). Más grande = más suave pero más "lag" perceptible al acelerar/frenar;
// ajustar a mano si hace falta.
const ROTATION_SMOOTHING_HALF_WINDOW = 5

// averageDeltaByFrame[f] = rotación promedio (entre las 38 casillas) de frame f-1 a f --
// averageDeltaByFrame[0] no es un delta real (no hay frame -1), queda en 0 y se excluye de la
// ventana de suavizado más abajo.
function computeAverageDeltaByFrame(frames: number[][]): number[] {
  const frameCount = frames.length
  const pocketCount = frames[0].length
  const deltas = new Array<number>(frameCount).fill(0)

  for (let f = 1; f < frameCount; f++) {
    let sum = 0
    for (let i = 0; i < pocketCount; i++) {
      sum += angleDeltaDeg(frames[f - 1][i], frames[f][i])
    }
    deltas[f] = sum / pocketCount
  }

  return deltas
}

// Promedio móvil sobre los deltas -- clamped en los bordes (frame 1 y frame frameCount-1), no
// circular: el "salto" real del loop (frame frameCount-1 -> frame 0, donde el giro acumulado NO
// da exactamente 360°) ya es un caso aparte que este suavizado no intenta resolver, tratarlo como
// si fuera continuo mezclaría ese salto real con el resto de la señal.
function smoothRotationDeltas(deltas: number[]): number[] {
  const n = deltas.length
  const smoothed = new Array<number>(n)

  for (let f = 0; f < n; f++) {
    let sum = 0
    let count = 0
    for (let k = -ROTATION_SMOOTHING_HALF_WINDOW; k <= ROTATION_SMOOTHING_HALF_WINDOW; k++) {
      const idx = f + k
      if (idx < 1 || idx >= n) continue // idx 0 no es un delta real (ver computeAverageDeltaByFrame)
      sum += deltas[idx]
      count++
    }
    smoothed[f] = count > 0 ? sum / count : deltas[f]
  }

  return smoothed
}

// rotationByFrame[f] = cuánto giró la rueda (promedio suavizado) entre el frame 0 y el frame f.
// Encapsulado en su propia función pura para poder memoizarla por geometría (ver
// rotationTableCache) -- es la misma tabla para cualquier montaje de esta rueda, no hace falta
// recalcularla dos veces.
function buildAverageRotationTable(video: WheelVideoGeometry): number[] {
  const frames = video.pocketAngleDegByFrame
  const frameCount = frames.length
  const smoothedDeltas = smoothRotationDeltas(computeAverageDeltaByFrame(frames))

  const table = new Array<number>(frameCount)
  table[0] = 0
  for (let f = 1; f < frameCount; f++) {
    table[f] = table[f - 1] + smoothedDeltas[f]
  }

  return table
}

const rotationTableCache = new WeakMap<WheelVideoGeometry, number[]>()

function getAverageRotationTable(video: WheelVideoGeometry): number[] {
  let table = rotationTableCache.get(video)
  if (!table) {
    table = buildAverageRotationTable(video)
    rotationTableCache.set(video, table)
  }
  return table
}

export function useWheelVideoRigidRotationSync(groupRef: RefObject<SVGGElement | null>, video: WheelVideoGeometry) {
  useLayoutEffect(() => {
    const group = groupRef.current
    if (!group) return

    const rotationByFrame = getAverageRotationTable(video)
    const frameCount = rotationByFrame.length

    function applyRotation(mediaTimeSec: number) {
      const frameIndex = ((Math.round(mediaTimeSec * video.fps) % frameCount) + frameCount) % frameCount
      // Mutación directa del DOM (no setState/React) a propósito -- ni siquiera vale la pena
      // pasar por el scheduler de React para un solo `rotate(deg)` por frame, mismo criterio que
      // useWheelRotationSync (que tampoco usa React para animar la rueda en modo imagen).
      group!.style.transform = `rotate(${rotationByFrame[frameIndex]}deg)`
    }

    let cancelled = false
    let unsubscribeCurrent: (() => void) | null = null

    // El doble-video de useSeamlessVideoLoop.ts cambia cuál <video> es el visible cada ~7s --
    // guardarse el elemento una sola vez al montar (y no volver a consultarlo) hace que este hook
    // se quede escuchando requestVideoFrameCallback del que quedó pausado, que ya no dispara nada,
    // y la rotación se congela justo en el primer swap. onWheelVideoSwap fuerza una
    // re-suscripción al elemento correcto cada vez que eso pasa.
    function subscribeToActiveVideo() {
      unsubscribeCurrent?.()
      unsubscribeCurrent = null

      const videoEl = getActiveWheelVideoElement()
      if (!videoEl) return

      if (typeof videoEl.requestVideoFrameCallback !== 'function') {
        let handle: number
        function tick() {
          if (cancelled) return
          applyRotation(videoEl!.currentTime)
          handle = requestAnimationFrame(tick)
        }
        handle = requestAnimationFrame(tick)
        unsubscribeCurrent = () => cancelAnimationFrame(handle)
        return
      }

      let vfcHandle: number
      function tick(_now: DOMHighResTimeStamp, metadata: VideoFrameCallbackMetadata) {
        if (cancelled) return
        applyRotation(metadata.mediaTime)
        vfcHandle = videoEl!.requestVideoFrameCallback(tick)
      }
      vfcHandle = videoEl.requestVideoFrameCallback(tick)
      unsubscribeCurrent = () => videoEl.cancelVideoFrameCallback(vfcHandle)
    }

    subscribeToActiveVideo()
    const unsubscribeSwap = onWheelVideoSwap(subscribeToActiveVideo)

    return () => {
      cancelled = true
      unsubscribeCurrent?.()
      unsubscribeSwap()
    }
  }, [video, groupRef])
}
