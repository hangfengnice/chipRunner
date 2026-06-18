# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

chipRunner 是一个基于 Vue 3 + Element Plus 的多账户交易跟踪原型(中文 UI)。每个账户拥有独立的模型参数(`TrackingParams`)和实盘买/卖记录,互不干扰。计算内核 `src/lib/trackingCore.ts` 按固定规则逐日累加,前端将实盘录入通过 Vite 中间件直接写回 `data/tracking/state.json`。

## Commands

```bash
npm run dev          # Vite dev server (依赖其写入 state.json)
npm run build        # vue-tsc -b 类型检查 + vite build
npm test             # Vitest 3.x — 运行全部 tests/
npm run test:watch   # Vitest watch 模式
```

跑单个测试:`npx vitest run tests/appState.test.ts`

## Architecture

### 计算内核(纯函数,无 Vue / 无 IO)
`src/lib/trackingCore.ts` —— 权威计算引擎。

- `runOneTradingDay(state, params)`:
  ```
  tProfit = shares * spread
  cash += tProfit
  lotsBought = floor(cash / lotCost)
  if lotsBought > 0: shares += lotsBought * 100, cash -= lotsBought * lotCost
  targetAssets = shares * price + cash
  ```
- `buildCoreTrackingRows(params, dates)` 先跑 `hiddenTradingDays` 次"预热"(结果不进入输出),再映射日期数组。
- `findMatchedIndexByAssets` / `buildProgressDelta` 提供进度定位。
- `isValidCoreTrackingParams` 是模块内部 helper(不导出)。

### 数据模型

**`src/lib/accountState.ts`** 定义多账户状态:

```ts
interface Account {
  id: string                                    // nanoid(8) 自生成
  name: string                                  // 用户可重命名
  params: TrackingParams                        // 完整参数集(从 DEFAULT_PARAMS 复制)
  actualEntries: Record<string, ActualPositionEntry>
  updatedAt: string
}

interface AppState {
  version: 1
  selectedAccountId: string
  accounts: Record<string, Account>
  updatedAt: string
}
```

提供纯函数助手:`createSeedState({ legacyEntries, legacyParams })` / `createDefaultAccount` / `createAccount` / `renameAccount` / `deleteAccount` / `selectAccount` / `upsertAccount` / `getSelectedAccount` / `getAccountEntries` / `setAccountEntry` / `removeAccountEntry`。所有更新都是不可变(spread)。

账户 id 由内置 `generateAccountId()`(8 位 `[a-z0-9]`)生成,不是 nanoid——无额外依赖。账户名经 `buildUniqueName` 去重(同名自动加 `(2)`/`(3)`),`deleteAccount` / `selectAccount` / `renameAccount` / `setAccountEntry` / `removeAccountEntry` 在目标缺失时返回原 `state`(无副作用),便于上层用引用比较判空。

### 数据流

1. **日历**:`data/calendar/*.json`(5 份,2026–2030)→ `src/data/sources.ts` 合并为 `ALL_TRADING_DATES`(去重升序),按年索引到 `CALENDAR_BY_YEAR`。`ALL_TRADING_DATE_TO` 动态取最晚交易日;新日历加入时无需改默认值。
2. **状态**: `data/tracking/state.json` 持久化整个 `AppState`。服务端启动时若文件不存在,自动注入单"默认账户"(`DEFAULT_PARAMS`,空实盘);若老的 `actual-entries.json` 仍存在,会迁入默认账户后删除。
3. **行计算**: `src/lib/tracking.ts` 用 `buildRows(params, ALL_TRADING_DATES)` 调用计算内核,加日期过滤;`buildComparisonRows(rows, entries)` 叠加实盘对照。
4. **UI 分层**:
   - **所有账户写回统一走 `onStateChange`**:App.vue 把 `useAppState.updateState` 作为 `onStateChange` 传给子 composable。子 composable 用 `accountState` 纯函数算出**新的** `AppState`,再 `onStateChange(next)` 回灌——**不要**直接改 `account.value` 或 `state.accounts[...]`。最终 `state`(唯一可写源)的 deep watcher → 400ms debounce 整体 PUT。
   - `src/App.vue` 是装配 shell,持有 `useAppState` 实例,把当前账户 `Ref` + `state` + `onStateChange` 注入 `useTrackingDashboard`。
   - `src/composables/useAppState.ts` 拥有整个 `state`(唯一可写源)、`selectedAccount` / `selectedAccountId`(computed)、加载/保存状态、CRUD、400ms debounce 自动保存;持久化时用 `ignoreWatcher` 屏蔽服务端回填避免保存死循环。
   - `src/composables/useTrackingDashboard.ts` 接收 `{ account, state, onStateChange }`,所有派生状态都是当前账户的;表单编辑经 `onStateChange` 写回账户 params。
   - `src/composables/useActualEntryState.ts` 同样接收 `{ account, state, onStateChange, rows, getDefaultPrice }`,保存/清除调 `setAccountEntry` / `removeAccountEntry` 后经 `onStateChange` 回灌。
   - `src/lib/trackingYearScope.ts` 决定年份视图切换时的计算截止日。
   - `src/lib/trackingDisplay.ts` 提供金额/百分比/差额格式化(`formatMoney` / `formatRatio` / `deltaTagType` 等)。

