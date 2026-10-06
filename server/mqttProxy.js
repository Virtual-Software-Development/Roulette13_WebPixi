import http from 'http'
import https from 'https'

// Reenvía el upgrade WebSocket de /mqtt a EMQX (mismo rol que el proxy '/mqtt' de vite.config.ts
// en dev), así el navegador se conecta al mismo origen que sirve la app.
export function createMqttUpgradeHandler({ target, prefix = '/mqtt' }) {
  const targetUrl = new URL(target)
  const secure = targetUrl.protocol === 'wss:' || targetUrl.protocol === 'https:'
  const client = secure ? https : http

  return function mqttUpgradeHandler(req, socket, head) {
    if (req.url !== prefix && !req.url.startsWith(prefix + '?') && !req.url.startsWith(prefix + '/')) {
      socket.destroy()
      return
    }

    const proxyReq = client.request({
      hostname: targetUrl.hostname,
      port: targetUrl.port || (secure ? 443 : 80),
      path: req.url,
      method: req.method,
      headers: { ...req.headers, host: targetUrl.host },
    })

    proxyReq.on('upgrade', (proxyRes, proxySocket, proxyHead) => {
      const headerLines = []
      for (let i = 0; i < proxyRes.rawHeaders.length; i += 2) {
        headerLines.push(`${proxyRes.rawHeaders[i]}: ${proxyRes.rawHeaders[i + 1]}`)
      }
      socket.write(`HTTP/1.1 101 Switching Protocols\r\n${headerLines.join('\r\n')}\r\n\r\n`)
      if (proxyHead.length) socket.write(proxyHead)
      if (head.length) proxySocket.write(head)
      proxySocket.pipe(socket).pipe(proxySocket)
      proxySocket.on('error', () => socket.destroy())
      socket.on('error', () => proxySocket.destroy())
    })

    // EMQX respondió sin upgrade (404, 5xx...): no hay WebSocket que reenviar.
    proxyReq.on('response', () => socket.destroy())
    proxyReq.on('error', () => socket.destroy())
    proxyReq.end()
  }
}
