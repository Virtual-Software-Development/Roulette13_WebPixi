export function buildMediaUrl(relativePath: string): string {
  return `/media/${encodeURIComponent(relativePath)}`
}

// buildMediaUrl('') resolves to the truthy string '/media/' (a request for the media root
// directory itself, not a file) -- callers that gate rendering on `url && ...` (Header.tsx's logo,
// Background.tsx) would treat that as "there IS a url" and briefly render a real <img>/background
// pointing at it, which 404s a beat later. Use this instead for any field that comes from the
// backend as an optional path (gameInfo's logo/background) so an unset one stays the empty string
// callers already know how to treat as "nothing configured." Whitespace-only counts as unset too:
// the backend has been seen returning background: ' ', which became '/media/%20' -- not an image,
// so the lobby showed a broken-image icon in the corner.
export function buildMediaUrlOrEmpty(relativePath: string): string {
  const trimmed = relativePath?.trim() ?? ''
  return trimmed ? buildMediaUrl(trimmed) : ''
}

async function fetchMediaListing(dirRelativePath: string): Promise<string[]> {
  const res = await fetch(`/media-list/${encodeURIComponent(dirRelativePath)}`)
  // A 404 here means the directory itself doesn't exist (server/mediaHandler.js's
  // mediaListHandler 404s on fs.readdirSync failing) -- true for every number except "12" today,
  // since only that one folder has been recorded (see scripts/roulette-video-library.md). That's
  // no different from an existing-but-empty directory as far as callers care ("no clips for this
  // number"), so it resolves to [] instead of throwing -- otherwise pickRandomDrawResultVideoUrl's
  // fallback-to-12 logic below never even runs, since it only triggers on an empty result, not a
  // thrown exception.
  if (res.status === 404) return []
  if (!res.ok) throw new Error(`media-list request failed: ${res.status}`)
  return res.json()
}

const VIDEO_EXTENSIONS = ['.webm', '.mp4', '.mov']

// Carpeta de la librería de videos de resultado, una subcarpeta por número (37 = '00'). Por ahora
// se usan los MP4 H.264 de SORTED (sin alfa: el círculo de la rueda lo recorta el CSS, ver
// .video-pool-slot en videoPool.css) en vez de los .webm de Videos/<n>/, que traen el alfa en 255
// (fondo negro opaco) y pesan ~6 veces más.
const DRAW_VIDEO_DIR = 'Videos/SORTED'

// /media-list/ no filtra por extensión: una carpeta de la librería puede tener el video
// jugable Y su .spins.json sidecar mezclados en el mismo listado. Sin este filtro,
// pickRandomDrawResultVideoUrl podía elegir el .json como si fuera un video.
export async function fetchVideoFilesForNumber(result: number): Promise<string[]> {
  const files = await fetchMediaListing(`${DRAW_VIDEO_DIR}/${result}`)
  return files.filter((name) => VIDEO_EXTENSIONS.some((ext) => name.toLowerCase().endsWith(ext)))
}

// Only "12" has a clip checked into local-media/Videos today (the rest of the library hasn't been
// recorded/delivered yet -- see scripts/roulette-video-library.md). Falling back to it keeps a
// round showing SOMETHING instead of throwing and leaving the video slot blank, matching how the
// backend's own PickVariant already tolerates a missing variant rather than blocking the event
// (internal/video/repository.go) -- it just doesn't have anything else to fall back to yet either.
const FALLBACK_VIDEO_RESULT = 12

export async function pickRandomDrawResultVideoUrl(result: number): Promise<string> {
  let files = await fetchVideoFilesForNumber(result)
  let effectiveResult = result

  if (files.length === 0 && result !== FALLBACK_VIDEO_RESULT) {
    console.warn(`No hay video local para el número ${result} -- usando el clip de reserva (${FALLBACK_VIDEO_RESULT}).`)
    files = await fetchVideoFilesForNumber(FALLBACK_VIDEO_RESULT)
    effectiveResult = FALLBACK_VIDEO_RESULT
  }

  if (files.length === 0) throw new Error(`No hay videos locales para el número ${result} (ni el de reserva)`)
  const chosen = files[Math.floor(Math.random() * files.length)]
  return buildMediaUrl(`${DRAW_VIDEO_DIR}/${effectiveResult}/${chosen}`)
}
