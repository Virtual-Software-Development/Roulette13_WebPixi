import type { Connect } from 'vite'

export function createMediaHandler(options: {
  mediaRoot: string
  prefix?: string
}): Connect.NextHandleFunction
