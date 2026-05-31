import { describe, expect, it } from 'vitest'
import {
  buildCoreTrackingRows,
  buildProgressDelta,
  findMatchedIndexByAssets,
  type CoreTrackingParams,
} from '../src/lib/trackingCore'

const BASE_PARAMS: CoreTrackingParams = {
  initialShares: 4900,
  initialCash: 2313.83,
  price: 25.35,
  spread: 0.4,
  lotCost: 2535,
  hiddenTradingDays: 0,
}

const BASE_DATES = [
  '2026.06.01',
  '2026.06.02',
  '2026.06.03',
  '2026.06.04',
  '2026.06.05',
  '2026.06.08',
  '2026.06.09',
  '2026.06.10',
  '2026.06.11',
  '2026.06.12',
]

describe('buildCoreTrackingRows', () => {
  it('matches the draft baseline for the first row and latest sampled row', () => {
    const rows = buildCoreTrackingRows(BASE_PARAMS, BASE_DATES)

    expect(rows).toHaveLength(BASE_DATES.length)
    expect(rows[0]).toMatchObject({
      index: 1,
      date: '2026.06.01',
      targetShares: 5000,
      tProfit: 1960,
      targetCash: 1738.83,
      targetAssets: 128488.83,
      lotsBought: 1,
    })

    expect(rows[9]).toMatchObject({
      date: '2026.06.12',
      targetShares: 5800,
      tProfit: 2280,
      targetCash: 698.83,
      targetAssets: 147728.83,
      lotsBought: 1,
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
