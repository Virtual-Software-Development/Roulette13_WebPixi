import net from 'net'

// ¿Tiene esta computadora salida a internet? El navegador solo sabe si hay red local
// (navigator.onLine: cable/Wi-Fi conectado), no si el router tiene salida -- con el proveedor
// caído sigue diciendo "online". Por eso lo comprueba el servidor Node local (corre en la misma
// terminal, ver terminalInfo.js) abriendo una conexión TCP a servidores públicos muy estables. Ver
// src/network/internetMonitor.ts.
//
// TCP y no DNS: el DNS suele ser el propio router, que responde de su caché aunque no haya salida.
// Basta con que UNO responda. Se puede cambiar con INTERNET_CHECK_HOSTS="host:puerto,host:puerto".
const DEFAULT_TARGETS = ['1.1.1.1:443', '8.8.8.8:443']
const CONNECT_TIMEOUT_MS = 3000

function parseTargets(raw) {
  return (raw ? raw.split(',') : DEFAULT_TARGETS)
    .map((entry) => entry.trim())
    .filter(Boolean)
    .map((entry) => {
      const separator = entry.lastIndexOf(':')
      return { host: entry.slice(0, separator), port: Number(entry.slice(separator + 1)) }
    })
}

function canConnect({ host, port }) {
  return new Promise((resolve) => {
    const socket = net.connect({ host, port })
    const done = (ok) => {
      socket.destroy()
      resolve(ok)
    }
    socket.setTimeout(CONNECT_TIMEOUT_MS, () => done(false))
    socket.once('connect', () => done(true))
    socket.once('error', () => done(false))
  })
}

export async function hasInternet(targets = parseTargets(process.env.INTERNET_CHECK_HOSTS)) {
  const results = await Promise.all(targets.map(canConnect))
  return results.some(Boolean)
}

export function createInternetCheckHandler({ path = '/terminal/internet' } = {}) {
  return function internetCheckHandler(req, res, next) {
    if (req.method !== 'GET' || req.url.split('?')[0] !== path) return next()

    hasInternet().then((online) => {
      res.setHeader('Content-Type', 'application/json')
      res.setHeader('Cache-Control', 'no-store')
      res.end(JSON.stringify({ online }))
    })
  }
}
