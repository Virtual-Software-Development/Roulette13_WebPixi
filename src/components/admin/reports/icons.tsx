// Íconos inline para Reports -- ninguno existe en Website_svg_icons con el color/semántica exacta
// que necesita cada KPI (coins/bets, payout, bar chart, pie de RTP) ni las acciones de la tabla
// (download, more, view/rename/delete), mismo criterio ya establecido en gameEvents/icons.tsx y
// users/icons.tsx: se resuelven como SVG inline en vez de sumar assets nuevos, mismo trazo
// (strokeWidth 1.6-1.8) que el resto del Admin.

export function CoinsIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <ellipse cx="12" cy="6" rx="7" ry="3" fill="none" stroke="currentColor" strokeWidth="1.7" />
      <path d="M5 6v5c0 1.66 3.13 3 7 3s7-1.34 7-3V6" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
      <path d="M5 11v5c0 1.66 3.13 3 7 3s7-1.34 7-3v-5" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
    </svg>
  )
}

export function PayoutIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path
        d="M4.2 7.6a2 2 0 0 1 2-2h9.4l3.2 3v9.3a1.5 1.5 0 0 1-1.5 1.5H6.2a2 2 0 0 1-2-2Z"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
      <path d="M4.2 12h15.6" fill="none" stroke="currentColor" strokeWidth="1.6" />
      <circle cx="16.8" cy="15.9" r="1.7" fill="currentColor" />
    </svg>
  )
}

export function RevenueBarsIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path d="M5 20V11M12 20V4M19 20v-7" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  )
}

export function RtpPieIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <circle cx="12" cy="12" r="8.2" fill="none" stroke="currentColor" strokeWidth="1.7" />
      <path d="M12 12 12 3.8A8.2 8.2 0 0 1 18.28 17.27Z" fill="currentColor" stroke="none" />
    </svg>
  )
}

export function DownloadIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path d="M12 3.5v11.4M7.6 10.5 12 14.9l4.4-4.4" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M4.5 16.5v2.3a1.7 1.7 0 0 0 1.7 1.7h11.6a1.7 1.7 0 0 0 1.7-1.7v-2.3" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

export function MoreIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <circle cx="12" cy="5.2" r="1.7" fill="currentColor" />
      <circle cx="12" cy="12" r="1.7" fill="currentColor" />
      <circle cx="12" cy="18.8" r="1.7" fill="currentColor" />
    </svg>
  )
}

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

export function PencilIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path
        d="M15.2 4.6 19.4 8.8 8.3 19.9l-4.5.6.6-4.5Z"
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

export function CloseIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path d="M6 6 18 18M18 6 6 18" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
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

export function ChevronLeftIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path d="M15.5 5 8.5 12l7 7" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

export function ChevronDownIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path d="M5 8.5 12 15.5 19 8.5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}
