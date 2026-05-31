import { describe, expect, it } from 'vitest'
import { ALL_TRADING_DATES } from '../src/data/sources'
import {
  buildComparisonRows,
  buildRows,
  DEFAULT_PARAMS,
  type ActualPositionEntry,
  type TrackingParams,
  type TrackingRow,
} from '../src/lib/tracking'

const DATE_RANGE = ['2026.06.01', '2026.06.02', '2026.06.03']

describe('buildRows', () => {
  it('filters rows by endDate when source dates are provided', () => {
    const params: TrackingParams = {
      initialShares: 4900,
      initialCash: 2313.83,
      price: 25.35,
      spread: 0.4,
      lotCost: 2535,
      hiddenTradingDays: 0,
      endDate: '2026.06.02',
    }

    const rows = buildRows(params, DATE_RANGE)

    expect(rows).toHaveLength(2)
    expect(rows[0].date).toBe('2026.06.01')
    expect(rows[1].date).toBe('2026.06.02')
  })

  it('keeps accumulating continuously when the end date crosses into a new year', () => {
    const rows = buildRows(
      {
        ...DEFAULT_PARAMS,
        endDate: '2027.01.05',
      },
      ALL_TRADING_DATES,
    )

    expect(rows).toHaveLength(149)
    expect(rows.slice(-4)).toEqual([
      {
        index: 146,
        date: '2026.12.30',
        tProfit: 19160,
        lotsBought: 8,
        targetCash: 23.83,
        targetAssets: 1234568.83,
        targetShares: 48700,
      },
      {
        index: 147,
        date: '2026.12.31',
        tProfit: 19480,
        lotsBought: 7,
        targetCash: 1758.83,
        targetAssets: 1254048.83,
        targetShares: 49400,
      },
      {
        index: 148,
        date: '2027.01.04',
        tProfit: 19760,
        lotsBought: 8,
        targetCash: 1238.83,
        targetAssets: 1273808.83,
        targetShares: 50200,
      },
      {
        index: 149,
        date: '2027.01.05',
        tProfit: 20080,
        lotsBought: 8,
        targetCash: 1038.83,
        targetAssets: 1293888.83,
        targetShares: 51000,
      },
    ])
  })
})

describe('buildComparisonRows', () => {
  const baseRows: TrackingRow[] = [
    {
      index: 1,
      date: '2026.06.01',
      targetShares: 5000,
      tProfit: 1960,
      targetCash: 1738.83,
      targetAssets: 128488.83,
      lotsBought: 1,
    },
    {
      index: 2,
      date: '2026.06.02',
      targetShares: 5100,
      tProfit: 2000,
      targetCash: 1203.83,
      targetAssets: 130488.83,
      lotsBought: 1,
    },
    {
      index: 3,
      date: '2026.06.03',
      targetShares: 5200,
      tProfit: 2040,
      targetCash: 708.83,
      targetAssets: 132528.83,
      lotsBought: 1,
    },
  ]

  it('calculates deltas and progress text for matched actual assets', () => {
    const entries: Record<string, ActualPositionEntry> = {
      '2026.06.02': {
        date: '2026.06.02',
        actualShares: 5100,
        actualCash: 1500,
        closePrice: 25.35,
      },
    }

    const rows = buildComparisonRows(baseRows, entries)

    expect(rows[0].actualShares).toBeNull()
    expect(rows[1]).toMatchObject({
      actualShares: 5100,
      actualCash: 1500,
      cashDelta: 296.17,
      actualTotalAssets: 130785,
      shareDiff: 0,
      assetDiff: 296.17,
      targetMatchedDate: '2026.06.03',
      progressDelta: '提前1天',
    })
    expect(rows[1].totalAssetRatio).toBeCloseTo(100.23, 6)
  })

  it('marks out-of-range assets as ahead of table range', () => {
    const entries: Record<string, ActualPositionEntry> = {
      '2026.06.03': {
        date: '2026.06.03',
        actualShares: 8000,
        actualCash: 5000,
        closePrice: 25.35,
      },
    }

    const rows = buildComparisonRows(baseRows, entries)

    expect(rows[2].targetMatchedDate).toBe('超出范围（最后日期 2026.06.03）')
    expect(rows[2].progressDelta).toBe('超前超出范围')
  })
})
