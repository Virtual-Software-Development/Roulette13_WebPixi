export function buildMediaUrl(relativePath: string): string {
  return `/media/${encodeURIComponent(relativePath)}`
}

export function buildDrawResultVideoUrl(result: number, video: number): string {
  return buildMediaUrl(`Videos/${result}/result_${result}_${video}.mp4`)
}
