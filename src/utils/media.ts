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
  // mediaListHandler 404s on fs.readdirSync failing). That's no different from an
  // existing-but-empty directory as far as callers care ("no clips for this number"), so it
  // resolves to [] instead of throwing.
  if (res.status === 404) return []
  if (!res.ok) throw new Error(`media-list request failed: ${res.status}`)
  return res.json()
}

const VIDEO_EXTENSIONS = ['.webm', '.mp4', '.mov']

// Carpeta de la librería de videos de resultado, una subcarpeta por número (37 = '00'): MP4 H.264
// sin alfa (la rueda va sobre fondo negro y el círculo lo recorta el CSS, ver .video-pool-slot en
// videoPool.css).
const DRAW_VIDEO_DIR = 'Videos'

// /media-list/ no filtra por extensión: una carpeta de la librería puede tener el video
// jugable Y su .spins.json sidecar mezclados en el mismo listado. Sin este filtro,
// pickRandomDrawResultVideoUrl podía elegir el .json como si fuera un video.
export async function fetchVideoFilesForNumber(result: number): Promise<string[]> {
  const files = await fetchMediaListing(`${DRAW_VIDEO_DIR}/${result}`)
  return files.filter((name) => VIDEO_EXTENSIONS.some((ext) => name.toLowerCase().endsWith(ext)))
}

// FNV-1a de 32 bits: mismo string -> mismo número en cualquier máquina y navegador.
function hashString(value: string): number {
  let hash = 0x811c9dc5
  for (let i = 0; i < value.length; i++) {
    hash ^= value.charCodeAt(i)
    hash = Math.imul(hash, 0x01000193)
  }
  return hash >>> 0
}

// Picks one of the result's clips (local-media/Videos/{result}/, 37 = "00"; the library has 5 per
// number) the same way on every machine instead of at random: every lobby plays the SAME clip, so
// they all spin, land and reveal the number at the same instant (the clips last 15.2-20.7s; a random
// pick per machine made the winner panel appear up to ~5.5s apart). The choice is /drawResult's
// `video` (1-based variant the backend derives from the event, events.VideoVariant) over the listing
// sorted by name -- so the server's readdir order doesn't matter; without a usable variant, a hash of
// `seed` (the draw's identity). Never falls back to another number's clip: a video showing the wrong
// number is worse than none, so with no clip for the result this throws and App.tsx shows the round
// with VideoErrorRound (the correct number, without the video) instead.
export async function pickDrawResultVideoUrl(result: number, variant: number | null, seed: string): Promise<string> {
  const files = await fetchVideoFilesForNumber(result)
  if (files.length === 0) throw new Error(`No hay videos locales para el número ${result}`)
  const sorted = [...files].sort((a, b) => (a < b ? -1 : a > b ? 1 : 0))
  const index =
    variant !== null && Number.isInteger(variant) && variant >= 1 && variant <= sorted.length
      ? variant - 1
      : hashString(seed) % sorted.length
  const chosen = sorted[index]
  return buildMediaUrl(`${DRAW_VIDEO_DIR}/${result}/${chosen}`)
}
