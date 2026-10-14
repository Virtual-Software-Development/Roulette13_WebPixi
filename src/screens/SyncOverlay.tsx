import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { ensureClockTicking, useClockStore } from '../store/useClockStore'
import { isLobbySyncing, useLobbySyncStore } from '../store/useLobbySyncStore'
import './syncOverlay.css'

const FADE_OUT_MS = 400

// "Sincronizando…" del lobby (ver useLobbySyncStore): pantalla negra opaca sobre todo el lobby
// mientras esta máquina se pone a la par de las demás, así no se ven los ajustes de detrás. DOM fuera
// de Pixi, como WinnerPanel, en vw/vh (regla de layout: los overlays DOM no pasan por el escalado del
// canvas de diseño). El indicador es un arco girando con transform (solo compositor).
export function SyncOverlay() {
  const { t } = useTranslation()
  ensureClockTicking()
  const bootDone = useLobbySyncStore((state) => state.bootDone)
  const holdUntilMs = useLobbySyncStore((state) => state.holdUntilMs)
  // Contra el reloj compartido (tick de 200ms; re-render solo cuando el booleano cambia).
  const visible = useClockStore((clock) => isLobbySyncing({ bootDone, holdUntilMs }, clock.now))
  const [mounted, setMounted] = useState(visible)

  useEffect(() => {
    if (visible) {
      setMounted(true)
      return
    }
    const timer = setTimeout(() => setMounted(false), FADE_OUT_MS)
    return () => clearTimeout(timer)
  }, [visible])

  if (!mounted) return null

  return (
    <div
      className={`sync-overlay${visible ? '' : ' sync-overlay--leaving'}`}
      style={{ transitionDuration: `${FADE_OUT_MS}ms` }}
      role="status"
      aria-live="polite"
    >
      <div className="sync-overlay-card">
        <div className="sync-overlay-spinner" aria-hidden="true">
          <span className="sync-overlay-spinner-track" />
          <span className="sync-overlay-spinner-arc" />
        </div>
        <span className="sync-overlay-title">{t('sync.title')}</span>
        <span className="sync-overlay-subtitle">{t('sync.subtitle')}</span>
      </div>
    </div>
  )
}
