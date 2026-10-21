export const DRAW_VIDEO_SLOT_ID = 'roulette-video-slot-a'
// Radio del borde de la rueda en los videos de sorteo, como fracción del alto del video (479px de
// 1080, medido sobre toda la librería -- cámara fija). Mismo número que el clip-path de
// .video-pool-slot en videoPool.css: si cambia uno, cambiar el otro.
export const DRAW_VIDEO_WHEEL_RADIUS_RATIO = 0.444

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

// Clip del sorteo de Roulette descargado ENTERO a memoria antes de reproducirlo (blob: URL). Con
// solo 'loadedmetadata' (lo que espera loadVideoSrc) el video se daba por listo sin datos para
// reproducir, y en un kiosco con disco/CPU lentos arrancaba y se trababa -- cada traba lo atrasaba
// respecto de las demás máquinas. Un solo blob vivo: el anterior se libera al crear el siguiente o
// con releaseDrawVideoBlob (al terminar o abandonar la ronda).
let drawVideoBlobUrl: string | null = null

export async function preloadDrawVideoBlob(url: string, signal?: AbortSignal): Promise<string> {
  const res = await fetch(url, { signal })
  if (!res.ok) throw new Error(`preloadDrawVideoBlob: ${url} respondió ${res.status}`)
  const blob = await res.blob()
  signal?.throwIfAborted()
  releaseDrawVideoBlob()
  drawVideoBlobUrl = URL.createObjectURL(blob)
  return drawVideoBlobUrl
}

export function releaseDrawVideoBlob(): void {
  if (drawVideoBlobUrl) URL.revokeObjectURL(drawVideoBlobUrl)
  drawVideoBlobUrl = null
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
