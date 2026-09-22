// GET /lottery/last-results (public, no auth). Mirrors
// internal/events/repository.go's LotteryLastResult -- resultadoEjecutado is
// a digit string ("037" for pick3, "0374" for pick4), null until Execute has
// run for that modalidad.
export interface LotteryLastResultApi {
  numeroEvento: string
  fecha: string
  horaProgramada: string
  modalidad: 'pick3' | 'pick4'
  resultadoEjecutado: string | null
}
