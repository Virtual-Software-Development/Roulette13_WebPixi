import { useState, type FormEvent } from 'react'
import { Navigate } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext'
import { VrMark } from '../components/VrMark'
import { UserIcon, LockIcon, EyeIcon, EyeOffIcon, CheckIcon, ArrowRightIcon } from '../components/icons'
import './loginPage.css'

export function LoginPage() {
  const { isAuthenticated, login } = useAuth()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [rememberMe, setRememberMe] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  if (isAuthenticated) return <Navigate to="/" replace />

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault()
    setError(null)
    setSubmitting(true)
    try {
      await login(username, password)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="login-page">
      <div className="login-page__backdrop">
        <div className="login-page__glow" />
        <form className="login-card" onSubmit={handleSubmit}>
          <VrMark size={96} />
          <h1 className="login-card__title">Admin Access</h1>
          <p className="login-card__subtitle">Sign in to manage roulette and lottery operations</p>

          <label className="login-field">
            <UserIcon className="login-field__icon" />
            <input
              className="login-field__input"
              placeholder="Username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              autoComplete="username"
            />
          </label>

          <label className="login-field">
            <LockIcon className="login-field__icon" />
            <input
              className="login-field__input"
              type={showPassword ? 'text' : 'password'}
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
            />
            <button
              type="button"
              className="login-field__toggle"
              onClick={() => setShowPassword((v) => !v)}
              aria-label={showPassword ? 'Hide password' : 'Show password'}
            >
              {showPassword ? <EyeOffIcon /> : <EyeIcon />}
            </button>
          </label>

          <div className="login-card__row">
            <label className="login-checkbox">
              <input
                type="checkbox"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
              />
              <span className="login-checkbox__box">{rememberMe && <CheckIcon />}</span>
              Remember me
            </label>
            <a className="login-card__link" href="#forgot-password">
              Forgot password?
            </a>
          </div>

          {error && <p className="login-card__error">{error}</p>}

          <button type="submit" className="login-card__submit" disabled={submitting}>
            <span>{submitting ? 'Signing in…' : 'Sign In'}</span>
            <ArrowRightIcon />
          </button>

          <div className="login-card__divider">
            <span />
            <p>Secure access only</p>
            <span />
          </div>
        </form>
      </div>
    </div>
  )
}
