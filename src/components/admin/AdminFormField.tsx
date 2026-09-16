import type { ReactNode } from 'react'
import './adminFormField.css'

interface AdminFormFieldStepper {
  onIncrement: () => void
  onDecrement: () => void
}

interface AdminFormFieldProps {
  id: string
  label: string
  description?: string
  prefix?: string
  suffix?: string
  value: string | number
  onChange?: (value: string) => void
  readOnly?: boolean
  disabled?: boolean
  emphasized?: boolean
  type?: 'text' | 'number' | 'date' | 'datetime-local'
  step?: string
  min?: string
  max?: string
  stepper?: AdminFormFieldStepper
  // Indicador pequeño junto al label (ej. LockedBadge) -- no forma parte del control en sí, así
  // que vive en su propia fila junto al label en vez de meterse dentro de admin-form-field-control.
  labelAddon?: ReactNode
  // Id de una descripción externa (ej. el tooltip de LockedBadge) para linkear aria-describedby en
  // el <input> -- así un lector de pantalla que llega directo al campo (sin pasar por el badge)
  // también escucha la razón del bloqueo, no solo "dimmed"/"read-only".
  describedById?: string
}

function ChevronUpIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path d="M5 15.5 12 8.5 19 15.5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function ChevronDownIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path d="M5 8.5 12 15.5 19 8.5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

// Input de formulario genérico -- label + control (prefix/suffix opcional, stepper opcional) +
// description, mismo lenguaje visual que .admin-dropdown (fondo oscuro, borde fino, focus accent).
// Ningún NumberInput/PercentInput/TextInput existía en el proyecto (ver investigación previa),
// así que este componente cubre los tres casos vía `type`/`prefix`/`suffix` en vez de triplicarse.
export function AdminFormField({
  id,
  label,
  description,
  prefix,
  suffix,
  value,
  onChange,
  readOnly,
  disabled,
  emphasized,
  type = 'text',
  step,
  min,
  max,
  stepper,
  labelAddon,
  describedById,
}: AdminFormFieldProps) {
  return (
    <div className="admin-form-field" data-emphasized={emphasized} data-readonly={readOnly} data-disabled={disabled}>
      <div className="admin-form-field-label-row">
        <label className="admin-form-field-label" htmlFor={id}>
          {label}
        </label>
        {labelAddon}
      </div>
      <span className="admin-form-field-control">
        {prefix && <span className="admin-form-field-affix admin-form-field-affix--prefix">{prefix}</span>}
        <input
          id={id}
          className="admin-form-field-input"
          type={type}
          value={value}
          step={step}
          min={min}
          max={max}
          readOnly={readOnly}
          disabled={disabled}
          aria-describedby={describedById}
          onChange={onChange ? (e) => onChange(e.target.value) : undefined}
        />
        {suffix && <span className="admin-form-field-affix admin-form-field-affix--suffix">{suffix}</span>}
        {stepper && (
          <span className="admin-form-field-stepper">
            <button type="button" className="admin-form-field-stepper-btn" tabIndex={-1} disabled={disabled} onClick={stepper.onIncrement} aria-label="increment">
              <ChevronUpIcon />
            </button>
            <button type="button" className="admin-form-field-stepper-btn" tabIndex={-1} disabled={disabled} onClick={stepper.onDecrement} aria-label="decrement">
              <ChevronDownIcon />
            </button>
          </span>
        )}
      </span>
      {description && <span className="admin-form-field-description">{description}</span>}
    </div>
  )
}
