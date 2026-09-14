import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import './i18n'
import App from './App.tsx'
import { LoginPage } from './screens/LoginPage.tsx'

// Preview temporal: ?preview=login muestra LoginPage en vez de App -- LoginPage todavía no está
// conectada a routing/auth real (ver conversación), esto es solo para poder verla en el navegador.
createRoot(document.getElementById('root')!).render(
  <StrictMode>
    {window.location.search.includes('preview=login') ? <LoginPage /> : <App />}
  </StrictMode>,
)
