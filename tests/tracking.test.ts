import { describe, expect, it } from 'vitest'
import {
  buildComparisonRows,
  buildRows,
  SYSTEM_START_DATE,
  type ActualPositionEntry,
  type TrackingParams,
  type TrackingRow,
} from '../src/lib/tracking'

const DATE_RANGE = ['2026.09.07', '2026.09.08', '2026.09.09']

describe('buildRows', () => {
  it('filters rows by endDate when source dates are provided', () => {
    const params: TrackingParams = {
      startDate: '2026.09.07',
      initialShares: 2600,
      initialCash: 1376.18,
      price: 40.2,
      spread: 0.5,
      lotCost: 4020,
      hiddenTradingDays: 0,
      endDate: '2026.09.08',
    }

    const rows = buildRows(params, DATE_RANGE)

    expect(rows).toHaveLength(2)
    expect(rows[0].date).toBe('2026.09.07')
    expect(rows[1].date).toBe('2026.09.08')
  })

  it('treats a start date before SYSTEM_START_DATE as an initial snapshot row, then computes from the system start date', () => {
    const earlyRange = [
      '2026.07.01',
      '2026.07.02',
      '2026.07.03',
      '2026.08.17',
      '2026.08.18',
      '2026.08.31',
      '2026.09.07',
      '2026.09.08',
    ]
    const params: TrackingParams = {
      startDate: '2026.07.03',
      initialShares: 2600,
      initialCash: 1376.18,
      price: 40.2,
      spread: 0.5,
      lotCost: 4020,
      hiddenTradingDays: 0,
      endDate: '2026.09.08',
    }

    const rows = buildRows(params, earlyRange)

    // 快照首行(基准日 07.03) + 系统起始日(09.07)起两个计算日。
    expect(rows).toHaveLength(3)
    expect(SYSTEM_START_DATE).toBe('2026.09.07')

    // 首行 = 初始基准快照(基本信息,不做 T、不买入)。
    expect(rows[0]).toMatchObject({
      index: 0,
      date: '2026.07.03',
      targetShares: 2600,
      tProfit: 0,
      targetCash: 1376.18,
      targetAssets: 105896.18,
      lotsBought: 0,
    })

    // 第二行起为实际计算日,首个计算日为系统起始日(9.07)。
    expect(rows[1]).toMatchObject({
      date: '2026.09.07',
      targetShares: 2600,
      tProfit: 1300,
      targetCash: 2676.18,
      targetAssets: 107196.18,
      lotsBought: 0,
    })
    expect(rows[2].date).toBe('2026.09.08')
  })

  it('firstDate 参数决定计算起点:首日后移则实际计算日顺延(早于首日只留基准快照)', () => {
    const params: TrackingParams = {
      startDate: '2026.08.12',
      initialShares: 2600,
      initialCash: 1376.18,
      price: 40.2,
      spread: 0.5,
      lotCost: 4020,
      hiddenTradingDays: 0,
      endDate: '2026.08.14',
    }
    const range = ['2026.08.12', '2026.08.13', '2026.08.14']

    // 显式首日 = 08.12:startDate 不早于首日,直接从 08.12 起算,3 个计算日。
    const baseline = buildRows(params, range, '2026.08.12')
    expect(baseline).toHaveLength(3)
    expect(baseline[0].date).toBe('2026.08.12')
    expect(baseline.every((r) => r.index > 0)).toBe(true)

    // 首日设到 08.13:startDate(08.12) 早于首日 → 08.12 退化为初始基准快照(index=0,不做 T),
    // 实际计算日(index>0)从 08.13 起。
    const shifted = buildRows(params, range, '2026.08.13')
    expect(shifted[0]).toMatchObject({ index: 0, date: '2026.08.12', tProfit: 0 })
    const computeRows = shifted.filter((r) => r.index > 0)
    expect(computeRows.map((r) => r.date)).toEqual(['2026.08.13', '2026.08.14'])
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
