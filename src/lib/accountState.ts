import {
  DEFAULT_PARAMS,
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

const DEFAULT_ACCOUNT_NAME = '默认账户'
const STATE_VERSION = 1 as const

const nowIso = () => new Date().toISOString()

// nanoid replacement that doesn't require a new dependency.
// 8 chars from a 36-char alphabet ≈ 1.7e12 combinations — collision-safe for our scale.
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

export const upsertAccount = (state: AppState, account: Account): AppState => ({
  ...state,
  accounts: {
    ...state.accounts,
    [account.id]: { ...account, updatedAt: nowIso() },
  },
  updatedAt: nowIso(),
})

const ACCOUNT_NAME_FALLBACK = '账户'

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

export const getAccountEntries = (
  state: AppState,
  accountId: string,
): Record<string, ActualPositionEntry> => {
  const account =
    state.accounts[accountId] ??
    state.accounts[state.selectedAccountId] ??
    Object.values(state.accounts)[0]
  return account ? { ...account.actualEntries } : {}
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
