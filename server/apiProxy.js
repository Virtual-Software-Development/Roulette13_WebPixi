import http from 'http'
import https from 'https'

export function createApiProxyHandler({ target, prefix = '/api/' }) {
  const targetUrl = new URL(target)
  const client = targetUrl.protocol === 'https:' ? https : http

  return function apiProxyHandler(req, res, next) {
    if (!req.url.startsWith(prefix)) return next()

    const forwardPath = req.url.slice(prefix.length - 1)
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
