import calendar2026 from '../../data/calendar/2026-remaining-trading-dates.json'
import legacyTracking20262028 from '../../data/tracking/2026-2028-tracking-total-table.json'

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

export interface TrackingTableParams {
  startDate: string
  initialShares: number
  initialCash: number
  price: number
  spread: number
  lotCost: number
}

export interface TrackingTableRow {
  date: string
  targetShares: number
  tProfit: number
  targetCash: number
  targetAssets: number
  actualShares: number | null
  actualCash: number | null
  cashDelta: string
  closePrice: number | null
  actualTotalAssets: number | null
  shareDiff: string
  assetDiff: string
  targetMatchedDate: string
  progressDelta: string
  totalAssetRatio: string
}

export interface TrackingTableData {
  sourceFile: string
  headers: string[]
  params: TrackingTableParams
  dateFrom: string
  dateTo: string
  rowCount: number
  rows: TrackingTableRow[]
}

export const CALENDAR_2026 = calendar2026 as CalendarYearData
export const LEGACY_TRACKING_2026_2028 =
  legacyTracking20262028 as TrackingTableData
export const TRADING_DATES_2026 = CALENDAR_2026.dates
