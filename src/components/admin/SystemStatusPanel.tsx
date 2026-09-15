import { useTranslation } from 'react-i18next'
import type { SystemStatusService } from '../../types/adminDashboard'
import './systemStatusPanel.css'

export function SystemStatusPanel({ services }: { services: SystemStatusService[] }) {
  const { t } = useTranslation()
  const allOperational = services.every((service) => service.online)

  return (
    <section className="admin-panel admin-system-status">
      <div className="admin-panel-header">
        <h2 className="admin-panel-title">{t('admin.dashboard.systemStatus.title')}</h2>
        {allOperational && (
          <span className="admin-system-status-summary">
            <span className="admin-status-dot admin-status-dot--online" />
            {t('admin.dashboard.systemStatus.allOperational')}
          </span>
        )}
      </div>

      <ul className="admin-system-status-list">
        {services.map((service) => (
          <li key={service.id} className="admin-system-status-row">
            <span className="admin-system-status-name">
              <span className={`admin-status-dot ${service.online ? 'admin-status-dot--online' : 'admin-status-dot--offline'}`} />
              {t(service.nameKey)}
            </span>
            <span className={service.online ? 'admin-system-status-value admin-system-status-value--online' : 'admin-system-status-value admin-system-status-value--offline'}>
              {service.online ? t('admin.dashboard.systemStatus.online') : t('admin.dashboard.systemStatus.offline')}
            </span>
          </li>
        ))}
      </ul>
    </section>
  )
}
