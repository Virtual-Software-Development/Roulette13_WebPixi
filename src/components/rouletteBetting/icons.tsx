// SVGs locales de esta vista -- mismo criterio que components/admin/users/icons.tsx (un icons.tsx
// por carpeta de vista, en vez de una librería de íconos compartida).

export function RemoveIcon() {
  return (
    <svg viewBox="0 0 16 16" width="14" height="14" fill="none" aria-hidden="true" focusable="false">
      <path d="M3.5 3.5l9 9M12.5 3.5l-9 9" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  )
}

export function TicketIcon() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" aria-hidden="true" focusable="false">
      <path
        d="M3 8.5a1.5 1.5 0 0 1 1.5-1.5H10a2 2 0 0 0 4 0h5.5A1.5 1.5 0 0 1 21 8.5v2a1.5 1.5 0 0 0 0 3v2a1.5 1.5 0 0 1-1.5 1.5H14a2 2 0 0 0-4 0H4.5A1.5 1.5 0 0 1 3 15.5v-2a1.5 1.5 0 0 0 0-3v-2Z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
      <path d="M12 6v1.2M12 16.8V18" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  )
}

// Rombo vectorial -- no hay asset de diamante en local-media/ (mismo hallazgo que documenta
// utils/diamond.ts para la versión Pixi de este mismo símbolo, drawDiamond). Reemplaza al texto
// "RED"/"BLACK" en esas dos celdas -- mismo símbolo que lleva una mesa real.
export function DiamondIcon({ color }: { color: 'red' | 'black' }) {
  // El negro puro se perdía contra el fondo oscuro de la celda -- gris pizarra + borde bien claro,
  // mismo criterio que el diamante negro de LiveTableBetsPanel.tsx (fill oscuro pero legible +
  // stroke claro, nunca negro sobre negro).
  const fill = color === 'red' ? '#c4222c' : '#3a4552'
  const stroke = color === 'red' ? 'rgba(255,255,255,0.55)' : 'rgba(222,230,238,0.85)'
  // Más ancho que alto (pedido explícito) -- mismo rombo, estirado en el eje horizontal en vez
  // de un cuadrado rotado 45° perfecto. Tamaño grande (pedido explícito), a reverificar que
  // siga entrando en la celda -- ver comentario de OUTSIDE_ROW_HEIGHT en rouletteBetZones.ts.
  return (
    <svg viewBox="0 0 32 22" width="44" height="30" aria-hidden="true" focusable="false">
      <path d="M16 2 L30 11 L16 20 L2 11 Z" fill={fill} stroke={stroke} strokeWidth="1.5" strokeLinejoin="round" />
    </svg>
  )
}

export function ClockIcon() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" aria-hidden="true" focusable="false">
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.7" />
      <path d="M12 7.2v5l3.3 1.9" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

export function CheckCircleIcon() {
  return (
    <svg viewBox="0 0 24 24" width="20" height="20" fill="none" aria-hidden="true" focusable="false">
      <circle cx="12" cy="12" r="9.25" stroke="currentColor" strokeWidth="1.5" />
      <path d="M8 12.3l2.6 2.6 5.4-5.8" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}
