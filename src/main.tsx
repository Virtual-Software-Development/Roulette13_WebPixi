import { lazy, StrictMode, Suspense } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import './i18n'

// Lazy en vez de import estático -- App.tsx carga @pixi/react + todo el motor de renderizado/video/
// física de la ruleta, que Login/Admin no necesitan para nada. Con import estático, main.tsx los
// traía a los tres siempre juntos (mismo bundle/módulo de entrada), así que visitar ?preview=admin
// igual forzaba descargar y evaluar todo el motor Pixi antes de poder pintar el Admin Panel (ver
// conversación: eso es lo que hacía lenta esa transición). Con lazy(), cada pantalla es su propio
// chunk -- Admin/Login ya no arrastran Pixi.
const App = lazy(() => import('./App.tsx'))
const LoginPage = lazy(() => import('./screens/LoginPage.tsx').then((m) => ({ default: m.LoginPage })))
const AdminPanel = lazy(() => import('./screens/AdminPanel.tsx').then((m) => ({ default: m.AdminPanel })))
const RouletteBettingView = lazy(() =>
  import('./screens/RouletteBettingView.tsx').then((m) => ({ default: m.RouletteBettingView })),
)
const QuickMoneyBettingView = lazy(() =>
  import('./screens/QuickMoneyBettingView.tsx').then((m) => ({ default: m.QuickMoneyBettingView })),
)

// Preview temporal vía ?preview=<login|admin|admin-rtp-dashboard|admin-rtp-management> -- todavía
// no hay router en el proyecto (ver conversación), así que la elección de pantalla de nivel
// superior (Roulette lobby / Login / Admin Panel) se resuelve leyendo el query string acá, una
// sola vez al montar. Dentro del Admin Panel, AdminPanel.tsx navega entre sus propias vistas
// (Dashboard/RTP Dashboard/RTP Management) en memoria (useState), sin volver a pasar por acá.
const ADMIN_PREVIEW_VALUES = [
  'admin',
  'admin-game-events',
  'admin-rtp-dashboard',
  'admin-rtp-management',
  'admin-next-results',
  'admin-next-results-quick-money',
  'admin-settings',
  'admin-users',
]

function resolveScreen() {
  const preview = new URLSearchParams(window.location.search).get('preview')
  if (preview === 'login') return <LoginPage />
  if (preview && ADMIN_PREVIEW_VALUES.includes(preview)) return <AdminPanel />
  // Player Mode tiene botón propio en el Header (ver Header.tsx: tab 'betting'). Cashier Mode
  // queda por ahora solo accesible por URL directa -- mismo criterio ad-hoc que ya usan las
  // sub-vistas de Admin sin botón dedicado (ej. admin-rtp-management): no existe hoy ningún gate
  // de rol real que distinga cajero de jugador (ver LoginPage.tsx, auth todavía stub).
  if (preview === 'roulette-betting') return <RouletteBettingView mode="player" />
  if (preview === 'roulette-betting-cashier') return <RouletteBettingView mode="cashier" />
  // Player Mode tiene botón propio en el Header (tab 'lottery', ver Header.tsx). Cashier Mode
  // queda por ahora solo accesible por URL directa -- mismo criterio ad-hoc que Roulette Betting.
  if (preview === 'quick-money-betting') return <QuickMoneyBettingView mode="player" />
  if (preview === 'quick-money-betting-cashier') return <QuickMoneyBettingView mode="cashier" />
  return <App />
}

// Fallback mientras carga el chunk lazy de la pantalla elegida -- deliberadamente NO es
// LoadingView.tsx (ese SÍ depende de Pixi/useTick, pensado para mostrarse adentro de la
// <Application> de App.tsx una vez que Pixi ya está cargado, no acá arriba de todo). Un div oscuro
// vacío evita el flash blanco mientras se resuelve el import(), sin arrastrar Pixi solo para
// mostrar un loader.
function ScreenFallback() {
  return <div style={{ position: 'fixed', inset: 0, background: '#05090d' }} />
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Suspense fallback={<ScreenFallback />}>{resolveScreen()}</Suspense>
  </StrictMode>,
)
