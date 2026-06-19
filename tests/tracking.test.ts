import { describe, expect, it } from 'vitest'
import {
  buildComparisonRows,
  buildRows,
  type ActualPositionEntry,
  type TrackingParams,
  type TrackingRow,
} from '../src/lib/tracking'

const DATE_RANGE = ['2026.06.03', '2026.06.04', '2026.06.05']

describe('buildRows', () => {
  it('filters rows by endDate when source dates are provided', () => {
    const params: TrackingParams = {
      startDate: '2026.06.03',
      initialShares: 2600,
      initialCash: 1376.18,
      price: 40.2,
      spread: 0.5,
      lotCost: 4020,
      hiddenTradingDays: 0,
      endDate: '2026.06.04',
    }

    const rows = buildRows(params, DATE_RANGE)

    expect(rows).toHaveLength(2)
    expect(rows[0].date).toBe('2026.06.03')
    expect(rows[1].date).toBe('2026.06.04')
  })
})

describe('buildComparisonRows', () => {
  const baseRows: TrackingRow[] = [
    {
      index: 1,
      date: '2026.06.03',
      targetShares: 2600,
      tProfit: 1300,
      targetCash: 2676.18,
      targetAssets: 107196.18,
      lotsBought: 0,
    },
    {
      index: 2,
      date: '2026.06.04',
      targetShares: 2600,
      tProfit: 1300,
      targetCash: 3976.18,
      targetAssets: 108496.18,
      lotsBought: 0,
    },
    {
      index: 3,
      date: '2026.06.05',
      targetShares: 2700,
      tProfit: 1300,
      targetCash: 1256.18,
      targetAssets: 109796.18,
      lotsBought: 1,
    },
  ]

  it('calculates deltas and progress text for matched actual assets', () => {
    const entries: Record<string, ActualPositionEntry> = {
      '2026.06.04': {
        date: '2026.06.04',
        actualShares: 2600,
        actualCash: 4200,
        closePrice: 40.2,
      },
    }

    const rows = buildComparisonRows(baseRows, entries)

    expect(rows[0].actualShares).toBeNull()
    expect(rows[1]).toMatchObject({
      actualShares: 2600,
      actualCash: 4200,
      cashDelta: 223.82,
      actualTotalAssets: 108720,
      shareDiff: 0,
      assetDiff: 223.82,
      targetMatchedDate: '2026.06.05',
      progressDelta: '提前1天',
    })
    expect(rows[1].totalAssetRatio).toBeCloseTo(100.21, 6)
  })

  it('marks out-of-range assets as ahead of table range', () => {
    const entries: Record<string, ActualPositionEntry> = {
      '2026.06.05': {
        date: '2026.06.05',
        actualShares: 8000,
        actualCash: 5000,
        closePrice: 40.2,
      },
    }

    const rows = buildComparisonRows(baseRows, entries)

    expect(rows[2].targetMatchedDate).toBe('超出范围（最后日期 2026.06.05）')
    expect(rows[2].progressDelta).toBe('超前超出范围')
  })

  it('keeps entries from different accounts fully isolated', () => {
    const accountA: Record<string, ActualPositionEntry> = {
      '2026.06.04': {
        date: '2026.06.04',
        actualShares: 2600,
        actualCash: 4200,
        closePrice: 40.2,
      },
    }
    const accountB: Record<string, ActualPositionEntry> = {}

    const rowsA = buildComparisonRows(baseRows, accountA)
    const rowsB = buildComparisonRows(baseRows, accountB)

    expect(rowsA[1]?.actualShares).toBe(2600)
    expect(rowsB[1]?.actualShares).toBeNull()
    expect(rowsA[0]?.actualShares).toBeNull()
    expect(rowsB[0]?.actualShares).toBeNull()
    expect(rowsB[1]?.cashDelta).toBeNull()
    expect(rowsB[1]?.progressDelta).toBe('')
  })
})
