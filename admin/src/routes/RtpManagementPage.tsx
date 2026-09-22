import { useCallback, useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { RtpManagementTabs } from '../components/admin/RtpManagementTabs'
import { RtpSettingsPanel } from '../components/admin/RtpSettingsPanel'
import { RtpSimulatorPanel } from '../components/admin/RtpSimulatorPanel'
import { RtpSchedulingPanel } from '../components/admin/RtpSchedulingPanel'
import { buildMediaUrl } from '../utils/media'
import { RTP_PROFILES, RTP_PROFILE_ACTIVITY, RTP_SETTINGS_BY_GAME } from '../data/rtpManagementMockData'
import { fetchRtpSetting, createRtpSetting } from '../api/rtpSettings'
import { fetchRtpProfiles, fetchRtpProfileEvents } from '../api/rtpProfiles'
import { RTP_GAMES } from '../data/rtpGameLabels'
import { formatDateDisplay, formatDateTimeDisplay, buildScheduleSummary } from '../utils/rtpProfileFormat'
import type { RtpGame } from '../types/rtpDashboard'
import type {
  RtpManagementTab,
  RtpProfile,
  RtpProfileActivity,
  RtpProfileActivityEvent,
  RtpProfileStatus,
  RtpSettingsData,
  DayOfWeek,
} from '../types/rtpManagement'
import type { RtpSettingApi } from '../types/rtpSetting'
import type { RtpProfileApi, RtpProfileEventApi } from '../types/rtpProfileApi'
import '../components/admin/rtpManagementShared.css'
import './rtpManagementPage.css'

const ARROW_ICON_URL = buildMediaUrl('Website_svg_icons/10_arrow_right_white.svg')

function fromApi(game: RtpGame, api: RtpSettingApi, fallback: RtpSettingsData): RtpSettingsData {
  return {
    ...fallback,
    game,
    targetRtp: api.targetRtp,
    minBand: api.minBand,
    maxBand: api.maxBand,
    correctionWindow: api.ventanaMedicionEventos,
    maxCorrectionPerEvent: api.topeCorreccionEventoPct,
    smoothingFactor: api.factorSuavizado,
    effectiveDate: `${api.effectiveDate}T00:00`,
  }
}

function toApi(data: RtpSettingsData): Omit<RtpSettingApi, 'id'> {
  return {
    juego: data.game,
    targetRtp: data.targetRtp,
    minBand: data.minBand,
    maxBand: data.maxBand,
    ventanaMedicionEventos: data.correctionWindow,
    topeCorreccionEventoPct: data.maxCorrectionPerEvent,
    factorSuavizado: data.smoothingFactor,
    effectiveDate: data.effectiveDate.split('T')[0],
  }
}

// created/disabled/enabled (the only event types the backend actually logs) mapped onto the
// existing RtpProfileActivityEvent labels the activity table already knows how to translate/
// render, instead of adding new i18n keys for a one-to-one rename.
const EVENT_TYPE_MAP: Record<string, RtpProfileActivityEvent> = {
  created: 'scheduled',
  disabled: 'disabled',
  enabled: 'activated',
}

function profileFromApi(api: RtpProfileApi, translateDay: (day: DayOfWeek) => string): RtpProfile {
  return {
    id: String(api.id),
    name: api.name,
    game: api.juego as RtpGame,
    targetRtp: api.targetRtp,
    minBand: api.minBand,
    maxBand: api.maxBand,
    scheduleSummary: buildScheduleSummary(api.activeDays as DayOfWeek[], api.restrictHours, api.startTime ?? '', api.endTime ?? '', translateDay),
    start: formatDateDisplay(api.startDate),
    expires: formatDateDisplay(api.expiresDate),
    status: api.status as RtpProfileStatus,
    createdBy: api.createdBy || '—',
    lastUpdated: formatDateTimeDisplay(api.updatedAt),
  }
}

function activityFromApi(api: RtpProfileEventApi): RtpProfileActivity {
  const period = api.restrictHours && api.startTime && api.endTime
    ? `${formatDateDisplay(api.startDate)} → ${formatDateDisplay(api.expiresDate)} · ${api.startTime}-${api.endTime}`
    : `${formatDateDisplay(api.startDate)} → ${formatDateDisplay(api.expiresDate)}`

  return {
    id: String(api.id),
    profileName: api.profileName,
    game: api.juego as RtpGame,
    event: EVENT_TYPE_MAP[api.eventType] ?? 'edited',
    activePeriod: period,
    changedBy: api.changedBy || '—',
    dateTime: formatDateTimeDisplay(api.createdAt),
    // A log row describes something that already happened -- 'completed' regardless of whatever
    // the profile's live status is now, same as the original mock's own activity rows.
    status: 'completed',
  }
}

// RTP Management -- tercer contenido posible dentro de AdminPanel.tsx (junto a AdminDashboardPage/
// RtpDashboardPage). Settings/Simulator/Scheduling son mutuamente exclusivos (pedido explícito):
// esta página es la única dueña de `tab`, cada uno de los tres recibe lo que necesita por props.
//
// settingsByGame/profiles/activity todos arrancan en sus mocks (para que la pantalla nunca se vea
// vacía) y se reemplazan en segundo plano por datos reales una vez que el fetch inicial resuelve --
// GET /rtp-settings/{juego} para Settings (roulette real hoy, pick3/pick4 404 = sin configurar),
// GET /rtp-profiles + GET /rtp-profile-events para Scheduling (real desde el día 1: a diferencia de
// RTP Settings, este feature no existía en el backend hasta ahora, así que la lista real reemplaza
// al mock por completo apenas llega, en vez de fusionarse con él).
export function RtpManagementPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [tab, setTab] = useState<RtpManagementTab>('settings')
  const [settingsByGame, setSettingsByGame] = useState<Record<RtpGame, RtpSettingsData>>(RTP_SETTINGS_BY_GAME)
  const [profiles, setProfiles] = useState<RtpProfile[]>(RTP_PROFILES)
  const [activity, setActivity] = useState<RtpProfileActivity[]>(RTP_PROFILE_ACTIVITY)

  const translateDay = useCallback((day: DayOfWeek) => t(`admin.rtp.management.scheduling.form.days.${day}`), [t])

  const refreshActivity = useCallback(() => {
    fetchRtpProfileEvents(20)
      .then((events) => setActivity(events.map(activityFromApi)))
      .catch((err) => console.error('No se pudo obtener la actividad de perfiles de RTP', err))
  }, [])

  const refreshProfiles = useCallback(() => {
    fetchRtpProfiles()
      .then((apiProfiles) => setProfiles(apiProfiles.map((p) => profileFromApi(p, translateDay))))
      .catch((err) => console.error('No se pudieron obtener los perfiles de RTP', err))
  }, [translateDay])

  useEffect(() => {
    let cancelled = false
    Promise.all(RTP_GAMES.map((game) => fetchRtpSetting(game))).then((results) => {
      if (cancelled) return
      setSettingsByGame((prev) => {
        const next = { ...prev }
        RTP_GAMES.forEach((game, i) => {
          const api = results[i]
          if (api) next[game] = fromApi(game, api, prev[game])
        })
        return next
      })
    })
    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    refreshProfiles()
  }, [refreshProfiles])

  useEffect(() => {
    refreshActivity()
  }, [refreshActivity])

  const handleSaveSettings = (game: RtpGame, data: RtpSettingsData) => {
    setSettingsByGame((prev) => ({ ...prev, [game]: data }))
    createRtpSetting(toApi(data)).catch((err) => console.error('No se pudo guardar la config de RTP', err))
  }

  return (
    <>
      <div className="admin-main-topbar">
        <div>
          <h1 className="admin-main-title">{t('admin.rtp.management.title')}</h1>
          <p className="admin-main-subtitle">{t('admin.rtp.management.subtitle')}</p>
        </div>
        <button type="button" className="admin-rtp-management-view-dashboard" onClick={() => navigate('/rtp-dashboard')}>
          {t('admin.rtp.management.viewDashboard')}
          <img src={ARROW_ICON_URL} className="admin-rtp-management-view-dashboard-icon" alt="" />
        </button>
      </div>

      <RtpManagementTabs active={tab} onChange={setTab} />

      {tab === 'settings' && <RtpSettingsPanel settingsByGame={settingsByGame} onSave={handleSaveSettings} />}
      {tab === 'simulator' && <RtpSimulatorPanel settingsByGame={settingsByGame} />}
      {tab === 'scheduling' && (
        <RtpSchedulingPanel
          profiles={profiles}
          onProfilesChange={setProfiles}
          onProfilesRefresh={refreshProfiles}
          activity={activity}
          onActivityRefresh={refreshActivity}
        />
      )}
    </>
  )
}
