export type AdminStatAccent = 'red' | 'blue' | 'purple' | 'green'

export interface AdminStatCardData {
  id: string
  titleKey: string
  value: string
  icon: string
  accent: AdminStatAccent
  trend: string
  trendDirection: 'up' | 'down'
  trendLabelKey: string
}

export interface GamesActivitySeriesPoint {
  time: string
  roulette: number
  pick3: number
  pick4: number
}

export type GamesDistributionGame = 'roulette' | 'pick3' | 'pick4'

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
