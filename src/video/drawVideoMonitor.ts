import { serverNow } from '../time/serverClock'

// Reproducción del clip del sorteo de Roulette alineada a la hora del servidor, con vigilancia.
//
// Todas las máquinas reproducen el MISMO clip (utils/media.ts pickDrawResultVideoUrl) desde la MISMA
// hora absoluta (T0 + PLAY_START_OFFSET_MS, ver sync/lobbyTimeline.ts). Antes cada una arrancaba
// cuando terminaba su carga y su animación de subida, desde el segundo 0, y nada corregía el
// atraso: el número salía en momentos distintos. Ahora:
// - si la máquina llega tarde, salta al punto donde van las demás (como ya hace Quick Money);
// - durante la reproducción, si se separa más de MAX_DRIFT_S de la hora del servidor, se recoloca;
// - si el video no se puede mostrar bien, avisa con onFail para pasar al panel de video no
//   disponible (que sigue la misma línea de tiempo). Antes ese panel solo cubría fallas de carga:
//   un video que arrancaba y después no pintaba cuadros (se oía pero no se veía) seguía así hasta
//   el final.

// Por debajo de esto no vale el salto (cuesta un hitch visible y la diferencia no se nota).
const SEEK_MIN_LAG_S = 0.15
// Separación tolerada respecto de la hora del servidor antes de recolocar el video.
const MAX_DRIFT_S = 0.35
// Entre dos correcciones: tras un salto el video tarda un poco en volver a pintar.
const DRIFT_CORRECTION_COOLDOWN_MS = 1500
// Sin imagen: después de reproducir esto, si se pintaron menos de MIN_PRESENTED_FRAMES cuadros (o
// el navegador descartó casi todos) el video se da por invisible aunque el audio siga sonando.
const NO_PICTURE_CHECK_AFTER_S = 1.5
const MIN_PRESENTED_FRAMES = 5
const MAX_DROPPED_RATIO = 0.9
// Trabado: currentTime no avanza durante esto con el video supuestamente reproduciéndose.
const STALL_FAIL_MS = 3000
// Llegó tan tarde que, saltando, quedaría menos que esto de video antes de revelar el número: no se
// muestra un clip que arranca prácticamente en el resultado.
const MIN_PLAY_BEFORE_REVEAL_S = 1
const CHECK_INTERVAL_MS = 250

export type DrawVideoFailure = 'tooLate' | 'playRejected' | 'error' | 'noPicture' | 'stalled'

export interface DrawVideoPlaybackOptions {
  // Hora absoluta (reloj del servidor, ms) en que el clip arranca en todas las máquinas.
  playStartAt: number
  // Segundos antes del final del clip en que se revela el número (WINNER_PANEL_LEAD_SECONDS):
  // desde ahí ya no se corrige ni se abandona el video, solo se deja terminar.
  revealLeadSeconds: number
  onFail: (reason: DrawVideoFailure) => void
  now?: () => number
}

interface PlaybackStats {
  startLagMs: number | null
  seekedToS: number | null
  driftCorrections: number
  presentedFrames: number
  totalFrames: number | null
  droppedFrames: number | null
  failure: DrawVideoFailure | null
}

