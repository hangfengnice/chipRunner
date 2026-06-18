import { describe, expect, it } from 'vitest'
import {
  ALL_TRADING_DATE_FROM,
  ALL_TRADING_DATE_TO,
  ALL_TRADING_DATES,
  CALENDAR_BY_YEAR,
  CALENDAR_YEARS,
} from '../src/data/sources'

describe('ALL_TRADING_DATES integrity', () => {
  it('is non-empty and starts no earlier than the earliest calendar date', () => {
    expect(ALL_TRADING_DATES.length).toBeGreaterThan(0)
    const earliestCalendarDate = CALENDAR_YEARS.reduce(
      (min, calendar) => (calendar.dateFrom < min ? calendar.dateFrom : min),
      CALENDAR_YEARS[0]!.dateFrom,
    )
    expect(ALL_TRADING_DATE_FROM).toBe(earliestCalendarDate)
    expect(ALL_TRADING_DATES[0]).toBe(earliestCalendarDate)
  })

  it('is sorted in ascending order', () => {
    const sorted = [...ALL_TRADING_DATES].sort()
    expect(ALL_TRADING_DATES).toEqual(sorted)
  })

  it('contains no duplicates', () => {
    expect(new Set(ALL_TRADING_DATES).size).toBe(ALL_TRADING_DATES.length)
  })

  it('ends at the latest calendar date', () => {
    const latestCalendarDate = CALENDAR_YEARS.reduce(
      (max, calendar) => (calendar.dateTo > max ? calendar.dateTo : max),
      CALENDAR_YEARS[0]!.dateTo,
    )
    expect(ALL_TRADING_DATE_TO).toBe(latestCalendarDate)
    expect(ALL_TRADING_DATES[ALL_TRADING_DATES.length - 1]).toBe(
      latestCalendarDate,
    )
  })

  it('only contains dates from the imported calendars', () => {
    const allowed = new Set<string>()
    for (const calendar of CALENDAR_YEARS) {
      for (const date of calendar.dates) {
        allowed.add(date)
      }
    }

    const orphans = ALL_TRADING_DATES.filter((date) => !allowed.has(date))
    expect(orphans).toEqual([])
  })

  it('each calendar year is addressable via CALENDAR_BY_YEAR', () => {
    for (const calendar of CALENDAR_YEARS) {
      expect(CALENDAR_BY_YEAR.get(calendar.year)).toBe(calendar)
    }
  })

  it('starts at or after 2026.06.08', () => {
    // Defensive: guard against an accidental backfill of pre-cutoff dates.
    expect(ALL_TRADING_DATE_FROM >= '2026.06.08').toBe(true)
  })
})
