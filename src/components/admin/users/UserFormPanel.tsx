import { useEffect, useState, type FormEvent } from 'react'
import { useTranslation } from 'react-i18next'
import { AdminFormField } from '../AdminFormField'
import { AdminSelect, type AdminSelectOption } from '../AdminSelect'
import { AdminAuthError } from '../../../api/adminSession'
import { USER_ROLES } from './userRoles'
import { CloseIcon, EyeIcon, EyeOffIcon } from './icons'
import type { AdminUserFormData, UserRole, UserStatus } from '../../../types/adminUsers'
import './adminUsers.css'

export type UserFormMode = 'create' | 'edit'

interface UserFormPanelProps {
  mode: UserFormMode
  initialData: AdminUserFormData
  // El admin editándose a sí mismo: rol y estado quedan fijos (el backend tampoco los acepta).
  isSelf?: boolean
  onClose: () => void
  // Rechaza con el error del backend, que se muestra tal cual en el panel.
  onSubmit: (data: AdminUserFormData) => Promise<void>
}

// Formulario Add/Edit User como panel (antes UserModal, pedido explícito): en desktop va a la
// derecha de la tabla; en pantallas angostas UsersPage lo envuelve en AdminDetailPopup, que aporta
// backdrop, focus trap y click-afuera. Este componente solo trae su botón X y Escape.
// aria-labelledby del pop-up en pantallas angostas (UsersPage.tsx usa el mismo id).
const USER_FORM_TITLE_ID = 'admin-users-form-title'

export function UserFormPanel({ mode, initialData, isSelf = false, onClose, onSubmit }: UserFormPanelProps) {
  const { t } = useTranslation()
  const [form, setForm] = useState<AdminUserFormData>(initialData)
  const [showPassword, setShowPassword] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    // AdminFormField no reenvía un ref a su <input> interno -- más simple buscarlo por id.
    document.getElementById('user-form-full-name')?.focus()
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
    } catch (err) {
      if (err instanceof AdminAuthError) setError(t('admin.users.errors.login'))
      else {
        const detail = err instanceof Error && err.message ? err.message : String(err)
        setError(t(mode === 'create' ? 'admin.users.modal.createError' : 'admin.users.modal.editError', { error: detail }))
      }
      setSubmitting(false)
    }
  }

  return (
    <section className="admin-panel admin-users-form" aria-labelledby={USER_FORM_TITLE_ID}>
      <div className="admin-users-form-header">
        <h2 id={USER_FORM_TITLE_ID} className="admin-users-form-title">
          {mode === 'create' ? t('admin.users.modal.createTitle') : t('admin.users.modal.editTitle')}
        </h2>
        <button type="button" className="admin-users-form-close" aria-label={t('admin.users.modal.close')} onClick={onClose} disabled={submitting}>
          <CloseIcon />
        </button>
      </div>

      <form className="admin-users-form-form" onSubmit={handleSubmit}>
        <AdminFormField
          id="user-form-full-name"
          label={t('admin.users.modal.fullName')}
          placeholder={t('admin.users.modal.fullNamePlaceholder')}
          value={form.fullName}
          required
          onChange={(value) => setForm((prev) => ({ ...prev, fullName: value }))}
        />

        <AdminFormField
          id="user-form-username"
          autoComplete="off"
          label={t('admin.users.modal.username')}
          placeholder={t('admin.users.modal.usernamePlaceholder')}
          value={form.username}
          required
          onChange={(value) => setForm((prev) => ({ ...prev, username: value }))}
        />

        <AdminFormField
          id="user-form-email"
          label={t('admin.users.modal.email')}
          type="email"
          placeholder={t('admin.users.modal.emailPlaceholder')}
          value={form.email}
          required
          onChange={(value) => setForm((prev) => ({ ...prev, email: value }))}
        />

        <AdminFormField
          id="user-form-password"
          label={mode === 'create' ? t('admin.users.modal.password') : t('admin.users.modal.newPassword')}
          type={showPassword ? 'text' : 'password'}
          placeholder={mode === 'create' ? t('admin.users.modal.passwordPlaceholder') : t('admin.users.modal.newPasswordPlaceholder')}
          description={mode === 'create' ? t('admin.users.modal.passwordHint') : t('admin.users.modal.newPasswordHint')}
          value={form.password}
          required={mode === 'create'}
          autoComplete="new-password"
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

        <AdminSelect
          value={form.role}
          options={roleOptions}
          onChange={(value: UserRole) => setForm((prev) => ({ ...prev, role: value }))}
          label={t('admin.users.modal.role')}
          disabled={isSelf}
        />

        <div className="admin-users-status-field">
          <span className="admin-users-status-field-label">{t('admin.users.modal.status')}</span>
          <label className="admin-users-toggle">
            <input
              type="checkbox"
              className="admin-users-toggle-input"
              checked={form.status === 'active'}
              disabled={isSelf}
              onChange={(e) => setForm((prev) => ({ ...prev, status: (e.target.checked ? 'active' : 'inactive') as UserStatus }))}
            />
            <span className="admin-users-toggle-track">
              <span className="admin-users-toggle-thumb" />
            </span>
          </label>
          <span className="admin-users-status-field-value">{t(`admin.users.status.${form.status}`)}</span>
        </div>

        {isSelf && <p className="admin-users-form-hint">{t('admin.users.modal.selfHint')}</p>}

        {error && <p className="admin-users-form-error">{error}</p>}

        <div className="admin-users-form-footer">
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
    </section>
  )
}
