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
})
