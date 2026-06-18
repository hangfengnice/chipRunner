import { computed, nextTick, ref, watch } from 'vue'
import { ElMessage } from 'element-plus'
import {
  createAccount,
  createSeedState,
  deleteAccount,
  getSelectedAccount,
  renameAccount,
  selectAccount as selectAccountPure,
  type Account,
  type AppState,
} from '../lib/accountState'
import {
  fetchAppState,
  saveAppState,
} from '../lib/stateApi'

interface UseAppStateOptions {
  legacyEntries?: Record<string, never>
}

export function useAppState(options: UseAppStateOptions = {}) {
  void options
  const state = ref<AppState>(createSeedState())
  const isLoading = ref(false)
  const isSaving = ref(false)
  const lastSaveError = ref<string | null>(null)
  const hasLoaded = ref(false)
  const lastSavedAt = ref<string | null>(null)

  // When `true`, the deep watcher ignores state changes — used during the
  // persist round-trip so the server response's updatedAt doesn't re-trigger
  // an infinite save loop.
  let ignoreWatcher = false

  const selectedAccount = computed<Account | undefined>(() =>
    getSelectedAccount(state.value),
  )

  const selectedAccountId = computed<string>(() => state.value.selectedAccountId)

  const accounts = computed<Account[]>(() =>
    Object.values(state.value.accounts).sort((a, b) =>
      a.name.localeCompare(b.name, 'zh-Hans-CN'),
    ),
  )

  const accountCount = computed(() => Object.keys(state.value.accounts).length)

  const load = async () => {
    if (isLoading.value) return
    isLoading.value = true

    try {
      const remote = await fetchAppState()
      ignoreWatcher = true
      state.value = remote
      lastSavedAt.value = remote.updatedAt
      await nextTick()
      ignoreWatcher = false
      hasLoaded.value = true
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'state 读取失败'
      ElMessage.error(message)
    } finally {
      isLoading.value = false
    }
  }

  const selectAccount = (id: string) => {
    const next = selectAccountPure(state.value, id)
    if (next !== state.value) {
      state.value = next
    }
  }

  const createNewAccount = (name?: string) => {
    state.value = createAccount(state.value, name)
  }

  const rename = (id: string, name: string) => {
    const next = renameAccount(state.value, id, name)
    if (next !== state.value) {
      state.value = next
    }
  }

  const remove = (id: string) => {
    const before = state.value
    const next = deleteAccount(state.value, id)
    if (next === before) {
      ElMessage.warning('至少需要保留一个账户')
      return
    }
    state.value = next
  }

  // Auto-save with debounce.
  let saveTimer: ReturnType<typeof setTimeout> | null = null
  const scheduleSave = () => {
    if (!hasLoaded.value) return
    if (saveTimer) {
      clearTimeout(saveTimer)
    }
    saveTimer = setTimeout(() => {
      saveTimer = null
      void persist()
    }, 400)
  }

  const persist = async () => {
    if (isSaving.value) return
    isSaving.value = true
    ignoreWatcher = true
    lastSaveError.value = null
    try {
      const saved = await saveAppState(state.value)
      // Don't reassign state.value — that would trigger the deep watcher and
      // loop forever. Persisted timestamp is kept separately for display.
      lastSavedAt.value = saved.updatedAt
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'state 写回失败'
      lastSaveError.value = message
      ElMessage.error(message)
    } finally {
      await nextTick()
      ignoreWatcher = false
      isSaving.value = false
    }
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
    accountCount,
    selectedAccount,
    selectedAccountId,
    isLoading,
    isSaving,
    lastSaveError,
    lastSavedAt,
    hasLoaded,
    load,
    selectAccount,
    createNewAccount,
    rename,
    remove,
    updateState,
  }
}
