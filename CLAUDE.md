# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 指引文件关系(避免双写漂移)

- **`CLAUDE.md`(本文件)是唯一权威指引源。** 架构 / 数据流 / 约定 / 域规则的全部细节以此为准。
- **`AGENTS.md` 是 OpenCode 的入口索引**(精简版:命令 + 最易踩坑的几条 + PR 约定),内容不与本文件重复;规范变更**只改 `CLAUDE.md`**,再同步 `AGENTS.md` 的指针,不要两处各改。
- `.harness/` 是 Claude Code 运行目录,不入库(见 `.gitignore`)。

## Project Overview

chipRunner 是一个基于 Vue 3 + Element Plus 的**多票(股票)交易跟踪原型**(中文 UI),纯前端无后端。每只票有独立的模型参数(`TrackingParams`)与实盘记录,顶部标签页切换查看;状态持久化在浏览器 **localStorage**(只存关键数据:参数 + 实盘录入,计算结果全部实时派生)。计算内核 `src/lib/trackingCore.ts` 按固定规则逐日累加。

## Commands

```bash
npm run dev          # Vite dev server(纯前端,状态存浏览器 localStorage)
npm run build        # vue-tsc -b 类型检查 + vite build
npm test             # Vitest 3.x — 运行全部 tests/
npm run test:watch   # Vitest watch 模式
```

跑单个测试:`npx vitest run tests/useTrackingDashboard.test.ts`

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
- `isValidCoreTrackingParams` / `CoreTrackingSnapshot` 是模块内部 helper(不导出)。

### 数据模型

**`src/lib/accountState.ts`** 定义多票状态(代码层仍叫 `Account`,UI 语义为"票"):

```ts
interface Account {
  id: string                                    // generateAccountId() 8 位
  name: string                                  // 票名
  params: TrackingParams                        // 完整参数集(从 DEFAULT_PARAMS 复制)
  actualEntries: Record<string, ActualPositionEntry>
  updatedAt: string
}

interface AppState {
  version: 1
  firstTradingDate: string                     // 全局"生效首交易日"(UI 下拉框可调,所有票共用)
  paidInterest: number                         // 全局"已支付利息"(页眉输入框,所有票共用,2 位小数)
  selectedAccountId: string
  accounts: Record<string, Account>
  updatedAt: string
}
```

提供纯函数助手:`createSeedState({ legacyEntries, legacyParams })` / `createDefaultAccount` / `createAccount` / `renameAccount` / `deleteAccount` / `selectAccount` / `upsertAccount` / `getSelectedAccount` / `setAccountEntry` / `removeAccountEntry` / `setFirstTradingDate` / `setPaidInterest` / `migrateState`。所有更新都是不可变(spread);账户/日期缺失时相应函数返回原 `state`(无副作用),便于上层用引用比较判空。`migrateState` 给老存档补 `firstTradingDate`(默认日历首日)与 `paidInterest`(默认 0),并**清除早于日历首日(SYSTEM_START_DATE)的实盘记录**;日历首日与生效首日之间的录入只忽略不显示(拨回首日自动重现,可逆)。

### 数据流

