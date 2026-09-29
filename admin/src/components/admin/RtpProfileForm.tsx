import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { AdminSelect, type AdminSelectOption } from './AdminSelect'
import { AdminFormField } from './AdminFormField'
import { InfoBanner } from './InfoBanner'
import { RTP_GAME_ICON_URLS } from '../../data/rtpDashboardMockData'
import { RTP_SETTINGS_BY_GAME } from '../../data/rtpManagementMockData'
import { GAME_LABEL_KEY, RTP_GAMES } from '../../data/rtpGameLabels'
import { formatDateDisplay, buildScheduleSummary } from '../../utils/rtpProfileFormat'
import type { RtpGame } from '../../types/rtpDashboard'
import { DAYS_OF_WEEK, type DayOfWeek, type RtpProfile } from '../../types/rtpManagement'
import type { CreateRtpProfileInput } from '../../types/rtpProfileApi'
import './rtpScheduling.css'

// yyyy-mm-dd en hora LOCAL -- mismo criterio que getNowAsDatetimeLocal en RtpSettingsPanel.tsx
// (Date#toISOString() convierte a UTC primero, lo que podría correr la fecha un día).
function getTodayAsDateInput(): string {
  const now = new Date()
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`
}

interface RtpProfileFormProps {
  existingProfiles: RtpProfile[]
  onCancel: () => void
  // `raw` carries the same values in the shape POST /rtp-profiles expects, so the caller can
  // persist this profile for real without this form needing to know anything about the API.
  onSave: (profile: RtpProfile, raw: CreateRtpProfileInput) => void
}

// Panel inline (no overlay) para crear un RTP Profile -- el proyecto no tiene modal/dialog/drawer
// (ver investigación previa), así que "Create RTP Profile" expande este mismo card system en vez
// de inventar un patrón nuevo.
//
// Sin selector de "Schedule Type": Date Range (Effective From/Expires) es la base única de todo
// profile, Active Days siempre está visible con los 7 días marcados por defecto (= aplica todos
// los días del rango; el usuario desmarca los que no quiera), y la franja horaria es un toggle
// opcional aparte (Restrict to specific hours each day) en vez de un modo mutuamente exclusivo.
// Una "campaña promocional" ya no es un tipo separado: es simplemente un profile con un Profile
// Name descriptivo (pedido explícito del usuario) -- no hay campo Campaign dedicado.
export function RtpProfileForm({ existingProfiles, onCancel, onSave }: RtpProfileFormProps) {
  const { t } = useTranslation()
  const [name, setName] = useState('')
  const [game, setGame] = useState<RtpGame>('roulette')
  const [targetRtp, setTargetRtp] = useState(RTP_SETTINGS_BY_GAME.roulette.targetRtp)
  const [minBand, setMinBand] = useState(RTP_SETTINGS_BY_GAME.roulette.minBand)
  const [maxBand, setMaxBand] = useState(RTP_SETTINGS_BY_GAME.roulette.maxBand)
  const [activeDays, setActiveDays] = useState<DayOfWeek[]>(DAYS_OF_WEEK)
  const [restrictHours, setRestrictHours] = useState(false)
  const [startTime, setStartTime] = useState('18:00')
  const [endTime, setEndTime] = useState('23:59')
  const [start, setStart] = useState('2026-09-18')
  const [expires, setExpires] = useState('2026-09-21')
  // Fijado al montar el form -- Effective From no puede ser anterior a hoy, y Expires no puede ser
  // anterior a Effective From (pedido explícito). yyyy-mm-dd compara lexicográficamente igual que
  // cronológicamente (zero-padded), así que no hace falta parsear a Date para comparar.
  const [minStart] = useState(getTodayAsDateInput)

  const handleStartChange = (value: string) => {
    const clampedStart = value < minStart ? minStart : value
    setStart(clampedStart)
    // Si el nuevo inicio queda después del vencimiento actual, empuja Expires para que nunca quede
    // antes de Effective From (en vez de dejar un rango inválido silencioso).
    if (expires < clampedStart) setExpires(clampedStart)
  }

  const handleExpiresChange = (value: string) => {
    setExpires(value < start ? start : value)
  }

  useEffect(() => {
    setTargetRtp(RTP_SETTINGS_BY_GAME[game].targetRtp)
    setMinBand(RTP_SETTINGS_BY_GAME[game].minBand)
    setMaxBand(RTP_SETTINGS_BY_GAME[game].maxBand)
  }, [game])

  const gameOptions: AdminSelectOption<RtpGame>[] = RTP_GAMES.map((g) => ({
    value: g,
    label: t(GAME_LABEL_KEY[g]),
    icon: RTP_GAME_ICON_URLS[g],
  }))

  const toggleDay = (day: DayOfWeek) => {
    setActiveDays((prev) => (prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day]))
  }

  const hasOverlapRisk = existingProfiles.some((p) => p.game === game && (p.status === 'active' || p.status === 'scheduled'))

  const canSave = name.trim().length > 0 && start.length > 0 && expires.length > 0 && activeDays.length > 0

  const handleSubmit = () => {
    const translateDay = (d: DayOfWeek) => t(`admin.rtp.management.scheduling.form.days.${d}`)
    const profile: RtpProfile = {
      id: `p-${Date.now()}`,
      name: name.trim(),
      game,
      targetRtp,
      minBand,
      maxBand,
      scheduleSummary: buildScheduleSummary(activeDays, restrictHours, startTime, endTime, translateDay),
      start: formatDateDisplay(start),
      expires: formatDateDisplay(expires),
      status: 'scheduled',
      createdBy: 'Admin',
      lastUpdated: formatDateDisplay(getTodayAsDateInput()),
    }
    const raw: CreateRtpProfileInput = {
      name: name.trim(),
      juego: game,
      targetRtp,
      minBand,
      maxBand,
      activeDays,
      restrictHours,
      startTime: restrictHours ? startTime : null,
      endTime: restrictHours ? endTime : null,
      startDate: start,
      expiresDate: expires,
    }
    onSave(profile, raw)
  }

  return (
    <div className="admin-rtp-profile-form">
      <p className="admin-rtp-profile-form-title">{t('admin.rtp.management.scheduling.form.createTitle')}</p>

      <div className="admin-rtp-scheduling-row">
        <AdminFormField id="profile-name" label={t('admin.rtp.management.scheduling.form.profileName')} value={name} onChange={setName} />
        <AdminSelect value={game} options={gameOptions} onChange={setGame} label={t('admin.rtp.management.gameSelectLabel')} />
      </div>

      <div className="admin-rtp-scheduling-row admin-rtp-scheduling-row--three">
        <AdminFormField
          id="profile-target-rtp"
          label={t('admin.rtp.management.scheduling.form.targetRtp')}
          suffix="%"
          type="number"
          step="0.01"
          value={targetRtp}
          onChange={(v) => setTargetRtp(Number(v))}
        />
        <AdminFormField
          id="profile-min-band"
          label={t('admin.rtp.management.scheduling.form.minBand')}
          suffix="%"
          type="number"
          step="0.01"
          value={minBand}
          onChange={(v) => setMinBand(Number(v))}
        />
        <AdminFormField
          id="profile-max-band"
          label={t('admin.rtp.management.scheduling.form.maxBand')}
          suffix="%"
          type="number"
          step="0.01"
          value={maxBand}
          onChange={(v) => setMaxBand(Number(v))}
        />
      </div>

      <div className="admin-rtp-profile-form-days">
        <span className="admin-form-field-label">{t('admin.rtp.management.scheduling.form.activeDays')}</span>
        <div className="admin-rtp-profile-form-days-chips">
          {DAYS_OF_WEEK.map((day) => (
            <button
              key={day}
              type="button"
              className="admin-rtp-profile-form-day-chip"
              data-active={activeDays.includes(day)}
              onClick={() => toggleDay(day)}
            >
              {t(`admin.rtp.management.scheduling.form.days.${day}`)}
            </button>
          ))}
        </div>
      </div>

      <label className="admin-rtp-toggle">
        <input type="checkbox" className="admin-rtp-toggle-input" checked={restrictHours} onChange={(e) => setRestrictHours(e.target.checked)} />
        <span className="admin-rtp-toggle-track">
          <span className="admin-rtp-toggle-thumb" />
        </span>
        <span className="admin-rtp-toggle-label">{t('admin.rtp.management.scheduling.form.restrictHours')}</span>
      </label>

      {restrictHours && (
        <div className="admin-rtp-scheduling-row">
          <AdminFormField id="profile-start-time" label={t('admin.rtp.management.scheduling.form.startTime')} type="text" value={startTime} onChange={setStartTime} />
          <AdminFormField id="profile-end-time" label={t('admin.rtp.management.scheduling.form.endTime')} type="text" value={endTime} onChange={setEndTime} />
        </div>
      )}

      <div className="admin-rtp-scheduling-row">
        <AdminFormField
          id="profile-start"
          label={t('admin.rtp.management.scheduling.form.effectiveFrom')}
          type="date"
          min={minStart}
          value={start}
          onChange={handleStartChange}
        />
        <AdminFormField
          id="profile-expires"
          label={t('admin.rtp.management.scheduling.form.expires')}
          type="date"
          min={start}
          value={expires}
          onChange={handleExpiresChange}
        />
      </div>

      {hasOverlapRisk && (
        <InfoBanner variant="warning" title={t('admin.rtp.management.scheduling.form.overlapWarningTitle')} description={t('admin.rtp.management.scheduling.form.overlapWarningDescription')} />
      )}

      <div className="admin-rtp-mgmt-confirm-actions">
        <button type="button" className="admin-rtp-mgmt-btn admin-rtp-mgmt-btn--ghost" onClick={onCancel}>
          {t('admin.rtp.management.scheduling.form.cancel')}
        </button>
        <button type="button" className="admin-rtp-mgmt-btn admin-rtp-mgmt-btn--primary" disabled={!canSave} onClick={handleSubmit}>
          {t('admin.rtp.management.scheduling.form.save')}
        </button>
      </div>
    </div>
  )
}
