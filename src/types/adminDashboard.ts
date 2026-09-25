export type AdminStatAccent = 'red' | 'blue' | 'purple' | 'green'

export interface AdminStatCardData {
  id: string
  titleKey: string
  value: string
  icon: string
  accent: AdminStatAccent
  // Opcional -- Video Management (ver adminVideosMockData.ts) usa estas cards sin variación día a
  // día real (Expected/Available/Storage no tienen un "vs ayer" con sentido), así que la fila de
  // trend se omite por completo cuando no vienen los 3 juntos, en vez de inventar un número.
  trend?: string
  trendDirection?: 'up' | 'down'
  trendLabelKey?: string
}

// Pick 3 y Pick 4 se agregan en un solo valor "quickMoney" (pedido explícito: ambos pertenecen a
// Quick Money, mismo criterio ya aplicado al admin-stat-card "Quick Money Rounds" -- ver
// adminDashboardMockData.ts). RecentRoundGame más abajo SÍ mantiene pick3/pick4 separados: ahí cada
// fila es una ronda real puntual, no un agregado, así que perder cuál de los dos juegos fue
// perdería información real.
export interface GamesActivitySeriesPoint {
  time: string
  roulette: number
  quickMoney: number
}

export type GamesDistributionGame = 'roulette' | 'quickMoney'

export interface GamesDistributionSegment {
  id: GamesDistributionGame
  labelKey: string
  value: number
  percent: number
  color: string
}

export type RecentRoundGame = 'roulette' | 'pick3' | 'pick4'

export interface RecentRound {
  id: string
  time: string
  game: RecentRoundGame
  result: number[]
  roundNumber: string
}

export interface SystemStatusService {
  id: string
  nameKey: string
  online: boolean
}

export interface AdminSidebarChildItem {
  id: string
  labelKey: string
  // Punto de estado a la izquierda del sub-item (ver Videos > Roulette Library/Lottery Video
  // Status en la referencia) -- puramente decorativo hoy, no representa un estado real todavía.
  indicator?: boolean
  // Vista (ver AdminPanel.tsx) a la que navega un click en este sub-item -- ej. RTP > Dashboard.
  // Los sub-items sin `view` quedan inertes (ej. RTP > Management, todavía no implementado).
  view?: string
}

export interface AdminSidebarItem {
  id: string
  labelKey: string
  icon: string
  disabled?: boolean
  children?: AdminSidebarChildItem[]
  // Vista (ver AdminPanel.tsx: useState, sin reload) a la que navega un click en la fila cuando
  // no es ya la sección activa. Un item con hijos y sin `view` (ej. RTP) solo expande/colapsa su
  // submenú al hacer click -- no navega él mismo.
  view?: string
}
