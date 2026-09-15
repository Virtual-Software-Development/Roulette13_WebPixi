import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import './i18n'
import App from './App.tsx'
import { LoginPage } from './screens/LoginPage.tsx'
import { AdminDashboardPage } from './screens/AdminDashboardPage.tsx'

// Preview temporal vía ?preview=<login|admin> -- todavía no hay router en el proyecto (ver
// conversación), así que la elección de pantalla se resuelve leyendo el query string acá, el
// mismo mecanismo ad-hoc que ya existía para LoginPage. El Header (ver Header.tsx) navega entre
// estas pantallas reescribiendo window.location.search con el mismo parámetro.
function resolveScreen() {
  const preview = new URLSearchParams(window.location.search).get('preview')
  if (preview === 'login') return <LoginPage />
  if (preview === 'admin') return <AdminDashboardPage />
  return <App />
}

createRoot(document.getElementById('root')!).render(<StrictMode>{resolveScreen()}</StrictMode>)
