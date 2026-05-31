import { TRADING_DATES_2026 } from '../data/sources'

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

const roundMoney = (value: number) => Number(value.toFixed(2))

export const syncLotCostFromPrice = (price: number) => roundMoney(price * 100)

export const DEFAULT_PARAMS: TrackingParams = {
  initialShares: 4400,
  initialCash: 128.83,
  price: 26,
  spread: 0.4,
  lotCost: 2600,
  hiddenTradingDays: 1,
  endDate: TRADING_DATES_2026[TRADING_DATES_2026.length - 1] ?? '2026.12.31',
}

export function buildRows(
  params: TrackingParams,
  sourceDates: readonly string[] = TRADING_DATES_2026,
): TrackingRow[] {
  if (
    params.initialShares < 0 ||
    params.initialCash < 0 ||
    params.price <= 0 ||
    params.spread < 0 ||
    params.lotCost <= 0 ||
    params.hiddenTradingDays < 0
  ) {
    return []
  }

  const dates = sourceDates.filter((date) => date <= params.endDate)
  if (dates.length === 0) {
    return []
  }

  let shares = Math.trunc(params.initialShares)
  let cash = roundMoney(params.initialCash)
  const lotCost = roundMoney(params.lotCost)

  const runOneTradingDay = () => {
    const tProfit = roundMoney(shares * params.spread)
    cash = roundMoney(cash + tProfit)

    const lotsBought = Math.floor(cash / lotCost)
    if (lotsBought > 0) {
      shares += lotsBought * 100
      cash = roundMoney(cash - lotsBought * lotCost)
    }

    return {
      tProfit,
      lotsBought,
      targetCash: cash,
      targetAssets: roundMoney(shares * params.price + cash),
      targetShares: shares,
    }
  }

  for (let day = 0; day < params.hiddenTradingDays; day += 1) {
    runOneTradingDay()
  }

  return dates.map((date, index) => {
    const snapshot = runOneTradingDay()

    return {
      index: index + 1,
      date,
      targetShares: snapshot.targetShares,
      tProfit: snapshot.tProfit,
      targetCash: snapshot.targetCash,
      targetAssets: snapshot.targetAssets,
      lotsBought: snapshot.lotsBought,
    }
  })
}

const findMatchedIndexByAssets = (
  rows: readonly TrackingRow[],
  totalAssets: number,
) => rows.findIndex((row) => row.targetAssets >= totalAssets)

const buildProgressDelta = (currentIndex: number, matchedIndex: number) => {
  const dayDiff = matchedIndex - currentIndex

  if (dayDiff > 0) {
    return `提前${dayDiff}天`
  }

  if (dayDiff < 0) {
    return `落后${Math.abs(dayDiff)}天`
  }

  return '正好当天'
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
