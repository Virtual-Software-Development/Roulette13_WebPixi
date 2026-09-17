// Tipos propios del panel horizontal de apuestas en vivo del LOBBY (LobbyLiveBetsPanel) --
// deliberadamente separados de LiveTableBetsData (src/types/liveTableBets.ts): ese tipo modela un
// snapshot fijo con `highlighted`/`showChipStack` decididos por el mapping de la API; acá no hay
// highlight sostenido -- el feedback de "acá entró una apuesta" es un pulso de escala disparado por
// el cambio de `total` (ver usePulseScale), sin chip stacks.

export type LobbyGroupKey =
  | 'firstDozen'
  | 'secondDozen'
  | 'thirdDozen'
  | 'firstColumn'
  | 'secondColumn'
  | 'thirdColumn'
  | 'low'
  | 'high'
  | 'even'
  | 'odd'
  | 'red'
  | 'black'

export interface LobbyBetCell {
  total: number
}

// Claves de número: '0', '00', '1'..'36' (mismo criterio que pocketKey en LiveTableBetsPanel, pero
// como Record en vez de array+Map porque acá cada celda se actualiza individualmente y con
// frecuencia).
export type LobbyNumberBets = Record<string, LobbyBetCell>
export type LobbyGroupBets = Record<LobbyGroupKey, LobbyBetCell>
