import { useLayoutEffect, useRef } from 'react'
import { buildMediaUrl } from '../utils/media'
import { useGameConfigStore } from '../store/useGameConfigStore'
import { useDrawCycleStore } from '../store/useDrawCycleStore'
import { WHEEL_DISPLAY_SCALE, WHEEL_GEOMETRY, WHEEL_SPIN_DURATION_SEC } from '../layout/wheelGeometry.constants'
import { WHEEL_VIDEO_GEOMETRY } from '../layout/wheelVideoGeometry.constants'
import { ACTIVE_WHEEL_TYPE } from '../data/wheelOrder'
import { getEffectiveWheelRenderMode } from '../data/wheelRenderMode'
import { WHEEL_VIDEO_FROZEN } from '../config/wheelCalibration'
import { useSeamlessVideoLoop } from '../hooks/useSeamlessVideoLoop'
import { WheelFrameStepper } from './WheelFrameStepper'
import { LobbyWheelDebugOverlay } from './LobbyWheelDebugOverlay'
import { HotColdNumberChipLayer } from '../components/numberIndicators/HotColdNumberChipLayer'
import { LastWinnerBallLayer } from '../components/numberIndicators/LastWinnerBallLayer'
import { NumberCellHighlightLayer } from '../components/numberIndicators/NumberCellHighlightLayer'
import { DozenDiamondIndicatorLayer } from '../components/numberIndicators/DozenDiamondIndicatorLayer'
import { ColumnDiamondIndicatorLayer } from '../components/numberIndicators/ColumnDiamondIndicatorLayer'
import { useHotColdWindow } from '../hooks/useHotColdWindow'
import { useSpinStatsCycle } from '../hooks/useSpinStatsCycle'
import { useCategoryHighlightEntries } from '../hooks/useCategoryHighlightEntries'
import { useDozenColumnHighlightEntries } from '../hooks/useDozenColumnHighlightEntries'
import './lobbyBackgroundLayer.css'

const ACTIVE_WHEEL_GEOMETRY = WHEEL_GEOMETRY[ACTIVE_WHEEL_TYPE]
const WHEEL_BASE_URL = buildMediaUrl(ACTIVE_WHEEL_GEOMETRY.baseAsset)
const WHEEL_ROTOR_URL = buildMediaUrl(ACTIVE_WHEEL_GEOMETRY.rotorAsset)

// Modo de render de la rueda (imagen vs video) -- fijo por build, ver data/wheelRenderMode.ts.
// Se resuelve una sola vez acá (no cambia en runtime) en vez de recalcularse en cada render.
const WHEEL_RENDER_MODE = getEffectiveWheelRenderMode(ACTIVE_WHEEL_TYPE)
const ACTIVE_WHEEL_VIDEO_GEOMETRY = WHEEL_VIDEO_GEOMETRY[ACTIVE_WHEEL_TYPE]
const WHEEL_VIDEO_URL = ACTIVE_WHEEL_VIDEO_GEOMETRY ? buildMediaUrl(ACTIVE_WHEEL_VIDEO_GEOMETRY.videoAsset) : undefined

// -- Video viejo, comentado (no borrado) por si hace falta volver atrás --
// import { useEffect, useRef } from 'react'
// import { loadVideoSrc } from '../video/videoElements'
// import { useLobbyVideoClock } from '../store/useLobbyVideoClock'
//
// const LOBBY_LOOP_VIDEO_URL = buildMediaUrl('Lobby/lobby_loop.webm')
//
// function playWithMutedFallback(video: HTMLVideoElement) {
//   video.play().catch(() => {
//     video.muted = true
//     void video.play()
//   })
// }

