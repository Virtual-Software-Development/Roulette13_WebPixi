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
  history: GameInfoDraw[]
}
