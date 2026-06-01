export interface YearScopeCalendarLike {
  dateFrom: string
  dateTo: string
}

interface ResolveScopeEndDateOptions {
  scope: string
  currentEndDate: string
  availableDateTo: string
  calendarByYear: ReadonlyMap<number, YearScopeCalendarLike>
}

export const resolveScopeEndDate = ({
  scope,
  currentEndDate,
  availableDateTo,
  calendarByYear,
}: ResolveScopeEndDateOptions) => {
  if (scope === 'all') {
    return availableDateTo
  }

  const calendar = calendarByYear.get(Number(scope))
  if (!calendar) {
    return currentEndDate
  }

  return calendar.dateTo > currentEndDate ? calendar.dateTo : currentEndDate
}
