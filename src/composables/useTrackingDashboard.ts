import { computed, reactive, ref, watch, type Ref } from 'vue'
import {
  buildComparisonRows,
  buildRows,
  DEFAULT_PARAMS,
  syncLotCostFromPrice,
  type TrackingComparisonRow,
  type TrackingParams,
} from '../lib/tracking'
import {
  ALL_TRADING_DATE_TO,
  ALL_TRADING_DATES,
  CALENDAR_BY_YEAR,
  CALENDAR_YEARS,
} from '../data/sources'
import type { Account, AppState } from '../lib/accountState'
import { useActualEntryState } from './useActualEntryState'
import { resolveScopeEndDate } from '../lib/trackingYearScope'

export interface DisplayRangeDraft {
  dateFrom: string
  dateTo: string
}

export interface YearScopeOption {
  value: string
  label: string
}

export interface TrackingSummary {
  tradingDays: number
  buyDays: number
  firstBuyDate: string
  rangeFrom: string
  rangeTo: string
  lastDate: string
  lastShares: number
  lastCash: number
  lastAssets: number
}

const toIsoDate = (value: string) => value.replaceAll('.', '-')
const toDateTime = (value: string) =>
  new Date(`${toIsoDate(value)}T00:00:00`).getTime()

const formatCurrentDate = () => {
  const now = new Date()
  const year = now.getFullYear()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const day = String(now.getDate()).padStart(2, '0')

  return `${year}.${month}.${day}`
}

const pickNearestToToday = (
  dates: readonly string[],
  fallbackDate: string,
) => {
  if (!dates.length) {
    return fallbackDate
  }

  const today = formatCurrentDate()

  if (dates.includes(today)) {
    return today
  }

  for (let index = dates.length - 1; index >= 0; index -= 1) {
    const candidate = dates[index]
    if (candidate <= today) {
      return candidate
    }
  }

  return dates[0] ?? fallbackDate
}

const clampDateWithin = (value: string, min: string, max: string) => {
  if (value < min) {
    return min
  }

  if (value > max) {
    return max
  }

  return value
}

interface UseTrackingDashboardOptions {
  account: Ref<Account | undefined>
  state: Ref<AppState>
  onStateChange: (next: AppState) => void
}

