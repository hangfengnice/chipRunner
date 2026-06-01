import { describe, expect, it } from 'vitest'
import { resolveScopeEndDate } from '../src/lib/trackingYearScope'

const CALENDAR_BY_YEAR = new Map([
  [2026, { dateFrom: '2026.06.01', dateTo: '2026.12.31' }],
  [2027, { dateFrom: '2027.01.04', dateTo: '2027.12.31' }],
  [2028, { dateFrom: '2028.01.03', dateTo: '2028.12.29' }],
])

describe('resolveScopeEndDate', () => {
  it('expands all-year scope to the last available trading date', () => {
    expect(
      resolveScopeEndDate({
        scope: 'all',
        currentEndDate: '2026.12.31',
        availableDateTo: '2028.12.29',
        calendarByYear: CALENDAR_BY_YEAR,
      }),
    ).toBe('2028.12.29')
  })

  it('keeps later accumulated end dates when switching back to an earlier year', () => {
    expect(
      resolveScopeEndDate({
        scope: '2026',
        currentEndDate: '2028.12.29',
        availableDateTo: '2028.12.29',
        calendarByYear: CALENDAR_BY_YEAR,
      }),
    ).toBe('2028.12.29')
  })
})
