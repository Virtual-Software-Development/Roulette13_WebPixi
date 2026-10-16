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

// Quick Money es un solo juego: cada sorteo produce un número de Pick 3 y uno de Pick 4 juntos.
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
  // Inicio del intervalo (ISO 8601); hora o día según GameEventsOverTimeBucket.
  start: string
  completed: number
  failed: number
  cancelled: number
}

export type GameEventsOverTimeRange = '24h' | '7d' | '30d' | '90d'

export type GameEventsOverTimeBucket = 'hour' | 'day'

export type GamesDistributionGame = 'roulette' | 'quickMoney'

export interface GamesDistributionSegment {
  id: GamesDistributionGame
  labelKey: string
  value: number
  percent: number
  color: string
}

export type RecentRoundGame = 'roulette' | 'quickMoney'

// Resultado de un sorteo de Quick Money: los dígitos de Pick 3 y de Pick 4 del mismo sorteo.
export interface QuickMoneyDrawResult {
  pick3: number[]
  pick4: number[]
}

interface RecentRoundBase {
  id: string
  time: string
  roundNumber: string
}

// Roulette: la casilla ('0'..'36', '00').
export type RecentRound =
  | (RecentRoundBase & { game: 'roulette'; result: string })
  | (RecentRoundBase & { game: 'quickMoney'; result: QuickMoneyDrawResult })

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
export type ResultFrequencyGame = 'roulette' | 'quickMoney'

export type ResultFrequencyWindow = 100 | 500 | 1000

export interface ResultFrequencyBucket {
  // Casilla de ruleta ('0', '00', '1'..'36') o dígito de Quick Money ('0'..'9').
  key: string
  count: number
}

export interface ResultFrequencyData {
  rounds: number
  // Resultados contados: = rounds en Roulette, rounds × 7 en Quick Money (cada dígito del Pick 3 y
  // del Pick 4 de cada sorteo cuenta). Base para el "expected" uniforme: draws / buckets.length.
  draws: number
  buckets: ResultFrequencyBucket[]
}

export type ResultFrequencyByGame = Record<ResultFrequencyGame, Record<ResultFrequencyWindow, ResultFrequencyData>>
