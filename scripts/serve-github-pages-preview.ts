import process from 'node:process'
import type { Buffer } from 'node:buffer'
import { createServer, type IncomingMessage, type Server, type ServerResponse } from 'node:http'
import { access, readFile, stat } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const MIME_TYPES: Record<string, string> = {
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

interface PreviewOptions {
  host?: string
  port?: number
}

interface ResolveRedirect {
  redirect: string
}

type ResolveFilePathResult = ResolveRedirect | string | false | null

interface ServedFile {
  body: Buffer
  contentType: string
}

function parseArgs(argv: readonly string[]): PreviewOptions {
  const options: PreviewOptions = {}

  for (let index = 0; index < argv.length; index += 1) {
    const current = argv[index]
    const next = argv[index + 1]

    if (next !== undefined && (current === '--host' || current === '-H')) {
      options.host = next
      index += 1
      continue
    }

    if (next !== undefined && (current === '--port' || current === '-p')) {
      const parsed = Number.parseInt(next, 10)
      if (Number.isInteger(parsed)) {
        options.port = parsed
      }
      index += 1
    }
  }

  return options
}

function sendResponse(
  response: ServerResponse,
  statusCode: number,
  body: string | Buffer | undefined,
  headers: Record<string, string> = {},
): void {
  response.writeHead(statusCode, headers)
  response.end(body)
}

function resolveFilePath(distDirectory: string, pathname: string): ResolveFilePathResult {
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

async function tryReadFile(filePath: string): Promise<ServedFile | null> {
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

async function handleRequest(
  request: IncomingMessage,
  response: ServerResponse,
  distDirectory: string,
  host: string,
  port: number,
): Promise<void> {
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

  const hostHeader = typeof request.headers.host === 'string' ? request.headers.host : `${host}:${port}`
  const url = new URL(request.url, `http://${hostHeader}`)
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
    sendResponse(
      response,
      200,
      request.method === 'HEAD' ? undefined : directFile.body,
      {
        'Content-Type': directFile.contentType,
        'Cache-Control': 'no-cache',
      },
    )
    return
  }

  if (!path.extname(resolvedPath)) {
    const fallbackFile = await tryReadFile(path.resolve(distDirectory, 'index.html'))

    if (fallbackFile) {
      sendResponse(
        response,
        200,
        request.method === 'HEAD' ? undefined : fallbackFile.body,
        {
          'Content-Type': fallbackFile.contentType,
          'Cache-Control': 'no-cache',
        },
      )
      return
    }
  }

  sendResponse(response, 404, 'Not Found', { 'Content-Type': 'text/plain; charset=utf-8' })
}

const options = parseArgs(process.argv.slice(2))
const host = options.host ?? DEFAULT_HOST
const port = options.port ?? DEFAULT_PORT
const currentDirectory = path.dirname(fileURLToPath(import.meta.url))
const distDirectory = path.resolve(currentDirectory, '../dist')

await access(distDirectory)

const server: Server = createServer((request, response) => {
  // ponytail: async handler 未处理异常由 node 默认行为接管，不画蛇添足加 500 兜底。
  void handleRequest(request, response, distDirectory, host, port)
})

server.listen(port, host, () => {
  console.log(`GitHub Pages 预览已启动：http://${host}:${port}${BASE_PATH}`)
})
