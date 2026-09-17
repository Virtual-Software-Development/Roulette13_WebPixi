import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import './i18n'
import App from './App.tsx'
import { LoginPage } from './screens/LoginPage.tsx'
import { AdminPanel } from './screens/AdminPanel.tsx'

// Preview temporal vía ?preview=<login|admin|admin-rtp-dashboard|admin-rtp-management> -- todavía
// no hay router en el proyecto (ver conversación), así que la elección de pantalla de nivel
// superior (Roulette lobby / Login / Admin Panel) se resuelve leyendo el query string acá, una
// sola vez al montar. Dentro del Admin Panel, AdminPanel.tsx navega entre sus propias vistas
// (Dashboard/RTP Dashboard/RTP Management) en memoria (useState), sin volver a pasar por acá.
const ADMIN_PREVIEW_VALUES = [
  'admin',
  'admin-rtp-dashboard',
  'admin-rtp-management',
  'admin-next-results',
  'admin-next-results-quick-money',
]

function resolveScreen() {
  const preview = new URLSearchParams(window.location.search).get('preview')
  if (preview === 'login') return <LoginPage />
  if (preview && ADMIN_PREVIEW_VALUES.includes(preview)) return <AdminPanel />
  return <App />
}

createRoot(document.getElementById('root')!).render(<StrictMode>{resolveScreen()}</StrictMode>)
