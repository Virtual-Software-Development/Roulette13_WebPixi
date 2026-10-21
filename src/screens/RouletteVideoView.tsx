import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { useGameConfigStore } from '../store/useGameConfigStore'
import { useDrawCycleStore } from '../store/useDrawCycleStore'
import { commitPendingResult } from '../store/commitPendingResult'
import { useAnimatedProgress } from '../hooks/useAnimatedProgress'
import { RESULT_HOLD_MS, VIDEO_WHEEL_TRANSITION_DURATION_MS, WINNER_PANEL_LEAD_SECONDS } from '../layout/layout.constants'
import { easeInOutCubic } from '../utils/easing'
import { DRAW_VIDEO_SLOT_ID, getVideoSlot, loadVideoSrc, releaseDrawVideoBlob, resetVideoSlot } from '../video/videoElements'
import { startDrawVideoPlayback } from '../video/drawVideoMonitor'
import { onVideoNearEnd } from '../utils/videoSeek'
import { serverNow } from '../time/serverClock'
import { PLAY_START_OFFSET_MS, RESULT_HOLD_END_OFFSET_MS } from '../sync/lobbyTimeline'

// Escala del <video>, anclada arriba-al-centro (ver `transform-origin: top center` en
// videoPool.css) -- 1 = sin escalar. Tiene que combinarse en el MISMO string de `transform` que
// translateY más abajo: asignar video.style.transform por separado para el scale lo pisaría por
// completo (son la misma propiedad inline), no se puede setear una vez desde CSS y otra desde acá.
export const VIDEO_SCALE = 0.90

// Respaldos a hora absoluta (ver el efecto que los agenda): margen tras el instante en que el clip
// debería revelar el número / terminar, antes de forzarlo sin esperar al video.
const REVEAL_FALLBACK_GRACE_MS = 400
const END_FALLBACK_GRACE_MS = 800

// Hora absoluta en que arranca el clip (igual en todas las máquinas), o null sin T0 conocido.
function playStartAtFor(drawStartMs: number | null): number | null {
  return drawStartMs === null ? null : drawStartMs + PLAY_START_OFFSET_MS
}

interface RouletteVideoViewProps {
  // Se llama recién cuando el video termina de bajar de vuelta a su posición
  // de partida (no cuando termina de reproducirse — eso solo arranca el hold).
  onFullyExited?: () => void
  // Se llama apenas el video termina de reproducirse (evento 'ended'), antes del
  // freeze-hold/slide-down -- justo cuando este componente se oculta (handedOff), sin
  // esperar a que termine esa animación.
  onEnded?: () => void
  // El video arrancó pero no se puede mostrar bien (ver video/drawVideoMonitor.ts): App lo cambia por
  // VideoErrorRound. revealAtMs: cuándo revela el número este clip en las demás máquinas.
  onPlaybackFailed?: (revealAtMs: number | null) => void
}

