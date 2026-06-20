# 项目状态记录

更新时间:2026-06-20

## 当前状态

- **2026-06-20**:四份文档(CLAUDE/README/project-status/codebase-review)全面对齐当前状态。
- **2026-06-19 ~ 06-20**:基线参数重置为 `2026.06.22 / 1200股 / 现金0 / 23.06 / 0.35 / lotCost 2306`(`state.json` 同步重置);表格字段改造——「做T差额」列替换为用户录入的「当天实际获取现金」+ 新增「累计获取现金」(逐日 running sum),表格 17 → 18 列;移除账户切换/管理 UI(`TrackingAccountSwitcher`/`TrackingAccountManager`),多账户数据模型保留,`useAppState` 去掉 CRUD;表单分区优化(参数区 3 列、实盘区 2 列,带单位 + 小标题);买入日高亮改 success 绿 + 连续 streak 奇偶交替;清理表格 tag 全局颜色覆盖、死 CSS(hero/notes/未用变量,style.css 426→338 行);去重 `roundMoney`、收口 `'2026.06.15'`→`DEFAULT_PARAMS.startDate`、删死代码 `accountCount`。`build` + 35 用例全绿。
- **2026-06-18**:代码梳理(只读审查)产出 `docs/codebase-review.md`(9 条发现 F1–F9、5 批推进 A–E);执行**日历精简**——仅保留 2026 日历,删除 2027–2030,同步 `src/data/sources.ts`,删除失效的"跨年累计"测试用例。`CLAUDE.md` 同步修正 endDate / composable 签名 / onStateChange 说明。
- 仓库根目录为 Vite 项目;Vue 3 + TypeScript + Element Plus 技术栈稳定。
- 多账户数据模型已落地:每个账户独立的 `TrackingParams` + 独立的实盘记录,持久化在 `data/tracking/state.json`。
- 旧的单账户 `actual-entries.json` 已下线,首次启动时服务端会自动迁移到 `state.json` 的"默认账户"中,然后删除老文件。
- Python 迁移工具 (`scripts/migrate_data.py`)、重复的 Markdown 副本 (`docs/2026-*.md`、`docs/2027-2030-estimated-trading-dates.md`、`docs/dialog-tracking-draft.md`、`docs/baseline-refresh-playbook.md`)、冗余 Vue 组件 (`TrackingHeroPanel.vue`、`TrackingNotesPanel.vue`)、未引用的 `data/tracking/*.json` 全部清理。
- `tests/tracking.test.ts` 的"跨年累计"用例在日历精简至仅 2026 后失效,已删除(连续累计核心仍由 `trackingCore.test.ts` 覆盖)。
- 日期准确性已由新增的 `tests/trackingCalendar.test.ts` 守卫:断言 `ALL_TRADING_DATES` 升序、去重、首日 ≥ `2026.06.08`、仅含 `data/calendar/*.json` 中的日期。

## 当前目录口径

- `src/`:Vue 组件、composables、计算内核、浏览器侧 API 封装
- `src/lib/`:计算、状态模型、格式化、API 客户端(纯函数或浏览器侧 IO)
- `data/calendar/`:1 份年度交易日 JSON(2026)
- `data/tracking/state.json`:多账户状态文件(由 `appStateApiPlugin` 维护)
- `docs/`:本文件 + 项目级说明
- `tests/`:Vitest 测试(纯函数,无 DOM)

## 已完成功能

- 目标模型参数录入与逐日重算(基于 `trackingCore`)
- 2026 交易日连续计算
- 年份视图切换与展示区间筛选
- 预期股数、预期现金、预期总资产摘要卡片
- 当前股数、当前现金、收盘价录入与对照
- 实盘录入通过 `/api/state` PUT 写回 `state.json`
- 多账户数据模型:独立参数 + 独立实盘(账户切换/管理 UI 已移除,UI 锁定当前账户)

## 计算口径

- 权威内核:`src/lib/trackingCore.ts` —— 纯函数,不感知账户、不感知 IO。
- `src/lib/tracking.ts` 包装内核:加日期过滤 (`buildRows`)、实盘对照 (`buildComparisonRows`)。
- 默认参数:`startDate='2026.06.22'`、`initialShares=1200`、`initialCash=0`、`price=23.06`、`spread=0.35`、`lotCost=2306`、`hiddenTradingDays=0`、`endDate` 动态 = 2026 日历最后一日(`TRADING_DATES_2026` 末位)。

## 数据流

1. 日历 JSON → `src/data/sources.ts` 合并 → `ALL_TRADING_DATES`
2. 持久化状态 → `data/tracking/state.json`(由 `/api/state` 维护)
3. 启动:服务端若发现 `state.json` 缺失 + 老 `actual-entries.json` 存在 → 迁移并删除老文件;否则直接 seed 一个 "默认账户"。
4. 客户端:`useAppState` 加载 → `useTrackingDashboard` 用当前账户的 `params` + 实盘 → 18 列表格 + 3 张卡片 + 实盘录入。

## 当前限制

- UI 锁定为单账户视图(无切换入口);底层多账户数据模型仍保留。表格 18 列对照。
- 实盘写入是 debounce 400ms 自动整 state PUT;不提供 per-entry 端点。
- `state.json` 没有 schema version 之外的迁移路径;`version: 1` 是当前唯一版本。

## 当前验证状态

- `npm run build` 已通过(Vue 3.5 + TypeScript 6 + Vite 8)
- `npm test` 已通过 35 个用例,覆盖:`trackingCore` 4 + `tracking` 4(含跨账户隔离用例)+ `trackingYearScope` 2 + `appState` 18 + `trackingCalendar` 7

## 重新打开项目时的快速恢复

1. 阅读本文件,确认架构、目录、限制
2. 阅读 `CLAUDE.md`,确认约定和命令
3. 执行 `git status --short`,确认是否有未提交改动
4. 需要进入页面:`npm run dev`(或复用现有服务)
5. 需要核对计算:`src/lib/trackingCore.ts`
6. 需要核对多账户逻辑:`src/lib/accountState.ts` + `src/composables/useAppState.ts`
7. 若要继续代码梳理:读 `docs/codebase-review.md` 的「后续进展」节——F1/F3/F4/F7 已完成、F2 跳过、F5/F6/F8 为可选项。
