import { useTranslation } from 'react-i18next'
import { Tooltip } from './Tooltip'
import './lockedBadge.css'

function LockIcon() {
  return (
    <svg viewBox="0 0 24 24" className="admin-locked-icon-svg" aria-hidden="true" focusable="false">
      <rect x="5.5" y="11" width="13" height="9" rx="2" fill="none" stroke="currentColor" strokeWidth="1.8" />
      <path d="M8.5 11V8a3.5 3.5 0 0 1 7 0v3" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  )
}

interface LockedBadgeProps {
  reason: string
  tooltipId: string
}

// Ícono de candado junto al label de un field bloqueado -- reemplaza el StatusBadge/pill anterior
// (pedido explícito: "quitar el admin-status-badge"). Solo visual (hover/focus muestra el tooltip
// con la razón) -- sin acción de click todavía, porque no existe ninguna lógica real de
// "desbloquear" en el backend/mock (pedido explícito: no inventar esa interacción). Más grande que
// el ícono que vivía adentro del badge (16px + halo vs 11px sin fondo) para que se siga notando
// claramente que el campo está bloqueado aunque ya no tenga el fondo/borde de la pill.
export function LockedBadge({ reason, tooltipId }: LockedBadgeProps) {
  const { t } = useTranslation()
  return (
    <Tooltip id={tooltipId} content={reason} label={t('admin.rtp.management.settings.lock.badge')}>
      <span className="admin-locked-icon">
        <LockIcon />
      </span>
    </Tooltip>
  )
}
