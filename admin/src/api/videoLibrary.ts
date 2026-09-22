import { apiFetch } from './client'
import type { MissingVideoVariants } from '../types/videoLibrary'

export async function fetchMissingVideoVariants(): Promise<MissingVideoVariants> {
  const res = await apiFetch('/video/missing')
  if (!res.ok) throw new Error(`video/missing fetch failed: ${res.status}`)
  return res.json()
}
