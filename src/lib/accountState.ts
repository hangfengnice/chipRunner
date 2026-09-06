import {
  DEFAULT_PARAMS,
  SYSTEM_START_DATE,
  type ActualPositionEntry,
  type TrackingParams,
} from './tracking'
import { ALL_TRADING_DATES } from '../data/sources'

export interface Account {
  id: string
  name: string
  params: TrackingParams
  actualEntries: Record<string, ActualPositionEntry>
  updatedAt: string
}

export interface AppState {
  version: 1
  firstTradingDate: string
  /** 全局已支付利息(页眉输入框,所有票共用,保留 2 位小数) */
  paidInterest: number
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
    firstTradingDate: SYSTEM_START_DATE,
    paidInterest: 0,
    selectedAccountId: account.id,
    accounts: { [account.id]: account },
    updatedAt: nowIso(),
  }
}

// 迁移旧 localStorage 状态:
// - 补全全局首交易日 firstTradingDate(老存档无此字段或值不在日历内 → 默认日历首日 SYSTEM_START_DATE);
// - 补全全局已支付利息 paidInterest(老存档无此字段或非有限数 → 默认 0);
// - 清除早于日历首日(SYSTEM_START_DATE)的实盘记录:日历首日为第一个真实交易日,此前的数据不再保留。
// 无任何变化时返回原 state(便于上层引用比较判空)。
export const migrateState = (state: AppState): AppState => {
  const stored = (state as Partial<AppState>).firstTradingDate
  const firstTradingDate =
    typeof stored === 'string' && ALL_TRADING_DATES.includes(stored)
      ? stored
      : SYSTEM_START_DATE

  const storedInterest = (state as Partial<AppState>).paidInterest
  const paidInterest =
    typeof storedInterest === 'number' && Number.isFinite(storedInterest)
      ? storedInterest
      : 0

  let entriesChanged = false
  const accounts: Record<string, Account> = {}
  for (const [id, account] of Object.entries(state.accounts)) {
    const keptEntries: Record<string, ActualPositionEntry> = {}
    for (const [date, entry] of Object.entries(account.actualEntries)) {
      if (date >= SYSTEM_START_DATE) {
        keptEntries[date] = entry
      } else {
        entriesChanged = true
      }
    }
    accounts[id] = { ...account, actualEntries: keptEntries }
  }

  if (
    !entriesChanged &&
    stored === firstTradingDate &&
    storedInterest === paidInterest
  ) {
    return state
  }

  return {
    ...state,
    firstTradingDate,
    paidInterest,
    accounts,
    updatedAt: nowIso(),
  }
}

// 设置全局首交易日(UI 下拉框调用)。date 必须是日历内的一天,否则原样返回。
export const setFirstTradingDate = (
  state: AppState,
  date: string,
): AppState => {
  if (!ALL_TRADING_DATES.includes(date) || state.firstTradingDate === date) {
    return state
  }

  return { ...state, firstTradingDate: date, updatedAt: nowIso() }
}

// 设置全局已支付利息(页眉输入框调用)。保留 2 位小数;非有限数原样返回。
export const setPaidInterest = (
  state: AppState,
  value: number,
): AppState => {
  if (!Number.isFinite(value)) {
    return state
  }

  const paidInterest = Math.round(value * 100) / 100
  if (state.paidInterest === paidInterest) {
    return state
  }

  return { ...state, paidInterest, updatedAt: nowIso() }
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
