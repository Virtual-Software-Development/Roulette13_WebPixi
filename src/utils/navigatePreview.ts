import { urlForPreview } from '../appSurface'

// Todavía no hay router en el proyecto -- "navegar" entre pantallas top-level se resuelve
// cambiando el path de la URL (/roulette-betting, reload completo), ver main.tsx: resolveScreen() lo
// lee una sola vez al montar. Admin y Juego corren en servidores (puertos) separados: si la
// pantalla destino es del otro, urlForPreview apunta a ese puerto (ver appSurface.ts).
export function navigateToPreview(preview: string | null) {
  window.location.href = urlForPreview(preview)
}
