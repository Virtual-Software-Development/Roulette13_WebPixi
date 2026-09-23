// SVGs locales de esta vista -- mismo criterio que components/rouletteBetting/icons.tsx: un
// icons.tsx por carpeta de vista, duplicado a propósito en vez de importar cross-folder, para que
// quickMoneyBetting/ quede autocontenida (folder-per-view).

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

export function ClockIcon() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" aria-hidden="true" focusable="false">
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.7" />
      <path d="M12 7.2v5l3.3 1.9" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

export function BackspaceIcon() {
  return (
    <svg viewBox="0 0 24 24" width="30" height="30" fill="none" aria-hidden="true" focusable="false">
      <path
        d="M9 5h9.5A1.5 1.5 0 0 1 20 6.5v11a1.5 1.5 0 0 1-1.5 1.5H9l-6-7 6-7Z"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
      <path d="M11 10l5 5M16 10l-5 5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  )
}

export function ClearIcon() {
  return (
    <svg viewBox="0 0 24 24" width="30" height="30" fill="none" aria-hidden="true" focusable="false">
      <path
        d="M4 12a8 8 0 1 1 2.5 5.8"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path d="M4 17v-5h5" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}
