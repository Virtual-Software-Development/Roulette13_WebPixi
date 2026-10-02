export type AdminStatAccent = 'red' | 'blue' | 'purple' | 'green' | 'yellow'

export interface AdminStatCardData {
  id: string
  titleKey: string
  value: string
  icon: string
  accent: AdminStatAccent
  // Opcional -- la fila de trend se omite por completo cuando no vienen los 3 juntos, en vez de
  // inventar un número.
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

export interface GamePerformanceRow {
  id: RecentRoundGame
  labelKey: string
  wagers: number
  payouts: number
  ggr: number
}

export interface GameEventsOverTimePoint {
  time: string
  completed: number
  failed: number
  cancelled: number
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

// Result Frequency (Dashboard) -- solo resultados ya sorteados, nunca apuestas de la ronda en curso
// (el admin puede fijar el próximo resultado, ver Next Results & Manual Control).
export type ResultFrequencyGame = 'roulette' | 'pick3' | 'pick4'

export type ResultFrequencyWindow = 100 | 500 | 1000

export interface ResultFrequencyBucket {
  // Casilla de ruleta ('0', '00', '1'..'36') o dígito de Pick ('0'..'9').
  key: string
  count: number
}

export interface ResultFrequencyData {
  rounds: number
  // Resultados contados: = rounds en Roulette, rounds × posiciones en Pick 3/Pick 4 (cada dígito de
  // cada posición cuenta). Base para el "expected" uniforme: draws / buckets.length.
  draws: number
  buckets: ResultFrequencyBucket[]
}

export type ResultFrequencyByGame = Record<ResultFrequencyGame, Record<ResultFrequencyWindow, ResultFrequencyData>>
