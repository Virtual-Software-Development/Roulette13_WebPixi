import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { ConfirmDialog } from '../ConfirmDialog'
import { TrashIcon, WarningIcon } from './icons'
import './adminSettings.css'

interface DangerZoneCardProps {
  onFactoryReset: () => void
}

// Alcance de "Factory Reset" confirmado con el usuario: solo restaura Database/Storage (los campos
// editables de este tab) a sus defaults -- no hay ningún otro estado de sistema real que resetear
// (ver conversación). Usa ConfirmDialog (generalizado desde DrawLogModal, ver ese archivo) por ser
// una acción irreversible -- el resto de Settings resuelve confirmaciones con la barra inline
// porque nada más ahí es igual de destructivo.
export function DangerZoneCard({ onFactoryReset }: DangerZoneCardProps) {
  const { t } = useTranslation()
  const [confirmOpen, setConfirmOpen] = useState(false)

  return (
    <section className="admin-panel admin-settings-card admin-settings-danger-zone">
      <div className="admin-settings-danger-zone-info">
        <span className="admin-settings-danger-zone-icon">
          <WarningIcon />
        </span>
        <div>
          <h2 className="admin-settings-danger-zone-title">{t('admin.settings.system.dangerZone.title')}</h2>
          <p className="admin-settings-danger-zone-description">{t('admin.settings.system.dangerZone.description')}</p>
        </div>
      </div>

      <button type="button" className="admin-settings-btn admin-settings-btn--danger-ghost" onClick={() => setConfirmOpen(true)}>
        <TrashIcon />
        {t('admin.settings.system.dangerZone.resetToFactoryDefaults')}
      </button>

      {confirmOpen && (
        <ConfirmDialog
          title={t('admin.settings.system.dangerZone.confirm.title')}
          description={t('admin.settings.system.dangerZone.confirm.description')}
          confirmLabel={t('admin.settings.system.dangerZone.confirm.confirm')}
          cancelLabel={t('admin.settings.system.dangerZone.confirm.cancel')}
          danger
          onCancel={() => setConfirmOpen(false)}
          onConfirm={() => {
            onFactoryReset()
            setConfirmOpen(false)
          }}
        />
      )}
    </section>
  )
}
