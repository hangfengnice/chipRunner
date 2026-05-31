import { promises as fs } from 'node:fs'
import type { IncomingMessage, ServerResponse } from 'node:http'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { defineConfig, type PreviewServer, type ViteDevServer } from 'vite'
import vue from '@vitejs/plugin-vue'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const actualEntriesFile = path.resolve(
  __dirname,
  'data/tracking/actual-entries.json',
)

interface ActualEntriesPayload {
  updatedAt: string | null
  entries: Record<
    string,
    {
      date: string
      actualShares: number
      actualCash: number
      closePrice: number
    }
  >
}

const defaultPayload: ActualEntriesPayload = {
  updatedAt: null,
  entries: {},
}

const readActualEntriesFile = async (): Promise<ActualEntriesPayload> => {
  try {
    const raw = await fs.readFile(actualEntriesFile, 'utf-8')
    const parsed = JSON.parse(raw) as Partial<ActualEntriesPayload>

    return {
      updatedAt:
        typeof parsed.updatedAt === 'string' || parsed.updatedAt === null
          ? parsed.updatedAt
          : null,
      entries:
        parsed.entries && typeof parsed.entries === 'object'
          ? parsed.entries
          : {},
    }
  } catch {
    return { ...defaultPayload }
  }
}

const writeActualEntriesFile = async (payload: ActualEntriesPayload) => {
  await fs.mkdir(path.dirname(actualEntriesFile), { recursive: true })
  await fs.writeFile(
    actualEntriesFile,
    `${JSON.stringify(payload, null, 2)}\n`,
    'utf-8',
  )
}

const readJsonBody = async <T>(req: IncomingMessage): Promise<T> => {
  const chunks: Buffer[] = []

  for await (const chunk of req) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk))
  }

  const body = Buffer.concat(chunks).toString('utf-8')
  return JSON.parse(body) as T
}

const sendJson = (
  res: ServerResponse,
  statusCode: number,
  payload: unknown,
) => {
  res.statusCode = statusCode
  res.setHeader('Content-Type', 'application/json; charset=utf-8')
  res.end(JSON.stringify(payload))
}

interface MiddlewareStack {
  use: (
    path: string,
    handler: (
      req: IncomingMessage,
      res: ServerResponse,
    ) => void | Promise<void>,
  ) => void
}

const applyActualEntriesApi = (middlewares: MiddlewareStack) => {
  middlewares.use('/api/actual-entries', async (req, res) => {
    try {
      if (req.method === 'GET') {
        sendJson(res, 200, await readActualEntriesFile())
        return
      }

      if (req.method === 'POST') {
        const payload = await readJsonBody<{
          date: string
          actualShares: number
          actualCash: number
          closePrice: number
        }>(req)

        if (
          !payload.date ||
          !Number.isFinite(payload.actualShares) ||
          !Number.isFinite(payload.actualCash) ||
          !Number.isFinite(payload.closePrice)
        ) {
          sendJson(res, 400, { message: '实盘记录参数不完整' })
          return
        }

        const current = await readActualEntriesFile()
        const next: ActualEntriesPayload = {
          updatedAt: new Date().toISOString(),
          entries: {
            ...current.entries,
            [payload.date]: {
              date: payload.date,
              actualShares: Math.trunc(payload.actualShares),
              actualCash: Number(payload.actualCash.toFixed(2)),
              closePrice: Number(payload.closePrice.toFixed(2)),
            },
          },
        }

        await writeActualEntriesFile(next)
        sendJson(res, 200, next)
        return
      }

      if (req.method === 'DELETE') {
        const requestUrl = new URL(req.url ?? '', 'http://localhost')
        const date = requestUrl.searchParams.get('date') ?? ''

        if (!date) {
          sendJson(res, 400, { message: '缺少 date 参数' })
          return
        }

        const current = await readActualEntriesFile()
        const nextEntries = { ...current.entries }
        delete nextEntries[date]

        const next: ActualEntriesPayload = {
          updatedAt: new Date().toISOString(),
          entries: nextEntries,
        }

        await writeActualEntriesFile(next)
        sendJson(res, 200, next)
        return
      }

      sendJson(res, 405, { message: 'Method Not Allowed' })
    } catch (error) {
      const message = error instanceof Error ? error.message : '未知错误'
      sendJson(res, 500, { message })
    }
  })
}

const actualEntriesApiPlugin = () => ({
  name: 'actual-entries-api',
  configureServer(server: ViteDevServer) {
    applyActualEntriesApi(server.middlewares)
  },
  configurePreviewServer(server: PreviewServer) {
    applyActualEntriesApi(server.middlewares)
  },
})

// https://vite.dev/config/
export default defineConfig({
  plugins: [vue(), actualEntriesApiPlugin()],
})
