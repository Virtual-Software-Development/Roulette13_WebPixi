export interface GameInfoDraw {
  drawNo: string
  time: string
  result: number
}

export interface GameInfoResponse {
  msgType: 'gameInfo'
  language: string
  // Idioma del panel de admin (Admin Panel Language de General Settings); backends viejos no lo mandan.
  adminLanguage?: string
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
