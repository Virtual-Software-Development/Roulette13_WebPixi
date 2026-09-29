import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { AdminSelect, type AdminSelectOption } from './AdminSelect'
import { AdminFormField } from './AdminFormField'
import { InfoBanner } from './InfoBanner'
import { LockedBadge } from './LockedBadge'
import { Tooltip } from './Tooltip'
import { RTP_GAME_ICON_URLS } from '../../data/rtpDashboardMockData'
import { RTP_SETTINGS_BY_GAME, RTP_SETTINGS_LOCK_STATE } from '../../data/rtpManagementMockData'
import { GAME_LABEL_KEY, RTP_GAMES } from '../../data/rtpGameLabels'
import type { RtpGame } from '../../types/rtpDashboard'
import type { RtpSettingsData, RtpSettingsLockableField } from '../../types/rtpManagement'
import './rtpSettingsPanel.css'

const DATE_DISPLAY_FORMATTER = new Intl.DateTimeFormat('en-US', {
  month: 'short',
  day: 'numeric',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
  hour12: false,
})

// effectiveDate ahora es un datetime-local (yyyy-mm-ddTHH:mm, sin sufijo Z) -- ese formato ya
// representa hora LOCAL sin zona horaria adjunta (mismo criterio que el input: "wall clock", no
// UTC), así que `new Date(iso)` alcanza sin el hack de timeZone:'UTC' que sí hace falta con fechas
// yyyy-mm-dd puras (ver rtpDashboardMockData.ts).
function formatDateDisplay(iso: string): string {
  if (!iso) return ''
  return DATE_DISPLAY_FORMATTER.format(new Date(iso))
}

