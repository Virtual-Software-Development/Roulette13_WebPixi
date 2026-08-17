export function buildMediaUrl(relativePath: string): string {
  return `/media/${encodeURIComponent(relativePath)}`
}

export async function fetchVideoFilesForNumber(result: number): Promise<string[]> {
  const res = await fetch(`/media-list/${encodeURIComponent(`Videos/${result}`)}`)
  if (!res.ok) throw new Error(`media-list request failed: ${res.status}`)
  return res.json()
}

export async function pickRandomDrawResultVideoUrl(result: number): Promise<string> {
  const files = await fetchVideoFilesForNumber(result)
  if (files.length === 0) throw new Error(`No hay videos locales para el número ${result}`)
  const chosen = files[Math.floor(Math.random() * files.length)]
  return buildMediaUrl(`Videos/${result}/${chosen}`)
}
