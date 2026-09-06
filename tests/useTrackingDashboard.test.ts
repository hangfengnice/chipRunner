import { computed, effectScope, nextTick, ref } from 'vue'
import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  createSeedState,
  getSelectedAccount,
  type AppState,
} from '../src/lib/accountState'
import { useTrackingDashboard } from '../src/composables/useTrackingDashboard'
import { DEFAULT_PARAMS } from '../src/lib/tracking'

// 构造一个 dashboard(单只默认票),返回它和写回 mock。
// 用 effectScope 包裹,afterEach 里 stop 掉以清理内部的 watch/computed。
let activeScope: ReturnType<typeof effectScope> | null = null

const setupDashboard = () => {
  activeScope = effectScope()
  const state = ref<AppState>(createSeedState())
  const onStateChange = vi.fn((next: AppState) => {
    state.value = next
  })
  let dashboard!: ReturnType<typeof useTrackingDashboard>
  activeScope.run(() => {
    const account = computed(() => getSelectedAccount(state.value))
    dashboard = useTrackingDashboard({ account, state, onStateChange })
  })
  return { state, onStateChange, dashboard }
}

afterEach(() => {
  activeScope?.stop()
  activeScope = null
})

describe('useTrackingDashboard', () => {
  it('基于默认参数算出对照行,首行股数 = 初始股数', () => {
    const { dashboard } = setupDashboard()
    expect(dashboard.visibleRows.value.length).toBeGreaterThan(0)
    expect(dashboard.visibleRows.value[0]?.targetShares).toBe(
      DEFAULT_PARAMS.initialShares,
    )
  })

  it('showRecentOnly 开启时 visibleRows 最多 10 行', async () => {
    const { dashboard } = setupDashboard()
    dashboard.showRecentOnly.value = true
    await nextTick()
    expect(dashboard.visibleRows.value.length).toBeLessThanOrEqual(10)
  })

  it('改表单参数会经 onStateChange 写回账户', async () => {
    const { dashboard, onStateChange } = setupDashboard()
    onStateChange.mockClear() // 清掉构造阶段的初始写回
    dashboard.form.price = 88.88
    await nextTick()
    expect(onStateChange).toHaveBeenCalled()
  })

  it('初始基准行始终保留在首行,即使展示区间起点晚于基准日', async () => {
    const { dashboard } = setupDashboard()
    // 默认参数下 startDate = 系统起始日,无基准行;这里显式把起始日设早以触发快照机制。
    dashboard.form.startDate = '2026.08.07'
    await nextTick()
    // 把展示起点挪到 09.08(晚于基准日 08.07 与系统起始日 09.07)。
    dashboard.displayRange.dateFrom = '2026.09.08'
    await nextTick()

    const rows = dashboard.visibleRows.value
    // 基准行(index=0)仍固定在首行:不做 T、展示初始股数。
    expect(rows[0]?.index).toBe(0)
    expect(rows[0]?.tProfit).toBe(0)
    expect(rows[0]?.targetShares).toBe(DEFAULT_PARAMS.initialShares)
    // 之后的行均为实际计算日(index>=1,日期 >= 09.01)。
    expect(rows[1]?.index).toBeGreaterThan(0)
    expect(rows[1]?.date >= '2026.09.08').toBe(true)
  })

  it('改固定股价时,未保存日期的收盘价实时跟随', async () => {
    const { dashboard } = setupDashboard()
    await nextTick()
    expect(dashboard.actualEntryForm.date).toBe('2026.09.07')
    expect(dashboard.actualEntryForm.closePrice).toBe(DEFAULT_PARAMS.price)
    dashboard.form.price = 99.99
    await nextTick()
    expect(dashboard.actualEntryForm.closePrice).toBe(99.99)
  })

  it('已保存日期的收盘价不跟随固定股价变化', async () => {
    const { dashboard, state } = setupDashboard()
    await nextTick()
    const id = state.value.selectedAccountId
    const savedEntry = {
      date: '2026.09.07',
      actualShares: 1000,
      actualCash: 0,
      closePrice: 50,
    }
    state.value = {
      ...state.value,
      accounts: {
        ...state.value.accounts,
        [id]: {
          ...state.value.accounts[id]!,
          actualEntries: { [savedEntry.date]: savedEntry },
        },
      },
    }
    dashboard.actualEntryForm.date = '2026.09.08'
    await nextTick()
    dashboard.actualEntryForm.date = '2026.09.07'
    await nextTick()
    expect(dashboard.actualEntryForm.closePrice).toBe(50)

    dashboard.form.price = 88.88
    await nextTick()
    expect(dashboard.actualEntryForm.closePrice).toBe(50)
  })

  it('首交易日改为靠后日期后,availableDateFrom 与计算行起点同步', async () => {
    const { state, dashboard } = setupDashboard()
    await nextTick()
    expect(dashboard.availableDateFrom.value).toBe('2026.09.07')

    state.value = { ...state.value, firstTradingDate: '2026.09.08' }
    await nextTick()

    expect(dashboard.availableDateFrom.value).toBe('2026.09.08')
    // 所有实际计算日(index>0)都不早于新首日 09.08(基准快照行 index=0 不受影响)。
    const computeRows = dashboard.visibleRows.value.filter((r) => r.index > 0)
    expect(computeRows.length).toBeGreaterThan(0)
    expect(computeRows.every((r) => r.date >= '2026.09.08')).toBe(true)
  })
})
