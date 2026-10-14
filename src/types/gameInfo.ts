export interface GameInfoDraw {
  drawNo: string
  time: string
  result: number
}

export interface GameInfoResponse {
  msgType: 'gameInfo'
  language: string
  gameName: string
  logo: string
  background: string
  roundInterval: number
  historyMax: number
  nextDraw: {
    drawNo: string
    startTime: string
    // hora_cierre_apuestas -- ausente en backends anteriores.
    betsCloseTime?: string
  }
  // Último sorteo ya ejecutado (en_curso o liquidado) -- a diferencia de `history` (solo liquidados)
  // ya incluye el que se está mostrando ahora. Ausente en backends anteriores o sin sorteos aún.
  lastDraw?: {
    drawNo: string
    startTime: string
    result: number | null
  }
  history: GameInfoDraw[]
  // Reloj del servidor al armar la respuesta (ms epoch) -- respaldo de time/serverClock.ts.
  serverTimeMs?: number
}
