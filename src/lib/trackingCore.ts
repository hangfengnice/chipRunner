export interface CoreTrackingParams {
  initialShares: number
  initialCash: number
  price: number
  spread: number
  lotCost: number
  hiddenTradingDays: number
}

export interface CoreTrackingSnapshot {
  tProfit: number
  lotsBought: number
  targetCash: number
  targetAssets: number
  targetShares: number
}

export interface CoreTrackingRow extends CoreTrackingSnapshot {
  index: number
  date: string
}

interface TrackingState {
  shares: number
  cash: number
}

export const roundMoney = (value: number) => Number(value.toFixed(2))

const isValidCoreTrackingParams = (params: CoreTrackingParams) =>
  !(
    params.initialShares < 0 ||
    params.initialCash < 0 ||
    params.price <= 0 ||
    params.spread < 0 ||
    params.lotCost <= 0 ||
    params.hiddenTradingDays < 0
  )

const runOneTradingDay = (
  state: TrackingState,
  params: Pick<CoreTrackingParams, 'spread' | 'lotCost' | 'price'>,
): CoreTrackingSnapshot => {
  const tProfit = roundMoney(state.shares * params.spread)
  state.cash = roundMoney(state.cash + tProfit)

  const lotsBought = Math.floor(state.cash / params.lotCost)
  if (lotsBought > 0) {
    state.shares += lotsBought * 100
    state.cash = roundMoney(state.cash - lotsBought * params.lotCost)
  }

  return {
    tProfit,
    lotsBought,
    targetCash: state.cash,
    targetAssets: roundMoney(state.shares * params.price + state.cash),
    targetShares: state.shares,
  }
}

export function buildCoreTrackingRows(
  params: CoreTrackingParams,
  sourceDates: readonly string[],
): CoreTrackingRow[] {
  if (!isValidCoreTrackingParams(params) || sourceDates.length === 0) {
    return []
  }

  const state: TrackingState = {
    shares: Math.trunc(params.initialShares),
    cash: roundMoney(params.initialCash),
  }

  for (let day = 0; day < params.hiddenTradingDays; day += 1) {
    runOneTradingDay(state, params)
  }

  return sourceDates.map((date, index) => {
    const snapshot = runOneTradingDay(state, params)

    return {
      index: index + 1,
      date,
      ...snapshot,
    }
  })
}

export const findMatchedIndexByAssets = (
  rows: readonly { targetAssets: number }[],
  totalAssets: number,
) => rows.findIndex((row) => row.targetAssets >= totalAssets)

export const buildProgressDelta = (
  currentIndex: number,
  matchedIndex: number,
) => {
  const dayDiff = matchedIndex - currentIndex

  if (dayDiff > 0) {
    return `提前${dayDiff}天`
  }

  if (dayDiff < 0) {
    return `落后${Math.abs(dayDiff)}天`
  }

  return '正好当天'
}
