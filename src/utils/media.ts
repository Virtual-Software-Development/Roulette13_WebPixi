export function buildMediaUrl(relativePath: string): string {
  return `/media/${encodeURIComponent(relativePath)}`
}

// buildMediaUrl('') resolves to the truthy string '/media/' (a request for the media root
// directory itself, not a file) -- callers that gate rendering on `url && ...` (Header.tsx's logo,
// Background.tsx) would treat that as "there IS a url" and briefly render a real <img>/background
// pointing at it, which 404s a beat later. Use this instead for any field that comes from the
// backend as an optional path (gameInfo's logo/background) so an unset one stays the empty string
// callers already know how to treat as "nothing configured."
export function buildMediaUrlOrEmpty(relativePath: string): string {
  return relativePath ? buildMediaUrl(relativePath) : ''
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

// /media-list/ no filtra por extensión: una carpeta Videos/<n>/ típicamente tiene el .webm
// jugable Y su .spins.json sidecar mezclados en el mismo listado. Sin este filtro,
// pickRandomDrawResultVideoUrl podía elegir el .json como si fuera un video.
export async function fetchVideoFilesForNumber(result: number): Promise<string[]> {
  const files = await fetchMediaListing(`Videos/${result}`)
  return files.filter((name) => VIDEO_EXTENSIONS.some((ext) => name.toLowerCase().endsWith(ext)))
}

// Only "12" has a clip checked into local-media/Videos today (the rest of the library hasn't been
// recorded/delivered yet -- see scripts/roulette-video-library.md). Falling back to it keeps a
// round showing SOMETHING instead of throwing and leaving the video slot blank, matching how the
// backend's own PickVariant already tolerates a missing variant rather than blocking the event
// (internal/video/repository.go) -- it just doesn't have anything else to fall back to yet either.
const FALLBACK_VIDEO_RESULT = 12

// A hardcoded, network-independent last resort -- unlike pickRandomDrawResultVideoUrl below, this
// never calls /media-list, so it still works even if THAT request is what's failing (e.g. the dev
// server / media proxy is having trouble). App.tsx falls back to this directly if anything in the
// normal video-prep chain throws, so a round is never left with no videoUrl at all (which would
// otherwise hang RouletteVideoView forever -- its effect no-ops on an empty/unset videoUrl).
export const GUARANTEED_FALLBACK_VIDEO_URL = buildMediaUrl(`Videos/${FALLBACK_VIDEO_RESULT}/12_0.webm`)

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
  return buildMediaUrl(`Videos/${effectiveResult}/${chosen}`)
}
