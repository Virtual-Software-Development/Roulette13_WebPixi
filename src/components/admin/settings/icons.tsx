// Íconos inline para Admin Settings -- no existe un ícono de campana (notifications) ni de carpeta
// (folder) en Website_svg_icons (ver investigación previa), así que se resuelven como SVG inline,
// mismo criterio que CloseIcon/ArrowRightIcon en nextResults/icons.tsx y SearchIcon/HourglassIcon
// en gameEvents/icons.tsx.
export function BellIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path
        d="M6 10.5a6 6 0 1 1 12 0v3.2l1.4 2.6a1 1 0 0 1-.9 1.5H5.5a1 1 0 0 1-.9-1.5L6 13.7v-3.2Z"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinejoin="round"
      />
      <path d="M9.5 19.5a2.5 2.5 0 0 0 5 0" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
    </svg>
  )
}

export function FolderIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path
        d="M4 6.5A1.5 1.5 0 0 1 5.5 5h4l1.6 2H18.5A1.5 1.5 0 0 1 20 8.5v9A1.5 1.5 0 0 1 18.5 19h-13A1.5 1.5 0 0 1 4 17.5v-11Z"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
    </svg>
  )
}

// Mismo trazo que EyeIcon/EyeOffIcon en LoginPage.tsx (show/hide password) -- esas no están
// exportadas desde una pantalla ajena, así que se replica el mismo path/lenguaje visual acá en vez
// de duplicar un ícono visualmente distinto para el mismo concepto.
export function EyeIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path
        d="M2.4 12S5.8 5.6 12 5.6 21.6 12 21.6 12 18.2 18.4 12 18.4 2.4 12 2.4 12z"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
      <circle cx="12" cy="12" r="2.8" fill="none" stroke="currentColor" strokeWidth="1.6" />
    </svg>
  )
}

export function EyeOffIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path
        d="M3.6 3.6l16.8 16.8M9.9 9.95a2.8 2.8 0 0 0 4.15 3.7M6.3 6.5C4.1 8 2.4 12 2.4 12s3.4 6.4 9.6 6.4c1.6 0 2.95-.42 4.1-1.03M14.9 6.3A10 10 0 0 1 21.6 12s-1.05 2-3 3.7"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

// Ninguno de los dos existe en Website_svg_icons -- wrench (System Operations) e info (System
// Information, mismo trazo que el InfoIcon privado de InfoBanner.tsx) se resuelven inline.
export function WrenchIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path
        d="M14.7 6.3a3.6 3.6 0 0 0-4.9 4.4L4.6 15.9a1.7 1.7 0 0 0 2.4 2.4l5.2-5.2a3.6 3.6 0 0 0 4.4-4.9l-2.3 2.3-1.9-.5-.5-1.9 2.3-2.3Z"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

export function InfoIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <circle cx="12" cy="12" r="9.2" fill="none" stroke="currentColor" strokeWidth="1.6" />
      <line x1="12" y1="11" x2="12" y2="16.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      <circle cx="12" cy="7.8" r="1.15" fill="currentColor" />
    </svg>
  )
}

// Rojo controlado vía currentColor -- los SVG de warning ya existentes en Website_svg_icons
// (23/40_warning_amber.svg) tienen el color ámbar fijo dentro del archivo, así que no sirven para
// "el ícono de warning debe ser rojo" (pedido explícito): un <img> no puede recolorear un SVG
// externo vía CSS, por eso este inline.
export function WarningIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path
        d="M12 4.2 21.3 20H2.7L12 4.2Z"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
      <line x1="12" y1="10.5" x2="12" y2="14.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      <circle cx="12" cy="17.2" r="1" fill="currentColor" />
    </svg>
  )
}

// Email/Discord/Slack/Webhook (Notification Channels) -- ninguno existe en Website_svg_icons. El
// proyecto sí tiene un símbolo "discord-icon" en public/icons.svg, pero es un asset huérfano (sin
// ningún <use>/xlinkHref en todo src/), pensado para un sprite de links sociales de otro contexto:
// viewBox distinto (20x19), color de marca fijo (fill="#08060d", no currentColor) y sin par de
// Slack. Usarlo acá rompería el lenguaje "línea, currentColor, 24x24" del resto de este archivo,
// así que los cuatro se dibujan inline con ese mismo trazo en vez de mezclar estilos.
export function EnvelopeIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <rect x="3" y="5.5" width="18" height="13" rx="2" fill="none" stroke="currentColor" strokeWidth="1.6" />
      <path d="M4 6.5 12 13l8-6.5" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

export function DiscordIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path
        d="M8.3 5.9c2.4-.6 4.9-.6 7.4 0M7 15.1c-1.9-.5-3-1.3-3-1.3-.2-2.9.4-5.6 2.1-7.7 0 0 1.4-.7 2.2-.9M17 15.1c1.9-.5 3-1.3 3-1.3.2-2.9-.4-5.6-2.1-7.7 0 0-1.4-.7-2.2-.9M7 15.1c1.7.8 3.3 1.2 5 1.2s3.3-.4 5-1.2M7 15.1c-.5.6-.9 1.4-1.2 2.1M17 15.1c.5.6.9 1.4 1.2 2.1"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <ellipse cx="9.4" cy="12.1" rx="1.15" ry="1.3" fill="currentColor" />
      <ellipse cx="14.6" cy="12.1" rx="1.15" ry="1.3" fill="currentColor" />
    </svg>
  )
}

export function SlackIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <rect x="9.8" y="3.2" width="2.6" height="7" rx="1.3" fill="currentColor" />
      <rect x="11.6" y="13.8" width="2.6" height="7" rx="1.3" fill="currentColor" />
      <rect x="3.2" y="11.6" width="7" height="2.6" rx="1.3" fill="currentColor" />
      <rect x="13.8" y="9.8" width="7" height="2.6" rx="1.3" fill="currentColor" />
    </svg>
  )
}

export function LinkIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path
        d="M9.5 14.5 14.5 9.5M10 6.5l1.2-1.2a3.2 3.2 0 0 1 4.5 4.5L14.5 11M14 17.5l-1.2 1.2a3.2 3.2 0 0 1-4.5-4.5L9.5 13"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

export function TrashIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path
        d="M5 7h14M9.5 7V5.2a1 1 0 0 1 1-1h3a1 1 0 0 1 1 1V7M7 7l.8 12a1.4 1.4 0 0 0 1.4 1.3h5.6a1.4 1.4 0 0 0 1.4-1.3L17 7"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <line x1="10" y1="10.5" x2="10.4" y2="16.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
      <line x1="14" y1="10.5" x2="13.6" y2="16.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
    </svg>
  )
}
