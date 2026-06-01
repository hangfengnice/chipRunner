# 项目状态记录

更新时间：2026-05-31

## 当前状态

- 仓库已经从子目录前端结构调整为根目录 Vite 项目。
- 前端技术栈为 Vue 3 + TypeScript + Element Plus。
- 原始 Markdown 底稿、交易日和总表文档已归档到 `docs/`。
- 前端直接消费的结构化数据已经迁移到 `data/`。
- 目标重算公式已收敛到 TypeScript 单一内核，避免前端与 Python 双实现分叉。
- 前端默认参数已对齐 `docs/dialog-tracking-draft.md` 的权威口径。
- 当前基础参数口径：起始日 `2026.06.01`，初始股 `4900`，初始现 `2313.83`，股价 `25.35`，每日差价 `0.4`，每手成本 `2535`。
- 本次基础数据替换的具体链路、命令和优化建议已整理到 `docs/baseline-refresh-playbook.md`。

## 当前目录口径

- `src/`: 页面、计算逻辑、前端 API 调用
- `data/calendar/`: 年度交易日 JSON
- `data/tracking/`: 跟踪总表 JSON 与实盘写回文件
- `docs/`: 原始 Markdown 文档与计算底稿
- `scripts/`: Markdown 迁移脚本与旧版 Python 工具

## 已完成功能

- 目标模型参数录入与逐日重算
- 2026-2030 多年度交易日连续计算
- 年份切换与展示区间筛选
- 目标股、目标现、目标资产摘要卡片
- 实盘股、实盘现、收盘价录入
- 对照列展示：实盘总资产、差额、目标对应日期、进度差、总资产百分比
- 实盘录入通过 `/api/actual-entries` 写回 `data/tracking/actual-entries.json`

## 数据流状态

### 原始资料

- 原始交易日与总表 Markdown 保留在 `docs/`
- 作为人工核对和聊天展示的权威文档来源

### 结构化数据

- `scripts/migrate_data.py` 负责把 `docs/` 中的 Markdown 迁移为 JSON
- 跟踪总表会同时生成整表 JSON 和 `.meta.json` 轻量摘要，前端首屏优先读取摘要以减小主包
- 前端当前读取：
  - `data/calendar/2026-remaining-trading-dates.json`
  - `data/tracking/2026-2028-tracking-total-table.meta.json`
  - `data/tracking/actual-entries.json`

### 计算内核

- 权威计算内核：`src/lib/trackingCore.ts`
- 前端页面：`src/lib/tracking.ts` 调用该内核并补充实盘对照列计算
- Python 工具：`scripts/tracking_tool.py recalc` 通过 `npm run tracking:core -- compute` 调用同一 TS 内核返回重算结果

### 实盘写回

- 当前页面保存/清除实盘记录时，不再只写浏览器本地存储
- 当前实现会通过 Vite 本地服务中间件直接改写 `data/tracking/actual-entries.json`
- 因此写回能力依赖本地开发服务或 preview 服务运行中

## 当前限制

- 实盘写回目前只同步到 `data/tracking/actual-entries.json`
- 还没有自动回写到 `docs/2026-2028-tracking-total-table.md`
- 历史总表 JSON 目前仍主要作为迁移基线和人工参考，不是页面实时计算的数据源
- 纯静态打开构建产物时，页面没有文件系统写权限
- `python3 scripts/tracking_tool.py recalc` 现依赖本地 Node 环境及已安装前端依赖（用于调用 TS 内核）

## 当前验证状态

- `npm install` 已完成
- `npm run build` 已通过
- `npm test` 已通过（覆盖核心重算与进度对照）
- `/api/actual-entries` 的 `GET / POST / DELETE` 已做过往返验证

## 当前工作区提醒

- 当前仓库处于一次较大目录重构之后的工作区状态。
- 根目录已经切换为 Vite 项目入口，原始 Markdown 已迁移到 `docs/`。
- 下次重新打开前，优先执行 `git status --short`，先确认是否仍有未提交改动，再继续开发。

## 关闭前建议

- 至少保留当前文档状态：优先查看本文件和 `README.md`。
- 如果还要继续前端开发，关闭前不必额外跑 `npm run build`；页面级改动优先依赖现有 dev 服务和编辑器错误检查。
- 如果改过 `vite.config.ts`、依赖、接口或目录结构，再用一次 `npm run build` 收口。
- 如果后续要复用本次进度，关项目之前建议记录或提交当前工作区状态。

## 重新打开快速恢复

- 第一步：阅读本文件，确认当前架构和限制。
- 第二步：阅读 `README.md`，确认目录和命令。
- 第三步：执行 `git status --short`，确认当前是否还有未提交变更。
- 第四步：如需看页面，优先复用现有开发服务；如果服务不存在，再执行 `npm run dev`。
- 第五步：如需核对交易逻辑，优先回到 `docs/dialog-tracking-draft.md` 和 `data/` 中的 JSON 数据。

## 建议的下一步

- 将 `actual-entries.json` 同步回 Markdown 总表的实盘列
- 增加导出能力，支持 JSON 或 Markdown
- 为多年度视图补充更完整的年份汇总、快捷跳转和导出能力