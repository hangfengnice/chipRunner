import { ALL_TRADING_DATES, TRADING_DATES_2026 } from '../data/sources'
import {
  buildCoreTrackingRows,
  buildProgressDelta,
  findMatchedIndexByAssets,
  roundMoney,
  type CoreTrackingParams,
} from './trackingCore'

export interface TrackingParams {
  startDate: string
  initialShares: number
  initialCash: number
  price: number
  spread: number
  lotCost: number
  hiddenTradingDays: number
  endDate: string
}

export interface TrackingRow {
  index: number
  date: string
  targetShares: number
  tProfit: number
  targetCash: number
  targetAssets: number
  lotsBought: number
}

export interface ActualPositionEntry {
  date: string
  actualShares: number
  actualCash: number
  closePrice: number
  dailyCashGained?: number | null
}

export interface TrackingComparisonRow extends TrackingRow {
  actualShares: number | null
  actualCash: number | null
  cashDelta: number | null
  dailyCashGained: number | null
  cumulativeCashGained: number
  closePrice: number | null
  actualTotalAssets: number | null
  shareDiff: number | null
  assetDiff: number | null
  targetMatchedDate: string
  progressDelta: string
  totalAssetRatio: number | null
}

export const syncLotCostFromPrice = (price: number) => roundMoney(price * 100)

export const DEFAULT_PARAMS: TrackingParams = {
  startDate: '2026.06.24',
  initialShares: 1200,
  initialCash: 0,
  price: 23.06,
  spread: 0.35,
  lotCost: 2306,
  hiddenTradingDays: 0,
  endDate: TRADING_DATES_2026[TRADING_DATES_2026.length - 1] ?? '2026.12.31',
}

// 系统起始日:计算引擎实际起算的第一天(= 默认起始日)。
// 早于该日的票起始日只作为"初始基准"快照行展示,不参与逐日累加。
export const SYSTEM_START_DATE = DEFAULT_PARAMS.startDate

// 初始基准快照行:仅展示用户填的初始股数/现金/股价对应的基本信息,
// tProfit 与 lotsBought 为 0(该日不做 T、不买入)。
const buildInitialSnapshotRow = (
  date: string,
  params: TrackingParams,
): TrackingRow => ({
  index: 0,
  date,
  targetShares: Math.trunc(params.initialShares),
  tProfit: 0,
  targetCash: roundMoney(params.initialCash),
  targetAssets: roundMoney(
    Math.trunc(params.initialShares) * params.price + params.initialCash,
  ),
  lotsBought: 0,
})

export function buildRows(
  params: TrackingParams,
  sourceDates: readonly string[] = ALL_TRADING_DATES,
): TrackingRow[] {
  const earlyStart = params.startDate < SYSTEM_START_DATE
  // 早于系统起始日:实际计算从系统起始日起;否则从票自身起始日起。
  const computeFrom = earlyStart ? SYSTEM_START_DATE : params.startDate
  const dates = sourceDates.filter(
    (date) => date >= computeFrom && date <= params.endDate,
  )
  const coreParams: CoreTrackingParams = {
    initialShares: params.initialShares,
    initialCash: params.initialCash,
    price: params.price,
    spread: params.spread,
    lotCost: params.lotCost,
    hiddenTradingDays: params.hiddenTradingDays,
  }

  const coreRows = buildCoreTrackingRows(coreParams, dates)

  if (!earlyStart) {
    return coreRows
  }

  // 早于系统起始日:所选日作为初始基准首行(基本信息),系统起始日起为首个实际计算日。
  return [buildInitialSnapshotRow(params.startDate, params), ...coreRows]
}

export function buildComparisonRows(
  rows: readonly TrackingRow[],
  actualEntries: Record<string, ActualPositionEntry>,
): TrackingComparisonRow[] {
  const lastDate = rows[rows.length - 1]?.date ?? ''
  let cumulativeCashGained = 0

  return rows.map((row, currentIndex) => {
    const entry = actualEntries[row.date]
    const dailyGain = entry?.dailyCashGained ?? null
    if (dailyGain !== null) {
      cumulativeCashGained = roundMoney(cumulativeCashGained + dailyGain)
    }

    if (!entry) {
      return {
        ...row,
        actualShares: null,
        actualCash: null,
        cashDelta: null,
        dailyCashGained: null,
        cumulativeCashGained,
        closePrice: null,
        actualTotalAssets: null,
        shareDiff: null,
        assetDiff: null,
        targetMatchedDate: '',
        progressDelta: '',
        totalAssetRatio: null,
      }
    }

    const actualTotalAssets = roundMoney(
      entry.actualShares * entry.closePrice + entry.actualCash,
    )
    const matchedIndex = findMatchedIndexByAssets(rows, actualTotalAssets)

    return {
      ...row,
      actualShares: entry.actualShares,
      actualCash: entry.actualCash,
      cashDelta: roundMoney(entry.actualCash - row.targetCash),
      dailyCashGained: dailyGain,
      cumulativeCashGained,
      closePrice: entry.closePrice,
      actualTotalAssets,
      shareDiff: entry.actualShares - row.targetShares,
      assetDiff: roundMoney(actualTotalAssets - row.targetAssets),
      targetMatchedDate:
        matchedIndex >= 0
          ? rows[matchedIndex].date
          : `超出范围（最后日期 ${lastDate}）`,
      progressDelta:
        matchedIndex >= 0
          ? buildProgressDelta(currentIndex, matchedIndex)
          : '超前超出范围',
      totalAssetRatio:
        row.targetAssets > 0
          ? roundMoney((actualTotalAssets / row.targetAssets) * 100)
          : null,
    }
  })
}
