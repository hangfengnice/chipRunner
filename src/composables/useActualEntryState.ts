import { ElMessage } from 'element-plus'
import {
  computed,
  onMounted,
  reactive,
  ref,
  watch,
  type ComputedRef,
} from 'vue'
import {
  type ActualEntriesPayload,
  deleteActualEntryFromFile,
  fetchActualEntries,
  saveActualEntryToFile,
} from '../lib/actualEntriesApi'
import { type ActualPositionEntry, type TrackingRow } from '../lib/tracking'

export interface ActualEntryDraft {
  date: string
  actualShares: number | null
  actualCash: number | null
  closePrice: number | null
}

interface UseActualEntryStateOptions {
  availableDateFrom: string
  rows: ComputedRef<TrackingRow[]>
  getDefaultPrice: () => number
}

const roundMoney = (value: number) => Number(value.toFixed(2))
const normalizeShares = (value: number) => Math.trunc(value)

export function useActualEntryState(options: UseActualEntryStateOptions) {
  const actualEntries = ref<Record<string, ActualPositionEntry>>({})
  const actualEntryForm = reactive<ActualEntryDraft>({
    date: options.availableDateFrom,
    actualShares: null,
    actualCash: null,
    closePrice: options.getDefaultPrice(),
  })
  const actualEntriesUpdatedAt = ref<string | null>(null)
  const isLoadingActualEntries = ref(false)
  const isSavingActualEntry = ref(false)

  const savedEntryCount = computed(
    () => Object.keys(actualEntries.value).length,
  )
  const hasSavedActualEntry = computed(() =>
    Boolean(actualEntries.value[actualEntryForm.date]),
  )

  const hydrateActualEntryForm = (date: string) => {
    const saved = actualEntries.value[date]
    if (saved) {
      actualEntryForm.actualShares = saved.actualShares
      actualEntryForm.actualCash = saved.actualCash
      actualEntryForm.closePrice = saved.closePrice
      return
    }

    const targetRow = options.rows.value.find((row) => row.date === date)
    actualEntryForm.actualShares = targetRow?.targetShares ?? null
    actualEntryForm.actualCash = null
    actualEntryForm.closePrice = options.getDefaultPrice()
  }

  watch(
    options.rows,
    (nextRows) => {
      if (!nextRows.length) {
        return
      }

      if (!nextRows.some((row) => row.date === actualEntryForm.date)) {
        actualEntryForm.date = nextRows[nextRows.length - 1].date
      }
    },
    { immediate: true },
  )

  watch(
    () => actualEntryForm.date,
    (date) => {
      if (!date) {
        return
      }

      hydrateActualEntryForm(date)
    },
    { immediate: true },
  )

  const syncActualEntriesFromPayload = (
    entries: Record<string, ActualPositionEntry>,
    updatedAt: string | null,
  ) => {
    actualEntries.value = entries
    actualEntriesUpdatedAt.value = updatedAt
    hydrateActualEntryForm(actualEntryForm.date)
  }

  const loadActualEntries = async () => {
    isLoadingActualEntries.value = true

    try {
      const payload = await fetchActualEntries()
      syncActualEntriesFromPayload(payload.entries, payload.updatedAt)
    } catch (error) {
      const message =
        error instanceof Error ? error.message : '实盘记录读取失败'
      ElMessage.error(message)
    } finally {
      isLoadingActualEntries.value = false
    }
  }

  onMounted(() => {
    void loadActualEntries()
  })

  const saveActualEntry = () => {
    if (!options.rows.value.some((row) => row.date === actualEntryForm.date)) {
      ElMessage.warning('当前录入日期不在计算区间内，请先调整截止日期')
      return
    }

    if (
      actualEntryForm.actualShares === null ||
      actualEntryForm.actualCash === null ||
      actualEntryForm.closePrice === null
    ) {
      ElMessage.warning('请完整录入实盘股、实盘现和收盘价后再保存')
      return
    }

    isSavingActualEntry.value = true

    void saveActualEntryToFile({
      date: actualEntryForm.date,
      actualShares: normalizeShares(actualEntryForm.actualShares),
      actualCash: roundMoney(actualEntryForm.actualCash),
      closePrice: roundMoney(actualEntryForm.closePrice),
    })
      .then((payload: ActualEntriesPayload) => {
        syncActualEntriesFromPayload(payload.entries, payload.updatedAt)
        ElMessage.success(`已写回 ${actualEntryForm.date} 的实盘记录`)
      })
      .catch((error: unknown) => {
        const message =
          error instanceof Error ? error.message : '实盘记录写回失败'
        ElMessage.error(message)
      })
      .finally(() => {
        isSavingActualEntry.value = false
      })
  }

  const clearActualEntry = () => {
    if (!actualEntries.value[actualEntryForm.date]) {
      ElMessage.info('当前日期还没有已写回的实盘记录')
      return
    }

    isSavingActualEntry.value = true

    void deleteActualEntryFromFile(actualEntryForm.date)
      .then((payload: ActualEntriesPayload) => {
        syncActualEntriesFromPayload(payload.entries, payload.updatedAt)
        ElMessage.success(`已清除 ${actualEntryForm.date} 的实盘记录`)
      })
      .catch((error: unknown) => {
        const message =
          error instanceof Error ? error.message : '实盘记录清除失败'
        ElMessage.error(message)
      })
      .finally(() => {
        isSavingActualEntry.value = false
      })
  }

  return {
    actualEntries,
    actualEntriesUpdatedAt,
    actualEntryForm,
    clearActualEntry,
    hasSavedActualEntry,
    isLoadingActualEntries,
    isSavingActualEntry,
    loadActualEntries,
    saveActualEntry,
    savedEntryCount,
  }
}
