import fs from 'fs'
import http from 'http'
import path from 'path'
import { fileURLToPath } from 'url'
import { createMediaHandler } from './server/mediaHandler.js'
import { createApiProxyHandler } from './server/apiProxy.js'

try {
  process.loadEnvFile('.env')
} catch {
  // .env is optional â fall back to whatever is already in process.env
}

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const distRoot = path.resolve(__dirname, 'dist')
const port = process.env.PORT ?? 4000
const mediaHandler = createMediaHandler({
  mediaRoot: process.env.MEDIA_ROOT ?? './local-media',
  prefix: '/media/',
})
const apiProxyHandler = createApiProxyHandler({
  target: process.env.API_URL ?? 'http://localhost:3000',
  prefix: '/api/',
})

const STATIC_MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.ico': 'image/x-icon',
}

function serveStatic(req, res) {
  const urlPath = decodeURIComponent(req.url.split('?')[0])
  const requestedPath = urlPath === '/' ? '/index.html' : urlPath
  const filePath = path.join(distRoot, requestedPath)

  if (filePath !== distRoot && !filePath.startsWith(distRoot + path.sep)) {
    res.statusCode = 400
    return res.end('Bad Request')
  }

  fs.readFile(filePath, (err, data) => {
    if (err) {
      res.statusCode = 404
      return res.end('Not Found')
    }
    const ext = path.extname(filePath).toLowerCase()
    res.setHeader('Content-Type', STATIC_MIME[ext] ?? 'application/octet-stream')
    res.end(data)
  })
}

const server = http.createServer((req, res) => {
  mediaHandler(req, res, () => apiProxyHandler(req, res, () => serveStatic(req, res)))
})

server.listen(port, () => {
  console.log(`Server listening on http://localhost:${port}`)
})
