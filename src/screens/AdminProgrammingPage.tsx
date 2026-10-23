import { useCallback, useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import type { TFunction } from 'i18next'
import { AdminAuthError, restoreAdminSession } from '../api/adminSession'
import { fetchProgramming, previewProgramming, saveProgramming } from '../api/adminProgramming'
import { ConfirmDialog } from '../components/admin/ConfirmDialog'
import { InfoBanner } from '../components/admin/InfoBanner'
import { GameScheduleCard } from '../components/admin/programming/GameScheduleCard'
import { UpcomingRoundsPanel } from '../components/admin/programming/UpcomingRoundsPanel'
import type { Programming, ProgrammingView } from '../types/adminProgramming'
import { buildMediaUrl } from '../utils/media'
import '../components/admin/settings/adminSettings.css'
import '../components/admin/programming/programming.css'

const SAVE_ICON_URL = buildMediaUrl('Website_svg_icons/08_save_white.svg')
// Same as the Settings page: success feedback goes away on its own, an error stays.
const SUCCESS_FEEDBACK_MS = 3000
// The preview of a change is asked for once the admin stops typing for this long.
const PREVIEW_DEBOUNCE_MS = 400

type Feedback = { variant: 'success' | 'error'; message: string }

function isSame(a: Programming, b: Programming) {
  return JSON.stringify(a) === JSON.stringify(b)
}

function errorMessage(err: unknown, key: 'loadError' | 'saveError', t: TFunction): string {
  if (err instanceof AdminAuthError) return t('admin.programming.errors.login')
  return t(`admin.programming.${key}`, { error: err instanceof Error && err.message ? err.message : String(err) })
}

// Programming: when roulette and Quick Money are drawn (times of the day, Santo Domingo time), when
// betting closes, until when an admin can change the result, and how many days ahead the rounds are
// created. Everything is a draft until Save; meanwhile the rounds list previews what the change
// would do (the backend validates it and says which rounds it would create, update or remove).
export function AdminProgrammingPage() {
  const { t } = useTranslation()
  const [saved, setSaved] = useState<ProgrammingView | null>(null)
  const [loadError, setLoadError] = useState<unknown>(null)
  const [edits, setEdits] = useState<Programming | null>(null)
  const [preview, setPreview] = useState<ProgrammingView | null>(null)
  const [previewError, setPreviewError] = useState<string | null>(null)
  const [previewing, setPreviewing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [feedback, setFeedback] = useState<Feedback | null>(null)
  const [confirmingRemoval, setConfirmingRemoval] = useState(false)
  const mounted = useRef(true)

  const load = useCallback(async () => {
    setLoadError(null)
    try {
      await restoreAdminSession()
      const view = await fetchProgramming()
      if (mounted.current) setSaved(view)
    } catch (err) {
      if (mounted.current) setLoadError(err)
    }
  }, [])

  useEffect(() => {
    mounted.current = true
    void load()
    return () => {
      mounted.current = false
    }
  }, [load])

  useEffect(() => {
    if (feedback?.variant !== 'success') return
    const timer = setTimeout(() => setFeedback(null), SUCCESS_FEEDBACK_MS)
    return () => clearTimeout(timer)
  }, [feedback])

  const draft = edits ?? saved?.programming ?? null
  const hasChanges = !!(saved && draft && !isSame(draft, saved.programming))

  // Preview of the unsaved change (debounced; a newer edit cancels the older request).
  useEffect(() => {
    if (!hasChanges || !draft) {
      setPreview(null)
      setPreviewError(null)
      return
    }
    const controller = new AbortController()
    const timer = setTimeout(() => {
      setPreviewing(true)
      previewProgramming(draft, controller.signal)
        .then((view) => {
          setPreview(view)
          setPreviewError(null)
        })
        .catch((err: unknown) => {
          if (controller.signal.aborted) return
          setPreview(null)
          setPreviewError(err instanceof AdminAuthError ? t('admin.programming.errors.login') : err instanceof Error ? err.message : String(err))
        })
        .finally(() => {
          if (!controller.signal.aborted) setPreviewing(false)
        })
    }, PREVIEW_DEBOUNCE_MS)
    return () => {
      clearTimeout(timer)
      controller.abort()
    }
  }, [draft, hasChanges, t])

  const header = (
    <div className="admin-main-topbar">
      <div>
        <h1 className="admin-main-title">{t('admin.programming.title')}</h1>
        <p className="admin-main-subtitle">{t('admin.programming.subtitle')}</p>
      </div>
      {feedback && (
        <div
          className={`admin-settings-save-feedback${feedback.variant === 'error' ? ' admin-settings-save-feedback--error' : ''}`}
          role={feedback.variant === 'error' ? 'alert' : 'status'}
        >
          {feedback.message}
        </div>
      )}
    </div>
  )

  if (!saved || !draft) {
    return (
      <>
        {header}
        {loadError ? (
          <p className="admin-settings-notice" data-variant="error" role="alert">
            {errorMessage(loadError, 'loadError', t)}
            <button type="button" className="admin-settings-btn admin-settings-btn--ghost" onClick={() => void load()}>
              {t('admin.programming.retry')}
            </button>
          </p>
        ) : (
          <p className="admin-settings-notice" role="status">
            {t('admin.programming.loading')}
          </p>
        )}
      </>
    )
  }

  const edit = (update: (prev: Programming) => Programming) => setEdits((prev) => update(prev ?? saved.programming))
  const shown = hasChanges ? preview : saved
  const blocked = preview?.summary.blocked ?? 0
  const removing = preview?.summary.cancel ?? 0
  const previewReady = hasChanges && !!preview && !previewing && !previewError
  const canSave = previewReady && blocked === 0 && !saving
  const limits = saved.limits

  const doSave = async () => {
    setConfirmingRemoval(false)
    setSaving(true)
    setFeedback(null)
    try {
      const res = await saveProgramming(draft)
      setSaved(res.view)
      setEdits(null)
      setFeedback({
        variant: 'success',
        message: t('admin.programming.saveSuccess', { created: res.created, updated: res.updated, cancelled: res.cancelled }),
      })
    } catch (err) {
      setFeedback({ variant: 'error', message: errorMessage(err, 'saveError', t) })
    } finally {
      setSaving(false)
    }
  }

  return (
    <>
      {header}

      <div className="admin-settings-tab-content admin-programming">
        <InfoBanner
          title={t('admin.programming.rules.title')}
          description={t('admin.programming.rules.description', { runTime: Math.round(limits.runTimeSeconds / 60) })}
        />

        <div className="admin-programming-games">
          <GameScheduleCard
            title={t('admin.programming.roulette.title')}
            subtitle={t('admin.programming.roulette.subtitle')}
            game={draft.roulette}
            everyHoursOptions={[1, 2, 3, 4]}
            onChange={(game) => edit((prev) => ({ ...prev, roulette: game }))}
          />
          <GameScheduleCard
            title={t('admin.programming.quickMoney.title')}
            subtitle={t('admin.programming.quickMoney.subtitle')}
            game={draft.quickMoney}
            onChange={(game) => edit((prev) => ({ ...prev, quickMoney: game }))}
          />
        </div>

        <section className="admin-panel admin-settings-card">
          <div className="admin-panel-header">
            <div>
              <h2 className="admin-panel-title">{t('admin.programming.horizon.title')}</h2>
              <p className="admin-settings-card-subtitle">{t('admin.programming.horizon.subtitle')}</p>
            </div>
          </div>
          <div className="admin-programming-horizon">
            <label className="admin-programming-label" htmlFor="programming-horizon">
              {t('admin.programming.horizon.label')}
            </label>
            <div className="admin-programming-duration-inputs">
              <input
                id="programming-horizon"
                type="number"
                min={limits.minHorizonDays}
                max={limits.maxHorizonDays}
                value={draft.horizonDays}
                onChange={(e) => {
                  const days = Math.min(limits.maxHorizonDays, Math.max(limits.minHorizonDays, Math.floor(Number(e.target.value) || 0)))
                  edit((prev) => ({ ...prev, horizonDays: days }))
                }}
              />
              <span>{t('admin.programming.horizon.days', { count: draft.horizonDays })}</span>
            </div>
            <p className="admin-settings-toggle-description admin-settings-field-hint">{t('admin.programming.horizon.hint')}</p>
          </div>
        </section>

        {previewError && <InfoBanner variant="warning" title={t('admin.programming.invalid')} description={previewError} />}
        {blocked > 0 && <InfoBanner variant="warning" title={t('admin.programming.blocked.title')} description={t('admin.programming.blocked.description', { count: blocked })} />}

        <div className="admin-settings-actions">
          <button
            type="button"
            className="admin-settings-btn admin-settings-btn--ghost"
            disabled={!hasChanges || saving}
            onClick={() => setEdits(null)}
          >
            {t('admin.programming.discard')}
          </button>
          <button
            type="button"
            className="admin-settings-btn admin-settings-btn--primary"
            disabled={!canSave}
            onClick={() => (removing > 0 ? setConfirmingRemoval(true) : void doSave())}
          >
            <img src={SAVE_ICON_URL} alt="" />
            {saving ? t('admin.programming.saving') : t('admin.programming.saveChanges')}
          </button>
        </div>

        {shown ? (
          <UpcomingRoundsPanel rounds={shown.rounds} summary={shown.summary} preview={hasChanges} loading={previewing} />
        ) : (
          !previewError && (
            <p className="admin-settings-notice" role="status">
              {t('admin.programming.previewing')}
            </p>
          )
        )}
      </div>

      {confirmingRemoval && (
        <ConfirmDialog
          warning
          title={t('admin.programming.removeConfirm.title')}
          description={t('admin.programming.removeConfirm.description', { count: removing })}
          cancelLabel={t('admin.programming.removeConfirm.cancel')}
          confirmLabel={t('admin.programming.removeConfirm.confirm')}
          loading={saving}
          confirmLoadingLabel={t('admin.programming.saving')}
          onCancel={() => setConfirmingRemoval(false)}
          onConfirm={() => void doSave()}
        />
      )}
    </>
  )
}
