import calendar2026 from '../../data/calendar/2026-remaining-trading-dates.json'
import calendar2027 from '../../data/calendar/2027-estimated-trading-dates.json'
import calendar2028 from '../../data/calendar/2028-estimated-trading-dates.json'
import calendar2029 from '../../data/calendar/2029-estimated-trading-dates.json'
import calendar2030 from '../../data/calendar/2030-estimated-trading-dates.json'

export interface CalendarRow {
  index: number
  date: string
  month: string
}

export interface CalendarYearData {
  sourceFile: string
  title: string
  year: number
  dateFrom: string
  dateTo: string
  totalTradingDays: number
  holidaysExcluded: string[]
  dates: string[]
  months: Record<string, string[]>
  rows: CalendarRow[]
}

const normalizeUniqueSortedDates = (dates: string[]) =>
  Array.from(new Set(dates)).sort((left, right) => left.localeCompare(right))

export const CALENDAR_2026 = calendar2026 as CalendarYearData
export const CALENDAR_2027 = calendar2027 as CalendarYearData
export const CALENDAR_2028 = calendar2028 as CalendarYearData
export const CALENDAR_2029 = calendar2029 as CalendarYearData
export const CALENDAR_2030 = calendar2030 as CalendarYearData

export const CALENDAR_YEARS: CalendarYearData[] = [
  CALENDAR_2026,
  CALENDAR_2027,
  CALENDAR_2028,
  CALENDAR_2029,
  CALENDAR_2030,
].sort((left, right) => left.year - right.year)

export const CALENDAR_BY_YEAR = new Map(
  CALENDAR_YEARS.map((calendar) => [calendar.year, calendar]),
)

export const TRADING_DATES_2026 = CALENDAR_2026.dates
export const ALL_TRADING_DATES = normalizeUniqueSortedDates(
  CALENDAR_YEARS.flatMap((calendar) => calendar.dates),
)
export const ALL_TRADING_DATE_FROM =
  ALL_TRADING_DATES[0] ?? CALENDAR_2026.dateFrom
export const ALL_TRADING_DATE_TO =
  ALL_TRADING_DATES[ALL_TRADING_DATES.length - 1] ?? CALENDAR_2026.dateTo
