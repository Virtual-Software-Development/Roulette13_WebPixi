// Levanta todo el entorno de desarrollo con un solo comando (`npm run dev:all`):
//   0. npm install -- solo si falta node_modules
//   1. PostgreSQL  -- verifica que esté escuchando (servicio de Windows o Docker, no lo arranca)
//   2. Migraciones -- golang-migrate `up` contra la BD del backend
//   3. API Go      -- quick-money-backend (compila y ejecuta cmd/api; incluye el worker de eventos)
//   4. Vite        -- frontend de juego + panel admin, con /api apuntando a la API
//
// Mientras corre, vigila el backend: un cambio en .go/go.mod/.env recompila y reinicia la API,
// y un cambio en db/migrations además vuelve a correr las migraciones. Vite ya tiene su HMR.
//
// El backend se busca en ../quick-money-backend; se puede sobreescribir con BACKEND_DIR.
// Variables de BD/puerto se leen del .env del backend (las mismas que usa la API).
import { spawn, spawnSync } from 'child_process'
import fs from 'fs'
import net from 'net'
import path from 'path'
import { fileURLToPath } from 'url'
import { parseEnv } from 'util'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const frontendDir = path.resolve(__dirname, '..')
const backendDir = path.resolve(frontendDir, process.env.BACKEND_DIR ?? '../quick-money-backend')
const isWindows = process.platform === 'win32'

const COLORS = { db: 36, migrate: 35, api: 33, web: 32, 'dev:all': 1 }

function log(tag, message) {
  const prefix = `\x1b[${COLORS[tag] ?? 0}m[${tag}]\x1b[0m`
  for (const line of String(message).split(/\r?\n/)) {
    if (line.trim() !== '') console.log(`${prefix} ${line}`)
  }
}

function logError(tag, message) {
  log(tag, `\x1b[31m${message}\x1b[0m`)
}

function fail(message) {
  logError('dev:all', message)
  shutdown(1)
}

function readEnvFile(file) {
  try {
    return parseEnv(fs.readFileSync(file, 'utf8'))
  } catch {
    return {}
  }
}

function isPortOpen(host, port) {
  return new Promise((resolve) => {
    const socket = net.connect({ host, port: Number(port) })
    socket.once('connect', () => {
      socket.destroy()
      resolve(true)
    })
    socket.once('error', () => {
      socket.destroy()
      resolve(false)
    })
  })
}

async function waitForPort(host, port, timeoutMs, isAlive = () => true) {
  const deadline = Date.now() + timeoutMs
  while (Date.now() < deadline && isAlive()) {
    if (await isPortOpen(host, port)) return true
    await new Promise((resolve) => setTimeout(resolve, 500))
  }
  return false
}

// --- Procesos hijos ----------------------------------------------------------

const children = new Set()
let shuttingDown = false

function killTree(child) {
  if (child.exitCode !== null || child.signalCode !== null || child.pid === undefined) return
  // En Windows, kill() no alcanza a los procesos nietos (p. ej. esbuild de Vite).
  if (isWindows) spawnSync('taskkill', ['/pid', String(child.pid), '/T', '/F'], { stdio: 'ignore' })
  else child.kill('SIGTERM')
}

function run(tag, command, args, options = {}) {
  const child = spawn(command, args, { stdio: ['ignore', 'pipe', 'pipe'], ...options })
  child.stdout.on('data', (chunk) => log(tag, chunk))
  child.stderr.on('data', (chunk) => log(tag, chunk))
  child.on('exit', () => children.delete(child))
  children.add(child)
  return child
}

function shutdown(code = 0) {
  if (shuttingDown) return
  shuttingDown = true
  for (const child of children) killTree(child)
  process.exit(code)
}

process.on('SIGINT', () => shutdown(0))
process.on('SIGTERM', () => shutdown(0))

// --- Configuración ---------------------------------------------------------

const backendEnvFile = path.join(backendDir, '.env')
if (!fs.existsSync(path.join(backendDir, 'go.mod'))) {
  fail(`No se encontró el backend en ${backendDir}. Clónalo ahí o define BACKEND_DIR.`)
}
if (!fs.existsSync(backendEnvFile)) {
  fail(`Falta ${backendEnvFile} (copia .env.example del backend y complétalo).`)
}

