import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { AdminSelect, type AdminSelectOption } from './AdminSelect'
import { AdminFormField } from './AdminFormField'
import { ConfirmDialog } from './ConfirmDialog'
import { InfoBanner } from './InfoBanner'
import { Tooltip } from './Tooltip'
import { GAME_LABEL_KEY, RTP_GAMES, RTP_GAME_ICON_URLS } from '../../data/rtpGameLabels'
import { describeRtpError } from '../../hooks/useRtpManagement'
import type { RtpGame } from '../../types/rtpDashboard'
import type { RtpSettingsData } from '../../types/rtpManagement'
import './rtpSettingsPanel.css'

type EditableKey = keyof Omit<RtpSettingsData, 'game' | 'effectiveDate'>
type NumericKey = Exclude<EditableKey, 'correctionWindowUnlimited'>

// Campos que el admin edita -- effectiveDate es solo lectura (lo fija el backend al guardar).
const SETTINGS_VALUE_KEYS: EditableKey[] = [
  'targetRtp',
  'minBand',
  'maxBand',
  'correctionWindow',
  'correctionWindowUnlimited',
  'maxCorrectionPerEvent',
  'smoothingFactor',
]

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
  // Lanza si el backend rechaza el cambio (su mensaje se muestra en el panel).
  onSave: (data: RtpSettingsData) => Promise<void>
}

