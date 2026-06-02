# chipRunner

基于 Vue 3 + Element Plus 的交易跟踪原型仓库。

当前项目状态见 [docs/project-status.md](./docs/project-status.md)。

如需再次替换基础数据，先看 [docs/baseline-refresh-playbook.md](./docs/baseline-refresh-playbook.md)。

## 目录结构

- `src/`: 前端页面与计算逻辑
- `data/calendar/`: 由历史 Markdown 迁出的交易日 JSON
- `data/tracking/`: 由历史 Markdown 迁出的跟踪总表 JSON 与实盘写回文件
- `docs/`: 原始 Markdown 底稿、交易日与总表文档
- `scripts/tracking_tool.py`: 现有跟踪计算脚本
- `scripts/migrate_data.py`: Markdown 到 JSON 的迁移脚本

## 当前能力

- 调整模型参数并重算目标跟踪结果
- 支持 2026-2030 多年度连续计算、年份切换与展示区间筛选
- 展示目标股、目标现、目标资产摘要
- 录入实盘股、实盘现、收盘价
- 直接在页面展示对照列与进度差
- 通过本地服务把实盘记录写回 `data/tracking/actual-entries.json`

## 计算口径

- 目标股/目标现/目标资产的权威计算内核为 `src/lib/trackingCore.ts`。
- 页面实时计算通过 `src/lib/tracking.ts` 复用该内核。
- `scripts/tracking_tool.py recalc` 也会委托给同一套 TypeScript 内核，避免 Python 与前端各自维护一份公式。
- 页面默认参数已与 `docs/dialog-tracking-draft.md` 对齐：`2600 / 1376.18 / 40.20 / 0.5 / 4020`，默认前置交易日为 `0`，从 `2026.06.03` 起算。

## 常用命令

- `npm install`: 安装前端依赖
- `npm run dev`: 启动本地开发服务
- `npm run build`: 构建前端
- `npm test`: 运行核心计算自动化测试
- `npm run migrate:data`: 从 `docs/` 重新生成 JSON 数据
- `npm run tracking:core -- compute`: 通过 stdin 调用 TS 计算内核（供脚本复用）
- `python3 scripts/tracking_tool.py recalc`: 重算总表目标字段

## 数据说明

- `docs/` 保留原始 Markdown，方便人工核对和聊天展示。
- `data/` 是前端直接消费的结构化 JSON，后续新增页面功能时优先读取这里。
- `data/tracking/*.meta.json` 保存轻量摘要，前端首屏优先读取它，避免把整份历史总表打进主包。
- 如果 Markdown 有更新，先执行 `npm run migrate:data`，再让前端读取新数据。

## 写回说明

- 页面中的实盘录入会通过 `/api/actual-entries` 写回 `data/tracking/actual-entries.json`。
- 这项能力依赖 `npm run dev` 或 `vite preview` 运行中的本地服务。
- 如果只是单独打开静态构建产物，页面无法直接改写仓库文件。

## 重新打开项目

- 先阅读 `docs/project-status.md`
- 再执行 `git status --short` 查看当前工作区状态
- 如需进入页面，优先复用已有 dev 服务；没有服务时再执行 `npm run dev`
- 如需核对规则，优先查看 `docs/dialog-tracking-draft.md`

## 当前限制

- 实盘写回目前还没有自动同步回 `docs/` 下的 Markdown 总表。
- 历史总表 JSON 仍主要用于参考，页面当前实时重算以交易日 JSON + TS 计算内核为准。
