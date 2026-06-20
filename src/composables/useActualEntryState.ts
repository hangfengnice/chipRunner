import { ElMessage } from 'element-plus'
import { computed, reactive, watch, type ComputedRef, type Ref } from 'vue'
import {
  removeAccountEntry,
  setAccountEntry,
  type Account,
  type AppState,
} from '../lib/accountState'
import {
  DEFAULT_PARAMS,
  type ActualPositionEntry,
  type TrackingRow,
} from '../lib/tracking'
import { roundMoney } from '../lib/trackingCore'

export interface ActualEntryDraft {
  date: string
  actualShares: number | null
  actualCash: number | null
  closePrice: number | null
  dailyCashGained: number | null
}

interface UseActualEntryStateOptions {
  account: Ref<Account | undefined>
  state: Ref<AppState>
  onStateChange: (next: AppState) => void
  rows: ComputedRef<TrackingRow[]>
  getDefaultPrice: () => number
}

const normalizeShares = (value: number) => Math.trunc(value)

const pickEarliestDate = (
  dates: readonly string[],
  fallback: string,
) => {
  if (!dates.length) return fallback
  return [...dates].sort()[0] ?? fallback
}

export function useActualEntryState(options: UseActualEntryStateOptions) {
  const { account, state, onStateChange, rows, getDefaultPrice } = options

  const actualEntryForm = reactive<ActualEntryDraft>({
    date: account.value?.params.startDate ?? DEFAULT_PARAMS.startDate,
    actualShares: null,
    actualCash: null,
    closePrice: getDefaultPrice(),
    dailyCashGained: null,
  })

  const actualEntries = computed<Record<string, ActualPositionEntry>>(
    () => account.value?.actualEntries ?? {},
  )

  const savedEntryCount = computed(
    () => Object.keys(actualEntries.value).length,
  )

  const hasSavedActualEntry = computed(() => {
    const date = actualEntryForm.date
    if (!date) return false
    return Boolean(actualEntries.value[date])
  })

  const hydrateActualEntryForm = (date: string) => {
    const saved = actualEntries.value[date]
    if (saved) {
      actualEntryForm.actualShares = saved.actualShares
      actualEntryForm.actualCash = saved.actualCash
      actualEntryForm.closePrice = saved.closePrice
      actualEntryForm.dailyCashGained = saved.dailyCashGained ?? null
      return
    }

    const targetRow = rows.value.find((row) => row.date === date)
    actualEntryForm.actualShares = targetRow?.targetShares ?? null
    actualEntryForm.actualCash = null
    actualEntryForm.closePrice = getDefaultPrice()
    actualEntryForm.dailyCashGained = null
  }

  // When the active account changes, switch the form to its earliest entry date.
  let previousAccountId: string | undefined = account.value?.id
  watch(
    () => account.value?.id,
    (id) => {
      if (id === previousAccountId) return
      previousAccountId = id
      const entries = Object.keys(actualEntries.value)
      const firstRow = rows.value[0]
      const fallback = firstRow?.date ?? DEFAULT_PARAMS.startDate
      actualEntryForm.date = pickEarliestDate(
        entries.length > 0 ? entries : [fallback],
        fallback,
      )
      hydrateActualEntryForm(actualEntryForm.date)
    },
    { immediate: true },
  )

  // When the form date changes manually, hydrate the entry fields.
  watch(
    () => actualEntryForm.date,
    (date) => {
      if (!date) return
      hydrateActualEntryForm(date)
    },
  )

  const saveActualEntry = () => {
    const target = account.value
    if (!target) {
      ElMessage.warning('当前没有选中票')
      return
    }

    if (!rows.value.some((row) => row.date === actualEntryForm.date)) {
      ElMessage.warning('当前录入日期不在计算区间内，请先调整截止日期')
      return
    }

    if (
      actualEntryForm.actualShares === null ||
      actualEntryForm.actualCash === null ||
      actualEntryForm.closePrice === null
    ) {
      ElMessage.warning('请完整录入当前股数、当前现金和收盘价后再保存')
      return
    }

    const entry: ActualPositionEntry = {
      date: actualEntryForm.date,
      actualShares: normalizeShares(actualEntryForm.actualShares),
      actualCash: roundMoney(actualEntryForm.actualCash),
      closePrice: roundMoney(actualEntryForm.closePrice),
      dailyCashGained:
        actualEntryForm.dailyCashGained === null
          ? null
          : roundMoney(actualEntryForm.dailyCashGained),
    }

    onStateChange(setAccountEntry(state.value, target.id, entry))
    ElMessage.success(`已写回 ${actualEntryForm.date} 的实盘记录`)
  }

  const clearActualEntry = () => {
    const target = account.value
    if (!target) return

    if (!actualEntries.value[actualEntryForm.date]) {
      ElMessage.info('当前日期还没有已写回的实盘记录')
      return
    }

    onStateChange(
      removeAccountEntry(state.value, target.id, actualEntryForm.date),
    )
    ElMessage.success(`已清除 ${actualEntryForm.date} 的实盘记录`)
  }

  return {
    actualEntryForm,
    clearActualEntry,
    hasSavedActualEntry,
    saveActualEntry,
    savedEntryCount,
  }
}
