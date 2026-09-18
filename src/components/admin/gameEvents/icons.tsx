// Íconos inline para Game Events -- no existe un ícono de lupa (search) ni de hourglass/duración
// en Website_svg_icons (ver investigación previa), así que se resuelven como SVG inline, mismo
// criterio que CloseIcon/ArrowRightIcon/SpinnerIcon en nextResults/icons.tsx.
export function SearchIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <circle cx="11" cy="11" r="6.5" fill="none" stroke="currentColor" strokeWidth="1.8" />
      <path d="M20 20 15.8 15.8" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  )
}

export function HourglassIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path
        d="M6 3.5h12M6 20.5h12M6.8 3.5c0 4.2 3 5.6 5.2 6.9 2.2 1.3 5.2 2.7 5.2 6.9M17.2 3.5c0 4.2-3 5.6-5.2 6.9-2.2 1.3-5.2 2.7-5.2 6.9"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
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

// Prev/Next de la paginación de la lista -- mismo trazo/grosor que ChevronDownIcon (AdminSidebar/
// AdminSelect), solo rotado 90°.
export function ChevronLeftIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path d="M15.5 5 8.5 12l7 7" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

export function ChevronRightIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path d="M8.5 5 15.5 12l-7 7" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}
