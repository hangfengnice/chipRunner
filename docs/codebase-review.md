# chipRunner 代码梳理报告

- 审查日期:2026-06-18
- 范围:全仓只读审查(**未改动任何代码**)
- 方法:逐文件阅读核心逻辑层 + composables + 组件 + 测试,辅以规模/引用/死代码扫描

---

## 1. 结论(TL;DR)

| 维度 | 评价 |
| --- | --- |
| 整体健康度 | **好**。3006 行,内核/IO/UI 分层清晰,零技术债标记 |
| 工作区 | 干净(`git status` 空,6 commit 已落盘) |
| 测试 | 内核 + 状态模型覆盖扎实;**composable 层零覆盖** |
| 梳理方向 | **增量整理**,不是重构。价值链:纯逻辑下沉 → 可测 → 常量收口 → 文档对齐 |

**最高价值单点:** 把 `useTrackingDashboard.ts`(447 行,全项目最重)**零测试**里的日期/范围逻辑抽成纯函数下沉到 `src/lib/`,顺手补单测——一举解决"不可测 + 重复 + 散落"三个问题。

---

## 2. 体检数据

### 2.1 文件规模(行数,降序)

| 文件 | 行 | 说明 |
| --- | --- | --- |
| `src/composables/useTrackingDashboard.ts` | **447** | 最重、零测试、含 7 个 watcher 联动 |
| `src/lib/accountState.ts` | 266 | 状态模型(权威,有测) |
| `tests/appState.test.ts` | 245 | 状态模型测试 |
| `src/components/TrackingOverviewSection.vue` | 242 | 参数表单 + 统计卡 |
| `src/App.vue` | 188 | 装配 shell |
| `tests/tracking.test.ts` | 179 | 内核包装测试 |
| `src/components/TrackingTablePanel.vue` | 174 | 17 列对照表 |
| `src/composables/useAppState.ts` | 165 | 顶层状态机 |
| `src/components/TrackingAccountManager.vue` | 162 | 账户管理对话框 |
| `src/composables/useActualEntryState.ts` | 158 | 实盘录入状态 |
| `src/components/TrackingActualPanel.vue` | 143 | 实盘录入表单 |
| `src/lib/tracking.ts` | 136 | 内核包装(加日期过滤/对照) |
| `tests/trackingCore.test.ts` | 84 | 内核测试 |
| 其余 | < 65 | 内核 / 格式化 / 年份作用域 / 日历 / switcher |

### 2.2 测试覆盖矩阵

| 层 | 覆盖 | 备注 |
| --- | --- | --- |
| 计算内核 `trackingCore` | ✅ | 纯函数,5 用例 |
| 内核包装 `tracking` | ✅ | 含跨账户隔离用例 |
| 状态模型 `accountState` | ✅ | 18 用例,最全 |
| 日历 `sources` | ✅ | `trackingCalendar` 守卫准确性 |
| 年份作用域 `trackingYearScope` | ✅ | `resolveScopeEndDate` 有测 |
| **`useAppState`** | ❌ | 保存防死循环、debounce、CRUD 联动无测 |
| **`useActualEntryState`** | ❌ | 表单回填、账户切换无测 |
| **`useTrackingDashboard`** | ❌ | 447 行联动逻辑零覆盖 |
| 组件 `.vue` | ❌ | 无 DOM 测试(可接受,原型阶段) |

### 2.3 技术债标记扫描

`grep TODO|FIXME|@ts-ignore|console|debugger|any` → **0 命中**。代码很干净。

---

## 3. 发现清单(分级)

### P0 — 低风险,应尽快(纯整理,行为不变)

#### F1. `roundMoney` 重复定义
- **位置:** `src/lib/trackingCore.ts:28`(已 `export`)vs `src/composables/useActualEntryState.ts:26`(逐字重新定义)
- **现象:** 同一实现 `Number(value.toFixed(2))` 存在两份。
- **建议:** 删 `useActualEntryState.ts:26`,改 `import { roundMoney } from '../lib/trackingCore'`。
- **风险/工作量:** 极低 / 5 分钟。`npm test` 即可验证。

#### F2. 日期工具散落在 composable 内(不可测)
- **位置:** `useTrackingDashboard.ts` 内的 `toIsoDate`(:42)、`toDateTime`(:44)、`formatCurrentDate`(:46)、`clampDateWithin`(:79)
- **现象:** 这些是**纯函数**,却定义在 composable 作用域里,无法单独测试,也无法跨文件复用。
- **建议:** 新建 `src/lib/dateUtils.ts` 导出上述 4 个;`useTrackingDashboard` 改为 import;新增 `tests/dateUtils.test.ts`。
- **风险/工作量:** 低 / 30 分钟。纯搬运 + 加测。

#### F3. 硬编码 `'2026.06.15'` 散落
- **位置:** 定义点 `tracking.ts:54`;**重复 fallback** `useActualEntryState.ts:41` 与 `:85`;**文案** `TrackingOverviewSection.vue:178`
- **现象:** `DEFAULT_PARAMS.startDate` 已是权威源,但 4 处直接写字面量。改默认起始日时易漏改(正是 CLAUDE.md 警告的痛点)。
- **建议:** `useActualEntryState` 两处 fallback 改用 `DEFAULT_PARAMS.startDate`;OverviewSection 文案改为绑定 `form.startDate`(动态)。
- **风险/工作量:** 低 / 15 分钟。注意按 CLAUDE.md 约定同步测试基线(测试里 `'2026.06.15'` 是**数据样本**,不是常量,可保留)。

