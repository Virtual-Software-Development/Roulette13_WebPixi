export const DRAW_VIDEO_SLOT_ID = 'roulette-video-slot-a'

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
