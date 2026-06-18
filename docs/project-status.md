# 项目状态记录

更新时间:2026-06-16

## 当前状态

- 仓库根目录为 Vite 项目;Vue 3 + TypeScript + Element Plus 技术栈稳定。
- 多账户数据模型已落地:每个账户独立的 `TrackingParams` + 独立的实盘记录,持久化在 `data/tracking/state.json`。
- 旧的单账户 `actual-entries.json` 已下线,首次启动时服务端会自动迁移到 `state.json` 的"默认账户"中,然后删除老文件。
- Python 迁移工具 (`scripts/migrate_data.py`)、重复的 Markdown 副本 (`docs/2026-*.md`、`docs/2027-2030-estimated-trading-dates.md`、`docs/dialog-tracking-draft.md`、`docs/baseline-refresh-playbook.md`)、冗余 Vue 组件 (`TrackingHeroPanel.vue`、`TrackingNotesPanel.vue`)、未引用的 `data/tracking/*.json` 全部清理。
- 老的 `tests/tracking.test.ts` 中"跨年累计"用例的基线与当前日历/计算结果不一致,已重新对齐到 `npm test` 的当前真实输出值。
- 日期准确性已由新增的 `tests/trackingCalendar.test.ts` 守卫:断言 `ALL_TRADING_DATES` 升序、去重、首日 ≥ `2026.06.08`、仅含 `data/calendar/*.json` 中的日期。

## 当前目录口径

- `src/`:Vue 组件、composables、计算内核、浏览器侧 API 封装
- `src/lib/`:计算、状态模型、格式化、API 客户端(纯函数或浏览器侧 IO)
- `data/calendar/`:5 份年度交易日 JSON(2026–2030)
- `data/tracking/state.json`:多账户状态文件(由 `appStateApiPlugin` 维护)
- `docs/`:本文件 + 项目级说明
- `tests/`:Vitest 测试(纯函数,无 DOM)

## 已完成功能

- 目标模型参数录入与逐日重算(基于 `trackingCore`)
- 2026–2030 多年度交易日连续计算
- 年份视图切换与展示区间筛选
- 预期股数、预期现金、预期总资产摘要卡片
- 当前股数、当前现金、收盘价录入与对照
- 实盘录入通过 `/api/state` PUT 写回 `state.json`
- 多账户隔离:独立参数 + 独立实盘,UI 顶部下拉切换 + 管理对话框

## 计算口径

- 权威内核:`src/lib/trackingCore.ts` —— 纯函数,不感知账户、不感知 IO。
- `src/lib/tracking.ts` 包装内核:加日期过滤 (`buildRows`)、实盘对照 (`buildComparisonRows`)。
- 默认参数:`startDate='2026.06.15'`、`initialShares=500`、`initialCash=1650.30`、`price=36.14`、`spread=1.2`、`lotCost=3614`、`hiddenTradingDays=0`、`endDate` 动态 = `ALL_TRADING_DATE_TO`。

## 数据流

1. 日历 JSON → `src/data/sources.ts` 合并 → `ALL_TRADING_DATES`
2. 持久化状态 → `data/tracking/state.json`(由 `/api/state` 维护)
3. 启动:服务端若发现 `state.json` 缺失 + 老 `actual-entries.json` 存在 → 迁移并删除老文件;否则直接 seed 一个 "默认账户"。
4. 客户端:`useAppState` 加载 → `useTrackingDashboard` 用当前账户的 `params` + 实盘 → 17 列表格 + 3 张卡片 + 实盘录入。

## 当前限制

- UI 一次只展示一个账户的 17 列对照;若需要"两账户对比"需另开视图,本期不做。
- 实盘写入是 debounce 400ms 自动整 state PUT;不提供 per-entry 端点。
- `state.json` 没有 schema version 之外的迁移路径;`version: 1` 是当前唯一版本。

## 当前验证状态

- `npm run build` 已通过(Vue 3.5 + TypeScript 6 + Vite 8)
- `npm test` 已通过 36 个用例,覆盖:`trackingCore` 5 + `tracking` 5(含跨账户隔离用例)+ `trackingYearScope` 2 + `appState` 18 + `trackingCalendar` 7

## 重新打开项目时的快速恢复

1. 阅读本文件,确认架构、目录、限制
2. 阅读 `CLAUDE.md`,确认约定和命令
3. 执行 `git status --short`,确认是否有未提交改动
4. 需要进入页面:`npm run dev`(或复用现有服务)
5. 需要核对计算:`src/lib/trackingCore.ts`
6. 需要核对多账户逻辑:`src/lib/accountState.ts` + `src/composables/useAppState.ts`
