// Ícono inline compartido por los botones "Clear"/"Reset" de Roulette/Pick 3/Pick 4 -- no hay un
// ícono de "X" en el set Website_svg_icons (ver investigación previa), así que se resuelve como
// SVG inline, mismo criterio que LogoutIcon/TrophyIcon en el resto del proyecto.
export function CloseIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path d="M6 6 18 18M18 6 6 18" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  )
}

// Flecha Current Result -> New Result (Pick 3/Pick 4) -- relación visual entre lo programado hoy
// y lo que el admin está preparando, ver comparación de resultados en PickResultPanel.
export function ArrowRightIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path d="M4 12h15M13 6l6 6-6 6" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

// Spinner del botón "Updating..." (Pick 3/Pick 4) -- ninguna librería de íconos en el proyecto
// trae uno (ver investigación previa); la rotación la da .admin-next-results-spinner en
// nextResults.css (pasada vía className, ver PickResultPanel).
export function SpinnerIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true" focusable="false">
      <circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" strokeOpacity="0.25" strokeWidth="2.4" />
      <path d="M21 12a9 9 0 0 0-9-9" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" />
    </svg>
  )
}
