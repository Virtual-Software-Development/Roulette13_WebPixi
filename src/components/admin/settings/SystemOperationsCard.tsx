import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { buildMediaUrl } from '../../../utils/media'
import { TrashIcon, WrenchIcon } from './icons'
import './adminSettings.css'

const REBUILD_ICON_URL = buildMediaUrl('Website_svg_icons/01_refresh_clock_white.svg')
const RESTART_ICON_URL = buildMediaUrl('Website_svg_icons/34_play_white.svg')

// Mismo criterio mock que DatabaseCard.tsx (sin backend real de cache/index/servicios, ver
// conversación) -- simula Testing.../success con setTimeout, comentado explícitamente como mock.
const ACTION_DURATION_MS = 700
const FEEDBACK_MS = 3000

type ActionStatus = 'idle' | 'running' | 'success'

function simulateAction(): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ACTION_DURATION_MS))
}

function useActionStatus() {
  const [status, setStatus] = useState<ActionStatus>('idle')
  useEffect(() => {
    if (status !== 'success') return
    const timer = setTimeout(() => setStatus('idle'), FEEDBACK_MS)
    return () => clearTimeout(timer)
  }, [status])
  const run = () => {
    setStatus('running')
    simulateAction().then(() => setStatus('success'))
  }
  return { status, run }
}

export function SystemOperationsCard() {
  const { t } = useTranslation()
  const clearCache = useActionStatus()
  const rebuildIndex = useActionStatus()
  const restartServices = useActionStatus()
  // Restart Services es la única de las tres que interrumpe partidas/usuarios en curso si alguna
  // vez se conecta a un backend real -- pedido explícito de "protección contra clicks
  // accidentales", resuelto con el mismo patrón de barra de confirmación inline ya establecido
  // (RtpSettingsPanel/GameEventDetailPanel), no un modal nuevo para algo de esta severidad menor.
  const [restartPendingConfirm, setRestartPendingConfirm] = useState(false)

  return (
    <section className="admin-panel admin-settings-card">
      <div className="admin-panel-header">
        <div className="admin-settings-card-heading">
          <span className="admin-settings-card-heading-icon admin-settings-card-heading-icon--inline">
            <WrenchIcon />
          </span>
          <div>
            <h2 className="admin-panel-title">{t('admin.settings.system.operations.title')}</h2>
            <p className="admin-settings-card-subtitle">{t('admin.settings.system.operations.subtitle')}</p>
          </div>
        </div>
      </div>

      <div className="admin-settings-operations-row">
        <div className="admin-settings-operation">
          <button
            type="button"
            className="admin-settings-btn admin-settings-btn--ghost admin-settings-btn--full"
            disabled={clearCache.status === 'running'}
            onClick={clearCache.run}
          >
            <TrashIcon />
            {clearCache.status === 'running'
              ? t('admin.settings.system.operations.clearingCache')
              : clearCache.status === 'success'
                ? t('admin.settings.system.operations.cacheCleared')
                : t('admin.settings.system.operations.clearCache')}
          </button>
          <p className="admin-settings-operation-description">{t('admin.settings.system.operations.clearCacheDescription')}</p>
        </div>

        <div className="admin-settings-operation">
          <button
            type="button"
            className="admin-settings-btn admin-settings-btn--ghost admin-settings-btn--full"
            disabled={rebuildIndex.status === 'running'}
            onClick={rebuildIndex.run}
          >
            <img src={REBUILD_ICON_URL} alt="" />
            {rebuildIndex.status === 'running'
              ? t('admin.settings.system.operations.rebuildingIndex')
              : rebuildIndex.status === 'success'
                ? t('admin.settings.system.operations.indexRebuilt')
                : t('admin.settings.system.operations.rebuildIndex')}
          </button>
          <p className="admin-settings-operation-description">{t('admin.settings.system.operations.rebuildIndexDescription')}</p>
        </div>

        <div className="admin-settings-operation">
          <button
            type="button"
            className="admin-settings-btn admin-settings-btn--ghost admin-settings-btn--full"
            disabled={restartServices.status === 'running'}
            onClick={() => setRestartPendingConfirm(true)}
          >
            <img src={RESTART_ICON_URL} alt="" />
            {restartServices.status === 'running'
              ? t('admin.settings.system.operations.restartingServices')
              : restartServices.status === 'success'
                ? t('admin.settings.system.operations.servicesRestarted')
                : t('admin.settings.system.operations.restartServices')}
          </button>
          <p className="admin-settings-operation-description">{t('admin.settings.system.operations.restartServicesDescription')}</p>
        </div>
      </div>

      {restartPendingConfirm && (
        <div className="admin-settings-confirm">
          <p className="admin-settings-confirm-title">{t('admin.settings.system.operations.restartConfirmTitle')}</p>
          <div className="admin-settings-actions">
            <button type="button" className="admin-settings-btn admin-settings-btn--ghost" onClick={() => setRestartPendingConfirm(false)}>
              {t('admin.settings.system.operations.restartConfirmCancel')}
            </button>
            <button
              type="button"
              className="admin-settings-btn admin-settings-btn--primary"
              onClick={() => {
                setRestartPendingConfirm(false)
                restartServices.run()
              }}
            >
              {t('admin.settings.system.operations.restartConfirmConfirm')}
            </button>
          </div>
        </div>
      )}
    </section>
  )
}
