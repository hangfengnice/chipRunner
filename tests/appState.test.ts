import { describe, expect, it } from 'vitest'
import {
  createAccount,
  createDefaultAccount,
  createSeedState,
  deleteAccount,
  getSelectedAccount,
  migrateState,
  removeAccountEntry,
  renameAccount,
  selectAccount,
  setAccountEntry,
  setFirstTradingDate,
  setPaidInterest,
  upsertAccount,
  type AppState,
} from '../src/lib/accountState'
import { DEFAULT_PARAMS } from '../src/lib/tracking'

describe('createSeedState', () => {
  it('seeds with a single default account and selects it', () => {
    const state = createSeedState()

    expect(state.version).toBe(1)
    expect(Object.keys(state.accounts)).toHaveLength(1)
    const accountId = state.selectedAccountId
    const account = state.accounts[accountId]
    expect(account).toBeDefined()
    expect(account?.name).toBe('默认票')
    expect(account?.params).toEqual(DEFAULT_PARAMS)
    expect(account?.actualEntries).toEqual({})
  })

  it('初始化全局首交易日为日历首日(SYSTEM_START_DATE),已支付利息为 0', () => {
    const state = createSeedState()
    expect(state.firstTradingDate).toBe('2026.09.07')
    expect(state.paidInterest).toBe(0)
  })

  it('migrates legacy entries into the default account', () => {
    const legacy = {
      '2026.06.15': {
        date: '2026.06.15',
        actualShares: 500,
        actualCash: 1750.3,
        closePrice: 36.65,
      },
    }

    const state = createSeedState({ legacyEntries: legacy })
    const account = getSelectedAccount(state)

    expect(account?.actualEntries).toEqual(legacy)
  })

  it('does not mutate the provided legacy entries', () => {
    const legacy = {
      '2026.06.15': {
        date: '2026.06.15',
        actualShares: 500,
        actualCash: 1750.3,
        closePrice: 36.65,
      },
    }
    const snapshot = JSON.parse(JSON.stringify(legacy)) as typeof legacy

    createSeedState({ legacyEntries: legacy })

    expect(legacy).toEqual(snapshot)
  })
})

describe('createDefaultAccount', () => {
  it('clones params to prevent later mutation of DEFAULT_PARAMS', () => {
    const account = createDefaultAccount()
    account.params.initialShares = 999
    expect(DEFAULT_PARAMS.initialShares).toBe(1200)
  })

  it('uses a unique 8-char id per call', () => {
    const a = createDefaultAccount()
    const b = createDefaultAccount()
    expect(a.id).not.toBe(b.id)
    expect(a.id).toMatch(/^[a-z0-9]{8}$/)
  })
})

describe('createAccount / upsertAccount', () => {
  it('createAccount selects the newly created account', () => {
    const state = createSeedState()
    const next = createAccount(state, '家人')

    expect(next.selectedAccountId).not.toBe(state.selectedAccountId)
    const newAccount = next.accounts[next.selectedAccountId]
    expect(newAccount?.name).toBe('家人')
  })

  it('createAccount disambiguates duplicate names', () => {
    let state = createSeedState()
    state = createAccount(state, '家人')
    state = createAccount(state, '家人')
    const names = Object.values(state.accounts).map((account) => account.name)
    expect(names).toEqual(['默认票', '家人', '家人 (2)'])
  })

  it('upsertAccount returns a new state without mutating the input', () => {
    const state = createSeedState()
    const account = createDefaultAccount(DEFAULT_PARAMS, '测试')
    const next = upsertAccount(state, account)

    expect(next).not.toBe(state)
    expect(state.accounts[account.id]).toBeUndefined()
    expect(next.accounts[account.id]).toEqual(account)
  })
})

