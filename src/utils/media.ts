export function buildMediaUrl(relativePath: string): string {
  return `/media/${encodeURIComponent(relativePath)}`
}

async function fetchMediaListing(dirRelativePath: string): Promise<string[]> {
  const res = await fetch(`/media-list/${encodeURIComponent(dirRelativePath)}`)
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

export async function pickRandomDrawResultVideoUrl(result: number): Promise<string> {
  const files = await fetchVideoFilesForNumber(result)
  if (files.length === 0) throw new Error(`No hay videos locales para el número ${result}`)
  const chosen = files[Math.floor(Math.random() * files.length)]
  return buildMediaUrl(`Videos/${result}/${chosen}`)
}
