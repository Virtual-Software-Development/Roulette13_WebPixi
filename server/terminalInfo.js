import os from 'os'

// El navegador no puede leer la MAC de la computadora (ninguna API web la expone), pero el
// servidor Node que sirve la app -- Vite en dev, server.js en prod -- corre en la MISMA terminal,
// así que la lee él con os.networkInterfaces() y se la entrega al frontend. Con ella el frontend
// pide sus credenciales MQTT (ver src/mqtt/mqttConnection.ts).

// Adaptadores virtuales/no físicos: su MAC no identifica a la terminal.
const VIRTUAL_ADAPTER = /virtual|vmware|vbox|hyper-v|vethernet|docker|wsl|loopback|bluetooth|tap|tun|zerotier|tailscale|npcap/i
const ZERO_MAC = '00:00:00:00:00:00'

// Adaptador físico con una IPv4 real (no 169.254.x.x, que es "sin red"): el que la terminal usa
// para hablar con el backend. Si hay varios (Ethernet + Wi-Fi), gana el primero que lista el SO.
export function findPhysicalAddress() {
  const candidates = []
  for (const [name, addresses] of Object.entries(os.networkInterfaces())) {
    if (VIRTUAL_ADAPTER.test(name)) continue
    for (const addr of addresses ?? []) {
      if (addr.internal || !addr.mac || addr.mac === ZERO_MAC) continue
      const hasRealIpv4 = addr.family === 'IPv4' && !addr.address.startsWith('169.254.')
      candidates.push({ mac: addr.mac, hasRealIpv4 })
    }
  }
  const best = candidates.find((c) => c.hasRealIpv4) ?? candidates[0]
  return best ? best.mac.replace(/[:-]/g, '').toUpperCase() : null
}

function isLoopback(address = '') {
  return address === '::1' || address.startsWith('127.') || address === '::ffff:127.0.0.1'
}

export function createTerminalInfoHandler({ path = '/terminal/physical-address' } = {}) {
  return function terminalInfoHandler(req, res, next) {
    if (req.method !== 'GET' || req.url.split('?')[0] !== path) return next()

    // Solo para el navegador de la propia terminal: a un cliente remoto se le estaría dando la
    // MAC de OTRA máquina (la que sirve la app), con la que se conectaría a MQTT haciéndose
    // pasar por ella.
    if (!isLoopback(req.socket.remoteAddress)) {
      res.statusCode = 403
      return res.end('Forbidden')
    }

    const physicalAddress = findPhysicalAddress()
    res.setHeader('Content-Type', 'application/json')
    res.setHeader('Cache-Control', 'no-store')
    if (!physicalAddress) {
      res.statusCode = 503
      return res.end(JSON.stringify({ error: 'no physical network adapter found' }))
    }
    res.end(JSON.stringify({ physicalAddress }))
  }
}
