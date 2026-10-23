// Qué pantallas sirve ESTE servidor -- el mismo código de src/ corre como tres apps separadas en dev
// (pedido explícito): Admin (Login + Admin Panel), Juego (lobbies de ruleta y Quick Money) y Betting
// (vistas de apuesta que abre el selector del tab BETTING), cada una en su puerto. 'all' = sin
// separación (build de producción servido por server.js, tests, `npm run dev`): todas las pantallas
// en el mismo origen, igual que antes. Lo inyecta vite.config.ts (define).
export type AppSurface = 'admin' | 'game' | 'betting' | 'all'
type ServerSurface = Exclude<AppSurface, 'all'>

export const APP_SURFACE: AppSurface = __APP_SURFACE__

const SURFACE_PORTS: Record<ServerSurface, number> = {
  admin: __ADMIN_PORT__,
  game: __GAME_PORT__,
  betting: __BETTING_PORT__,
}

// Pantallas (path de la URL, p.ej. /admin-users) de cada servidor -- el resto (incluido '/') son de
// Juego, salvo en el puerto Admin, donde '/' es el Login, y en el de Betting, donde es el selector
// de juego (ver main.tsx). 'betting' = ese selector como página.
export const ADMIN_PREVIEW_VALUES = [
  'admin',
  'admin-game-events',
  'admin-rtp-dashboard',
  'admin-rtp-management',
  'admin-next-results',
  'admin-next-results-quick-money',
  'admin-settings',
  'admin-programming',
  'admin-users',
  'admin-reports',
  'admin-system-logs',
]

export const BETTING_PREVIEW_VALUES = ['betting', 'roulette-betting', 'roulette-betting-cashier', 'quick-money-betting', 'quick-money-betting-cashier']

export function isAdminPreview(preview: string | null): boolean {
  return preview === 'login' || (preview !== null && ADMIN_PREVIEW_VALUES.includes(preview))
}

// Servidor al que pertenece una pantalla.
export function surfaceForPreview(preview: string | null): ServerSurface {
  if (isAdminPreview(preview)) return 'admin'
  if (preview !== null && BETTING_PREVIEW_VALUES.includes(preview)) return 'betting'
  return 'game'
}

// Mismo host que la página actual, solo cambia el puerto -- así funciona igual en localhost que
// desde otra máquina de la red.
function originForPort(port: number): string {
  return `${window.location.protocol}//${window.location.hostname}:${port}`
}

// Pantalla de la URL actual: el path (localhost:4200/roulette-betting -> 'roulette-betting'); '/' es
// null. Los links viejos con ?preview= se siguen aceptando (main.tsx los pasa al path).
export function currentPreview(): string | null {
  const path = window.location.pathname.replace(/^\/+|\/+$/g, '')
  if (path) return decodeURIComponent(path)
  return new URLSearchParams(window.location.search).get('preview')
}

// Misma URL con la pantalla en el path, sin ?preview= (conserva el resto de los query params).
export function withPreviewPath(url: URL, preview: string | null): URL {
  url.pathname = preview ? `/${encodeURIComponent(preview)}` : '/'
  url.searchParams.delete('preview')
  return url
}

// URL de destino de una pantalla: en el mismo servidor solo cambia el path (conserva el resto de la
// URL); si la pantalla vive en otro servidor, apunta a su puerto.
export function urlForPreview(preview: string | null): string {
  const target = surfaceForPreview(preview)
  const sameServer = APP_SURFACE === 'all' || APP_SURFACE === target
  const url = sameServer ? new URL(window.location.href) : new URL(originForPort(SURFACE_PORTS[target]) + '/')
  return withPreviewPath(url, preview).toString()
}