describe('renameAccount / selectAccount', () => {
  it('renameAccount updates name and rejects unknown ids', () => {
    const state = createSeedState()
    const id = state.selectedAccountId
    const renamed = renameAccount(state, id, '主力')

    expect(renamed.accounts[id]?.name).toBe('主力')
    expect(renameAccount(state, 'missing', 'X')).toBe(state)
  })

  it('selectAccount switches and ignores unknown ids', () => {
    let state = createSeedState()
    state = createAccount(state, '备用')
    const previousId = state.selectedAccountId
    const otherId = Object.keys(state.accounts).find(
      (id) => id !== previousId,
    )!

    const switched = selectAccount(state, otherId)
    expect(switched.selectedAccountId).toBe(otherId)

    expect(selectAccount(state, 'unknown')).toBe(state)
    expect(selectAccount(switched, switched.selectedAccountId)).toBe(switched)
  })
})

describe('deleteAccount', () => {
  it('removes an account and reassigns selection', () => {
    let state = createSeedState()
    state = createAccount(state, '备用')
    const initialId = state.selectedAccountId

    const next = deleteAccount(state, state.selectedAccountId)
    expect(next.selectedAccountId).not.toBe(initialId)
    expect(next.accounts[initialId]).toBeUndefined()
    expect(Object.keys(next.accounts)).toHaveLength(1)
  })

  it('refuses to delete the last remaining account', () => {
    const state = createSeedState()
    const next = deleteAccount(state, state.selectedAccountId)

    expect(next).toBe(state)
    expect(Object.keys(next.accounts)).toHaveLength(1)
  })

  it('falls back to a valid selection when the deleted one was active', () => {
    let state = createSeedState()
    state = createAccount(state, 'B')
    state = selectAccount(
      state,
      state.selectedAccountId ===
      state.accounts[Object.keys(state.accounts)[0]!.id]?.id
        ? Object.keys(state.accounts)[1]!
        : Object.keys(state.accounts)[0]!,
    )

    const activeId = state.selectedAccountId
    const after = deleteAccount(state, activeId)

    expect(after.accounts[after.selectedAccountId]).toBeDefined()
  })
})

describe('getSelectedAccount', () => {
  it('falls back when selectedAccountId drifts', () => {
    const state = createSeedState()
    const drifted: AppState = {
      ...state,
      selectedAccountId: 'does-not-exist',
    }
    const account = getSelectedAccount(drifted)
    expect(account).toBeDefined()
    expect(Object.values(state.accounts)).toContain(account)
  })
})

describe('setAccountEntry / removeAccountEntry', () => {
  it('setAccountEntry writes under the given account only', () => {
    let state = createSeedState()
    state = createAccount(state, 'B')
    const ids = Object.keys(state.accounts)
    const [a, b] = ids as [string, string]

    const entry = {
      date: '2026.06.15',
      actualShares: 600,
      actualCash: 2000,
      closePrice: 36.5,
    }
    state = setAccountEntry(state, a, entry)

    expect(state.accounts[a]?.actualEntries['2026.06.15']).toEqual(entry)
    expect(state.accounts[b]?.actualEntries['2026.06.15']).toBeUndefined()
  })

  it('removeAccountEntry clears the date without touching other dates', () => {
    let state = createSeedState()
    const id = state.selectedAccountId
    state = setAccountEntry(state, id, {
      date: '2026.06.15',
      actualShares: 1,
      actualCash: 1,
      closePrice: 1,
    })
    state = setAccountEntry(state, id, {
      date: '2026.06.16',
      actualShares: 2,
      actualCash: 2,
      closePrice: 2,
    })

    const next = removeAccountEntry(state, id, '2026.06.15')
    expect(next.accounts[id]?.actualEntries['2026.06.15']).toBeUndefined()
    expect(next.accounts[id]?.actualEntries['2026.06.16']).toBeDefined()
  })

  it('removeAccountEntry is a no-op when date missing', () => {
    const state = createSeedState()
    const next = removeAccountEntry(
      state,
      state.selectedAccountId,
      '2099.01.01',
    )
    expect(next).toBe(state)
  })
})