// Se relee en cada reinicio de la API, por si se editó el .env del backend.
function loadBackendConfig() {
  const env = { ...readEnvFile(backendEnvFile), ...process.env }
  const db = {
    host: env.DB_HOST ?? 'localhost',
    port: env.DB_PORT ?? '5432',
    user: env.DB_USER ?? '',
    password: env.DB_PASSWORD ?? '',
    name: env.DB_NAME ?? '',
    sslmode: env.DB_SSLMODE ?? 'disable',
  }
  const databaseUrl =
    `postgres://${encodeURIComponent(db.user)}:${encodeURIComponent(db.password)}` +
    `@${db.host}:${db.port}/${encodeURIComponent(db.name)}?sslmode=${db.sslmode}`
  return { db, databaseUrl, apiPort: env.HTTP_PORT ?? '8080' }
}

let config = loadBackendConfig()
const frontendEnv = readEnvFile(path.join(frontendDir, '.env'))

// --- 0. Dependencias del frontend --------------------------------------------

const viteBin = path.join(frontendDir, 'node_modules', 'vite', 'bin', 'vite.js')
if (!fs.existsSync(viteBin)) {
  log('web', 'node_modules incompleto, ejecutando npm install...')
  const install = spawnSync('npm install', { cwd: frontendDir, stdio: 'inherit', shell: true })
  if (install.status !== 0 || !fs.existsSync(viteBin)) fail('npm install falló.')
}

// local-media/ está en .gitignore (no viene con el clone): sin él Vite responde 404 a todo /media/
// y el juego/admin quedan sin imágenes, íconos ni videos. Solo se avisa; no bloquea el arranque.
const mediaRoot = path.resolve(frontendDir, process.env.MEDIA_ROOT || frontendEnv.MEDIA_ROOT || './local-media')
if (!fs.existsSync(mediaRoot) || fs.readdirSync(mediaRoot).length === 0) {
  logError('web', `No hay media en ${mediaRoot}: faltarán imágenes, íconos y videos. Copia ahí el paquete local-media.`)
}

// --- 1. PostgreSQL -----------------------------------------------------------

const { db } = config
log('db', `esperando PostgreSQL en ${db.host}:${db.port}...`)
if (!(await waitForPort(db.host, db.port, 15000))) {
  fail(
    `PostgreSQL no responde en ${db.host}:${db.port}. Arráncalo primero ` +
      (isWindows
        ? '(servicio "postgresql-x64-16": `net start postgresql-x64-16` como administrador).'
        : '(p. ej. `docker compose -f deploy/docker-compose.yml up postgres` en el backend).')
  )
}
log('db', 'PostgreSQL listo')

// --- 2. Migraciones ----------------------------------------------------------

function runMigrations() {
  log('migrate', 'aplicando migraciones...')
  // -tags postgres es obligatorio: sin él migrate compila sin driver ("unknown driver postgres").
  const migrate = spawnSync(
    'go',
    [
      'run', '-tags', 'postgres', 'github.com/golang-migrate/migrate/v4/cmd/migrate@v4.18.1',
      '-path', 'db/migrations', '-database', config.databaseUrl, 'up',
    ],
    { cwd: backendDir, encoding: 'utf8' }
  )
  if (migrate.error) {
    logError('migrate', `No se pudo ejecutar go: ${migrate.error.message}`)
    return false
  }
  log('migrate', migrate.stdout + migrate.stderr)
  if (migrate.status !== 0) {
    logError('migrate', 'Las migraciones fallaron (revisa credenciales DB_* en el .env del backend).')
    return false
  }
  return true
}

if (!runMigrations()) fail('No se puede continuar sin migraciones.')

// --- 3. API Go ---------------------------------------------------------------

// Se compila y ejecuta el binario directamente (en vez de `go run`) para que al detener
// dev:all se mate la API real y no quede un proceso huérfano ocupando el puerto. Se compila a
// un archivo aparte y luego se copia porque Windows no deja sobrescribir un .exe en ejecución.
const cacheDir = path.join(frontendDir, 'node_modules', '.cache', 'dev-all')
const exe = isWindows ? '.exe' : ''
const apiBinary = path.join(cacheDir, `api${exe}`)
const apiBuildOutput = path.join(cacheDir, `api-build${exe}`)
let apiChild = null