// Fondo de RouletteLobby: dos <img> reales del DOM (base estática + rotor animado por CSS),
// sin pasar por Pixi/WebGL, montadas como hermanas de <Application> en App.tsx -- viven SIEMPRE
// detrás del canvas (z-index negativo, ver CSS). Reemplaza tanto al loop que antes pintaba
// LobbyView vía pixiSprite/textura como al <Background/> que pinta SharedLayout (ver prop
// hideBackground) -- todo el fondo de la pantalla de resultados es nativo del navegador, en vez
// de Pixi. Antes esto era un <video> en loop (lobby_loop.webm); se reemplazó por 2 PNG + rotación
// CSS porque decodificar video es más costoso de GPU que rotar una textura ya cargada (transform
// corre en el compositor) y da control total sobre velocidad/dirección del giro.
export function LobbyBackgroundLayer() {
  const backgroundUrl = useGameConfigStore((state) => state.backgroundUrl)
  const wheelRotorRef = useRef<HTMLImageElement>(null)
  const wheelImageGroupRef = useRef<HTMLDivElement>(null)
  // Espeja el último estado de congelamiento aplicado, para no tocar el DOM (classList/seek) en
  // cada tick del progreso -- solo al cruzar el umbral (ver el efecto más abajo).
  const wheelFrozenRef = useRef(false)
  // Mismos números y misma ventana de tiempo que NumberPanelHotCold (ver RouletteLobby.tsx) --
  // useHotColdWindow es la fuente única para ambos.
  const { shouldShow: showHotCold, hot, cold } = useHotColdWindow()
  // Categoría resaltada (red/black/even/odd/high/low) -- misma fuente que SpinStatsPanel (ver
  // useSpinStatsCycle), así la dona que brilla ahí y los números que se resaltan acá en la rueda
  // siempre corresponden a la misma categoría. useCategoryHighlightEntries se encarga de la
  // transición (entering/leaving) entre una categoría y la siguiente, ver su comentario.
  const { activeCategory } = useSpinStatsCycle()
  const highlightEntries = useCategoryHighlightEntries(activeCategory, ACTIVE_WHEEL_TYPE)
  // Fase 2 (docenas/columnas) -- misma activeCategory, useDozenColumnHighlightEntries ignora todo
  // lo que no sea una docena/columna (ver su comentario) y reparte entre los dos layers de acá
  // abajo según cuál esté resaltada en este instante.
  const { dozenEntries, columnEntries } = useDozenColumnHighlightEntries(activeCategory, ACTIVE_WHEEL_TYPE)

  // Doble-video con crossfade en vez de loop nativo -- esconde el hitch de Chromium al reiniciar
  // un <video loop> (bug genérico del navegador, confirmado incluso fuera de esta app -- ver
  // useSeamlessVideoLoop.ts). WHEEL_RENDER_MODE no cambia en runtime, así que "enabled" es estable
  // por montaje.
  const { videoRefA, videoRefB } = useSeamlessVideoLoop({
    enabled: WHEEL_RENDER_MODE === 'video' && !!WHEEL_VIDEO_URL,
    url: WHEEL_VIDEO_URL,
    frozen: WHEEL_VIDEO_FROZEN,
  })

  // Traslada el grupo base+rotor en sync con la subida/bajada del video de sorteo (mismo
  // progreso ya-easeado, misma duración), y congela el giro del rotor (modo imagen) recién
  // cuando ya terminó de ocultarse del todo (progress===1) -- no al arrancar la subida, para que
  // se lo vea girar mientras sale de escena en vez de quedar "muerto" detrás del video que sube.
  // Al bajar de vuelta, se destraba apenas el progreso deja de estar en 1 (retoma girando desde
  // el ángulo de referencia al que quedó fijado). No hace falta en modo video (WHEEL_VIDEO_FROZEN
  // ya cubre ESE caso, y acá `active`/`videoSlideProgress` nunca se mueven mientras
  // WHEEL_VIDEO_FROZEN está activo -- ver App.tsx: showVideo() ni siquiera dispara
  // setActive(true) en ese caso).
  //
  // Un solo useLayoutEffect/subscribe para ambas cosas (posición + freeze), en vez de un selector
  // reactivo (que re-renderizaría todo este componente, con varios hooks pesados encima, en cada
  // tick) -- se suscribe fuera de React y escribe el DOM a mano, mismo patrón que ya usa
  // RouletteVideoView con su <video> y useWheelRotationSync con Animation.currentTime.
  useLayoutEffect(() => {
    const applyProgress = (progress: number) => {
      const group = wheelImageGroupRef.current
      if (group) group.style.transform = `translateY(${-progress * 100}%)`

      const rotor = wheelRotorRef.current
      const shouldFreeze = progress >= 1
      if (rotor && shouldFreeze !== wheelFrozenRef.current) {
        wheelFrozenRef.current = shouldFreeze
        rotor.classList.toggle('lobby-wheel-rotor--frozen', shouldFreeze)
        if (shouldFreeze) {
          // Pausar (animation-play-state, vía la clase de arriba) no reposiciona, solo congela
          // donde haya quedado -- por eso hace falta este seek explícito al ángulo de referencia,
          // misma posición que usa la calibración/wheelDebug. Animation.currentTime (Web
          // Animations API), NO animation-delay como string: reasignar animation-delay sobre una
          // animación que ya lleva un rato corriendo NO la reposiciona (el navegador la
          // reinterpreta contra el momento en que arrancó originalmente, no contra "ahora") --
          // confirmado con el mismo bug en useWheelRotationSync.ts, ver su comentario.
          const rotorAnimation = rotor.getAnimations()[0]
          if (rotorAnimation) rotorAnimation.currentTime = 0
        }
      }
    }
    applyProgress(useDrawCycleStore.getState().videoSlideProgress)
    return useDrawCycleStore.subscribe((state) => applyProgress(state.videoSlideProgress))
  }, [])

  return (
    <div className="lobby-background-layer">
      {/* A diferencia del video viejo (opaco, tapaba todo), los PNG de la rueda (base/rotor,
          según ACTIVE_WHEEL_TYPE -- ver data/wheelOrder.ts) tienen transparencia real alrededor
          del círculo (verificado por canal alfa) -- esta imagen de fondo se ve genuinamente
          detrás/alrededor de la rueda, no solo como fallback mientras algo carga. */}
      {backgroundUrl && <img src={backgroundUrl} className="lobby-background-image" alt="" />}
      {/* Envuelve la rueda (imagen o video) y TODOS sus overlays -- un solo scale acá los achica
          juntos, anclado al punto central-inferior de la pantalla (ver WHEEL_DISPLAY_SCALE). La
          foto de fondo (lobby-background-image, arriba) queda afuera a propósito: solo la rueda
          debe achicarse, no el fondo. */}
      <div className="lobby-wheel-scale" style={{ transform: `scale(${WHEEL_DISPLAY_SCALE})` }}>
        {WHEEL_RENDER_MODE === 'video' && WHEEL_VIDEO_URL ? (
          <>
            <video
              ref={videoRefA}
              className="lobby-wheel-video"
              muted
              playsInline
              preload="auto"
              data-wheel-video-active="true"
              style={{ opacity: 0 }}
            />
            <video
              ref={videoRefB}
              className="lobby-wheel-video"
              muted
              playsInline
              preload="auto"
              data-wheel-video-active="false"
              style={{ opacity: 0 }}
            />
          </>
        ) : (
          <div className="lobby-wheel-image-group" ref={wheelImageGroupRef}>
            <img
              ref={wheelRotorRef}
              src={WHEEL_ROTOR_URL}
              className="lobby-wheel-rotor"
              alt=""
              style={{ animationDuration: `${WHEEL_SPIN_DURATION_SEC}s` }}
            />
            <img src={WHEEL_BASE_URL} className="lobby-wheel-base" alt="" />
          </div>
        )}
        {/* <video ref={videoRef} className="lobby-background-video" playsInline preload="auto" /> */}
        {showHotCold && <HotColdNumberChipLayer numbersByType={{ hot, cold }} />}
        <NumberCellHighlightLayer entries={highlightEntries} />
        <DozenDiamondIndicatorLayer entries={dozenEntries} />
        <ColumnDiamondIndicatorLayer entries={columnEntries} />
        <LastWinnerBallLayer />
        <LobbyWheelDebugOverlay />
      </div>
      <WheelFrameStepper />
    </div>
  )
}
