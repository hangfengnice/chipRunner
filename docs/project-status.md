# 项目状态记录

更新时间:2026-09-06(内容复核:52 用例与构建当日实测复验通过;补线上部署状态)

## 项目简介

chipRunner —— Vue 3 + Element Plus 的**多票(股票)交易跟踪原型**(中文 UI),纯前端无后端,状态存浏览器 localStorage。

## 当前能力

- **多票**:顶部标签页切换;新建(票名 + 股价/初始股数/初始现金/每日差价/起始日)、编辑(改名 + 改初始数据)、删除(二次确认,最后一只不可删)
- **输入校验**:新建/编辑票时,票名为空 → 提示且阻断;起始日非交易日 → 提示「将从最近的下一个交易日开始」(不阻断)
- 模型参数实时重算(逐日累加:做T利润 → 现金 → 触发买入手)
- **首交易日可调**:页眉下拉框(全局,所有票共用)从交易日历选一天作为"生效首交易日",选中后计算起点/日期范围/选择器范围全部自动同步;默认 = 日历首日(2026.09.07)
- **已支付利息**:页眉右上角输入框(全局,所有票共用),2 位小数,经 `AppState.paidInterest` 持久化到 localStorage
- **初始基准行**:当票起始日早于生效首交易日时,初始股数/现金作为表格首行"初始基准"固定展示(不参与逐日计算);逐日 T 从生效首交易日起算。早于日历首日(2026.09.07)的实盘记录在加载时自动**清除**(9.07 为第一个真实交易日,之前数据不再保留)
- 2026 交易日连续计算、年份视图、展示区间筛选
- 18 列对照表(目标 + 实盘 + 派生),含当天/累计实际获取现金
- 实盘录入写回 localStorage(纯前端)

## 架构要点

- **计算内核** `src/lib/trackingCore.ts`:纯函数,逐日累加(权威)
- **票状态模型** `src/lib/accountState.ts`:多票 `AppState`(代码层 `Account` = 票),纯函数 CRUD
- **composable 层**:
  - `useAppState`:localStorage 持久化 + 票 CRUD(`createTicket` / `editTicket` / `selectTicket` / `removeTicket`)+ 全局首交易日 `firstTradingDate` / `setFirstTradingDate` + 全局已支付利息 `paidInterest` / `setPaidInterest`
  - `useTrackingDashboard`:当前票的参数/行/对照/汇总;切换票自动 rehydrate
  - `useActualEntryState`:实盘录入(保存/清除)
- **持久化**:localStorage(key `chiprunner-state-v1`),只存关键数据(参数 + 实盘),计算实时派生
- **部署**:纯静态(`dist` + Nginx,见 `deploy.sh`)。**已上线(2026-09-04)**:`http://112.124.38.17/`,阿里云 ECS 上 nginx 托管 `/var/www/html`,同机还共住一个 `/chat/` 路径的应用(互不干扰);更新流程 = 本地 `npm run build` 后重跑 `deploy.sh`

## 目录

- `src/`:Vue 组件、composables、计算内核、格式化
- `src/lib/`:计算内核、票状态、格式化(纯函数)
- `data/calendar/`:1 份年度交易日 JSON(2026)
- `docs/`:本文件
- `tests/`:Vitest 测试

## 默认参数

`startDate=SYSTEM_START_DATE`('2026.09.07',日历首日)/ `initialShares=1200` / `initialCash=0` / `price=23.06` / `spread=0.35` / `lotCost=2306` / `hiddenTradingDays=0` / `endDate`=2026 日历最后一日。日历首日 = `2026.09.07`(共 78 个交易日,9.07 前的日期已裁剪,最近一次删除 08.31–09.04)。**生效首交易日 = `AppState.firstTradingDate`**(界面页眉下拉框可调,默认日历首日);逐日 T 从生效首交易日起算,票起始日早于它时作为表格首行"初始基准"快照展示。

## 当前限制

- localStorage 存储:换浏览器/清缓存会丢数据,多设备不同步。
- 当前仅 2026 单年日历。
- `version: 1` 是唯一数据版本,无迁移路径。

## 验证状态

- `npm run build` 通过(Vue 3.5 + TypeScript 6 + Vite 8;2026-09-06 复验,构建期有一条 rolldown pure-annotation 提示,无害)
- `npm test` 通过 **52 用例**(2026-09-06 复验):
  - `trackingCore` 4 / `tracking` 6 / `trackingYearScope` 2 / `trackingCalendar` 7(纯函数 + 日历)
  - `appState` 26(票状态模型 CRUD + 迁移 + 全局首交易日 + 已支付利息)
  - `useTrackingDashboard` 7(composable 联动:对照行 / 最近10日 / 表单写回 / 基准行常驻 / 首交易日联动)

## 工作区状态(2026-09-06)

- git 最后一次提交在 2026-06-23(`327f403`),此后约 560 行改动**未提交**,含:交易日历重切(131 天 → 78 天,起点 2026.09.07)、首交易日下拉 / 已支付利息 / 初始基准行整套功能、三个测试文件扩充、本文档。功能以本文档描述为准(内容已对照代码复核)
- 提交信息惯例(历史遗留)多为 `refactor`/`step` 等笼统词,考古靠 diff

## 重新打开项目

1. 阅读本文件,确认能力/架构/限制
2. 阅读 `CLAUDE.md`,确认约定和命令
3. `git status --short` 看未提交改动
4. 进页面:`npm run dev`
5. 核对计算:`src/lib/trackingCore.ts`
6. 核对票/状态逻辑:`src/lib/accountState.ts` + `src/composables/useAppState.ts`
