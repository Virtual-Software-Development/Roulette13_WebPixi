export const DRAW_VIDEO_SLOT_ID = 'roulette-video-slot-a'
// Radio del borde de la rueda en los videos de sorteo, como fracción del alto del video (479px de
// 1080, medido sobre toda la librería -- cámara fija). Mismo número que el clip-path de
// .video-pool-slot en videoPool.css: si cambia uno, cambiar el otro.
export const DRAW_VIDEO_WHEEL_RADIUS_RATIO = 0.444
// <video> propio para el sorteo de Quick Money (ver QuickMoneyVideoView) -- separado del de Roulette
// para que ninguno de los dos pise el src/estado del otro si llegaran a solaparse.
export const QUICK_MONEY_VIDEO_SLOT_ID = 'quick-money-video-slot'

export function getVideoSlot(id: string): HTMLVideoElement {
  const el = document.getElementById(id)
  if (!(el instanceof HTMLVideoElement)) {
    throw new Error(`getVideoSlot: no se encontró <video id="${id}"> — ¿falta montar <VideoPoolLayer />?`)
  }
  return el
}

function resolveUrl(url: string): string {
  return new URL(url, window.location.href).href
}

// Carga un src en un <video> del pool. Si ya está cargado (mismo src, metadata lista), resuelve
// de inmediato en vez de recargar — evita un fetch/decode de más cuando el mismo componente se
// remonta (p.ej. StrictMode) o cuando App.tsx precarga el mismo video que después usa el screen.
export function loadVideoSrc(video: HTMLVideoElement, url: string): Promise<void> {
  if (video.currentSrc && video.currentSrc === resolveUrl(url) && video.readyState >= HTMLMediaElement.HAVE_METADATA) {
    return Promise.resolve()
  }

  return new Promise((resolve, reject) => {
    function onLoadedMetadata() {
      cleanup()
      resolve()
    }
    function onError() {
      cleanup()
      reject(new Error(`loadVideoSrc: no se pudo cargar ${url}`))
    }
    function cleanup() {
      video.removeEventListener('loadedmetadata', onLoadedMetadata)
      video.removeEventListener('error', onError)
    }

    video.addEventListener('loadedmetadata', onLoadedMetadata)
    video.addEventListener('error', onError)
    video.src = url
    video.load()
  })
}

// Precarga del video de Quick Money en su slot -- se llama al abrir el lobby y al entrar cada split
// (ver useQuickMoneyLobbyCycle), así cuando el countdown llega a 0 el video ya está listo y arranca
// sin espera. Deduplica la carga en curso: loadVideoSrc solo evita recargar si YA terminó
// (readyState), y una segunda llamada a mitad de carga reasignaría el src y la reiniciaría.
let quickMoneyPreload: { url: string; promise: Promise<void> } | null = null

export function preloadQuickMoneyVideo(url: string): Promise<void> {
  if (quickMoneyPreload?.url === url) return quickMoneyPreload.promise
  const promise = loadVideoSrc(getVideoSlot(QUICK_MONEY_VIDEO_SLOT_ID), url).catch((err: unknown) => {
    // Falló: se olvida para que el próximo intento vuelva a cargar desde cero.
    if (quickMoneyPreload?.promise === promise) quickMoneyPreload = null
    throw err
  })
  quickMoneyPreload = { url, promise }
  return promise
}

// Oculta un slot SIN soltar su src (a diferencia de resetVideoSlot): queda cargado y rebobinado para
// reproducirse de nuevo sin volver a descargar/decodificar -- lo usa el video de Quick Money, que se
// precarga antes de cada sorteo (ver preloadQuickMoneyVideo).
export function hideVideoSlot(video: HTMLVideoElement): void {
  video.pause()
  video.currentTime = 0
  video.style.display = 'none'
  video.style.transform = ''
  video.style.opacity = ''
}

// Libera un slot del pool: pausa, saca el src (corta la descarga/decode en curso) y lo oculta.
// Reemplaza al Assets.unload de la era Pixi.
export function resetVideoSlot(video: HTMLVideoElement): void {
  video.pause()
  video.removeAttribute('src')
  video.load()
  video.style.display = 'none'
  video.style.transform = ''
  video.style.opacity = ''
}