### 服务端写回

`vite.config.ts` 中 `appStateApiPlugin` 在 `/api/state` 上挂中间件:
- `GET` → 读取 `state.json`(若不存在则 seed 并写回)
- `PUT` body `AppState` → 整体替换;`version !== 1` / 缺少 `selectedAccountId` / 空 accounts / selectedId 不在 accounts 中 → 返回 422。
- 写入时刷新顶层 `updatedAt`。
- 浏览器侧通过 `src/lib/stateApi.ts` 调用。

### 默认模型参数

```ts
DEFAULT_PARAMS = {
  startDate: '2026.06.15',
  initialShares: 500,
  initialCash: 1650.30,
  price: 36.14,
  spread: 1.2,
  lotCost: 3614,        // 通常 = price * 100
  hiddenTradingDays: 0,
  endDate: <动态 = 2026 日历最后一日,即 TRADING_DATES_2026 末位>
}
```

## Components

| 组件 | 职责 |
| --- | --- |
| `App.vue` | 装配 shell,创建 `useAppState` + `useTrackingDashboard` |
| `TrackingAccountSwitcher.vue` | 顶部下拉切换账户 + "新建/管理"按钮 |
| `TrackingAccountManager.vue` | el-dialog:列表 + 重命名 + 删除(最后 1 个不可删) |
| `TrackingOverviewSection.vue` | 参数表单 + 3 张统计卡片 + 账户名 + 顶栏操作按钮 |
| `TrackingActualPanel.vue` | 实盘录入表单 + 当前目标基准 + 保存状态 |
| `TrackingTablePanel.vue` | 17 列对照表(目标 + 实盘 + 差额) |

## Key Reference Files

- `src/lib/trackingCore.ts` — 计算内核(权威)
- `src/lib/accountState.ts` — 账户状态模型(权威)
- `src/lib/stateApi.ts` — 浏览器侧 fetch 封装
- `src/composables/useAppState.ts` — 顶层状态机
- `src/composables/useTrackingDashboard.ts` — 账户作用域 dashboard
- `tests/trackingCalendar.test.ts` — 日历准确性守卫
- `tests/appState.test.ts` — 账户状态纯函数测试
- `data/calendar/*.json` — 交易日权威源
- `data/tracking/state.json` — 多账户状态持久化文件
- `docs/project-status.md` — 当前项目状态与下一步

## Working Conventions

- 默认中文回复。
- 优先最小化修改,避免无关重构。
- 新增结构化数据写入 `data/`,不要把 Markdown 当前端主数据源(`docs/` 仅保留项目状态)。
- 重新打开项目时:先读 `docs/project-status.md`,再看 `git status --short`,再启 `npm run dev`(优先复用旧服务)。
- 前端日常改动:依赖现有 `npm run dev` + 编辑器错误。
- 修改 `vite.config.ts`、依赖、写回接口、目录结构后必须跑 `npm run build`。
- 替换基础参数时:**必须**同步 `tests/trackingCore.test.ts` 与 `tests/tracking.test.ts` 里的基线样本值,否则 `npm test` 失败。
- **不要臆造交易日**——所有日期来自 `data/calendar/*.json`。
- 多账户隔离:`useTrackingDashboard` / `useActualEntryState` 都从 `account.value` 读,不要绕过它去读 `state.accounts[...]`。
- 新增年度:把 JSON 放入 `data/calendar/` + 在 `src/data/sources.ts` 加 import。

## Tech Stack

Vue 3.5 + Element Plus 2.14(zh-CN locale)+ Vite 8。测试 Vitest 3.2。TypeScript 6 with `noUnusedLocals` / `noUnusedParameters` / `erasableSyntaxOnly`。
