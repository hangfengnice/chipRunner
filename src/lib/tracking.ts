import { ALL_TRADING_DATES, TRADING_DATES_2026 } from '../data/sources'
import {
  buildCoreTrackingRows,
  buildProgressDelta,
  findMatchedIndexByAssets,
  roundMoney,
  type CoreTrackingParams,
} from './trackingCore'

export interface TrackingParams {
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
}

export interface TrackingComparisonRow extends TrackingRow {
  actualShares: number | null
  actualCash: number | null
  cashDelta: number | null
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
  initialShares: 4900,
  initialCash: 2313.83,
  price: 25.35,
  spread: 0.4,
  lotCost: 2535,
  hiddenTradingDays: 0,
  endDate: TRADING_DATES_2026[TRADING_DATES_2026.length - 1] ?? '2026.12.31',
}

export function buildRows(
  params: TrackingParams,
  sourceDates: readonly string[] = ALL_TRADING_DATES,
): TrackingRow[] {
  const dates = sourceDates.filter((date) => date <= params.endDate)
  const coreParams: CoreTrackingParams = {
    initialShares: params.initialShares,
    initialCash: params.initialCash,
    price: params.price,
    spread: params.spread,
    lotCost: params.lotCost,
    hiddenTradingDays: params.hiddenTradingDays,
  }

  return buildCoreTrackingRows(coreParams, dates)
}

export function buildComparisonRows(
  rows: readonly TrackingRow[],
  actualEntries: Record<string, ActualPositionEntry>,
): TrackingComparisonRow[] {
  const lastDate = rows[rows.length - 1]?.date ?? ''

  return rows.map((row, currentIndex) => {
    const entry = actualEntries[row.date]

    if (!entry) {
      return {
        ...row,
        actualShares: null,
        actualCash: null,
        cashDelta: null,
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
