import { lazy, StrictMode, Suspense, type ReactNode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import './i18n'
import { startInternetMonitor } from './network/internetMonitor.ts'
import { APP_SURFACE, currentPreview, isAdminPreview, surfaceForPreview, urlForPreview, withPreviewPath } from './appSurface.ts'
import { IS_LAN_VIEWER } from './lanPreview.ts'

// Lazy en vez de import estático -- App.tsx carga @pixi/react + todo el motor de renderizado/video/
// física de la ruleta, que Login/Admin no necesitan para nada. Con import estático, main.tsx los
// traía a los tres siempre juntos (mismo bundle/módulo de entrada), así que visitar /admin
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
const QuickMoneyLobby = lazy(() =>
  import('./screens/QuickMoneyLobby.tsx').then((m) => ({ default: m.QuickMoneyLobby })),
)
const MqttGate = lazy(() => import('./screens/MqttGate.tsx').then((m) => ({ default: m.MqttGate })))
const VideoErrorPanelPreview = lazy(() =>
  import('./screens/VideoErrorPanelPreview.tsx').then((m) => ({ default: m.VideoErrorPanelPreview })),
)
const BettingHomePage = lazy(() => import('./screens/BettingHomePage.tsx').then((m) => ({ default: m.BettingHomePage })))
const NotFoundView = lazy(() =>
  import('./screens/NotFoundView.tsx').then((m) => ({ default: m.NotFoundView })),
)

// Todavía no hay router en el proyecto: la pantalla de nivel superior se elige leyendo el path de la
// URL (localhost:4200/roulette-betting, ver currentPreview en appSurface.ts) una sola vez al montar
// (dentro del Admin Panel, AdminPanel.tsx navega entre sus vistas en memoria).
// En dev, Admin (Login + Admin Panel), Juego (lobbies) y Betting son servidores separados -- ver
// appSurface.ts: cada uno solo muestra sus pantallas y manda las de los otros a su puerto.

// Conexión MQTT de la MÁQUINA: se abre una sola vez al arrancar, sea cual sea la pantalla, y su
// estado queda en useMqttStore para cualquier vista. Import dinámico para no meter mqtt.js en el
// bundle de entrada (mismo criterio que las pantallas lazy de arriba).
// Título de la pestaña: index.html (compartido por los tres servidores) dice "Roulette 13"; cada
// servidor usa el suyo (pedido explícito). Sin separación ('all') queda el de index.html.
if (APP_SURFACE === 'game') document.title = 'American Roulette'
if (APP_SURFACE === 'betting') document.title = 'Game Bets'
if (APP_SURFACE === 'admin') document.title = 'Game Administration'

// Solo en los servidores de Juego y Betting (el Admin no es una máquina/terminal). Tampoco en un
// espectador de `npm run dev:lan` (ver lanPreview.ts): no es la terminal y no tiene credenciales.
if (APP_SURFACE !== 'admin') {
  if (!IS_LAN_VIEWER) void import('./mqtt/mqttConnection.ts').then((m) => m.startMqttConnection())
  // Salida a internet de la máquina, también global (ver network/internetMonitor.ts).
  startInternetMonitor()
}

// Solo los lobbies redirigen a la pantalla de error cuando la máquina pierde MQTT o internet (ver
// MqttGate.tsx). El resto de pantallas sigue igual; pueden leer useMqttStore si lo necesitan.
function lobbyWithMqttGate(screen: ReactNode) {
  return <MqttGate>{screen}</MqttGate>
}

// Pantalla de otro servidor: redirige a su puerto conservando la pantalla (reemplaza la entrada del
// historial para que "atrás" no rebote de vuelta). Devuelve el mismo fallback oscuro mientras tanto.
function redirectToOtherServer(preview: string | null) {
  window.location.replace(urlForPreview(preview))
  return <ScreenFallback />
}

// Links viejos (localhost:4200/?preview=roulette-betting): se reescriben a la URL limpia
// (localhost:4200/roulette-betting) sin recargar.
if (new URLSearchParams(window.location.search).has('preview')) {
  window.history.replaceState(null, '', withPreviewPath(new URL(window.location.href), currentPreview()))
}

function resolveScreen() {
  const preview = currentPreview()
  // Servidor Admin: '/' muestra el Login (pedido explícito).
  if (APP_SURFACE === 'admin' && !preview) return <LoginPage />
  // Servidor Betting: '/' muestra el selector de juego (Choose Betting Game) como página.
  if (APP_SURFACE === 'betting' && !preview) return <BettingHomePage />
  if (APP_SURFACE !== 'all' && surfaceForPreview(preview) !== APP_SURFACE) return redirectToOtherServer(preview)
  if (preview === 'login') return <LoginPage />
  if (isAdminPreview(preview)) return <AdminPanel />
  // Player Mode tiene botón propio en el Header (ver Header.tsx: tab 'betting'). Cashier Mode
  // queda por ahora solo accesible por URL directa -- mismo criterio ad-hoc que ya usan las
  // sub-vistas de Admin sin botón dedicado (ej. admin-rtp-management): no existe hoy ningún gate
  // de rol real que distinga cajero de jugador (ver LoginPage.tsx, auth todavía stub).
  if (preview === 'betting') return <BettingHomePage />
  if (preview === 'roulette-betting') return <RouletteBettingView mode="player" />
  if (preview === 'roulette-betting-cashier') return <RouletteBettingView mode="cashier" />
  // Tab 'lottery' del Header (ver Header.tsx) lleva acá -- punto de entrada a Quick Money, desde
  // donde el usuario ve Pick 3/Pick 4 antes de entrar a apostar. Las vistas de apuesta de abajo
  // (quick-money-betting[-cashier]) siguen existiendo tal cual, solo que ya no son el destino
  // directo del tab del Header.
  if (preview === 'quick-money-lobby') return lobbyWithMqttGate(<QuickMoneyLobby />)
  // Cashier Mode queda por ahora solo accesible por URL directa -- mismo criterio ad-hoc que
  // Roulette Betting.
  if (preview === 'quick-money-betting') return <QuickMoneyBettingView mode="player" />
  if (preview === 'quick-money-betting-cashier') return <QuickMoneyBettingView mode="cashier" />
  // Preview temporal del panel que reemplaza al video del sorteo cuando no carga (ver
  // VideoErrorPanelPreview.tsx) -- para maquetarlo sin forzar la falla real en App.tsx.
  if (preview === 'video-error-panel') return <VideoErrorPanelPreview />
  // '/' es la entrada normal (pantalla principal, Roulette Lobby) -- eso sigue igual.
  // Un path presente pero que no matchea ninguna pantalla conocida de arriba (typo, link
  // viejo, etc.) antes caía acá también y mostraba la ruleta como si nada -- ahora muestra el 404
  // genérico en su lugar (ver NotFoundView.tsx), sin tocar ninguna de las rutas válidas de arriba.
  if (!preview) return lobbyWithMqttGate(<App />)
  return <NotFoundView />
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
