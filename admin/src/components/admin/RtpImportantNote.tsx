import { useTranslation } from 'react-i18next'
import { buildMediaUrl } from '../../utils/media'
import './rtpImportantNote.css'

const WARNING_ICON_URL = buildMediaUrl('Website_svg_icons/23_warning_amber.svg')

export function RtpImportantNote() {
  const { t } = useTranslation()

  return (
    <section className="admin-panel admin-rtp-important-note">
      <div className="admin-rtp-important-note-header">
        <img src={WARNING_ICON_URL} className="admin-rtp-important-note-icon" alt="" />
        <h2 className="admin-rtp-important-note-title">{t('admin.rtp.importantNote.title')}</h2>
      </div>
      <p className="admin-rtp-important-note-text">{t('admin.rtp.importantNote.paragraph1')}</p>
      <p className="admin-rtp-important-note-text">{t('admin.rtp.importantNote.paragraph2')}</p>
    </section>
  )
}