// Único tab que cambia la configuración base de producción (Simulator solo proyecta y Scheduling
// programa perfiles aparte, pedido explícito: "no mezclar"). El guardado pasa por un ConfirmDialog
// (game/current/new) y el backend lo aplica de inmediato; Cancel descarta los cambios.
export function RtpSettingsPanel({ settingsByGame, onSave }: RtpSettingsPanelProps) {
  const { t } = useTranslation()
  const [selectedGame, setSelectedGame] = useState<RtpGame>('roulette')
  const [draft, setDraft] = useState<RtpSettingsData>(settingsByGame[selectedGame])
  const [pendingConfirm, setPendingConfirm] = useState(false)
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)

  useEffect(() => {
    setDraft(settingsByGame[selectedGame])
    setPendingConfirm(false)
    setSaveError(null)
  }, [selectedGame, settingsByGame])

  const gameOptions: AdminSelectOption<RtpGame>[] = RTP_GAMES.map((game) => ({
    value: game,
    label: t(GAME_LABEL_KEY[game]),
    icon: RTP_GAME_ICON_URLS[game],
  }))

  const current = settingsByGame[selectedGame]

  const updateField = (key: NumericKey) => (value: string) => {
    setDraft((prev) => ({ ...prev, [key]: Number(value) }))
  }

  // No pisa draft.correctionWindow al activarlo -- desactivar el toggle restaura el número de
  // ventana configurado (el backend también lo conserva).
  const toggleCorrectionWindowUnlimited = () => {
    setDraft((prev) => ({ ...prev, correctionWindowUnlimited: !prev.correctionWindowUnlimited }))
  }

  const hasChanges = SETTINGS_VALUE_KEYS.some((key) => draft[key] !== current[key])
  const saveDisabled = !hasChanges || saving
  const saveDisabledReason = !hasChanges ? t('admin.rtp.management.settings.save.noChangesReason') : null

  const handleConfirm = async () => {
    setPendingConfirm(false)
    setSaving(true)
    setSaveError(null)
    try {
      await onSave(draft)
    } catch (err) {
      setSaveError(t('admin.rtp.management.settings.saveError', { message: describeRtpError(err, t) }))
    } finally {
      setSaving(false)
    }
  }

  const saveButton = (
    <button
      type="button"
      className="admin-rtp-mgmt-btn admin-rtp-mgmt-btn--primary"
      disabled={saveDisabled}
      onClick={() => setPendingConfirm(true)}
    >
      {saveDisabled ? <LockIcon /> : <SaveIcon />}
      {saving ? t('admin.rtp.management.saving') : t('admin.rtp.management.settings.saveSettings')}
    </button>
  )

  return (
    <section className="admin-panel admin-rtp-settings">
      {/* Selector de juego a la izquierda + aviso "Changes will be applied to future rounds only" en la
          esquina superior derecha. */}
      <div className="admin-rtp-settings-top-row">
        <div className="admin-rtp-settings-game">
          <AdminSelect value={selectedGame} options={gameOptions} onChange={setSelectedGame} label={t('admin.rtp.management.gameSelectLabel')} />
        </div>
        <div className="admin-rtp-settings-top-banner">
          <InfoBanner title={t('admin.rtp.management.settings.infoBanner.title')} description={t('admin.rtp.management.settings.infoBanner.description')} />
        </div>
      </div>

      <div className="admin-rtp-settings-row admin-rtp-settings-row--single">
        <AdminFormField
          id="rtp-target"
          label={t('admin.rtp.management.settings.targetRtp.label')}
          description={t('admin.rtp.management.settings.targetRtp.description')}
          suffix="%"
          type="number"
          step="0.01"
          value={draft.targetRtp}
          onChange={updateField('targetRtp')}
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
          onChange={updateField('minBand')}
        />
        <AdminFormField
          id="rtp-max-band"
          label={t('admin.rtp.management.settings.maxBand.label')}
          description={t('admin.rtp.management.settings.maxBand.description')}
          suffix="%"
          type="number"
          step="0.01"
          value={draft.maxBand}
          onChange={updateField('maxBand')}
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
        {/* Solo lectura: el backend no programa cambios a futuro, aplica cada guardado de inmediato y
            lo fecha hoy -- este campo muestra desde cuándo rige la configuración vigente. */}
        <AdminFormField
          id="rtp-effective-date"
          label={t('admin.rtp.management.settings.effectiveDate.label')}
          description={t('admin.rtp.management.settings.effectiveDate.currentDescription')}
          type="date"
          value={current.effectiveDate}
          readOnly
        />
      </div>

      {saveError && <InfoBanner variant="warning" title={saveError} />}

      {/* Confirmación como pop-up modal centrado -- cambiar el RTP afecta rondas reales. */}
      {pendingConfirm && (
        <ConfirmDialog
          warning
          title={t('admin.rtp.management.settings.confirm.title')}
          description={t('admin.rtp.management.settings.confirm.descriptionImmediate')}
          cancelLabel={t('admin.rtp.management.settings.confirm.cancel')}
          confirmLabel={t('admin.rtp.management.settings.confirm.confirm')}
          onCancel={() => {
            // Cancelar descarta los cambios: el formulario vuelve a la configuración vigente.
            setDraft(current)
            setPendingConfirm(false)
          }}
          onConfirm={() => void handleConfirm()}
        >
          <dl className="admin-confirm-dialog-details">
            <div>
              <dt>{t('admin.rtp.management.settings.confirm.game')}</dt>
              <dd>{t(GAME_LABEL_KEY[selectedGame])}</dd>
            </div>
            <div>
              <dt>{t('admin.rtp.management.settings.confirm.effectiveDate')}</dt>
              <dd>{t('admin.rtp.management.settings.confirm.immediately')}</dd>
            </div>
            <div>
              <dt>{t('admin.rtp.management.settings.confirm.currentTarget')}</dt>
              <dd>{current.targetRtp.toFixed(2)}%</dd>
            </div>
            <div>
              <dt>{t('admin.rtp.management.settings.confirm.newTarget')}</dt>
              <dd>{draft.targetRtp.toFixed(2)}%</dd>
            </div>
          </dl>
        </ConfirmDialog>
      )}

      <div className="admin-rtp-settings-actions">
        {saveDisabled && saveDisabledReason ? <Tooltip content={saveDisabledReason}>{saveButton}</Tooltip> : saveButton}
      </div>
    </section>
  )
}
