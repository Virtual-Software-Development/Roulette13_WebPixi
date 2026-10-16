import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { AdminSelect, type AdminSelectOption } from './AdminSelect'
import { AdminFormField } from './AdminFormField'
import { InfoBanner } from './InfoBanner'
import { GAME_LABEL_KEY, RTP_GAMES, RTP_GAME_ICON_URLS } from '../../data/rtpGameLabels'
import { describeRtpError } from '../../hooks/useRtpManagement'
import type { RtpGame } from '../../types/rtpDashboard'
import { DAYS_OF_WEEK, type DayOfWeek, type NewRtpProfile, type RtpProfile, type RtpSettingsData } from '../../types/rtpManagement'
import './rtpScheduling.css'

// yyyy-mm-dd en hora LOCAL, `days` días después de hoy (Date#toISOString() convierte a UTC primero,
// lo que podría correr la fecha un día).
function localDateInput(days = 0): string {
  const date = new Date()
  date.setDate(date.getDate() + days)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
}

interface RtpProfileFormProps {
  existingProfiles: RtpProfile[]
  // Configuración vigente: valores iniciales de target/bandas; null si todavía no cargó.
  settingsByGame: Record<RtpGame, RtpSettingsData> | null
  onCancel: () => void
  // Lanza si el backend rechaza el profile (su mensaje se muestra en el formulario).
  onSave: (profile: NewRtpProfile) => Promise<void>
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
export function RtpProfileForm({ existingProfiles, settingsByGame, onCancel, onSave }: RtpProfileFormProps) {
  const { t } = useTranslation()
  const [name, setName] = useState('')
  const [game, setGame] = useState<RtpGame>('roulette')
  const [targetRtp, setTargetRtp] = useState(0)
  const [minBand, setMinBand] = useState(0)
  const [maxBand, setMaxBand] = useState(0)
  const [activeDays, setActiveDays] = useState<DayOfWeek[]>(DAYS_OF_WEEK)
  const [restrictHours, setRestrictHours] = useState(false)
  const [startTime, setStartTime] = useState('18:00')
  const [endTime, setEndTime] = useState('23:59')
  const [start, setStart] = useState(() => localDateInput())
  const [expires, setExpires] = useState(() => localDateInput(6))
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)
  // Fijado al montar el form -- Effective From no puede ser anterior a hoy, y Expires no puede ser
  // anterior a Effective From (pedido explícito). yyyy-mm-dd compara lexicográficamente igual que
  // cronológicamente (zero-padded), así que no hace falta parsear a Date para comparar.
  const [minStart] = useState(() => localDateInput())

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

  // Al cambiar de juego (o cuando llega la configuración) arranca desde los valores vigentes.
  const currentSettings = settingsByGame?.[game]
  useEffect(() => {
    if (!currentSettings) return
    setTargetRtp(currentSettings.targetRtp)
    setMinBand(currentSettings.minBand)
    setMaxBand(currentSettings.maxBand)
  }, [currentSettings])

  const gameOptions: AdminSelectOption<RtpGame>[] = RTP_GAMES.map((g) => ({
    value: g,
    label: t(GAME_LABEL_KEY[g]),
    icon: RTP_GAME_ICON_URLS[g],
  }))

  const toggleDay = (day: DayOfWeek) => {
    setActiveDays((prev) => (prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day]))
  }

  const hasOverlapRisk = existingProfiles.some((p) => p.game === game && (p.status === 'active' || p.status === 'scheduled' || p.status === 'expiringSoon'))

  const canSave = !saving && name.trim().length > 0 && start.length > 0 && expires.length > 0 && activeDays.length > 0

  const handleSubmit = async () => {
    setSaving(true)
    setSaveError(null)
    try {
      await onSave({
        name: name.trim(),
        game,
        targetRtp,
        minBand,
        maxBand,
        activeDays: DAYS_OF_WEEK.filter((d) => activeDays.includes(d)),
        restrictHours,
        startTime: restrictHours ? startTime : null,
        endTime: restrictHours ? endTime : null,
        startDate: start,
        expiresDate: expires,
      })
    } catch (err) {
      setSaveError(t('admin.rtp.management.scheduling.form.saveError', { message: describeRtpError(err, t) }))
      setSaving(false)
    }
  }

  // Panel propio a la derecha de Scheduled Profiles (ver RtpSchedulingPanel), con X para cerrarlo.
  return (
    <section className="admin-panel admin-rtp-profile-form" aria-labelledby="rtp-profile-form-title">
      <div className="admin-panel-header admin-rtp-profile-form-header">
        <h2 id="rtp-profile-form-title" className="admin-panel-title">{t('admin.rtp.management.scheduling.form.createTitle')}</h2>
        <button
          type="button"
          className="admin-rtp-profile-form-close"
          aria-label={t('admin.rtp.management.scheduling.form.close')}
          title={t('admin.rtp.management.scheduling.form.close')}
          onClick={onCancel}
        >
          <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
            <path d="M6 6 18 18M18 6 6 18" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
          </svg>
        </button>
      </div>

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
          <AdminFormField id="profile-start-time" label={t('admin.rtp.management.scheduling.form.startTime')} type="text" placeholder="HH:MM" value={startTime} onChange={setStartTime} />
          <AdminFormField id="profile-end-time" label={t('admin.rtp.management.scheduling.form.endTime')} type="text" placeholder="HH:MM" value={endTime} onChange={setEndTime} />
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

      {saveError && <InfoBanner variant="warning" title={saveError} />}

      <div className="admin-rtp-mgmt-confirm-actions">
        <button type="button" className="admin-rtp-mgmt-btn admin-rtp-mgmt-btn--ghost" onClick={onCancel}>
          {t('admin.rtp.management.scheduling.form.cancel')}
        </button>
        <button type="button" className="admin-rtp-mgmt-btn admin-rtp-mgmt-btn--primary" disabled={!canSave} onClick={() => void handleSubmit()}>
          {saving ? t('admin.rtp.management.saving') : t('admin.rtp.management.scheduling.form.save')}
        </button>
      </div>
    </section>
  )
}
