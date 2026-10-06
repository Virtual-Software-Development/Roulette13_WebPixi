import type { Connect } from 'vite'

export function hasInternet(targets?: { host: string; port: number }[]): Promise<boolean>

export function createInternetCheckHandler(options?: { path?: string }): Connect.NextHandleFunction
