import { useEffect, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { useConnectionIssue } from '../../hooks/useConnectionIssue'
import './connectionBanner.css'

// Variable con la altura de la banda, para que el body de cada pantalla corra su padding-top y la
// banda no tape contenido (ver bettingTokens.css, quickMoneyBettingTokens.css, adminLayout.css).
const HEIGHT_VAR = '--connection-banner-height'

// Aviso persistente bajo el Header cuando la pantalla no puede confiar en el backend (ver
// useConnectionIssue). No es pantalla completa (pedido explícito): el cajero o el admin siguen
// viendo la pantalla. No se puede cerrar a mano; desaparece solo al recuperarse la conexión.
// Qué queda bloqueado mientras se muestra lo decide cada pantalla -- las de apuesta cierran el
// tablero (useBettingRoundPhase / useQuickMoneyRoundPhase).
//
// context: qué pantalla es, para el mensaje (qué consecuencias tiene) y qué se vigila -- las de
// apuesta incluyen MQTT, internet y reloj; Admin y Login solo el backend (ver useConnectionIssue).
// Login no tiene Header, así que ahí la banda va pegada arriba.
const MESSAGE_KEY = {
  betting: 'connectionBanner.bettingBlocked',
  admin: 'connectionBanner.adminStale',
  login: 'connectionBanner.loginBlocked',
} as const

export function ConnectionBanner({ context }: { context: keyof typeof MESSAGE_KEY }) {
  const { t } = useTranslation()
  const issue = useConnectionIssue(context === 'betting' ? 'betting' : 'admin')
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const root = document.documentElement
    const el = ref.current
    if (!el) {
      root.style.removeProperty(HEIGHT_VAR)
      return
    }
    // ResizeObserver y no un alto fijo: en pantallas angostas el texto ocupa dos líneas.
    const observer = new ResizeObserver(() => root.style.setProperty(HEIGHT_VAR, `${el.offsetHeight}px`))
    observer.observe(el)
    return () => {
      observer.disconnect()
      root.style.removeProperty(HEIGHT_VAR)
    }
  }, [issue])

  if (!issue) return null

  return (
    <div
      ref={ref}
      className="connection-banner"
      data-issue={issue}
      data-placement={context === 'login' ? 'top' : 'below-header'}
      role="alert"
      aria-live="assertive"
    >
      <svg className="connection-banner-icon" viewBox="0 0 24 24" aria-hidden="true">
        <path d="M12 3 2 20h20L12 3Z" fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
        <path d="M12 10v4.5M12 17.2v.1" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      </svg>
      <strong className="connection-banner-title">{t(`connectionBanner.${issue}`)}</strong>
      <span className="connection-banner-text">{t(MESSAGE_KEY[context])}</span>
    </div>
  )
}
