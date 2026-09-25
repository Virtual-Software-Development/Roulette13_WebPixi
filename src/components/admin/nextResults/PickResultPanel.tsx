import { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { AdminSelect, type AdminSelectOption } from '../AdminSelect'
import { ResultBall } from './ResultBall'
import { buildMediaUrl } from '../../../utils/media'
import { ArrowRightIcon, CloseIcon, SpinnerIcon } from './icons'
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
// Duración de la actualización simulada -- ver comentario en performUpdate() más abajo.
const UPDATE_DURATION_MS = 700

type UpdateStatus = 'idle' | 'confirming' | 'updating' | 'success' | 'error'

interface PickResultPanelProps {
  accent: 'green' | 'amber'
  icon: string
  title: string
  subtitle: string
  updateLabel: string
  seedDigits: number[]
}

// Pick 3 y Pick 4 comparten exactamente la misma estructura (current result en bolas, new result
// en selects, update/reset con confirmación) -- solo cambian cantidad de dígitos, color de acento
// y semillas. El countdown/Draw #/Scheduled Time YA NO viven acá (antes cada card tenía su propio
// reloj independiente) -- Pick 3 y Pick 4 comparten un único draw cycle (decisión de negocio
// confirmada, ver useQuickMoneyRoundStore.ts), así que esa info ahora es una sola card compartida
// en QuickMoneyNextResultPanel.tsx, igual que "Next Round" en RouletteNextResultPanel. El proyecto
// hoy no tiene NINGÚN endpoint de escritura para Quick Money -- todo el estado de esta card es
// local, listo para reemplazar por un fetch/store real más adelante (ver performUpdate).
export function PickResultPanel({ accent, icon, title, subtitle, updateLabel, seedDigits }: PickResultPanelProps) {
  const { t } = useTranslation()

  // currentDigits = lo que hoy está programado como próximo resultado; draftDigits = lo que el
  // admin está armando en los selectors, todavía sin confirmar. Solo currentDigits alimenta las
  // bolas de "Current Result"; solo un Update confirmado copia draftDigits -> currentDigits.
  const [currentDigits, setCurrentDigits] = useState(seedDigits)
  const [draftDigits, setDraftDigits] = useState(seedDigits)
  const [status, setStatus] = useState<UpdateStatus>('idle')

  const changedFlags = useMemo(() => draftDigits.map((digit, index) => digit !== currentDigits[index]), [draftDigits, currentDigits])
  const hasChanges = changedFlags.some(Boolean)
  const digitOptions = useMemo(() => DIGIT_OPTIONS, [])
  const actionsDisabled = !hasChanges || status === 'updating'

  // El feedback de éxito se retira solo, como un toast -- si el admin dispara otro Update antes
  // de que expire, este timer queda huérfano pero ya no importa (el siguiente render lo reemplaza).
  useEffect(() => {
    if (status !== 'success') return
    const timer = setTimeout(() => setStatus('idle'), SUCCESS_FEEDBACK_MS)
    return () => clearTimeout(timer)
  }, [status])

  // No existe todavía un endpoint real de escritura para Quick Money (ver comentario de arriba) --
  // esta función demuestra el flujo confirming -> updating -> success/error tal cual lo vería el
  // usuario final. Reemplazar el cuerpo por el fetch/mutation real no requiere tocar el resto del
  // componente: el try/catch ya está listo para que un rechazo real dispare el estado 'error'.
  function performUpdate(digits: number[]): Promise<void> {
    return new Promise((resolve) => {
      setTimeout(resolve, UPDATE_DURATION_MS, digits)
    })
  }

  async function handleConfirmUpdate() {
    setStatus('updating')
    try {
      await performUpdate(draftDigits)
      setCurrentDigits(draftDigits)
      setStatus('success')
    } catch {
      setStatus('error')
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
                <span className="admin-next-results-changed-tag">{t('admin.nextResults.changedTag')}</span>
                <AdminSelect
                  value={String(digit)}
                  options={digitOptions}
                  ariaLabel={`${title} digit ${index + 1}`}
                  onChange={(value) => setDraftDigits((prev) => prev.map((d, i) => (i === index ? Number(value) : d)))}
                />
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="admin-next-results-divider" />

      {status === 'confirming' ? (
        <div className="admin-next-results-confirm" data-accent={accent}>
          <p className="admin-next-results-confirm-title">{t('admin.nextResults.confirmTitle')}</p>
          <div className="admin-next-results-confirm-row">
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
          <div className="admin-next-results-actions">
            <button type="button" className="admin-next-results-btn-clear" onClick={() => setStatus('idle')}>
              {t('admin.nextResults.cancel')}
            </button>
            <button type="button" className="admin-next-results-btn-update" data-accent={accent} onClick={handleConfirmUpdate}>
              {t('admin.nextResults.confirmUpdate')}
            </button>
          </div>
        </div>
      ) : (
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
      )}

      {status === 'success' && (
        <div className="admin-next-results-feedback" data-variant="success">
          {t('admin.nextResults.updateSuccess', { game: title })}
        </div>
      )}
      {status === 'error' && (
        <div className="admin-next-results-feedback" data-variant="error">
          {t('admin.nextResults.updateError', { game: title })}
        </div>
      )}
    </div>
  )
}
