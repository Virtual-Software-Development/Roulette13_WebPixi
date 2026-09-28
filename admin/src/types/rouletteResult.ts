// GET /roulette/last-results (public, no auth -- also used by the root game frontend's terminal
// view). Mirrors internal/events/repository.go's RouletteLastResult.
export interface RouletteLastResultApi {
  numeroEvento: string
  fecha: string
  horaProgramada: string
  resultadoEjecutado: number
}
