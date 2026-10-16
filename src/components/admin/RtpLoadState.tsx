import { useTranslation } from 'react-i18next'
import { InfoBanner } from './InfoBanner'

interface RtpLoadStateProps {
  // null mientras carga.
  error: string | null
  onRetry: () => void
}

// Placeholder de RTP Management mientras llegan los datos del backend o si fallaron.
export function RtpLoadState({ error, onRetry }: RtpLoadStateProps) {
  const { t } = useTranslation()
  if (error === null) {
    return <p className="admin-rtp-mgmt-state-text">{t('admin.rtp.management.loading')}</p>
  }
  return (
    <div className="admin-rtp-mgmt-state">
      <InfoBanner variant="warning" title={error} />
      <button type="button" className="admin-rtp-mgmt-btn admin-rtp-mgmt-btn--ghost" onClick={onRetry}>
        {t('admin.rtp.management.retry')}
      </button>
    </div>
  )
}