#### F4. 文档与代码不符
- **位置:** `docs/project-status.md` 计算口径段(~line 37)
- **现象:** 写 "`endDate` 动态 = `ALL_TRADING_DATE_TO`",实际是 `TRADING_DATES_2026` 末位(= `2026.12.31`)。`ALL_TRADING_DATE_TO` 是 2030 末位。表述错误(数值碰巧一致,语义错)。CLAUDE.md 已修正,此处漏改。
- **建议:** 同步为 CLAUDE.md 的口径:"动态 = 2026 日历最后一日(`TRADING_DATES_2026` 末位)"。顺带把更新时间刷到 2026-06-18。
- **风险/工作量:** 极低 / 5 分钟。

### P1 — 中风险,高收益(依赖 P0 的 F2)

#### F5. composable 层零测试(重点 `useTrackingDashboard`)
- **位置:** `useTrackingDashboard.ts`(447)/`useAppState.ts`(165)/`useActualEntryState.ts`(158)
- **现象:** 状态机、年份切换、displayRange clamp、保存防死循环(`ignoreWatcher`)等高风险联动**完全无护栏**。
- **建议:** 优先做 F2 把日期/范围逻辑抽成纯函数后,对这些纯函数补测;再用 `@vue/test-utils` + `node` 环境对 `useAppState` 的 debounce/防循环做集成测(可选)。
- **风险/工作量:** 中 / 半天起。需要先落 F2。

#### F6. `resolvePreferred*` 双胞胎函数语义混淆
- **位置:** `useTrackingDashboard.ts:55` `resolvePreferredDate`(**偏"今天"**)vs `useActualEntryState.ts:29` `resolvePreferredEntryDate`(**取最早**)
- **现象:** 名字相近、签名相近,但**逻辑不同**(一个找 ≤today 的最近日,一个直接取排序后最早)。维护时极易看错。
- **建议:** 二选一:① 重命名以暴露语义(如 `pickTodayAnchoredDate` / `pickEarliestDate`);② 合并为带选项的 `pickPreferredDate(dates, { mode: 'today'|'earliest', fallback })`,放 `dateUtils.ts`。
- **风险/工作量:** 中 / 20 分钟。改完补测锁定语义。

### P2 — 低优先级,可选

#### F7. `accountCount` 导出未被消费(死代码候选)
- **位置:** `useAppState.ts:48` 导出,但 `App.vue` 解构未取。
- **建议:** 确认是否预留 API;否则从返回值移除。
- **风险/工作量:** 极低。

#### F8. `CoreTrackingSnapshot` 仅内部 `extends` 使用
- **位置:** `trackingCore.ts:10` `export interface`,仅 `:18` 的 `CoreTrackingRow extends` 用到,外部无引用。
- **建议:** 改为非导出 `interface`(纯整理)。
- **风险/工作量:** 极低。

#### F9. `state.json` 历史 `endDate` 观察(不必迁移)
- **现象:** 现存 2 个账户的 `endDate` 均为字面 `"2026.12.31"`,是旧代码遗留值。当前默认逻辑动态取 2026 日历末位(也是 `2026.12.31`),**数值一致**,无需迁移。
- **建议:** 仅作记录。`version: 1` 是唯一版本,数据简单(2 账户、0 实盘),不要为此引入 schema 迁移机制。

---

## 4. 推进顺序(分批,每批可独立 ship + 验证)

每批结束后跑 `npm test`(纯函数改动)或 `npm run build`(触达类型/配置时)。

| 批次 | 内容 | 涉及发现 | 验证 |
| --- | --- | --- | --- |
| **A** | 新建 `src/lib/dateUtils.ts`,下沉日期工具 + `roundMoney` 去重 + 补 `dateUtils.test.ts` | F1, F2 | `npm test` |
| **B** | `'2026.06.15'` 收口到 `DEFAULT_PARAMS.startDate`;同步测试基线 | F3 | `npm test` |
| **C** | 文档对齐 `project-status.md` + 刷日期 | F4 | 人工 |
| **D** | composable 测试(依赖 A 抽离完成);`resolvePreferred` 语义整理 | F5, F6 | `npm test` |
| **E** | 死代码清理 | F7, F8 | `npm run build` |

A→B→C 可连续做(都低风险);D 必须在 A 之后;E 任何时候都可。

---

## 5. 不建议做的事

- **不要大改 `useTrackingDashboard` 的 7 个 watcher 编排。** 它们现在能正确联动(年份→endDate→displayRange→clamp),重构风险高、收益低。要测就先把里面的**纯逻辑**抽出来测(F2),watcher 本身保持不动。
- **不要给 `state.json` 引入 schema 迁移机制。** `version: 1` 是唯一版本,数据简单(F9),加迁移路径是过度设计。
- **不要引入 ESLint/Prettier。** 项目靠 `vue-tsc`(strict + `noUnusedLocals/Parameters`)+ Vitest 守门,目前够用;引入 lint 是独立议题,不在本次"梳理"范围。

---

## 6. 附:本次未深入的部分(供后续判断)

- 组件 `.vue` 的 DOM/交互测试:原型阶段可接受,未列为问题。
- Vite 中间件 `appStateApiPlugin` 的并发/校验:`validateState` 已覆盖主要校验(version/selectedId/accounts 非空/账户字段完整),够用。
- 日历 JSON 准确性:已有 `trackingCalendar.test.ts` 守卫(升序/去重/首日≥2026.06.08/仅含 calendar 源),不在本次范围。
