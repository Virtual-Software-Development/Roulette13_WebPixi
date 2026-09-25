import { useEffect, useState, type CSSProperties, type FormEvent } from 'react'
import { useTranslation } from 'react-i18next'
import { useGameConfigStore } from '../store/useGameConfigStore'
import { buildMediaUrl } from '../utils/media'
import './loginPage.css'

const REMEMBERED_USERNAME_KEY = 'login.rememberedUsername'

// local-media/loginbg.png todavía no existe físicamente en el repo (verificado -- no está en
// local-media/ ni en git) pese a lo esperado; se deja apuntando acá porque es la ruta correcta
// una vez que el archivo se agregue. Hasta entonces el fondo no se pintará (solo el overlay).
const LOGIN_BACKGROUND_URL = buildMediaUrl('loginbg.png')

// Logo fijo (no el logoUrl dinámico de useGameConfigStore, que puede venir vacío si LoginPage se
// monta antes del fetch de /gameInfo) -- pedido explícito: usar el SVG de marca Roulette 13
// (Option 2) en vez del logo-central.png anterior.
const LOGIN_LOGO_URL = buildMediaUrl('Website_svg_icons/46_logo_option_2.svg')

function UserIcon() {
  return (
    <svg viewBox="0 0 24 24" className="login-input-icon-svg" aria-hidden="true" focusable="false">
      <circle cx="12" cy="8.2" r="3.4" fill="none" stroke="currentColor" strokeWidth="1.6" />
      <path
        d="M4.8 19.4c1.1-3.4 4-5.2 7.2-5.2s6.1 1.8 7.2 5.2"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
    </svg>
  )
}

function LockIcon() {
  return (
    <svg viewBox="0 0 24 24" className="login-input-icon-svg" aria-hidden="true" focusable="false">
      <rect x="5.2" y="10.4" width="13.6" height="9.4" rx="2" fill="none" stroke="currentColor" strokeWidth="1.6" />
      <path d="M8.2 10.4V7.6a3.8 3.8 0 0 1 7.6 0v2.8" fill="none" stroke="currentColor" strokeWidth="1.6" />
      <circle cx="12" cy="14.8" r="1.15" fill="currentColor" />
    </svg>
  )
}

function EyeIcon() {
  return (
    <svg viewBox="0 0 24 24" className="login-eye-svg" aria-hidden="true" focusable="false">
      <path
        d="M2.4 12S5.8 5.6 12 5.6 21.6 12 21.6 12 18.2 18.4 12 18.4 2.4 12 2.4 12z"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
      <circle cx="12" cy="12" r="2.8" fill="none" stroke="currentColor" strokeWidth="1.6" />
    </svg>
  )
}