describe('migrateState', () => {
  it('清除早于日历首日(9.07)的实盘记录,并给老存档补全 firstTradingDate / paidInterest', () => {
    const seed = createSeedState()
    const id = seed.selectedAccountId
    const originalStartDate = '2026.06.22'
    const input: AppState = {
      ...seed,
      accounts: {
        [id]: {
          ...seed.accounts[id]!,
          params: { ...seed.accounts[id]!.params, startDate: originalStartDate },
          actualEntries: {
            '2026.07.30': {
              date: '2026.07.30',
              actualShares: 1,
              actualCash: 1,
              closePrice: 1,
            },
            '2026.08.14': {
              date: '2026.08.14',
              actualShares: 2,
              actualCash: 2,
              closePrice: 2,
            },
            '2026.08.24': {
              date: '2026.08.24',
              actualShares: 3,
              actualCash: 3,
              closePrice: 3,
            },
            '2026.08.31': {
              date: '2026.08.31',
              actualShares: 4,
              actualCash: 4,
              closePrice: 4,
            },
            '2026.09.07': {
              date: '2026.09.07',
              actualShares: 5,
              actualCash: 5,
              closePrice: 5,
            },
          },
        },
      },
    }
    // 模拟老存档:删除 firstTradingDate / paidInterest 字段。
    delete (input as Partial<AppState>).firstTradingDate
    delete (input as Partial<AppState>).paidInterest

    const migrated = migrateState(input)
    const account = migrated.accounts[id]!

    // startDate 早于首日仍合法(作初始基准日),不再拉齐。
    expect(account.params.startDate).toBe(originalStartDate)
    // 9.07 为第一个真实交易日:早于它的实盘(07.30 / 08.14 / 08.24 / 08.31)被清除,9.07 当天保留。
    expect(account.actualEntries['2026.07.30']).toBeUndefined()
    expect(account.actualEntries['2026.08.14']).toBeUndefined()
    expect(account.actualEntries['2026.08.24']).toBeUndefined()
    expect(account.actualEntries['2026.08.31']).toBeUndefined()
    expect(account.actualEntries['2026.09.07']).toBeDefined()
    // 老存档补全 firstTradingDate = 日历首日(SYSTEM_START_DATE),paidInterest = 0。
    expect(migrated.firstTradingDate).toBe('2026.09.07')
    expect(migrated.paidInterest).toBe(0)
  })

  it('returns the same state reference when nothing needs migrating', () => {
    const state = createSeedState()
    expect(migrateState(state)).toBe(state)
  })
})

describe('setFirstTradingDate', () => {
  it('更新全局首交易日(不可变,需日历内日期)', () => {
    const state = createSeedState()
    const next = setFirstTradingDate(state, '2026.09.08')
    expect(next).not.toBe(state)
    expect(next.firstTradingDate).toBe('2026.09.08')
    expect(state.firstTradingDate).toBe('2026.09.07')
  })

  it('非日历内日期原样返回', () => {
    const state = createSeedState()
    expect(setFirstTradingDate(state, '2026.07.04')).toBe(state)
  })

  it('相同日期原样返回(无变化)', () => {
    const state = createSeedState()
    expect(setFirstTradingDate(state, state.firstTradingDate)).toBe(state)
  })
})

describe('setPaidInterest', () => {
  it('更新全局已支付利息并保留 2 位小数(不可变)', () => {
    const state = createSeedState()
    const next = setPaidInterest(state, 123.456)
    expect(next).not.toBe(state)
    expect(next.paidInterest).toBe(123.46)
    expect(state.paidInterest).toBe(0)
  })

  it('四舍五入后相同值原样返回(无变化)', () => {
    const state = createSeedState()
    expect(setPaidInterest(state, 0.001)).toBe(state)
  })

  it('非有限数原样返回', () => {
    const state = createSeedState()
    expect(setPaidInterest(state, Number.NaN)).toBe(state)
    expect(setPaidInterest(state, Number.POSITIVE_INFINITY)).toBe(state)
  })
})