// Arranca y vigila la reproducción. Devuelve la limpieza (deja de vigilar y registra un resumen).
export function startDrawVideoPlayback(video: HTMLVideoElement, options: DrawVideoPlaybackOptions): () => void {
  const { playStartAt, revealLeadSeconds, onFail, now = serverNow } = options
  const stats: PlaybackStats = {
    startLagMs: null,
    seekedToS: null,
    driftCorrections: 0,
    presentedFrames: 0,
    totalFrames: null,
    droppedFrames: null,
    failure: null,
  }
  let stopped = false
  let startTimer: ReturnType<typeof setTimeout> | undefined
  let checkTimer: ReturnType<typeof setInterval> | undefined
  let frameHandle: number | undefined
  // Segundos reproducidos por el propio video, sin contar los saltos que hace este monitor: un video
  // que no arranca no debe parecer "avanzando" porque se lo recoloca.
  let playedS = 0
  let lastCorrectionAt = 0
  let lastMediaTime = 0
  let lastProgressAt = 0

  const expectedMediaTime = () => (now() - playStartAt) / 1000
  const revealMediaTime = () => video.duration - revealLeadSeconds

  function fail(reason: DrawVideoFailure) {
    if (stopped) return
    stats.failure = reason
    // Nada de audio sin imagen: se calla y se para antes de pasar al panel.
    video.muted = true
    video.pause()
    stop()
    onFail(reason)
  }

  function countFrame() {
    if (stopped) return
    stats.presentedFrames++
    frameHandle = video.requestVideoFrameCallback(countFrame)
  }

  function check() {
    if (stopped) return
    if (video.error) return fail('error')
    const current = video.currentTime
    // Desde la revelación solo se deja terminar: el 'ended' (o el respaldo de RouletteVideoView)
    // cierra la ronda.
    if (current >= revealMediaTime() || video.ended) return stop()

    const t = performance.now()
    const advanced = current - lastMediaTime
    lastMediaTime = current
    if (advanced > 0.01) {
      playedS += advanced
      lastProgressAt = t
    } else if (t - lastProgressAt > STALL_FAIL_MS) {
      return fail('stalled')
    }

    if (playedS >= NO_PICTURE_CHECK_AFTER_S) {
      const quality = video.getVideoPlaybackQuality?.()
      const dropped = quality && quality.totalVideoFrames > 0 ? quality.droppedVideoFrames / quality.totalVideoFrames : 0
      if (video.videoWidth === 0 || stats.presentedFrames < MIN_PRESENTED_FRAMES || dropped > MAX_DROPPED_RATIO) {
        return fail('noPicture')
      }
    }

    const drift = expectedMediaTime() - current
    if (Math.abs(drift) > MAX_DRIFT_S && t - lastCorrectionAt > DRIFT_CORRECTION_COOLDOWN_MS) {
      const target = Math.min(expectedMediaTime(), revealMediaTime())
      if (target > 0) {
        lastCorrectionAt = t
        stats.driftCorrections++
        video.currentTime = target
        // El salto no cuenta como reproducción (ni para "trabado" ni para "sin imagen").
        lastMediaTime = target
      }
    }
  }

  function begin() {
    if (stopped) return
    const lagS = expectedMediaTime()
    stats.startLagMs = Math.round(lagS * 1000)
    if (Number.isFinite(video.duration) && lagS > revealMediaTime() - MIN_PLAY_BEFORE_REVEAL_S) return fail('tooLate')
    if (lagS > SEEK_MIN_LAG_S) {
      video.currentTime = lagS
      stats.seekedToS = Math.round(lagS * 100) / 100
    }
    lastMediaTime = video.currentTime
    lastProgressAt = performance.now()
    lastCorrectionAt = performance.now()
    if (typeof video.requestVideoFrameCallback === 'function') frameHandle = video.requestVideoFrameCallback(countFrame)
    else stats.presentedFrames = Number.POSITIVE_INFINITY

    // El kiosco corre sin interacción de usuario: si el navegador bloquea el autoplay con sonido,
    // se reintenta mudo (ver flag --autoplay-policy=no-user-gesture-required del lanzador). El slot
    // se reutiliza entre rondas: sin esto, un fail() (que lo silencia) dejaría mudas las siguientes.
    video.muted = false
    video.play().catch(() => {
      if (stopped) return
      video.muted = true
      video.play().catch(() => fail('playRejected'))
    })
    checkTimer = setInterval(check, CHECK_INTERVAL_MS)
  }

  function stop() {
    if (stopped) return
    stopped = true
    clearTimeout(startTimer)
    clearInterval(checkTimer)
    if (frameHandle !== undefined) video.cancelVideoFrameCallback?.(frameHandle)
    const quality = video.getVideoPlaybackQuality?.()
    if (quality) {
      stats.totalFrames = quality.totalVideoFrames
      stats.droppedFrames = quality.droppedVideoFrames
    }
    const log = stats.failure ? console.warn : console.info
    log('[drawVideo] reproducción', stats)
  }

  // Esperar a la hora absoluta si la subida terminó antes (no debería: la subida dura justo
  // PLAY_START_OFFSET_MS desde T0); si no, arrancar ya, saltando lo que haga falta.
  const waitMs = playStartAt - now()
  if (waitMs > 0) startTimer = setTimeout(begin, waitMs)
  else begin()

  return stop
}