// El video real vive en el pool de <video> del DOM (VideoPoolLayer, montado como hermano de
// <Application> en App.tsx) y se pinta directamente ahí -- ya no pasa por Pixi/WebGL (ni
// pixiSprite ni textura), lo que evita la subida de textura extra por frame. Los videos no traen
// alfa: la rueda se recorta del fondo negro con el clip-path circular de .video-pool-slot
// (videoPool.css).
// Este componente sigue montado dentro del árbol de Pixi únicamente para poder usar
// useAnimatedProgress (depende del ticker de Pixi) como reloj de la animación de entrada/salida
// -- no pinta nada en el canvas, devuelve null.
export function RouletteVideoView({ onFullyExited, onEnded, onPlaybackFailed }: RouletteVideoViewProps) {
  const videoUrlFromStore = useGameConfigStore((state) => state.videoUrl)
  const [ready, setReady] = useState(false)
  // true desde el evento 'ended' en adelante — este componente deja de pintarse (opacity:0,
  // revelando el fondo de LobbyBackgroundLayer detrás), aunque el hold/slide-down internos
  // sigan corriendo (siguen siendo necesarios para disparar onFullyExited).
  const [handedOff, setHandedOff] = useState(false)
  // Para los callbacks del monitor: una vez entregado (o revelado) el resultado ya no se abandona el video.
  const handedOffRef = useRef(false)
  const active = useDrawCycleStore((state) => state.active)
  // progress 0 = oculto abajo de la pantalla, 1 = en su posición final mostrándose.
  // Sube cuando active pasa a true, y baja cuando vuelve a false — el mismo cálculo
  // sirve para la entrada y, en reversa, para la salida.
  const progress = useAnimatedProgress(active ? 1 : 0, VIDEO_WHEEL_TRANSITION_DURATION_MS)
  const eased = easeInOutCubic(progress)
  const arrived = active && progress === 1
  const fullyExited = !active && progress === 0

  // Publica el mismo progreso ya-easeado que posiciona este video para que LobbyBackgroundLayer
  // (fuera del árbol de Pixi, no puede usar useAnimatedProgress) mueva la rueda del lobby en
  // sync -- ver useDrawCycleStore.videoSlideProgress. Sin gating por `ready`: existe desde el
  // instante en que `active` cambia, igual que `progress`.
  useLayoutEffect(() => {
    useDrawCycleStore.getState().setVideoSlideProgress(eased)
  }, [eased])

  useEffect(() => {
    if (!videoUrlFromStore) return

    let cancelled = false
    setReady(false)
    const video = getVideoSlot(DRAW_VIDEO_SLOT_ID)
    video.loop = false

    loadVideoSrc(video, videoUrlFromStore).then(() => {
      if (!cancelled) setReady(true)
    })

    // Sin resetVideoSlot acá: en desarrollo StrictMode corre esta limpieza al montar, y quitarle el
    // src al slot tiraba el clip que App.tsx acababa de precargar -- se volvía a cargar justo al
    // arrancar la ronda y esta máquina quedaba atrasada. El slot se libera al terminar la ronda
    // (fullyExited, abajo) o al abandonarla (App.handlePlaybackFailed).
    return () => {
      cancelled = true
    }
  }, [videoUrlFromStore])

  // Publica cuándo el video real ya terminó de cargar Y de subir del todo a su posición final --
  // ver useDrawCycleStore.videoArrived (por qué hace falta esperar las DOS cosas, no solo la
  // carga). `ready` de por sí ya casi seguro es true para cuando `arrived` lo es (900ms le sobran
  // de margen a una carga que además ya viene precargada desde App.tsx), pero incluirlo igual cierra
  // la ventana rara en que no fuera así: sin `ready`, el transform real del <video> (gateado por
  // `!ready` más abajo) todavía podría no haberse aplicado aunque el progreso ya diga 1. Se resetea
  // a false en el cleanup, no solo cuando pasa a true.
  useEffect(() => {
    const videoArrived = ready && arrived
    useDrawCycleStore.getState().setVideoArrived(videoArrived)
    return () => useDrawCycleStore.getState().setVideoArrived(false)
  }, [ready, arrived])

  useEffect(() => {
    if (!ready) return

    const video = getVideoSlot(DRAW_VIDEO_SLOT_ID)

    let holdTimer: ReturnType<typeof setTimeout> | undefined

    function handleEnded() {
      commitPendingResult()

      // Deja el resultado en pantalla (panel Winner) hasta la hora ABSOLUTA en que todas las máquinas
      // bajan la rueda (sync/lobbyTimeline.ts) -- no RESULT_HOLD_MS desde este 'ended': los clips son
      // aleatorios y duran distinto en cada máquina, así un clip corto simplemente deja el panel más
      // tiempo. Sin T0 conocido (no debería pasar), el hold de siempre.
      const drawStartMs = useDrawCycleStore.getState().drawStartMs
      const holdMs = drawStartMs === null ? RESULT_HOLD_MS : drawStartMs + RESULT_HOLD_END_OFFSET_MS - serverNow()
      holdTimer = setTimeout(() => {
        useDrawCycleStore.getState().setActive(false)
      }, Math.max(0, holdMs))
    }

    video.addEventListener('ended', handleEnded)

    return () => {
      video.removeEventListener('ended', handleEnded)
      clearTimeout(holdTimer)
    }
  }, [ready])

  // Dispara el hand-off visual (ocultar este video, avisar al caller para revelar el lobby) tan
  // cerca como sea posible del último frame REAL pintado -- separado del 'ended' de arriba
  // porque la ruleta sigue girando a velocidad casi constante hasta ese frame (nunca frena en
  // cámara), así que cualquier demora extra esperando el evento 'ended' se ve como un salto de
  // varios grados. Ver onVideoNearEnd en utils/videoSeek.ts.
  useEffect(() => {
    if (!ready) return
    const video = getVideoSlot(DRAW_VIDEO_SLOT_ID)
    return onVideoNearEnd(video, () => {
      handedOffRef.current = true
      setHandedOff(true)
      onEnded?.()
    })
  }, [ready, onEnded])

  // Captura el número ganador para el panel Winner (WinnerPanel.tsx) apenas quedan
  // WINNER_PANEL_LEAD_SECONDS del video -- no puede leer pendingResult en el momento en que el
  // panel debe desaparecer porque el 'ended' de handleEnded ya lo limpió para entonces (bastante
  // antes: el panel sigue en pantalla durante el hold + la bajada de la rueda). Registro
  // independiente del hand-off de arriba (mismo video, otro leadSeconds -- ver onVideoNearEnd).
  useEffect(() => {
    if (!ready) return
    const video = getVideoSlot(DRAW_VIDEO_SLOT_ID)
    return onVideoNearEnd(video, () => {
      const pendingResult = useDrawCycleStore.getState().pendingResult
      if (pendingResult) useDrawCycleStore.getState().setWinnerPanelNumber(pendingResult.result)
    }, WINNER_PANEL_LEAD_SECONDS)
  }, [ready])

  // Respaldos a hora absoluta: el panel Winner y el final de la ronda salen a la hora en que los
  // muestra el clip (el mismo en todas las máquinas) aunque este video vaya atrasado o no dispare
  // sus eventos -- así ninguna máquina revela el número ni vuelve al lobby tarde. Normalmente los
  // eventos del propio video llegan antes y estos timers no hacen nada (setWinnerPanelNumber con el
  // mismo número / 'ended' ya disparado).
  useEffect(() => {
    if (!ready) return
    const video = getVideoSlot(DRAW_VIDEO_SLOT_ID)
    const playStartAt = playStartAtFor(useDrawCycleStore.getState().drawStartMs)
    if (playStartAt === null || !Number.isFinite(video.duration)) return

    const at = (timestampMs: number, fn: () => void) => setTimeout(fn, Math.max(0, timestampMs - serverNow()))
    const revealAt = playStartAt + (video.duration - WINNER_PANEL_LEAD_SECONDS) * 1000
    const endAt = playStartAt + video.duration * 1000
    const timers = [
      at(revealAt + REVEAL_FALLBACK_GRACE_MS, () => {
        const { pendingResult, winnerPanelNumber } = useDrawCycleStore.getState()
        if (pendingResult && winnerPanelNumber === null) {
          console.warn('[drawVideo] el video no llegó a revelar el número a tiempo -- panel Winner por hora del servidor')
          useDrawCycleStore.getState().setWinnerPanelNumber(pendingResult.result)
        }
      }),
      at(endAt + END_FALLBACK_GRACE_MS, () => {
        // Solo mira 'ended', no el hand-off: un video que se traba en su último cuadro ya entregó al
        // lobby (onVideoNearEnd) pero nunca dispara 'ended', y sin este empujón el hold no se agendaba
        // y el panel Winner quedaba en pantalla para siempre.
        if (video.ended) return
        console.warn('[drawVideo] el video no terminó a tiempo -- se cierra por hora del servidor')
        // Mismo camino que el final real: los listeners de 'ended' (handleEnded y onVideoNearEnd)
        // registran el resultado, agendan el hold y entregan al lobby.
        video.pause()
        video.dispatchEvent(new Event('ended'))
      }),
    ]
    return () => timers.forEach(clearTimeout)
  }, [ready])

  // Arranca una vez que terminó de subir, a la hora absoluta del clip (saltando lo que haga falta si
  // esta máquina llegó tarde) y vigila la reproducción -- ver video/drawVideoMonitor.ts.
  useEffect(() => {
    if (!ready || !arrived) return

    const video = getVideoSlot(DRAW_VIDEO_SLOT_ID)
    const playStartAt = playStartAtFor(useDrawCycleStore.getState().drawStartMs) ?? serverNow()
    return startDrawVideoPlayback(video, {
      playStartAt,
      revealLeadSeconds: WINNER_PANEL_LEAD_SECONDS,
      onFail: (reason) => {
        if (handedOffRef.current) return
        console.warn(`[drawVideo] no se puede mostrar el video (${reason}) -- panel de video no disponible`)
        const revealAt = Number.isFinite(video.duration)
          ? playStartAt + (video.duration - WINNER_PANEL_LEAD_SECONDS) * 1000
          : null
        onPlaybackFailed?.(revealAt)
      },
    })
  }, [ready, arrived, onPlaybackFailed])

  // Avisa recién cuando terminó de bajar de vuelta, para que App desmonte este
  // componente y programe el siguiente sorteo.
  useEffect(() => {
    if (!fullyExited) return
    resetVideoSlot(getVideoSlot(DRAW_VIDEO_SLOT_ID))
    releaseDrawVideoBlob()
    onFullyExited?.()
  }, [fullyExited, onFullyExited])

  // Posiciona el <video> real del pool a mano: translateY(100%) lo deja empujado fuera de
  // pantalla por su propio alto (mismo <video> es position:fixed, 100vw/100vh, ver
  // videoPool.css), y translateY(0) es su posición final en pantalla — mismo cálculo que antes
  // hacía el pixiSprite con screenHeight/scale, pero en porcentaje, sin depender del canvas de
  // diseño. La opacidad, a diferencia de la posición, se apaga de un salto (no anima) apenas
  // handedOff — el caller ya reveló el loop de lobby por encima — igual que antes hacía
  // `visible={!handedOff}` en el pixiSprite; el hold/slide-down interno sigue corriendo (para
  // eventualmente disparar onFullyExited) aunque ya no se vea.
  useLayoutEffect(() => {
    if (!ready) return
    const video = getVideoSlot(DRAW_VIDEO_SLOT_ID)
    video.style.display = 'block'
    video.style.opacity = handedOff ? '0' : '1'
    video.style.transform = `translateY(${(1 - eased) * 100}%) scale(${VIDEO_SCALE})`
  }, [ready, eased, handedOff])

  return null
}
