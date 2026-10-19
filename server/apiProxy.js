import http from 'http'
import https from 'https'

// forwardBase: what replaces the prefix's leading segment upstream -- '/api/v1' for the API, '' for
// the backend's root probes (/backend/readyz -> /readyz, see src/network/backendMonitor.ts).
export function createApiProxyHandler({ target, prefix = '/api/', forwardBase = '/api/v1' }) {
  const targetUrl = new URL(target)
  const client = targetUrl.protocol === 'https:' ? https : http

  return function apiProxyHandler(req, res, next) {
    if (!req.url.startsWith(prefix)) return next()

    // Backend routes live under /api/v1 (quick_money-backend's router.go):
    // "/api/gameInfo" -> "/api/v1/gameInfo".
    const forwardPath = forwardBase + req.url.slice(prefix.length - 1)
    const options = {
      hostname: targetUrl.hostname,
      port: targetUrl.port || (targetUrl.protocol === 'https:' ? 443 : 80),
      path: forwardPath,
      method: req.method,
      headers: { ...req.headers, host: targetUrl.host },
    }

    const proxyReq = client.request(options, (proxyRes) => {
      res.writeHead(proxyRes.statusCode ?? 502, proxyRes.headers)
      proxyRes.pipe(res)
    })

    proxyReq.on('error', () => {
      res.statusCode = 502
      res.end('Bad Gateway')
    })

    req.pipe(proxyReq)
  }
}
