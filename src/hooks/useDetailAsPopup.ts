import { useMediaQuery } from './useMediaQuery'

// Por debajo de este ancho los paneles de detalle laterales del Admin (Game Events, System Logs)
// dejan de ir al lado de la lista y se abren como pop-up (ver AdminDetailPopup.tsx) -- pedido
// explícito para tablet/teléfono. Un único breakpoint para todas las páginas master/detail.
const DETAIL_POPUP_QUERY = '(max-width: 1180px)'

export function useDetailAsPopup(): boolean {
  return useMediaQuery(DETAIL_POPUP_QUERY)
}
