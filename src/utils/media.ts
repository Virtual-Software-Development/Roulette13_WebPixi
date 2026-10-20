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
// se podía tomar el .json como si fuera un video.
export async function fetchVideoFilesForNumber(result: number): Promise<string[]> {
  const files = await fetchMediaListing(`${DRAW_VIDEO_DIR}/${result}`)
  return files.filter((name) => VIDEO_EXTENSIONS.some((ext) => name.toLowerCase().endsWith(ext)))
}

// The round's video: the clip the backend chose for it (videoFile in /drawResult, see
// quick-money-backend internal/videolib), the same on every machine -- so all of them play the same
// video. A machine never picks one itself: without the backend's choice (or with a name that isn't a
// plain file name) this throws, and App.tsx shows the round with VideoErrorRound (the correct
// number, without the video) instead of a video the other machines aren't playing.
export function drawResultVideoUrl(result: number, videoFile?: string): string {
  if (!videoFile) throw new Error(`the backend did not choose a video for draw result ${result}`)
  if (!/^[\w.-]+$/.test(videoFile) || videoFile.includes('..')) {
    throw new Error(`invalid video file name from the backend: ${videoFile}`)
  }
  return buildMediaUrl(`${DRAW_VIDEO_DIR}/${result}/${videoFile}`)
}
