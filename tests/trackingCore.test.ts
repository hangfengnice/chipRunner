import { describe, expect, it } from 'vitest'
import {
  buildCoreTrackingRows,
  buildProgressDelta,
  findMatchedIndexByAssets,
  type CoreTrackingParams,
} from '../src/lib/trackingCore'

const BASE_PARAMS: CoreTrackingParams = {
  initialShares: 500,
  initialCash: 1650.3,
  price: 36.14,
  spread: 1.2,
  lotCost: 3614,
  hiddenTradingDays: 0,
}

const BASE_DATES = [
  '2026.06.15',
  '2026.06.16',
  '2026.06.17',
  '2026.06.18',
  '2026.06.22',
  '2026.06.23',
  '2026.06.24',
  '2026.06.25',
  '2026.06.26',
  '2026.06.29',
]

describe('buildCoreTrackingRows', () => {
  it('matches the draft baseline for the first row and latest sampled row', () => {
    const rows = buildCoreTrackingRows(BASE_PARAMS, BASE_DATES)

    expect(rows).toHaveLength(BASE_DATES.length)
    expect(rows[0]).toMatchObject({
      index: 1,
      date: '2026.06.15',
      targetShares: 500,
      tProfit: 600,
      targetCash: 2250.3,
      targetAssets: 20320.3,
      lotsBought: 0,
    })

    expect(rows[9]).toMatchObject({
      date: '2026.06.29',
      targetShares: 700,
      tProfit: 840,
      targetCash: 1262.3,
      targetAssets: 26560.3,
      lotsBought: 0,
    })
  })

  it('returns empty rows for invalid params', () => {
    const invalidParams: CoreTrackingParams = {
      ...BASE_PARAMS,
      price: 0,
    }

    expect(buildCoreTrackingRows(invalidParams, BASE_DATES)).toEqual([])
  })
})

describe('progress helpers', () => {
  it('finds matched index by target assets', () => {
    const rows = [
      { targetAssets: 100 },
      { targetAssets: 200 },
      { targetAssets: 350 },
    ]

    expect(findMatchedIndexByAssets(rows, 200)).toBe(1)
    expect(findMatchedIndexByAssets(rows, 201)).toBe(2)
    expect(findMatchedIndexByAssets(rows, 500)).toBe(-1)
  })

  it('builds readable progress delta text', () => {
    expect(buildProgressDelta(4, 6)).toBe('提前2天')
    expect(buildProgressDelta(6, 4)).toBe('落后2天')
    expect(buildProgressDelta(5, 5)).toBe('正好当天')
  })
})