1. **日历**:`data/calendar/*.json`(当前仅 2026 一份)→ `src/data/sources.ts` 合并为 `ALL_TRADING_DATES`(去重升序),按年索引到 `CALENDAR_BY_YEAR`。`ALL_TRADING_DATE_TO` 动态取最晚交易日。
2. **状态**: 浏览器 **localStorage**(key `chiprunner-state-v1`)持久化整个 `AppState`。首次为空时 `useAppState` 注入单"默认票"(`DEFAULT_PARAMS`,空实盘)。
3. **行计算**: `src/lib/tracking.ts` 用 `buildRows(params, ALL_TRADING_DATES)` 调用计算内核,加日期过滤;`buildComparisonRows(rows, entries)` 叠加实盘对照。
4. **UI 分层**:
   - **所有写回统一走 `onStateChange`**:App.vue 把 `useAppState.updateState` 作为 `onStateChange` 传给子 composable。子 composable 用 `accountState` 纯函数算出**新的** `AppState`,再 `onStateChange(next)` 回灌——**不要**直接改 `account.value` 或 `state.accounts[...]`。最终 `state`(唯一可写源)的 deep watcher → 400ms debounce 写回 localStorage。
   - `src/App.vue` 是装配 shell,持有 `useAppState` 实例,把当前票 `Ref` + `state` + `onStateChange` 注入 `useTrackingDashboard`;并装配票标签页 / 新建 / 编辑对话框。
   - `src/composables/useAppState.ts` 拥有整个 `state`(唯一可写源)、`selectedAccount` / `selectedAccountId` / `accounts` / `firstTradingDate` / `paidInterest`(computed)、票 CRUD(`createTicket` / `editTicket` / `selectTicket` / `removeTicket`)+ 全局首交易日调整 `setFirstTradingDate` + 全局已支付利息 `setPaidInterest`、400ms debounce 自动写回 localStorage。
   - `src/composables/useTrackingDashboard.ts` 接收 `{ account, state, onStateChange }`,所有派生状态都是当前票的;表单编辑经 `onStateChange` 写回票 params。切换票时已有 `watch(account.id)` 自动 rehydrate 表单/实盘。
   - `src/composables/useActualEntryState.ts` 同样接收 `{ account, state, onStateChange, rows, getDefaultPrice }`,保存/清除调 `setAccountEntry` / `removeAccountEntry` 后经 `onStateChange` 回灌。
   - `src/lib/trackingYearScope.ts` 决定年份视图切换时的计算截止日。
   - `src/lib/trackingDisplay.ts` 提供金额/百分比/差额格式化(`formatMoney` / `formatRatio` / `deltaTagType` 等)。

### 状态持久化(localStorage)

纯前端无后端。`useAppState` 把整个 `AppState` 序列化进浏览器 **localStorage**(key `chiprunner-state-v1`):
- 读取:模块初始化时同步读;解析失败 / 为空 → 注入默认票(`createSeedState()`)。
- 写入:对 `state` 的 deep watcher → 400ms debounce → `localStorage.setItem`。
- 只存关键数据(每只票的 params + actualEntries + 结构),计算结果不持久化。
- 部署为纯静态(`dist` + Nginx),无需 Node 后端(见 `deploy.sh`)。

### 默认模型参数

```ts
DEFAULT_PARAMS = {
  startDate: SYSTEM_START_DATE,  // = 日历首日(无 state 时的兜底);运行时新建票用当前生效首日
  initialShares: 1200,
  initialCash: 0,
  price: 23.06,
  spread: 0.35,
  lotCost: 2306,        // 通常 = price * 100
  hiddenTradingDays: 0,
  endDate: <动态 = 2026 日历最后一日,即 TRADING_DATES_2026 末位>
}
// SYSTEM_START_DATE = TRADING_DATES_2026[0] = '2026.09.07'(日历首日,作"生效首交易日"的默认值与下限)
// 实际生效首交易日 = state.firstTradingDate(界面页眉下拉框可调,所有票共用)
```

- **首交易日可调(全局)**:`AppState.firstTradingDate` 是全局"生效首交易日",界面页眉 `App.vue` 下拉框(选项 = `ALL_TRADING_DATES`)可改,经 `setFirstTradingDate` 写回 `state`。改后整套计算自动同步:计算起点、生效日期范围、日期选择器范围都跟随它(见 `useTrackingDashboard` 的 `availableDateFrom` computed)。`SYSTEM_START_DATE` 仅作默认值/下限(日历首日)。
- **初始基准行**:`buildRows(params, sourceDates, firstDate = SYSTEM_START_DATE)`(`src/lib/tracking.ts`)的 `firstDate` 即生效首交易日;当 `startDate < firstDate` 时,startDate 作为表格首行 `index=0` 的"初始基准"快照(只展示初始股数/现金/资产,`tProfit=0`、不买入),逐日 T 计算从 `firstDate` 起。`TrackingTablePanel.vue` 把该行日期列渲染为"初始基准"。`migrateState` 不再拉齐 startDate(基准日合法),并**清除早于日历首日(SYSTEM_START_DATE = 2026.09.07)的实盘记录**——9.07 起为第一个真实交易日,此前的数据不再保留。默认 `DEFAULT_PARAMS.startDate = SYSTEM_START_DATE`,新建票 draft.startDate 跟随当前 `firstTradingDate`,故首日 = startDate 时不出现基准行,首行即首个计算日。

