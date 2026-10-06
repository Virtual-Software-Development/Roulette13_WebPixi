import type { Connect } from 'vite'

export function findPhysicalAddress(): string | null

export function createTerminalInfoHandler(options?: { path?: string }): Connect.NextHandleFunction