function EyeOffIcon() {
  return (
    <svg viewBox="0 0 24 24" className="login-eye-svg" aria-hidden="true" focusable="false">
      <path
        d="M3.6 3.6l16.8 16.8M9.9 9.95a2.8 2.8 0 0 0 4.15 3.7M6.3 6.5C4.1 8 2.4 12 2.4 12s3.4 6.4 9.6 6.4c1.6 0 2.95-.42 4.1-1.03M14.9 6.3A10 10 0 0 1 21.6 12s-1.05 2-3 3.7"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

function ArrowRightIcon() {
  return (
    <svg viewBox="0 0 24 24" className="login-submit-arrow" aria-hidden="true" focusable="false">
      <path
        d="M4 12h15.2M13.6 5.6L20 12l-6.4 6.4"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

// No hay backend de autenticación todavía (ver conversación) -- placeholder aislado a propósito
// para que sea el único lugar a reemplazar por la llamada real (ej. POST /api/login) el día que
// exista.
async function placeholderLogin(username: string, password: string): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, 700))
  if (!username.trim() || !password) {
    throw new Error('invalid-credentials')
  }
}

export function LoginPage() {
  const { t } = useTranslation()
  const gameName = useGameConfigStore((state) => state.gameName)
  const logoUrl = LOGIN_LOGO_URL
  const showLogo = useGameConfigStore((state) => state.showLogo)
  const [logoFailed, setLogoFailed] = useState(false)

  useEffect(() => {
    setLogoFailed(false)
  }, [logoUrl])

  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [rememberMe, setRememberMe] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const remembered = window.localStorage.getItem(REMEMBERED_USERNAME_KEY)
    if (remembered) {
      setUsername(remembered)
      setRememberMe(true)
    }
  }, [])

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (loading) return
    setError(null)
    setLoading(true)
    try {
      await placeholderLogin(username, password)
      if (rememberMe) {
        window.localStorage.setItem(REMEMBERED_USERNAME_KEY, username)
      } else {
        window.localStorage.removeItem(REMEMBERED_USERNAME_KEY)
      }
    } catch {
      setError(t('login.error'))
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="login-page" style={{ '--login-bg-image': `url(${LOGIN_BACKGROUND_URL})` } as CSSProperties}>
      <section className="login-card">
        <div className="login-brand">
          {showLogo && logoUrl && !logoFailed && (
            <img
              src={logoUrl}
              alt={gameName || 'Logo'}
              className="login-logo-img"
              onError={() => setLogoFailed(true)}
            />
          )}
          {showLogo && (!logoUrl || logoFailed) && (
            <span className="login-logo-fallback">{t('media.logoNotFound')}</span>
          )}
        </div>

        <h1 className="login-title">{t('login.title')}</h1>
        <p className="login-subtitle">{t('login.subtitle')}</p>

        <form className="login-form" onSubmit={handleSubmit} noValidate>
          <div className="login-input-wrapper">
            <span className="login-input-icon">
              <UserIcon />
            </span>
            <label htmlFor="login-username" className="login-sr-only">
              {t('login.usernameLabel')}
            </label>
            <input
              id="login-username"
              name="username"
              type="text"
              className="login-input"
              placeholder={t('login.usernamePlaceholder')}
              autoComplete="username"
              value={username}
              onChange={(event) => setUsername(event.target.value)}
              disabled={loading}
            />
          </div>

          <div className="login-input-wrapper">
            <span className="login-input-icon">
              <LockIcon />
            </span>
            <label htmlFor="login-password" className="login-sr-only">
              {t('login.passwordLabel')}
            </label>
            <input
              id="login-password"
              name="password"
              type={showPassword ? 'text' : 'password'}
              className="login-input"
              placeholder={t('login.passwordPlaceholder')}
              autoComplete="current-password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              disabled={loading}
            />
            <button
              type="button"
              className="login-eye-button"
              onClick={() => setShowPassword((value) => !value)}
              aria-label={showPassword ? t('login.hidePassword') : t('login.showPassword')}
              disabled={loading}
            >
              {showPassword ? <EyeOffIcon /> : <EyeIcon />}
            </button>
          </div>

          {error && (
            <p className="login-error" role="alert">
              {error}
            </p>
          )}

          <div className="login-options">
            <label className="login-remember">
              <input
                type="checkbox"
                className="login-checkbox-input"
                checked={rememberMe}
                onChange={(event) => setRememberMe(event.target.checked)}
                disabled={loading}
              />
              <span className="login-checkbox-box" aria-hidden="true" />
              <span>{t('login.rememberMe')}</span>
            </label>

            {/* No existe todavía una ruta/flow de recuperación de contraseña -- botón placeholder,
                sin navegación, listo para conectarse el día que exista. */}
            <button type="button" className="login-forgot">
              {t('login.forgotPassword')}
            </button>
          </div>

          <button type="submit" className="login-submit" disabled={loading}>
            <span className="login-submit-label">{loading ? t('login.signingIn') : t('login.signIn')}</span>
            {!loading && <ArrowRightIcon />}
          </button>
        </form>

        <div className="login-secure">
          <span className="login-secure-text">{t('login.secureAccessOnly')}</span>
        </div>
      </section>
    </main>
  )
}