## Components

| 组件 | 职责 |
| --- | --- |
| `App.vue` | 装配 shell,创建 `useAppState` + `useTrackingDashboard`,挂载票标签页 / 新建 / 编辑对话框 / 页眉首交易日下拉框 / 页眉已支付利息输入框 |
| `TrackingTicketTabs.vue` | 顶部票标签页(切换)+ 新建 / 编辑按钮 |
| `TrackingTicketCreateDialog.vue` | 新建票对话框(票名 + 关键参数) |
| `TrackingTicketEditDialog.vue` | 编辑票对话框(改名 + 改参数 + 删除票) |
| `TrackingFieldsForm.vue` | 新建/编辑共用的 6 字段表单(票名/起始日/股价/股数/现金/差价)+ `TicketDraft` 类型 |
| `TrackingOverviewSection.vue` | 参数表单(分区)+ 3 张统计卡片 + 顶栏操作按钮 |
| `TrackingActualPanel.vue` | 实盘录入表单(分区)+ 当前目标基准 + 保存状态 |
| `TrackingTablePanel.vue` | 18 列对照表(目标 + 实盘 + 派生) |

## Key Reference Files

- `src/lib/trackingCore.ts` — 计算内核(权威)
- `src/lib/accountState.ts` — 票状态模型(权威,代码层 `Account` = 票)
- `src/composables/useAppState.ts` — 顶层状态机(localStorage 持久化 + 票 CRUD)
- `src/composables/useTrackingDashboard.ts` — 当前票作用域 dashboard
- `tests/trackingCalendar.test.ts` — 日历准确性守卫
- `tests/appState.test.ts` — 票状态纯函数测试
- `tests/useTrackingDashboard.test.ts` — dashboard 联动测试(对照行 / 最近10日 / 表单写回)
- `data/calendar/*.json` — 交易日权威源
- `docs/project-status.md` — 当前项目状态

## Working Conventions

- 默认中文回复。
- **按钮带图标统一用 `el-button` 的 `:icon` prop**(如 `<el-button :icon="RefreshRight">文字</el-button>`),不要在 slot 里手写 `<el-icon>`——后者图标与文字垂直对齐有问题且需额外 CSS 修补;卡片标题等**纯装饰图标仍用 `<el-icon>`**。
- 优先最小化修改,避免无关重构。
- 新增结构化数据写入 `data/`,不要把 Markdown 当前端主数据源(`docs/` 仅保留项目状态)。
- 重新打开项目时:先读 `docs/project-status.md`,再看 `git status --short`,再启 `npm run dev`。
- 前端日常改动:依赖现有 `npm run dev` + 编辑器错误。
- 修改 `vite.config.ts`、依赖、目录结构后必须跑 `npm run build`。
- 替换基础参数时:**必须**同步 `tests/trackingCore.test.ts`、`tests/tracking.test.ts`、`tests/appState.test.ts` 里的基线样本值,否则 `npm test` 失败。
- **不要臆造交易日**——所有日期来自 `data/calendar/*.json`。
- 票隔离:`useTrackingDashboard` / `useActualEntryState` 都从 `account.value`(当前选中票)读,不要绕过它去读 `state.accounts[...]`。
- 新增年度:把 JSON 放入 `data/calendar/` + 在 `src/data/sources.ts` 加 import。

## Tech Stack

Vue 3.5 + Element Plus 2.14(zh-CN locale)+ Vite 8。测试 Vitest 3.2。TypeScript 6 with `noUnusedLocals` / `noUnusedParameters` / `erasableSyntaxOnly`。
