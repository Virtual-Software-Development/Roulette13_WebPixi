import { onConnectionLost } from '../hooks/useConnectionIssue'
import { useBetsSummaryStore } from './useBetsSummaryStore'
import { useResultsStore } from './useResultsStore'

let started = false

// Modo degradado: al perder la conexión, los datos GLOBALES (totales de apuestas de la flota y
// listas de resultados) se marcan como desactualizados y sus paneles se ocultan, en vez de seguir
// mostrando lo último que llegó como si fuera actual. Cada store se limpia solo con el primer dato
// fresco tras la reconexión (ver `stale` en useBetsSummaryStore/useResultsStore). Lo local (el
// video en curso, las apuestas propias de la ronda) no se toca. Arrancado una vez por main.tsx en
// los servidores de Juego y Betting.
export function startStaleGlobalDataWatch(): void {
  if (started) return
  started = true
  onConnectionLost('terminal', () => {
    console.info('[degraded] conexión perdida -- ocultando totales y resultados hasta que lleguen frescos')
    useBetsSummaryStore.getState().markStale()
    useResultsStore.getState().markStale()
  })
}
