// Copias propias de SearchIcon/CloseIcon (mismo trazo que gameEvents/icons.tsx y videos/icons.tsx)
// -- cada feature del Admin mantiene su propia copia de estos íconos inline en vez de importarlos
// entre carpetas (convención ya establecida, ver videos/icons.tsx).
export function SearchIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <circle cx="11" cy="11" r="6.5" fill="none" stroke="currentColor" strokeWidth="1.8" />
      <path d="M20 20 15.8 15.8" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  )
}

export function CloseIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path d="M6 6 18 18M18 6 6 18" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  )
}

// Affordance de "abrir detalle" al final de cada fila (pedido explícito: chevron, no un botón
// "View Details" ancho).
export function ChevronRightIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path d="M8.5 5 15.5 12l-7 7" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}
