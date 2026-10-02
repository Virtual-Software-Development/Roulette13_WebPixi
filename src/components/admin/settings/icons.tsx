// Íconos inline para Admin Settings -- los que no existen en Website_svg_icons (ver investigación previa), así que se resuelven como SVG inline,
// mismo criterio que CloseIcon/ArrowRightIcon en nextResults/icons.tsx y SearchIcon/HourglassIcon
// en gameEvents/icons.tsx.
// Email (único canal de notificación) -- no existe en Website_svg_icons, se dibuja inline con el
// mismo trazo "línea, currentColor, 24x24" del resto de este archivo.
export function EnvelopeIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <rect x="3" y="5.5" width="18" height="13" rx="2" fill="none" stroke="currentColor" strokeWidth="1.6" />
      <path d="M4 6.5 12 13l8-6.5" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

