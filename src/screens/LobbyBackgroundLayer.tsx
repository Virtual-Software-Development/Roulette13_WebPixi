import { useEffect, useRef } from 'react'
import { buildMediaUrl } from '../utils/media'
import { useGameConfigStore } from '../store/useGameConfigStore'
import { WHEEL_GEOMETRY, WHEEL_SPIN_DURATION_SEC } from '../layout/wheelGeometry.constants'
import { WHEEL_VIDEO_GEOMETRY } from '../layout/wheelVideoGeometry.constants'
import { ACTIVE_WHEEL_TYPE } from '../data/wheelOrder'
import { getEffectiveWheelRenderMode } from '../data/wheelRenderMode'
import { loadVideoSrc } from '../video/videoElements'
import { LobbyWheelDebugOverlay } from './LobbyWheelDebugOverlay'
// import { HotColdNumberChipLayer } from '../components/numberIndicators/HotColdNumberChipLayer'
// NumberCellHighlightLayer pausado temporalmente mientras se construye DozenDiamondIndicator.
// import { NumberCellHighlightLayer } from '../components/numberIndicators/NumberCellHighlightLayer'
// import { useNumberCellHighlightCycle } from '../hooks/useNumberCellHighlightCycle'
import { DozenDiamondIndicatorLayer } from '../components/numberIndicators/DozenDiamondIndicatorLayer'
// ColumnDiamondIndicatorLayer pausado temporalmente mientras se prueban las docenas.
// import { ColumnDiamondIndicatorLayer } from '../components/numberIndicators/ColumnDiamondIndicatorLayer'
import type { NumberIndicatorType } from '../types/numberIndicator'
import type { WheelPocket } from '../types/wheel'
import './lobbyBackgroundLayer.css'

const ACTIVE_WHEEL_GEOMETRY = WHEEL_GEOMETRY[ACTIVE_WHEEL_TYPE]
const WHEEL_BASE_URL = buildMediaUrl(ACTIVE_WHEEL_GEOMETRY.baseAsset)
const WHEEL_ROTOR_URL = buildMediaUrl(ACTIVE_WHEEL_GEOMETRY.rotorAsset)

// Modo de render de la rueda (imagen vs video) -- fijo por build, ver data/wheelRenderMode.ts.
// Se resuelve una sola vez acá (no cambia en runtime) en vez de recalcularse en cada render.
const WHEEL_RENDER_MODE = getEffectiveWheelRenderMode(ACTIVE_WHEEL_TYPE)
const ACTIVE_WHEEL_VIDEO_GEOMETRY = WHEEL_VIDEO_GEOMETRY[ACTIVE_WHEEL_TYPE]
const WHEEL_VIDEO_URL = ACTIVE_WHEEL_VIDEO_GEOMETRY ? buildMediaUrl(ACTIVE_WHEEL_VIDEO_GEOMETRY.videoAsset) : undefined

// Ejemplo de uso temporal -- a reemplazar cuando exista cálculo real de frecuencia sobre
// useResultsStore().history. HotColdNumberChip queda pausado por ahora (ver montaje comentado
// más abajo) mientras se construye NumberCellHighlight.
const DEMO_NUMBERS_BY_TYPE: Partial<Record<NumberIndicatorType, WheelPocket[]>> = {
  hot: [7, 23, 10, 5],
  cold: [8, 2, 16],
}

// Datos de prueba para NumberCellHighlight -- mismos números de la foto de referencia (11
// negro, 30 rojo, 8 negro).
const DEMO_HIGHLIGHT_NUMBERS: WheelPocket[] = [11, 30, 8]

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
  const wheelVideoRef = useRef<HTMLVideoElement>(null)
  // const highlightEntries = useNumberCellHighlightCycle(DEMO_HIGHLIGHT_NUMBERS)

  // Carga y arranca el loop del video de la rueda -- solo corre en modo video (WHEEL_RENDER_MODE
  // no cambia en runtime, así que este efecto es un no-op completo en modo imagen). Mismo
  // fallback de autoplay mudo que RouletteVideoView.tsx (el kiosco corre sin interacción de
  // usuario, el navegador puede bloquear autoplay con sonido).
  useEffect(() => {
    if (WHEEL_RENDER_MODE !== 'video' || !WHEEL_VIDEO_URL) return
    const video = wheelVideoRef.current
    if (!video) return

    let cancelled = false
    video.loop = true
    loadVideoSrc(video, WHEEL_VIDEO_URL).then(() => {
      if (cancelled) return
      video.play().catch(() => {
        video.muted = true
        void video.play()
      })
    })

    return () => {
      cancelled = true
    }
  }, [])

  return (
    <div className="lobby-background-layer">
      {/* A diferencia del video viejo (opaco, tapaba todo), los PNG de la rueda (base/rotor,
          según ACTIVE_WHEEL_TYPE -- ver data/wheelOrder.ts) tienen transparencia real alrededor
          del círculo (verificado por canal alfa) -- esta imagen de fondo se ve genuinamente
          detrás/alrededor de la rueda, no solo como fallback mientras algo carga. */}
      {backgroundUrl && <img src={backgroundUrl} className="lobby-background-image" alt="" />}
      {WHEEL_RENDER_MODE === 'video' && WHEEL_VIDEO_URL ? (
        <video ref={wheelVideoRef} className="lobby-wheel-video" muted playsInline />
      ) : (
        <>
          <img src={WHEEL_BASE_URL} className="lobby-wheel-base" alt="" />
          <img
            src={WHEEL_ROTOR_URL}
            className="lobby-wheel-rotor"
            alt=""
            style={{ animationDuration: `${WHEEL_SPIN_DURATION_SEC}s` }}
          />
        </>
      )}
      {/* <video ref={videoRef} className="lobby-background-video" playsInline preload="auto" /> */}
      {/* <HotColdNumberChipLayer numbersByType={DEMO_NUMBERS_BY_TYPE} /> */}
      {/* <NumberCellHighlightLayer entries={highlightEntries} /> */}
      {/* Solo 1-12 activo por ahora -- agregar 'secondDozen'/'thirdDozen' al array para
          probar las otras docenas. */}
      <DozenDiamondIndicatorLayer activeGroups={['thirdDozen']} />
      {/* <ColumnDiamondIndicatorLayer activeGroups={['thirdColumn']} /> */}
      <LobbyWheelDebugOverlay />
    </div>
  )
}
