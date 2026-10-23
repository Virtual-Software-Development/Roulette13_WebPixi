import { useId } from 'react'
import { useTranslation } from 'react-i18next'
import { splitSeconds } from '../../../utils/programmingTime'

interface DurationFieldProps {
  label: string
  hint?: string
  seconds: number
  onChange: (seconds: number) => void
}

// A duration in minutes and seconds (the Programming page's cutoffs, all "before the draw").
export function DurationField({ label, hint, seconds, onChange }: DurationFieldProps) {
  const { t } = useTranslation()
  const id = useId()
  const { minutes, seconds: secs } = splitSeconds(seconds)
  const clamp = (value: string, max: number) => Math.min(max, Math.max(0, Math.floor(Number(value) || 0)))

  return (
    <div className="admin-programming-duration">
      <label className="admin-programming-label" htmlFor={`${id}-m`}>
        {label}
      </label>
      <div className="admin-programming-duration-inputs">
        <input
          id={`${id}-m`}
          type="number"
          min={0}
          max={60}
          value={minutes}
          aria-label={`${label} (${t('admin.programming.minutes')})`}
          onChange={(e) => onChange(clamp(e.target.value, 60) * 60 + secs)}
        />
        <span>{t('admin.programming.minutesShort')}</span>
        <input
          type="number"
          min={0}
          max={59}
          step={5}
          value={secs}
          aria-label={`${label} (${t('admin.programming.seconds')})`}
          onChange={(e) => onChange(minutes * 60 + clamp(e.target.value, 59))}
        />
        <span>{t('admin.programming.secondsShort')}</span>
        <span className="admin-programming-duration-suffix">{t('admin.programming.beforeTheDraw')}</span>
      </div>
      {hint && <p className="admin-settings-toggle-description admin-settings-field-hint">{hint}</p>}
    </div>
  )
}
