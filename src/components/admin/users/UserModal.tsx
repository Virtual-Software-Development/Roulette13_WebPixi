import { useEffect, useRef, useState, type FormEvent } from 'react'
import { useTranslation } from 'react-i18next'
import { useFocusTrap } from '../../../hooks/useFocusTrap'
import { AdminFormField } from '../AdminFormField'
import { AdminSelect, type AdminSelectOption } from '../AdminSelect'
import { USER_ROLES } from '../../../data/adminUsersMockData'
import { CloseIcon, EyeIcon, EyeOffIcon } from './icons'
import type { AdminUserFormData, UserRole, UserStatus } from '../../../types/adminUsers'
import './adminUsers.css'

export type UserModalMode = 'create' | 'edit'

interface UserModalProps {
  mode: UserModalMode
  initialData: AdminUserFormData
  // Solo para mostrar "Editing <nombre>" en el header en modo edit -- el form en sí usa
  // initialData (ver comentario en UsersPage.tsx: el form es dueño de su propio draft).
  editingName?: string
  onClose: () => void
  onSubmit: (data: AdminUserFormData) => Promise<void>
}

// Tercera forma de modal del proyecto (ver ConfirmDialog.tsx: mensaje simple, DrawLogModal.tsx:
// contenido de solo lectura) -- esta es un formulario con footer Cancel/Submit, forma distinta a
// las otras dos, así que no las reutiliza directamente pero sí el mismo mecanismo de backdrop/
// Escape/foco + el focus trap nuevo (ver useFocusTrap.ts, también aplicado a ConfirmDialog).
export function UserModal({ mode, initialData, editingName, onClose, onSubmit }: UserModalProps) {
  const { t } = useTranslation()
  const [form, setForm] = useState<AdminUserFormData>(initialData)
  const [showPassword, setShowPassword] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const dialogRef = useRef<HTMLDivElement>(null)
  const previouslyFocusedRef = useRef<HTMLElement | null>(null)

  useFocusTrap(dialogRef, true)

  useEffect(() => {
    previouslyFocusedRef.current = document.activeElement as HTMLElement | null
    // AdminFormField no reenvía un ref a su <input> interno (no lo necesitaba hasta ahora) -- más
    // simple buscarlo por id para el foco inicial que agregar forwardRef solo para este caso.
    document.getElementById('user-modal-full-name')?.focus()
    return () => previouslyFocusedRef.current?.focus()
  }, [])

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape' && !submitting) onClose()
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [onClose, submitting])

  const roleOptions: AdminSelectOption<UserRole>[] = USER_ROLES.map((value) => ({ value, label: t(`admin.users.role.${value}`) }))

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError(null)
    setSubmitting(true)
    try {
      await onSubmit(form)
    } catch {
      setError(mode === 'create' ? t('admin.users.modal.createError') : t('admin.users.modal.editError'))
      setSubmitting(false)
    }
  }

  return (
    <div className="admin-users-modal-backdrop" onClick={submitting ? undefined : onClose}>
      <div
        ref={dialogRef}
        className="admin-users-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="admin-users-modal-title"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="admin-users-modal-header">
          <div>
            <h2 id="admin-users-modal-title" className="admin-users-modal-title">
              {mode === 'create' ? t('admin.users.modal.createTitle') : t('admin.users.modal.editTitle')}
            </h2>
            {mode === 'edit' && editingName && <p className="admin-users-modal-subtitle">{editingName}</p>}
          </div>
          <button type="button" className="admin-users-modal-close" aria-label={t('admin.users.modal.close')} onClick={onClose} disabled={submitting}>
            <CloseIcon />
          </button>
        </div>

        <form className="admin-users-modal-form" onSubmit={handleSubmit}>
          <AdminFormField
            id="user-modal-full-name"
            label={t('admin.users.modal.fullName')}
            placeholder={t('admin.users.modal.fullNamePlaceholder')}
            value={form.fullName}
            required
            onChange={(value) => setForm((prev) => ({ ...prev, fullName: value }))}
          />

          <AdminFormField
            id="user-modal-username"
            label={t('admin.users.modal.username')}
            placeholder={t('admin.users.modal.usernamePlaceholder')}
            value={form.username}
            required
            onChange={(value) => setForm((prev) => ({ ...prev, username: value }))}
          />

          <AdminFormField
            id="user-modal-email"
            label={t('admin.users.modal.email')}
            type="email"
            placeholder={t('admin.users.modal.emailPlaceholder')}
            value={form.email}
            required
            onChange={(value) => setForm((prev) => ({ ...prev, email: value }))}
          />

          {mode === 'create' && (
            <AdminFormField
              id="user-modal-password"
              label={t('admin.users.modal.password')}
              type={showPassword ? 'text' : 'password'}
              placeholder={t('admin.users.modal.passwordPlaceholder')}
              value={form.password}
              required
              onChange={(value) => setForm((prev) => ({ ...prev, password: value }))}
              suffix={
                <button
                  type="button"
                  className="admin-users-eye-btn"
                  onClick={() => setShowPassword((v) => !v)}
                  aria-label={showPassword ? t('admin.users.modal.hidePassword') : t('admin.users.modal.showPassword')}
                >
                  {showPassword ? <EyeOffIcon /> : <EyeIcon />}
                </button>
              }
            />
          )}

          <AdminSelect
            value={form.role}
            options={roleOptions}
            onChange={(value: UserRole) => setForm((prev) => ({ ...prev, role: value }))}
            label={t('admin.users.modal.role')}
          />

          <div className="admin-users-status-field">
            <span className="admin-users-status-field-label">{t('admin.users.modal.status')}</span>
            <label className="admin-users-toggle">
              <input
                type="checkbox"
                className="admin-users-toggle-input"
                checked={form.status === 'active'}
                onChange={(e) => setForm((prev) => ({ ...prev, status: (e.target.checked ? 'active' : 'inactive') as UserStatus }))}
              />
              <span className="admin-users-toggle-track">
                <span className="admin-users-toggle-thumb" />
              </span>
            </label>
            <span className="admin-users-status-field-value">{t(`admin.users.status.${form.status}`)}</span>
          </div>

          {error && <p className="admin-users-modal-error">{error}</p>}

          <div className="admin-users-modal-footer">
            <button type="button" className="admin-users-btn admin-users-btn--ghost" disabled={submitting} onClick={onClose}>
              {t('admin.users.modal.cancel')}
            </button>
            <button type="submit" className="admin-users-btn admin-users-btn--primary" disabled={submitting}>
              {submitting
                ? mode === 'create'
                  ? t('admin.users.modal.creating')
                  : t('admin.users.modal.saving')
                : mode === 'create'
                  ? t('admin.users.modal.createSubmit')
                  : t('admin.users.modal.saveSubmit')}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
