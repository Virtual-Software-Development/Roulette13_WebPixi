import { useTranslation } from 'react-i18next'
import { GAME_LABEL_KEY, RTP_GAME_ICON_URLS } from '../../data/rtpGameLabels'
import type { RtpBand } from '../../types/rtpDashboard'
import './currentBandsPanel.css'

// Verde = color de marca de Quick Money (ver quickMoneyLobbyTokens.css, pedido explícito).
const ACCENT_BY_GAME: Record<RtpBand['id'], 'red' | 'green'> = {
  roulette: 'red',
  quickMoney: 'green',
}

function InfoIcon() {
  return (
    <svg viewBox="0 0 24 24" className="admin-current-bands-footnote-icon" aria-hidden="true" focusable="false">
      <circle cx="12" cy="12" r="9.2" fill="none" stroke="currentColor" strokeWidth="1.6" />
      <line x1="12" y1="11" x2="12" y2="16.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      <circle cx="12" cy="7.8" r="1.15" fill="currentColor" />
    </svg>
  )
}

export function CurrentBandsPanel({ bands }: { bands: RtpBand[] }) {
  const { t } = useTranslation()

  return (
    <section className="admin-panel admin-current-bands">
      <div className="admin-panel-header">
        <h2 className="admin-panel-title">{t('admin.rtp.currentBands.title')}</h2>
      </div>

      <div className="admin-current-bands-list">
        {bands.map((band) => (
          <div key={band.id} className="admin-current-bands-row" data-accent={ACCENT_BY_GAME[band.id]}>
            <div className="admin-current-bands-left">
              <img src={RTP_GAME_ICON_URLS[band.id]} className="admin-current-bands-icon" alt="" />
              <span className="admin-current-bands-name">{t(GAME_LABEL_KEY[band.id])}</span>
            </div>
            <span className="admin-current-bands-spacer" />
            <span className="admin-current-bands-divider" aria-hidden="true" />
            <div className="admin-current-bands-range-col">
              <span className="admin-current-bands-range">
                {band.min}% – {band.max}%
              </span>
              <span className="admin-current-bands-width">{t('admin.rtp.currentBands.bandWidth', { value: Math.round((band.max - band.min) * 100) / 100 })}</span>
            </div>
          </div>
        ))}
      </div>

      <p className="admin-current-bands-footnote">
        <InfoIcon />
        {t('admin.rtp.currentBands.footnote')}
      </p>
    </section>
  )
}
