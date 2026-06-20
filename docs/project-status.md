# 项目状态记录

更新时间:2026-06-20

## 项目简介

chipRunner —— Vue 3 + Element Plus 的**多票(股票)交易跟踪原型**(中文 UI),纯前端无后端,状态存浏览器 localStorage。

## 当前能力

- **多票**:顶部标签页切换;新建(票名 + 股价/初始股数/初始现金/每日差价/起始日)、编辑(改名 + 改初始数据)、删除(二次确认,最后一只不可删)
- 模型参数实时重算(逐日累加:做T利润 → 现金 → 触发买入手)
- 2026 交易日连续计算、年份视图、展示区间筛选
- 18 列对照表(目标 + 实盘 + 派生),含当天/累计实际获取现金
- 实盘录入写回 localStorage(纯前端)

## 架构要点

- **计算内核** `src/lib/trackingCore.ts`:纯函数,逐日累加(权威)
- **票状态模型** `src/lib/accountState.ts`:多票 `AppState`(代码层 `Account` = 票),纯函数 CRUD
- **composable 层**:
  - `useAppState`:localStorage 持久化 + 票 CRUD(`createTicket` / `editTicket` / `selectTicket` / `removeTicket`)
  - `useTrackingDashboard`:当前票的参数/行/对照/汇总;切换票自动 rehydrate
  - `useActualEntryState`:实盘录入(保存/清除)
- **持久化**:localStorage(key `chiprunner-state-v1`),只存关键数据(参数 + 实盘),计算实时派生
- **部署**:纯静态(`dist` + Nginx,见 `deploy.sh`)

## 目录

- `src/`:Vue 组件、composables、计算内核、格式化
- `src/lib/`:计算内核、票状态、格式化(纯函数)
- `data/calendar/`:1 份年度交易日 JSON(2026)
- `docs/`:本文件
- `tests/`:Vitest 测试

## 默认参数

`startDate='2026.06.22'` / `initialShares=1200` / `initialCash=0` / `price=23.06` / `spread=0.35` / `lotCost=2306` / `hiddenTradingDays=0` / `endDate`=2026 日历最后一日。

## 当前限制

- localStorage 存储:换浏览器/清缓存会丢数据,多设备不同步。
- 当前仅 2026 单年日历。
- `version: 1` 是唯一数据版本,无迁移路径。

## 验证状态

- `npm run build` 通过(Vue 3.5 + TypeScript 6 + Vite 8)
- `npm test` 通过 **37 用例**:
  - `trackingCore` 4 / `tracking` 4 / `trackingYearScope` 2 / `trackingCalendar` 7(纯函数 + 日历)
  - `appState` 17(票状态模型 CRUD)
  - `useTrackingDashboard` 3(composable 联动:对照行 / 最近10日 / 表单写回)

## 重新打开项目

1. 阅读本文件,确认能力/架构/限制
2. 阅读 `CLAUDE.md`,确认约定和命令
3. `git status --short` 看未提交改动
4. 进页面:`npm run dev`
5. 核对计算:`src/lib/trackingCore.ts`
6. 核对票/状态逻辑:`src/lib/accountState.ts` + `src/composables/useAppState.ts`