function buildApi() {
  log('api', 'compilando quick-money-backend...')
  const build = spawnSync('go', ['build', '-o', apiBuildOutput, './cmd/api'], { cwd: backendDir, encoding: 'utf8' })
  if (build.error) {
    logError('api', `No se pudo ejecutar go: ${build.error.message}`)
    return false
  }
  if (build.status !== 0) {
    log('api', build.stdout + build.stderr)
    logError('api', 'La compilación falló; se reintenta al guardar un cambio en el backend.')
    return false
  }
  return true
}

function stopApi() {
  if (!apiChild) return
  const child = apiChild
  apiChild = null
  killTree(child)
}

async function startApi() {
  fs.copyFileSync(apiBuildOutput, apiBinary)
  const child = run('api', apiBinary, [], { cwd: backendDir })
  apiChild = child
  child.on('exit', (code, signal) => {
    if (shuttingDown || apiChild !== child) return
    apiChild = null
    logError('api', `terminó (${signal ?? `código ${code}`}); se reinicia al guardar un cambio en el backend.`)
  })
  const up = await waitForPort('localhost', config.apiPort, 30000, () => apiChild === child)
  if (up) log('api', `API lista en http://localhost:${config.apiPort}`)
  else if (apiChild === child) logError('api', `La API no abrió el puerto ${config.apiPort}.`)
  return up
}

if (!buildApi()) fail('No se puede continuar sin compilar el backend.')
if (!(await startApi())) fail('La API no levantó.')

// --- 4. Vite (juego + admin) -------------------------------------------------

// El proxy de Vite quita el prefijo /api, así que API_URL debe incluir /api/v1.
// Un API_URL definido en el .env del frontend (o en el entorno) tiene prioridad.
const apiUrl = process.env.API_URL || frontendEnv.API_URL || `http://localhost:${config.apiPort}/api/v1`
const web = run('web', process.execPath, [viteBin], {
  cwd: frontendDir,
  env: { ...process.env, API_URL: apiUrl, FORCE_COLOR: '1' },
})
web.on('exit', (code, signal) => {
  if (shuttingDown) return
  logError('web', `terminó (${signal ?? `código ${code}`}); deteniendo el resto`)
  shutdown(code || 1)
})

// --- Recarga del backend -----------------------------------------------------

const IGNORED_DIRS = new Set(['.git', 'bin', 'vendor', 'node_modules', '.github'])
let pending = null // { migrate: boolean } acumulado mientras se espera el debounce o un reinicio
let debounceTimer = null
let restarting = false

async function reloadBackend() {
  if (restarting || !pending || shuttingDown) return
  const { migrate } = pending
  pending = null
  restarting = true
  try {
    const previousPort = config.apiPort
    config = loadBackendConfig()
    if (config.apiPort !== previousPort) {
      logError('dev:all', `HTTP_PORT cambió (${previousPort} -> ${config.apiPort}); reinicia dev:all para que Vite apunte al nuevo puerto.`)
    }
    // Se compila antes de detener la API: si el código no compila, la versión anterior sigue sirviendo.
    if (!buildApi()) return
    stopApi()
    if (migrate) runMigrations()
    await startApi()
  } finally {
    restarting = false
    if (pending) reloadBackend()
  }
}

fs.watch(backendDir, { recursive: true }, (_event, filename) => {
  if (!filename) return
  const rel = filename.split(path.sep).join('/')
  if (IGNORED_DIRS.has(rel.split('/')[0])) return

  const isMigration = rel.startsWith('db/migrations/') && rel.endsWith('.sql')
  const isGoSource = rel.endsWith('.go') || rel === 'go.mod' || rel === 'go.sum' || rel === '.env'
  if (!isMigration && !isGoSource) return

  // Un solo guardado dispara varios eventos en Windows; se loguea cada archivo una vez por ráfaga.
  if (!pending?.files.has(rel)) log('dev:all', `cambio en backend: ${rel}`)
  pending = {
    migrate: (pending?.migrate ?? false) || isMigration,
    files: (pending?.files ?? new Set()).add(rel),
  }
  clearTimeout(debounceTimer)
  debounceTimer = setTimeout(reloadBackend, 400)
})

log('dev:all', `frontend -> /api proxied a ${apiUrl}. Vigilando ${backendDir}. Ctrl+C para detener todo.`)