export function useTrackingDashboard(options: UseTrackingDashboardOptions) {
  const { account, state, onStateChange } = options

  const form = reactive<TrackingParams>({
    ...DEFAULT_PARAMS,
  })

  const syncFormFromAccount = () => {
    const target = account.value
    if (!target) return
    Object.assign(form, target.params)
    clampEndDate()
  }

  const writeFormBackToAccount = () => {
    const target = account.value
    if (!target) return
    onStateChange({
      ...state.value,
      accounts: {
        ...state.value.accounts,
        [target.id]: {
          ...target,
          params: { ...form },
        },
      },
    })
  }

  const availableDateFrom = DEFAULT_PARAMS.startDate
  const availableDateTo = ALL_TRADING_DATE_TO
  const totalAvailableTradingDays = ALL_TRADING_DATES.filter(
    (date) => date >= availableDateFrom,
  ).length
  const firstCalendarYear = CALENDAR_YEARS[0]?.year
  const lastCalendarYear = CALENDAR_YEARS[CALENDAR_YEARS.length - 1]?.year
  const defaultYearScope = String(firstCalendarYear ?? 'all')

  const clampEndDate = () => {
    form.endDate = clampDateWithin(
      form.endDate,
      availableDateFrom,
      availableDateTo,
    )
  }

  clampEndDate()

  const showRecentOnly = ref(false)
  const selectedYearScope = ref(defaultYearScope)
  const displayRange = reactive<DisplayRangeDraft>({
    dateFrom: pickNearestToToday(
      ALL_TRADING_DATES.filter((date) => date >= availableDateFrom),
      availableDateFrom,
    ),
    dateTo: form.endDate,
  })

  const yearScopeOptions = computed<YearScopeOption[]>(() => {
    const allLabel = !firstCalendarYear
      ? '全部年份'
      : firstCalendarYear === lastCalendarYear
        ? `全部年份（${firstCalendarYear}）`
        : `全部年份（${firstCalendarYear}-${lastCalendarYear}）`

    return [
      {
        value: 'all',
        label: allLabel,
      },
      ...CALENDAR_YEARS.map((calendar) => ({
        value: String(calendar.year),
        label: `${calendar.year}（${calendar.totalTradingDays}日）`,
      })),
    ]
  })

  const titleYearRange = !firstCalendarYear
    ? 'Multi-Year'
    : firstCalendarYear === lastCalendarYear
      ? `${firstCalendarYear}`
      : `${firstCalendarYear}-${lastCalendarYear}`

  const rows = computed(() =>
    buildRows({ ...form }, ALL_TRADING_DATES),
  )

  const {
    actualEntryForm,
    clearActualEntry,
    hasSavedActualEntry,
    saveActualEntry,
    savedEntryCount,
  } = useActualEntryState({
    account,
    state,
    onStateChange,
    rows,
    getDefaultPrice: () => form.price,
  })

  const calculatedDateBounds = computed(() => {
    if (!rows.value.length) {
      return {
        min: availableDateFrom,
        max: availableDateFrom,
      }
    }

    return {
      min: rows.value[0].date,
      max: rows.value[rows.value.length - 1].date,
    }
  })

  const syncDisplayRangeWithinCalculated = () => {
    const { min, max } = calculatedDateBounds.value

    displayRange.dateFrom = clampDateWithin(displayRange.dateFrom, min, max)
    displayRange.dateTo = clampDateWithin(
      displayRange.dateTo,
      displayRange.dateFrom,
      max,
    )
  }

  const applyYearScope = (scope: string) => {
    const nextEndDate = resolveScopeEndDate({
      scope,
      currentEndDate: form.endDate,
      availableDateTo,
      calendarByYear: CALENDAR_BY_YEAR,
    })

    if (nextEndDate !== form.endDate) {
      form.endDate = nextEndDate
    }

    if (scope === 'all') {
      displayRange.dateFrom = calculatedDateBounds.value.min
      displayRange.dateTo = calculatedDateBounds.value.max
      syncDisplayRangeWithinCalculated()
      return
    }

    const calendar = CALENDAR_BY_YEAR.get(Number(scope))
    if (!calendar) {
      return
    }

    const { min, max } = calculatedDateBounds.value
    displayRange.dateFrom = clampDateWithin(calendar.dateFrom, min, max)
    displayRange.dateTo = clampDateWithin(
      calendar.dateTo,
      displayRange.dateFrom,
      max,
    )
  }

  const restorePreset = () => {
    Object.assign(form, DEFAULT_PARAMS)
    clampEndDate()
    selectedYearScope.value = defaultYearScope
    writeFormBackToAccount()
  }

  const syncLotCost = () => {
    form.lotCost = syncLotCostFromPrice(form.price)
    writeFormBackToAccount()
  }

  const comparisonRows = computed(() => {
    const entries = account.value?.actualEntries ?? {}
    return buildComparisonRows(rows.value, entries)
  })

  const rangedComparisonRows = computed(() =>
    comparisonRows.value.filter(
      (row) =>
        row.date >= displayRange.dateFrom && row.date <= displayRange.dateTo,
    ),
  )

  const visibleRows = computed(() => {
    if (!showRecentOnly.value) {
      return rangedComparisonRows.value
    }

    return rangedComparisonRows.value.slice(-10)
  })

  const summary = computed<TrackingSummary>(() => {
    const sourceRows = rangedComparisonRows.value
    const lastRow = sourceRows[sourceRows.length - 1]
    const firstRow = sourceRows[0]
    const buyDays = sourceRows.filter((row) => row.lotsBought > 0).length
    const firstBuyDate =
      sourceRows.find((row) => row.lotsBought > 0)?.date ?? '未触发买入'

    return {
      tradingDays: sourceRows.length,
      buyDays,
      firstBuyDate,
      rangeFrom: firstRow?.date ?? '--',
      rangeTo: lastRow?.date ?? '--',
      lastDate: lastRow?.date ?? '无可展示数据',
      lastShares: lastRow?.targetShares ?? 0,
      lastCash: lastRow?.targetCash ?? 0,
      lastAssets: lastRow?.targetAssets ?? 0,
    }
  })

  const selectedComparisonRow = computed<TrackingComparisonRow | null>(
    () =>
      comparisonRows.value.find((row) => row.date === actualEntryForm.date) ??
      null,
  )

  // When the selected account changes, rehydrate form from its params.
  watch(
    () => account.value?.id,
    () => {
      syncFormFromAccount()
    },
    { immediate: true },
  )

  // Persist form edits back into the account on every change.
  watch(
    () => ({ ...form }),
    () => {
      writeFormBackToAccount()
    },
    { deep: true },
  )

  watch(
    selectedYearScope,
    (scope) => {
      applyYearScope(scope)
    },
    { immediate: true },
  )

  watch(
    () => form.endDate,
    (nextEndDate) => {
      const clampedEndDate = clampDateWithin(
        nextEndDate,
        availableDateFrom,
        availableDateTo,
      )

      if (clampedEndDate !== nextEndDate) {
        form.endDate = clampedEndDate
        return
      }

      if (selectedYearScope.value === 'all') {
        displayRange.dateTo = clampedEndDate
      } else if (displayRange.dateTo > clampedEndDate) {
        displayRange.dateTo = clampedEndDate
      }

      if (displayRange.dateFrom > displayRange.dateTo) {
        displayRange.dateFrom = displayRange.dateTo
      }
    },
  )

  watch(
    () => displayRange.dateFrom,
    () => {
      syncDisplayRangeWithinCalculated()
    },
  )

  watch(
    () => displayRange.dateTo,
    () => {
      syncDisplayRangeWithinCalculated()
    },
  )

  watch(
    rows,
    (nextRows) => {
      if (!nextRows.length) {
        return
      }
      syncDisplayRangeWithinCalculated()
    },
    { immediate: true },
  )

  const disableOutsideAvailableRange = (date: Date) => {
    const time = date.getTime()
    const minTime = toDateTime(availableDateFrom)
    const maxTime = toDateTime(availableDateTo)

    return time < minTime || time > maxTime
  }

  const disableOutsideCalculatedRange = (date: Date) => {
    const time = date.getTime()
    const minTime = toDateTime(calculatedDateBounds.value.min)
    const maxTime = toDateTime(calculatedDateBounds.value.max)

    return time < minTime || time > maxTime
  }

  const disableDisplayDateFrom = (date: Date) => {
    const time = date.getTime()
    const minTime = toDateTime(calculatedDateBounds.value.min)
    const maxTime = toDateTime(displayRange.dateTo)

    return time < minTime || time > maxTime
  }

  const disableDisplayDateTo = (date: Date) => {
    const time = date.getTime()
    const minTime = toDateTime(displayRange.dateFrom)
    const maxTime = toDateTime(calculatedDateBounds.value.max)

    return time < minTime || time > maxTime
  }

  return {
    form,
    availableDateFrom,
    availableDateTo,
    disableDisplayDateFrom,
    disableDisplayDateTo,
    disableOutsideAvailableRange,
    disableOutsideCalculatedRange,
    displayRange,
    restorePreset,
    selectedComparisonRow,
    selectedYearScope,
    showRecentOnly,
    summary,
    syncLotCost,
    titleYearRange,
    totalAvailableTradingDays,
    visibleRows,
    yearScopeOptions,
    actualEntryForm,
    clearActualEntry,
    hasSavedActualEntry,
    saveActualEntry,
    savedEntryCount,
  }
}
