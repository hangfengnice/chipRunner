import {
  DEFAULT_PARAMS,
  SYSTEM_START_DATE,
  type ActualPositionEntry,
  type TrackingParams,
} from './tracking'

export interface Account {
  id: string
  name: string
  params: TrackingParams
  actualEntries: Record<string, ActualPositionEntry>
  updatedAt: string
}

export interface AppState {
  version: 1
  selectedAccountId: string
  accounts: Record<string, Account>
  updatedAt: string
}

const DEFAULT_ACCOUNT_NAME = '默认票'
const STATE_VERSION = 1 as const

const nowIso = () => new Date().toISOString()

// 8 位 [a-z0-9] id,无外部依赖
const generateAccountId = () => {
  const alphabet = 'abcdefghijklmnopqrstuvwxyz0123456789'
  let id = ''
  for (let i = 0; i < 8; i += 1) {
    id += alphabet[Math.floor(Math.random() * alphabet.length)]
  }
  return id
}

const cloneParams = (params: TrackingParams): TrackingParams => ({
  startDate: params.startDate,
  initialShares: params.initialShares,
  initialCash: params.initialCash,
  price: params.price,
  spread: params.spread,
  lotCost: params.lotCost,
  hiddenTradingDays: params.hiddenTradingDays,
  endDate: params.endDate,
})

export const createDefaultAccount = (
  params: TrackingParams = DEFAULT_PARAMS,
  name: string = DEFAULT_ACCOUNT_NAME,
): Account => ({
  id: generateAccountId(),
  name,
  params: cloneParams(params),
  actualEntries: {},
  updatedAt: nowIso(),
})

interface CreateSeedStateOptions {
  legacyEntries?: Record<string, ActualPositionEntry>
  legacyParams?: TrackingParams
}

export const createSeedState = (
  options: CreateSeedStateOptions = {},
): AppState => {
  const account = createDefaultAccount(options.legacyParams ?? DEFAULT_PARAMS)
  if (options.legacyEntries) {
    account.actualEntries = { ...options.legacyEntries }
    account.updatedAt = nowIso()
  }

  return {
    version: STATE_VERSION,
    selectedAccountId: account.id,
    accounts: { [account.id]: account },
    updatedAt: nowIso(),
  }
}

// 迁移旧 localStorage 状态到当前系统起始日:
// - 每只票 startDate 早于 SYSTEM_START_DATE 的拉到 SYSTEM_START_DATE;
// - 删除每只票早于 SYSTEM_START_DATE 的实盘记录。
// 无任何变化时返回原 state(便于上层引用比较判空)。
export const migrateState = (state: AppState): AppState => {
  let changed = false
  const nextAccounts = Object.fromEntries(
    Object.entries(state.accounts).map(([id, account]) => {
      const startDateChanged = account.params.startDate < SYSTEM_START_DATE
      const droppedDates = Object.keys(account.actualEntries).filter(
        (date) => date < SYSTEM_START_DATE,
      )

      if (!startDateChanged && droppedDates.length === 0) {
        return [id, account]
      }

      changed = true
      const nextParams = startDateChanged
        ? { ...account.params, startDate: SYSTEM_START_DATE }
        : account.params
      let nextEntries = account.actualEntries
      if (droppedDates.length > 0) {
        nextEntries = { ...account.actualEntries }
        for (const date of droppedDates) {
          delete nextEntries[date]
        }
      }

      return [id, { ...account, params: nextParams, actualEntries: nextEntries }]
    }),
  )

  return changed ? { ...state, accounts: nextAccounts, updatedAt: nowIso() } : state
}

export const upsertAccount = (state: AppState, account: Account): AppState => ({
  ...state,
  accounts: {
    ...state.accounts,
    [account.id]: { ...account, updatedAt: nowIso() },
  },
  updatedAt: nowIso(),
})

const ACCOUNT_NAME_FALLBACK = '票'

const buildUniqueName = (
  existing: readonly Account[],
  desired: string,
): string => {
  const trimmed = desired.trim() || ACCOUNT_NAME_FALLBACK
  const taken = new Set(existing.map((account) => account.name))
  if (!taken.has(trimmed)) {
    return trimmed
  }

  let suffix = 2
  while (taken.has(`${trimmed} (${suffix})`)) {
    suffix += 1
  }
  return `${trimmed} (${suffix})`
}

export const createAccount = (
  state: AppState,
  name?: string,
  params: TrackingParams = DEFAULT_PARAMS,
): AppState => {
  const existing = Object.values(state.accounts)
  const account: Account = createDefaultAccount(
    params,
    buildUniqueName(existing, name ?? ''),
  )

  return {
    ...state,
    selectedAccountId: account.id,
    accounts: {
      ...state.accounts,
      [account.id]: account,
    },
    updatedAt: nowIso(),
  }
}

export const renameAccount = (
  state: AppState,
  id: string,
  name: string,
): AppState => {
  const target = state.accounts[id]
  if (!target) {
    return state
  }

  const others = Object.values(state.accounts).filter(
    (account) => account.id !== id,
  )
  const nextName = buildUniqueName(others, name)

  return {
    ...state,
    accounts: {
      ...state.accounts,
      [id]: {
        ...target,
        name: nextName,
        updatedAt: nowIso(),
      },
    },
    updatedAt: nowIso(),
  }
}

export const deleteAccount = (state: AppState, id: string): AppState => {
  const accountIds = Object.keys(state.accounts)
  if (!state.accounts[id] || accountIds.length <= 1) {
    return state
  }

  const { [id]: _removed, ...remaining } = state.accounts
  const nextSelectedId =
    state.selectedAccountId === id
      ? (Object.keys(remaining)[0] ?? id)
      : state.selectedAccountId

  return {
    ...state,
    selectedAccountId: nextSelectedId,
    accounts: remaining,
    updatedAt: nowIso(),
  }
}

export const selectAccount = (state: AppState, id: string): AppState => {
  if (!state.accounts[id] || state.selectedAccountId === id) {
    return state
  }

  return {
    ...state,
    selectedAccountId: id,
    updatedAt: nowIso(),
  }
}

export const getSelectedAccount = (
  state: AppState,
): Account | undefined => {
  const direct = state.accounts[state.selectedAccountId]
  if (direct) {
    return direct
  }
  const fallbackId = Object.keys(state.accounts)[0]
  return fallbackId ? state.accounts[fallbackId] : undefined
}


export const setAccountEntry = (
  state: AppState,
  accountId: string,
  entry: ActualPositionEntry,
): AppState => {
  const target = state.accounts[accountId]
  if (!target) {
    return state
  }

  return {
    ...state,
    accounts: {
      ...state.accounts,
      [accountId]: {
        ...target,
        actualEntries: {
          ...target.actualEntries,
          [entry.date]: entry,
        },
        updatedAt: nowIso(),
      },
    },
    updatedAt: nowIso(),
  }
}

export const removeAccountEntry = (
  state: AppState,
  accountId: string,
  date: string,
): AppState => {
  const target = state.accounts[accountId]
  if (!target || !target.actualEntries[date]) {
    return state
  }

  const { [date]: _removed, ...remaining } = target.actualEntries

  return {
    ...state,
    accounts: {
      ...state.accounts,
      [accountId]: {
        ...target,
        actualEntries: remaining,
        updatedAt: nowIso(),
      },
    },
    updatedAt: nowIso(),
  }
}
