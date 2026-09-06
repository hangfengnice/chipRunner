import { computed, nextTick, ref, watch } from 'vue'
import { ElMessage } from 'element-plus'
import {
  createAccount,
  createSeedState,
  deleteAccount,
  getSelectedAccount,
  migrateState,
  renameAccount,
  selectAccount,
  setFirstTradingDate as setFirstTradingDateState,
  setPaidInterest as setPaidInterestState,
  upsertAccount,
  type Account,
  type AppState,
} from '../lib/accountState'
import type { TrackingParams } from '../lib/tracking'

// 状态持久化在浏览器 localStorage(纯前端,无服务端)。
// 只存"关键数据"——每只票的 params(模型参数)+ actualEntries(实盘录入);
// 所有计算结果(逐日行、对照、汇总)都是实时派生,不持久化。
const STORAGE_KEY = 'chiprunner-state-v1'

const loadFromStorage = (): AppState => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) {
      const parsed = JSON.parse(raw) as AppState
      if (parsed && parsed.version === 1 && parsed.accounts) {
        return migrateState(parsed)
      }
    }
  } catch {
    // 数据损坏 → 退回 seed
  }
  return createSeedState()
}

const saveToStorage = (state: AppState) => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
  } catch {
    // 配额满 / 隐私模式 → 静默(内存中仍有 state,本次会话可用)
  }
}

export function useAppState() {
  const state = ref<AppState>(loadFromStorage())
  const isSaving = ref(false)
  const lastSavedAt = ref<string | null>(state.value.updatedAt ?? null)

  const selectedAccount = computed<Account | undefined>(() =>
    getSelectedAccount(state.value),
  )

  const selectedAccountId = computed<string>(() => state.value.selectedAccountId)

  const accounts = computed<Account[]>(() => Object.values(state.value.accounts))

  const firstTradingDate = computed<string>(() => state.value.firstTradingDate)

  const setFirstTradingDate = (date: string) => {
    state.value = setFirstTradingDateState(state.value, date)
  }

  // 全局已支付利息(页眉输入框):写回 state 后由 deep watcher 自动持久化
  const paidInterest = computed<number>(() => state.value.paidInterest)

  const setPaidInterest = (value: number) => {
    state.value = setPaidInterestState(state.value, value)
  }

  // 票 CRUD:走 state.value 赋值,现有 deep watcher 自动写回 localStorage
  const createTicket = (name: string, params: TrackingParams) => {
    state.value = createAccount(state.value, name, params)
  }

  const editTicket = (id: string, name: string, params: TrackingParams) => {
    const renamed = renameAccount(state.value, id, name)
    const target = renamed.accounts[id]
    if (!target) return
    state.value = upsertAccount(renamed, { ...target, params })
  }

  const selectTicket = (id: string) => {
    const next = selectAccount(state.value, id)
    if (next !== state.value) {
      state.value = next
    }
  }

  const removeTicket = (id: string) => {
    const before = state.value
    const next = deleteAccount(state.value, id)
    if (next === before) {
      ElMessage.warning('至少保留一只票')
      return
    }
    state.value = next
  }

  // persist 时同步内存 state.updatedAt,使其与 localStorage 一致;
  // ignoreWatcher 屏蔽"这次 updatedAt 变化"触发的 watch,避免死循环写回。
  let ignoreWatcher = false
  let saveTimer: ReturnType<typeof setTimeout> | null = null
  const scheduleSave = () => {
    if (saveTimer) {
      clearTimeout(saveTimer)
    }
    saveTimer = setTimeout(() => {
      saveTimer = null
      persist()
    }, 400)
  }

  const persist = () => {
    isSaving.value = true
    const now = new Date().toISOString()
    saveToStorage({ ...state.value, updatedAt: now })
    ignoreWatcher = true
    state.value = { ...state.value, updatedAt: now }
    lastSavedAt.value = now
    nextTick(() => {
      ignoreWatcher = false
      isSaving.value = false
    })
  }

  const updateState = (next: AppState) => {
    state.value = next
  }

  watch(
    state,
    () => {
      if (ignoreWatcher) return
      scheduleSave()
    },
    { deep: true },
  )

  return {
    state,
    accounts,
    selectedAccount,
    selectedAccountId,
    firstTradingDate,
    paidInterest,
    setPaidInterest,
    isSaving,
    lastSavedAt,
    createTicket,
    editTicket,
    selectTicket,
    removeTicket,
    setFirstTradingDate,
    updateState,
  }
}
