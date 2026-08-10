import fs from 'fs'
import path from 'path'

const MIME = {
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.webp': 'image/webp',
  '.gif': 'image/gif',
  '.mp4': 'video/mp4',
  '.webm': 'video/webm',
  '.mp3': 'audio/mpeg',
}

export function createMediaHandler({ mediaRoot, prefix = '/media/' }) {
  const root = path.resolve(mediaRoot)

  return function mediaHandler(req, res, next) {
    if (req.method !== 'GET' || !req.url.startsWith(prefix)) return next()

    const encoded = req.url.slice(prefix.length)
    let requested
    try {
      requested = decodeURIComponent(encoded)
    } catch {
      res.statusCode = 400
      return res.end('Bad Request')
    }

    const filePath = path.resolve(root, requested)
    if (filePath !== root && !filePath.startsWith(root + path.sep)) {
      res.statusCode = 400
      return res.end('Bad Request')
    }

    let stat
    try {
      stat = fs.statSync(filePath)
    } catch {
      res.statusCode = 404
      return res.end('Not Found')
    }
    if (!stat.isFile()) {
      res.statusCode = 404
      return res.end('Not Found')
    }

    const ext = path.extname(filePath).toLowerCase()
    res.setHeader('Content-Type', MIME[ext] ?? 'application/octet-stream')
    res.setHeader('Accept-Ranges', 'bytes')

    const rangeHeader = req.headers['range']
    if (rangeHeader) {
      const match = rangeHeader.match(/bytes=(\d+)-(\d*)/)
      if (!match) {
        res.statusCode = 416
        res.setHeader('Content-Range', `bytes */${stat.size}`)
        return res.end()
      }
      const start = parseInt(match[1], 10)
      const end = match[2] ? parseInt(match[2], 10) : stat.size - 1
      if (start >= stat.size || end >= stat.size || start > end) {
        res.statusCode = 416
        res.setHeader('Content-Range', `bytes */${stat.size}`)
        return res.end()
      }
      res.statusCode = 206
      res.setHeader('Content-Range', `bytes ${start}-${end}/${stat.size}`)
      res.setHeader('Content-Length', end - start + 1)
      const rangeStream = fs.createReadStream(filePath, { start, end })
      rangeStream.on('error', () => {
        if (!res.headersSent) {
          res.statusCode = 500
          res.end()
        }
      })
      rangeStream.pipe(res)
    } else {
      res.setHeader('Content-Length', stat.size)
      const stream = fs.createReadStream(filePath)
      stream.on('error', () => {
        res.statusCode = 404
        res.end()
      })
      stream.pipe(res)
    }
  }
}
