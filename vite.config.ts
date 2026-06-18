import { promises as fs } from 'node:fs'
import type { IncomingMessage, ServerResponse } from 'node:http'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { defineConfig, type PreviewServer, type ViteDevServer } from 'vite'
import vue from '@vitejs/plugin-vue'
import { createSeedState } from './src/lib/accountState'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const stateFile = path.resolve(__dirname, 'data/tracking/state.json')
const legacyActualEntriesFile = path.resolve(
  __dirname,
  'data/tracking/actual-entries.json',
)

interface LegacyActualEntries {
  updatedAt?: string
  entries?: Record<
    string,
    {
      date: string
      actualShares: number
      actualCash: number
      closePrice: number
    }
  >
}

interface RawState {
  version?: number
  selectedAccountId?: string
  accounts?: unknown
  updatedAt?: string
}

const readJson = async (filePath: string): Promise<unknown | null> => {
  try {
    const raw = await fs.readFile(filePath, 'utf-8')
    return JSON.parse(raw) as unknown
  } catch {
    return null
  }
}

const writeJson = async (filePath: string, payload: unknown) => {
  await fs.mkdir(path.dirname(filePath), { recursive: true })
  await fs.writeFile(
    filePath,
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

const isAccountLike = (
  value: unknown,
): value is Record<string, unknown> => {
  if (!value || typeof value !== 'object') return false
  const obj = value as Record<string, unknown>
  return (
    typeof obj.id === 'string' &&
    typeof obj.name === 'string' &&
    typeof obj.params === 'object' &&
    obj.params !== null &&
    typeof obj.actualEntries === 'object' &&
    obj.actualEntries !== null
  )
}

const validateState = (
  value: unknown,
):
  | { ok: true; state: RawState }
  | { ok: false; message: string } => {
  if (!value || typeof value !== 'object') {
    return { ok: false, message: 'state 必须是对象' }
  }
  const candidate = value as RawState
  if (candidate.version !== 1) {
    return { ok: false, message: 'state.version 必须等于 1' }
  }
  if (typeof candidate.selectedAccountId !== 'string') {
    return { ok: false, message: 'state.selectedAccountId 必须是字符串' }
  }
  if (!candidate.accounts || typeof candidate.accounts !== 'object') {
    return { ok: false, message: 'state.accounts 必须是对象' }
  }
  const accounts = candidate.accounts as Record<string, unknown>
  const accountIds = Object.keys(accounts)
  if (accountIds.length === 0) {
    return { ok: false, message: 'state.accounts 不能为空' }
  }
  for (const id of accountIds) {
    if (!isAccountLike(accounts[id])) {
      return { ok: false, message: `账户 ${id} 字段不完整` }
    }
  }
  if (!accounts[candidate.selectedAccountId]) {
    return {
      ok: false,
      message: 'state.selectedAccountId 必须在 accounts 中存在',
    }
  }
  return { ok: true, state: candidate }
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

const seedFromLegacy = async () => {
  const legacy = await readJson(legacyActualEntriesFile)
  if (legacy && typeof legacy === 'object') {
    const entries = (legacy as LegacyActualEntries).entries ?? {}
    try {
      await fs.unlink(legacyActualEntriesFile)
    } catch {
      // ignore: file may not exist or already removed
    }
    return createSeedState({ legacyEntries: entries })
  }
  return createSeedState()
}

const applyAppStateApi = (middlewares: MiddlewareStack) => {
  middlewares.use('/api/state', async (req, res) => {
    try {
      if (req.method === 'GET') {
        let current = await readJson(stateFile)
        if (current === null) {
          current = await seedFromLegacy()
          await writeJson(stateFile, current)
        }
        sendJson(res, 200, current)
        return
      }

      if (req.method === 'PUT') {
        const body = await readJsonBody<unknown>(req)
        const validation = validateState(body)
        if (!validation.ok) {
          sendJson(res, 422, { message: validation.message })
          return
        }
        const nextState = {
          ...validation.state,
          updatedAt: new Date().toISOString(),
        }
        await writeJson(stateFile, nextState)
        sendJson(res, 200, nextState)
        return
      }

      sendJson(res, 405, { message: 'Method Not Allowed' })
    } catch (error) {
      const message = error instanceof Error ? error.message : '未知错误'
      sendJson(res, 500, { message })
    }
  })
}

const appStateApiPlugin = () => ({
  name: 'app-state-api',
  configureServer(server: ViteDevServer) {
    applyAppStateApi(server.middlewares)
  },
  configurePreviewServer(server: PreviewServer) {
    applyAppStateApi(server.middlewares)
  },
})

// https://vite.dev/config/
export default defineConfig({
  plugins: [vue(), appStateApiPlugin()],
})
