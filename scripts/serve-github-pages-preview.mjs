import { createServer } from 'node:http'
import { access, readFile, stat } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const MIME_TYPES = {
  '.css': 'text/css; charset=utf-8',
  '.html': 'text/html; charset=utf-8',
  '.ico': 'image/x-icon',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.map': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.svg': 'image/svg+xml; charset=utf-8',
  '.txt': 'text/plain; charset=utf-8',
}

const REPO_NAME = 'Idle-Champions-Helper'
const BASE_PATH = `/${REPO_NAME}/`
const DEFAULT_HOST = '127.0.0.1'
const DEFAULT_PORT = 4173

function parseArgs(argv) {
  const options = {}

  for (let index = 0; index < argv.length; index += 1) {
    const current = argv[index]
    const next = argv[index + 1]

    if ((current === '--host' || current === '-H') && next) {
      options.host = next
      index += 1
      continue
    }

    if ((current === '--port' || current === '-p') && next) {
      options.port = Number.parseInt(next, 10)
      index += 1
    }
  }

  return options
}

function sendResponse(response, statusCode, body, headers = {}) {
  response.writeHead(statusCode, headers)
  response.end(body)
}

function resolveFilePath(distDirectory, pathname) {
  if (pathname === '/' || pathname === BASE_PATH.slice(0, -1)) {
    return { redirect: BASE_PATH }
  }

  if (!pathname.startsWith(BASE_PATH)) {
    return null
  }

  const relativePath = pathname.slice(BASE_PATH.length)
  const normalizedRelativePath = path.normalize(relativePath || 'index.html')
  const targetPath = path.resolve(distDirectory, normalizedRelativePath)

  if (!targetPath.startsWith(distDirectory)) {
    return false
  }

  return targetPath
}

async function tryReadFile(filePath) {
  try {
    const fileStats = await stat(filePath)

    if (fileStats.isDirectory()) {
      return null
    }

    const body = await readFile(filePath)
    const extension = path.extname(filePath)

    return {
      body,
      contentType: MIME_TYPES[extension] ?? 'application/octet-stream',
    }
  } catch (error) {
    if (error && typeof error === 'object' && 'code' in error && error.code === 'ENOENT') {
      return null
    }

    throw error
  }
}

const options = parseArgs(process.argv.slice(2))
const host = options.host ?? DEFAULT_HOST
const port = options.port ?? DEFAULT_PORT
const currentDirectory = path.dirname(fileURLToPath(import.meta.url))
const distDirectory = path.resolve(currentDirectory, '../dist')

await access(distDirectory)

const server = createServer(async (request, response) => {
  if (!request.url) {
    sendResponse(response, 400, 'Bad Request', { 'Content-Type': 'text/plain; charset=utf-8' })
    return
  }

  if (request.method !== 'GET' && request.method !== 'HEAD') {
    sendResponse(response, 405, 'Method Not Allowed', {
      Allow: 'GET, HEAD',
      'Content-Type': 'text/plain; charset=utf-8',
    })
    return
  }

  const url = new URL(request.url, `http://${request.headers.host ?? `${host}:${port}`}`)
  const pathname = decodeURIComponent(url.pathname)
  const resolvedPath = resolveFilePath(distDirectory, pathname)

  if (resolvedPath === false) {
    sendResponse(response, 403, 'Forbidden', { 'Content-Type': 'text/plain; charset=utf-8' })
    return
  }

  if (resolvedPath === null) {
    sendResponse(response, 404, 'Not Found', { 'Content-Type': 'text/plain; charset=utf-8' })
    return
  }

  if (typeof resolvedPath === 'object' && 'redirect' in resolvedPath) {
    response.writeHead(302, { Location: resolvedPath.redirect })
    response.end()
    return
  }

  const directFile = await tryReadFile(resolvedPath)

  if (directFile) {
    sendResponse(response, 200, request.method === 'HEAD' ? undefined : directFile.body, {
      'Content-Type': directFile.contentType,
      'Cache-Control': 'no-cache',
    })
    return
  }

  if (!path.extname(resolvedPath)) {
    const fallbackFile = await tryReadFile(path.resolve(distDirectory, 'index.html'))

    if (fallbackFile) {
      sendResponse(response, 200, request.method === 'HEAD' ? undefined : fallbackFile.body, {
        'Content-Type': fallbackFile.contentType,
        'Cache-Control': 'no-cache',
      })
      return
    }
  }

  sendResponse(response, 404, 'Not Found', { 'Content-Type': 'text/plain; charset=utf-8' })
})

server.listen(port, host, () => {
  console.log(`GitHub Pages 预览已启动：http://${host}:${port}${BASE_PATH}`)
})
