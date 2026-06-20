import { describe, expect, it } from 'vitest'
import {
  createAccount,
  createDefaultAccount,
  createSeedState,
  deleteAccount,
  getSelectedAccount,
  removeAccountEntry,
  renameAccount,
  selectAccount,
  setAccountEntry,
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