// yyyy-mm-ddTHH:mm en hora LOCAL (mismo formato que el input, ver arriba) -- Date#toISOString()
// no sirve acá porque convierte a UTC primero, lo que correría la hora mostrada según el offset
// del navegador.
function getNowAsDatetimeLocal(): string {
  const now = new Date()
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}T${pad(now.getHours())}:${pad(now.getMinutes())}`
}

// Campos de RtpSettingsData que participan en el chequeo de "¿hay algo para guardar?" -- excluye
// `game` (no es un valor de configuración, es el selector). Cuáles de estos están realmente
// bloqueados se resuelve en runtime contra RTP_SETTINGS_LOCK_STATE (ver hasEditableChanges más
// abajo), no hay una segunda lista hardcodeada de "los editables" que se pueda desincronizar.
const SETTINGS_VALUE_KEYS: (keyof Omit<RtpSettingsData, 'game'>)[] = [
  'targetRtp',
  'minBand',
  'maxBand',
  'correctionWindow',
  'correctionWindowUnlimited',
  'maxCorrectionPerEvent',
  'smoothingFactor',
  'effectiveDate',
]

function isLockableKey(key: string): key is RtpSettingsLockableField {
  return key in RTP_SETTINGS_LOCK_STATE
}

function SaveIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path
        d="M5 4h11l3 3v13H5V4Z M8 4v6h8V4 M8 14h8v6H8v-6Z"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinejoin="round"
      />
    </svg>
  )
}

function ResetIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path
        d="M4 12a8 8 0 1 1 2.7 6M4 12V6M4 12h6"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

function LockIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true" focusable="false">
      <rect x="5.5" y="11" width="13" height="9" rx="2" fill="none" stroke="currentColor" strokeWidth="1.7" />
      <path d="M8.5 11V8a3.5 3.5 0 0 1 7 0v3" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
    </svg>
  )
}

interface RtpSettingsPanelProps {
  settingsByGame: Record<RtpGame, RtpSettingsData>
  onSave: (game: RtpGame, data: RtpSettingsData) => void
}

// Único tab que escribe estado real (Settings configura la base -- distinto de Simulator, que solo
// proyecta, y Scheduling, que programa perfiles temporales, pedido explícito: "no mezclar"). El
// guardado pasa por una barra de confirmación inline (game/current/new/effective date) antes de
// aplicar -- el proyecto no tiene ningún sistema de modal/dialog (ver investigación previa), así
// que se resuelve con el mismo lenguaje visual de panel/InfoBanner en vez de inventar un overlay.
//
// Locked settings: Target RTP / Min Band / Max Band / Effective Date están bloqueados hoy según
// RTP_SETTINGS_LOCK_STATE (rtpManagementMockData.ts) -- la UI lee ese objeto, nunca un `disabled`
// suelto en el JSX, así que el día que exista un backend real que informe qué está bloqueado y por
// qué, solo hay que reemplazar esa constante por la respuesta de la API.
export function RtpSettingsPanel({ settingsByGame, onSave }: RtpSettingsPanelProps) {
  const { t } = useTranslation()
  const [selectedGame, setSelectedGame] = useState<RtpGame>('roulette')
  const [draft, setDraft] = useState<RtpSettingsData>(settingsByGame[selectedGame])
  const [pendingConfirm, setPendingConfirm] = useState(false)
  // Fijado al montar el panel (no re-evaluado cada minuto) -- alcanza para evitar elegir una fecha
  // pasada durante la sesión de edición; el valor ya guardado de un juego (potencialmente anterior
  // a "ahora") no se toca, solo se restringe lo que el usuario puede elegir de acá en adelante.
  const [minEffectiveDate] = useState(getNowAsDatetimeLocal)

  useEffect(() => {
    setDraft(settingsByGame[selectedGame])
    setPendingConfirm(false)
  }, [selectedGame, settingsByGame])

  const gameOptions: AdminSelectOption<RtpGame>[] = RTP_GAMES.map((game) => ({
    value: game,
    label: t(GAME_LABEL_KEY[game]),
    icon: RTP_GAME_ICON_URLS[game],
  }))

  const current = settingsByGame[selectedGame]

  const updateField = (key: keyof RtpSettingsData) => (value: string) => {
    if (key === 'effectiveDate') {
      // Comparación lexicográfica == cronológica acá porque el formato yyyy-mm-ddTHH:mm es
      // zero-padded (mismo truco que las fechas ISO) -- cubre el caso de que el usuario tipee una
      // fecha pasada a mano en vez de usar el date-picker, que el atributo `min` no bloquea del
      // todo en todos los navegadores.
      setDraft((prev) => ({ ...prev, effectiveDate: value < minEffectiveDate ? minEffectiveDate : value }))
      return
    }
    setDraft((prev) => ({ ...prev, [key]: key === 'game' ? value : Number(value) }) as RtpSettingsData)
  }

  // No pisa draft.correctionWindow al activarlo -- desactivar el toggle restaura el número de
  // ventana que el usuario ya tenía configurado en vez de perderlo.
  const toggleCorrectionWindowUnlimited = () => {
    setDraft((prev) => ({ ...prev, correctionWindowUnlimited: !prev.correctionWindowUnlimited }))
  }

  const lockedFieldKeys = (Object.keys(RTP_SETTINGS_LOCK_STATE) as RtpSettingsLockableField[]).filter(
    (key) => RTP_SETTINGS_LOCK_STATE[key].locked,
  )
  const anyFieldLocked = lockedFieldKeys.length > 0

  // Save Settings NO se deshabilita solo porque existan fields locked (pedido explícito) -- se
  // deshabilita únicamente cuando no hay ningún cambio real en un field editable, o cuando
  // (hipotéticamente) TODOS los fields quedaran bloqueados y no quede nada editable.
  const editableKeys = SETTINGS_VALUE_KEYS.filter((key) => !isLockableKey(key) || !RTP_SETTINGS_LOCK_STATE[key].locked)
  const allEditableFieldsLocked = editableKeys.length === 0
  const hasEditableChanges = editableKeys.some((key) => draft[key] !== current[key])
  const saveDisabled = allEditableFieldsLocked || !hasEditableChanges
  const saveDisabledReason = allEditableFieldsLocked
    ? t('admin.rtp.management.settings.save.allLockedReason')
    : !hasEditableChanges
      ? t('admin.rtp.management.settings.save.noChangesReason')
      : null

  const targetRtpLock = RTP_SETTINGS_LOCK_STATE.targetRtp
  const minBandLock = RTP_SETTINGS_LOCK_STATE.minBand
  const maxBandLock = RTP_SETTINGS_LOCK_STATE.maxBand
  const effectiveDateLock = RTP_SETTINGS_LOCK_STATE.effectiveDate

  const saveButton = (
    <button
      type="button"
      className="admin-rtp-mgmt-btn admin-rtp-mgmt-btn--primary"
      disabled={saveDisabled}
      onClick={() => setPendingConfirm(true)}
    >
      {saveDisabled ? <LockIcon /> : <SaveIcon />}
      {t('admin.rtp.management.settings.saveSettings')}
    </button>
  )

  return (
    <section className="admin-panel admin-rtp-settings">
      <div className="admin-panel-header">
        <div>
          <h2 className="admin-panel-title">{t('admin.rtp.management.settings.title')}</h2>
          <p className="admin-rtp-settings-subtitle">{t('admin.rtp.management.settings.subtitle')}</p>
        </div>
      </div>

      <div className="admin-rtp-settings-game">
        <AdminSelect value={selectedGame} options={gameOptions} onChange={setSelectedGame} label={t('admin.rtp.management.gameSelectLabel')} />
      </div>

      {anyFieldLocked && (
        <InfoBanner
          icon={<LockIcon className="admin-info-banner-icon" />}
          title={t('admin.rtp.management.settings.lock.bannerTitle')}
          description={t('admin.rtp.management.settings.lock.bannerDescription')}
        />
      )}

      <div className="admin-rtp-settings-row admin-rtp-settings-row--single">
        <AdminFormField
          id="rtp-target"
          label={t('admin.rtp.management.settings.targetRtp.label')}
          description={t('admin.rtp.management.settings.targetRtp.description')}
          suffix="%"
          type="number"
          step="0.01"
          value={draft.targetRtp}
          onChange={targetRtpLock.locked ? undefined : updateField('targetRtp')}
          readOnly={targetRtpLock.locked}
          describedById={targetRtpLock.locked ? 'rtp-target-lock' : undefined}
          labelAddon={targetRtpLock.locked ? <LockedBadge reason={t(targetRtpLock.reasonKey)} tooltipId="rtp-target-lock" /> : undefined}
        />
      </div>

      <div className="admin-rtp-settings-row">
        <AdminFormField
          id="rtp-min-band"
          label={t('admin.rtp.management.settings.minBand.label')}
          description={t('admin.rtp.management.settings.minBand.description')}
          suffix="%"
          type="number"
          step="0.01"
          value={draft.minBand}
          onChange={minBandLock.locked ? undefined : updateField('minBand')}
          readOnly={minBandLock.locked}
          describedById={minBandLock.locked ? 'rtp-min-band-lock' : undefined}
          labelAddon={minBandLock.locked ? <LockedBadge reason={t(minBandLock.reasonKey)} tooltipId="rtp-min-band-lock" /> : undefined}
        />
        <AdminFormField
          id="rtp-max-band"
          label={t('admin.rtp.management.settings.maxBand.label')}
          description={t('admin.rtp.management.settings.maxBand.description')}
          suffix="%"
          type="number"
          step="0.01"
          value={draft.maxBand}
          onChange={maxBandLock.locked ? undefined : updateField('maxBand')}
          readOnly={maxBandLock.locked}
          describedById={maxBandLock.locked ? 'rtp-max-band-lock' : undefined}
          labelAddon={maxBandLock.locked ? <LockedBadge reason={t(maxBandLock.reasonKey)} tooltipId="rtp-max-band-lock" /> : undefined}
        />
      </div>

      <div className="admin-rtp-settings-row">
        <div className="admin-rtp-settings-field-group">
          <AdminFormField
            id="rtp-correction-window"
            label={t('admin.rtp.management.settings.correctionWindow.label')}
            description={
              draft.correctionWindowUnlimited
                ? t('admin.rtp.management.settings.correctionWindow.unlimitedHint')
                : t('admin.rtp.management.settings.correctionWindow.description')
            }
            suffix={t('admin.rtp.management.settings.spinsUnit')}
            type="number"
            step="1000"
            value={draft.correctionWindow}
            onChange={draft.correctionWindowUnlimited ? undefined : updateField('correctionWindow')}
            disabled={draft.correctionWindowUnlimited}
          />
          <label className="admin-rtp-toggle">
            <input
              type="checkbox"
              className="admin-rtp-toggle-input"
              checked={draft.correctionWindowUnlimited}
              onChange={toggleCorrectionWindowUnlimited}
            />
            <span className="admin-rtp-toggle-track">
              <span className="admin-rtp-toggle-thumb" />
            </span>
            <span className="admin-rtp-toggle-label">{t('admin.rtp.management.settings.correctionWindow.unlimitedToggle')}</span>
          </label>
        </div>
        <AdminFormField
          id="rtp-max-correction"
          label={t('admin.rtp.management.settings.maxCorrection.label')}
          description={t('admin.rtp.management.settings.maxCorrection.description')}
          suffix="%"
          type="number"
          step="1"
          value={draft.maxCorrectionPerEvent}
          onChange={updateField('maxCorrectionPerEvent')}
        />
      </div>

      <div className="admin-rtp-settings-row">
        <AdminFormField
          id="rtp-smoothing"
          label={t('admin.rtp.management.settings.smoothingFactor.label')}
          description={t('admin.rtp.management.settings.smoothingFactor.description')}
          type="number"
          step="0.01"
          min="0"
          max="1"
          value={draft.smoothingFactor}
          onChange={updateField('smoothingFactor')}
        />
        <AdminFormField
          id="rtp-effective-date"
          label={t('admin.rtp.management.settings.effectiveDate.label')}
          description={t('admin.rtp.management.settings.effectiveDate.description')}
          type="datetime-local"
          min={effectiveDateLock.locked ? undefined : minEffectiveDate}
          value={draft.effectiveDate}
          onChange={effectiveDateLock.locked ? undefined : updateField('effectiveDate')}
          readOnly={effectiveDateLock.locked}
          describedById={effectiveDateLock.locked ? 'rtp-effective-date-lock' : undefined}
          labelAddon={
            effectiveDateLock.locked ? <LockedBadge reason={t(effectiveDateLock.reasonKey)} tooltipId="rtp-effective-date-lock" /> : undefined
          }
        />
      </div>

      <InfoBanner title={t('admin.rtp.management.settings.infoBanner.title')} description={t('admin.rtp.management.settings.infoBanner.description')} />

      {pendingConfirm && (
        <div className="admin-rtp-mgmt-confirm">
          <p className="admin-rtp-mgmt-confirm-title">{t('admin.rtp.management.settings.confirm.title')}</p>
          <dl className="admin-rtp-mgmt-confirm-grid">
            <div>
              <dt>{t('admin.rtp.management.settings.confirm.game')}</dt>
              <dd>{t(GAME_LABEL_KEY[selectedGame])}</dd>
            </div>
            <div>
              <dt>{t('admin.rtp.management.settings.confirm.currentTarget')}</dt>
              <dd>{current.targetRtp.toFixed(2)}%</dd>
            </div>
            <div>
              <dt>{t('admin.rtp.management.settings.confirm.newTarget')}</dt>
              <dd>{draft.targetRtp.toFixed(2)}%</dd>
            </div>
            <div>
              <dt>{t('admin.rtp.management.settings.confirm.effectiveDate')}</dt>
              <dd>{formatDateDisplay(draft.effectiveDate)}</dd>
            </div>
          </dl>
          <div className="admin-rtp-mgmt-confirm-actions">
            <button type="button" className="admin-rtp-mgmt-btn admin-rtp-mgmt-btn--ghost" onClick={() => setPendingConfirm(false)}>
              {t('admin.rtp.management.settings.confirm.cancel')}
            </button>
            <button
              type="button"
              className="admin-rtp-mgmt-btn admin-rtp-mgmt-btn--primary"
              onClick={() => {
                onSave(selectedGame, draft)
                setPendingConfirm(false)
              }}
            >
              {t('admin.rtp.management.settings.confirm.confirm')}
            </button>
          </div>
        </div>
      )}

      <div className="admin-rtp-settings-actions">
        <button
          type="button"
          className="admin-rtp-mgmt-btn admin-rtp-mgmt-btn--ghost admin-rtp-mgmt-btn--ghost-strong"
          onClick={() => setDraft(RTP_SETTINGS_BY_GAME[selectedGame])}
        >
          <ResetIcon />
          {t('admin.rtp.management.settings.resetToDefaults')}
        </button>
        {saveDisabled && saveDisabledReason ? <Tooltip content={saveDisabledReason}>{saveButton}</Tooltip> : saveButton}
      </div>
    </section>
  )
}
