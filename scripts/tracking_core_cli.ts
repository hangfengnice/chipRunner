import { stdin, stderr, stdout } from 'node:process'
import {
  buildCoreTrackingRows,
  type CoreTrackingParams,
} from '../src/lib/trackingCore'

interface ComputePayload {
  params: CoreTrackingParams
  dates: string[]
}

const readStdin = async () => {
  let buffer = ''

  for await (const chunk of stdin) {
    buffer += chunk
  }

  return buffer
}

const isFiniteNumber = (value: unknown): value is number =>
  typeof value === 'number' && Number.isFinite(value)

const parseComputePayload = (raw: string): ComputePayload => {
  const parsed = JSON.parse(raw) as Partial<ComputePayload>

  if (!parsed || typeof parsed !== 'object') {
    throw new Error('输入格式错误：需要 JSON 对象')
  }

  if (
    !Array.isArray(parsed.dates) ||
    !parsed.dates.every((date) => typeof date === 'string')
  ) {
    throw new Error('输入格式错误：dates 必须是字符串数组')
  }

  const params = parsed.params
  if (!params || typeof params !== 'object') {
    throw new Error('输入格式错误：缺少 params')
  }

  if (
    !isFiniteNumber(params.initialShares) ||
    !isFiniteNumber(params.initialCash) ||
    !isFiniteNumber(params.price) ||
    !isFiniteNumber(params.spread) ||
    !isFiniteNumber(params.lotCost) ||
    !isFiniteNumber(params.hiddenTradingDays)
  ) {
    throw new Error('输入格式错误：params 字段不完整或类型错误')
  }

  return {
    params: {
      initialShares: params.initialShares,
      initialCash: params.initialCash,
      price: params.price,
      spread: params.spread,
      lotCost: params.lotCost,
      hiddenTradingDays: params.hiddenTradingDays,
    },
    dates: parsed.dates,
  }
}

const runCompute = async () => {
  const raw = (await readStdin()).trim()
  if (!raw) {
    throw new Error('缺少输入：请通过 stdin 传入 JSON')
  }

  const payload = parseComputePayload(raw)
  const rows = buildCoreTrackingRows(payload.params, payload.dates)

  if (rows.length !== payload.dates.length) {
    throw new Error('计算结果与日期数量不一致')
  }

  stdout.write(JSON.stringify(rows))
}

const main = async () => {
  const command = process.argv[2]

  if (command !== 'compute') {
    throw new Error('仅支持命令: compute')
  }

  await runCompute()
}

void main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : '未知错误'
  stderr.write(`${message}\n`)
  process.exitCode = 1
})
