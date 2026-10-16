import { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { AdminSelect, type AdminSelectOption } from '../AdminSelect'
import { ResultBall } from './ResultBall'
import { buildMediaUrl } from '../../../utils/media'
import { ArrowRightIcon, CloseIcon, SpinnerIcon } from './icons'
import { ConfirmDialog } from '../ConfirmDialog'
import './nextResults.css'

const REFRESH_ICON_URL = buildMediaUrl('Website_svg_icons/39_refresh_white_clean.svg')

const DIGIT_OPTIONS: AdminSelectOption<string>[] = Array.from({ length: 10 }, (_, n) => ({
  value: String(n),
  label: String(n),
}))

// Cuánto se mantiene visible el feedback "✓ actualizado" antes de volver a idle -- mismo criterio
// que un toast con auto-dismiss (el proyecto no tiene ninguno propio todavía, ver investigación
// previa), pero acotado a esta card en vez de un sistema global nuevo.
const SUCCESS_FEEDBACK_MS = 3000

type UpdateStatus = 'idle' | 'confirming' | 'updating' | 'success' | 'error'

interface PickResultPanelProps {
  accent: 'green' | 'amber'
  icon: string
  title: string
  subtitle: string
  updateLabel: string
  // Resultado pendiente del sorteo para este número (Pick 3 o Pick 4).
  currentDigits: number[]
  // Cambios cerrados (pasó el límite de sustitución del sorteo).
  disabled?: boolean
  // Envía el cambio al backend; si rechaza, la card queda en 'error'.
  onUpdate: (digits: number[]) => Promise<void>
  // Resultado de un Update confirmado -- el feedback ("Pick 3 result updated") ya no vive en esta
  // card: lo muestra QuickMoneyNextResultPanel en la esquina superior derecha del panel Quick Money.
  onResult?: (result: 'success' | 'error') => void
}

// Pick 3 y Pick 4 comparten exactamente la misma estructura (current result en bolas, new result
// en selects, update/reset con confirmación) -- solo cambian cantidad de dígitos, color de acento
// y semillas. El countdown/Draw #/Scheduled Time YA NO viven acá (antes cada card tenía su propio
// reloj independiente) -- Pick 3 y Pick 4 comparten un único draw cycle (decisión de negocio
// confirmada, ver useQuickMoneyRoundStore.ts), así que esa info ahora es una sola card compartida
// en QuickMoneyNextResultPanel.tsx, igual que "Next Round" en RouletteNextResultPanel, que es
// también quien trae el resultado real del backend y lo cambia (onUpdate).
export function PickResultPanel({ accent, icon, title, subtitle, updateLabel, currentDigits, disabled = false, onUpdate, onResult }: PickResultPanelProps) {
  const { t } = useTranslation()

  // currentDigits = lo que hoy está programado como próximo resultado (backend); draftDigits = lo
  // que el admin está armando en los selectors, todavía sin confirmar. Cada resultado nuevo que
  // llega (otro sorteo, o el cambio ya guardado) reinicia la selección.
  const [draftDigits, setDraftDigits] = useState(currentDigits)
  const [status, setStatus] = useState<UpdateStatus>('idle')
  const currentKey = currentDigits.join('')
  useEffect(() => {
    setDraftDigits(currentKey.split('').map(Number))
  }, [currentKey])

  const changedFlags = useMemo(() => draftDigits.map((digit, index) => digit !== currentDigits[index]), [draftDigits, currentDigits])
  const hasChanges = changedFlags.some(Boolean)
  const digitOptions = useMemo(() => DIGIT_OPTIONS, [])
  const actionsDisabled = !hasChanges || status === 'updating' || disabled

  // El feedback de éxito se retira solo, como un toast -- si el admin dispara otro Update antes
  // de que expire, este timer queda huérfano pero ya no importa (el siguiente render lo reemplaza).
  useEffect(() => {
    if (status !== 'success') return
    const timer = setTimeout(() => setStatus('idle'), SUCCESS_FEEDBACK_MS)
    return () => clearTimeout(timer)
  }, [status])

  async function handleConfirmUpdate() {
    setStatus('updating')
    try {
      await onUpdate(draftDigits)
      setStatus('success')
      onResult?.('success')
    } catch {
      setStatus('error')
      onResult?.('error')
    }
  }

  function handleReset() {
    if (actionsDisabled) return
    setDraftDigits(currentDigits)
  }

  return (
    <div className="admin-next-results-pick" data-accent={accent}>
      <div className="admin-next-results-panel-header">
        <div className="admin-next-results-header-left">
          <span className="admin-next-results-icon-halo" data-accent={accent}>
            <img src={icon} alt="" />
          </span>
          <div>
            <h3 className="admin-next-results-title">{title}</h3>
            <p className="admin-next-results-subtitle">{subtitle}</p>
          </div>
        </div>
      </div>

      <div className="admin-next-results-divider" />

      <div className="admin-next-results-pick-columns">
        <div className="admin-next-results-section">
          <h4 className="admin-next-results-result-label">{t('admin.nextResults.currentResult')}</h4>
          <div className="admin-next-results-balls-row">
            {currentDigits.map((digit, index) => (
              <ResultBall key={index} value={digit} />
            ))}
          </div>
        </div>

        <div className="admin-next-results-result-arrow" aria-hidden="true">
          <ArrowRightIcon />
        </div>

        <div className="admin-next-results-section">
          <h4 className="admin-next-results-result-label">{t('admin.nextResults.newResult')}</h4>
          <div className="admin-next-results-selects-row">
            {draftDigits.map((digit, index) => (
              <div key={index} className="admin-next-results-select-slot" data-accent={accent} data-changed={changedFlags[index]}>
                <AdminSelect
                  value={String(digit)}
                  options={digitOptions}
                  ariaLabel={`${title} digit ${index + 1}`}
                  openUpward
                  onChange={(value) => setDraftDigits((prev) => prev.map((d, i) => (i === index ? Number(value) : d)))}
                />
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="admin-next-results-divider" />

      <div className="admin-next-results-actions">
        <button
          type="button"
          className="admin-next-results-btn-update"
          data-accent={accent}
          disabled={actionsDisabled}
          onClick={() => setStatus('confirming')}
        >
          {status === 'updating' ? (
            <>
              <SpinnerIcon className="admin-next-results-spinner" />
              {t('admin.nextResults.updating')}
            </>
          ) : (
            <>
              <img src={REFRESH_ICON_URL} alt="" />
              {updateLabel}
            </>
          )}
        </button>
        <button type="button" className="admin-next-results-btn-clear" disabled={actionsDisabled} onClick={handleReset}>
          <CloseIcon />
          {t('admin.nextResults.reset')}
        </button>
      </div>

      {/* Confirmación como pop-up modal de aviso (mismo que Roulette) -- línea de acento y botón del
          color del juego. Cancel descarta los cambios y vuelve al resultado actual. */}
      {status === 'confirming' && (
        <ConfirmDialog
          warning
          accent={accent}
          title={t('admin.nextResults.confirmTitle')}
          description={t('admin.nextResults.confirmDescription', { game: title })}
          cancelLabel={t('admin.nextResults.cancel')}
          confirmLabel={t('admin.nextResults.confirmUpdate')}
          onCancel={() => {
            setDraftDigits(currentDigits)
            setStatus('idle')
          }}
          onConfirm={handleConfirmUpdate}
        >
          <div className="admin-next-results-confirm-row admin-next-results-confirm-row--dialog">
            <div className="admin-next-results-confirm-col">
              <span className="admin-next-results-result-label">{t('admin.nextResults.currentResult')}</span>
              <span className="admin-next-results-confirm-value">{currentDigits.join('')}</span>
            </div>
            <ArrowRightIcon />
            <div className="admin-next-results-confirm-col">
              <span className="admin-next-results-result-label">{t('admin.nextResults.newResult')}</span>
              <span className="admin-next-results-confirm-value admin-next-results-confirm-value--accent" data-accent={accent}>
                {draftDigits.join('')}
              </span>
            </div>
          </div>
        </ConfirmDialog>
      )}
    </div>
  )
}
