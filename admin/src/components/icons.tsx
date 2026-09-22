import type { SVGProps } from 'react'

export function UserIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" {...props}>
      <circle cx="10" cy="6.5" r="3.5" />
      <path d="M3 17c.8-3.5 3.4-5.5 7-5.5s6.2 2 7 5.5" strokeLinecap="round" />
    </svg>
  )
}

export function LockIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" {...props}>
      <rect x="4" y="9" width="12" height="8" rx="1.5" />
      <path d="M6.5 9V6.5a3.5 3.5 0 0 1 7 0V9" strokeLinecap="round" />
    </svg>
  )
}

export function EyeIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" {...props}>
      <path d="M1.5 10S4.5 4.5 10 4.5 18.5 10 18.5 10 15.5 15.5 10 15.5 1.5 10 1.5 10Z" strokeLinejoin="round" />
      <circle cx="10" cy="10" r="2.5" />
    </svg>
  )
}

export function EyeOffIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" {...props}>
      <path
        d="M2.5 2.5l15 15M8.2 8.35a2.5 2.5 0 0 0 3.45 3.45M5.8 5.9C3.6 7.15 1.5 10 1.5 10s3 5.5 8.5 5.5c1.35 0 2.53-.33 3.55-.83M12.1 4.9A9 9 0 0 1 10 4.5c5.5 0 8.5 5.5 8.5 5.5s-.7 1.28-2.02 2.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

export function CheckIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="2" {...props}>
      <path d="M2.5 7.2 5.6 10 11.5 3.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

export function ArrowRightIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" {...props}>
      <path d="M4 10h12M11 5l5 5-5 5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

export function GearIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.4" {...props}>
      <circle cx="10" cy="10" r="2.6" />
      <path
        d="M10 2.5v2M10 15.5v2M17.5 10h-2M4.5 10h-2M15.1 4.9l-1.4 1.4M6.3 13.7l-1.4 1.4M15.1 15.1l-1.4-1.4M6.3 6.3 4.9 4.9"
        strokeLinecap="round"
      />
    </svg>
  )
}

export function ExpandIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" {...props}>
      <path
        d="M7 3H3v4M13 3h4v4M17 13v4h-4M3 13v4h4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

export function RouletteIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.4" {...props}>
      <circle cx="10" cy="10" r="7.5" />
      <circle cx="10" cy="10" r="1.6" fill="currentColor" stroke="none" />
      <path d="M10 2.5V6M10 14v3.5M2.5 10H6M14 10h3.5M4.6 4.6l2.5 2.5M12.9 12.9l2.5 2.5M15.4 4.6l-2.5 2.5M7.1 12.9l-2.5 2.5" strokeLinecap="round" />
    </svg>
  )
}

export function DiceIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.4" {...props}>
      <rect x="3" y="3" width="14" height="14" rx="3" />
      <circle cx="7" cy="7" r="1.1" fill="currentColor" stroke="none" />
      <circle cx="13" cy="7" r="1.1" fill="currentColor" stroke="none" />
      <circle cx="10" cy="10" r="1.1" fill="currentColor" stroke="none" />
      <circle cx="7" cy="13" r="1.1" fill="currentColor" stroke="none" />
      <circle cx="13" cy="13" r="1.1" fill="currentColor" stroke="none" />
    </svg>
  )
}
