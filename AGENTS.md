# chipRunner 代理指南

## 适用范围

这个工作区已经从纯文档仓库演进为一个以 Vue 3 + Vite 前端为主入口的交易跟踪项目，同时保留原始 Markdown 底稿、结构化 JSON 数据和 Python 工具脚本。

## 主要参考文件

- 将 [docs/dialog-tracking-draft.md](./docs/dialog-tracking-draft.md) 作为以下内容的权威来源：
  - 模型参数
  - 计算规则
  - 输出列顺序
  - 偏好的回复格式
- 将 [docs/2026-remaining-trading-dates.md](./docs/2026-remaining-trading-dates.md) 作为 `2026.06.01` 之后有效交易日的权威来源。
- 将 [docs/project-status.md](./docs/project-status.md) 作为当前项目进度、数据流和下次恢复工作的第一参考文件。
- 将 [README.md](./README.md) 作为目录结构和常用命令入口说明。

## 当前目录口径

- `src/`: 页面、计算逻辑、前端 API 调用
- `data/calendar/`: 前端直接读取的交易日 JSON
- `data/tracking/`: 跟踪总表 JSON 与实盘写回文件
- `docs/`: 原始 Markdown 文档与状态记录
- `scripts/`: Python 工具和迁移脚本

## 工作规则

- 在计算目标股数、目标现金、目标资产和各项对比指标时，应以底稿和现有计算规则为准。
- 在续写每日记录时，优先使用实际日期标签，而不是只使用第几天的序号。
- 用户每日输入应解释为实盘股数、实盘现金和收盘价，再据此更新所有派生指标。
- 不要臆造交易日。如果需要下一个交易日，必须依据 `docs/` 或 `data/calendar/` 中的现有数据推导。
- 除非用户明确要求批量导出，否则应保持输出紧凑、适合在聊天窗口中阅读。
- 当前页面中的实盘录入会写回 `data/tracking/actual-entries.json`，这依赖本地开发服务运行中。

## 回复语言

- 所有回复默认使用中文。

## 编辑约定

- 优先进行最小化修改，避免无关重构。
- 与交易日、总表、状态相关的文档更新，优先同步到 `docs/`。
- 新增结构化数据时，优先写入 `data/`，不要把 Markdown 当作前端主数据源。
- 如果项目状态、目录结构或数据流发生明显变化，应同步更新 [docs/project-status.md](./docs/project-status.md) 和 [README.md](./README.md)。

## 验证方式

- 前端日常页面改动：优先复用现有 `npm run dev` 服务进行实际检查，再看编辑器错误。
- 修改 `vite.config.ts`、依赖、写回接口、目录结构时，再运行 `npm run build` 做收口验证。
- Python/Markdown 数据改动时，应对照 [docs/dialog-tracking-draft.md](./docs/dialog-tracking-draft.md) 的公式和示例行检查一致性。
- 启动新服务前，优先复用旧服务；必须重启时，先关闭旧服务，避免同时占用多个端口。

## 自动化工具

- 前端开发服务：`npm run dev`
- 前端构建：`npm run build`
- Markdown 迁移为 JSON：`npm run migrate:data`
- 跟踪工具脚本：[scripts/tracking_tool.py](./scripts/tracking_tool.py)
  - 一键重算总表目标字段：`python3 scripts/tracking_tool.py recalc --file docs/2026-2028-tracking-total-table.md`
  - 调整初始参数并重算：`python3 scripts/tracking_tool.py recalc --initial-shares 1200 --initial-cash 0 --price 30.71 --spread 0.3 --lot-cost 3071`
  - 按日期区间提取数据：`python3 scripts/tracking_tool.py range --date-from 2027.03.01 --date-to 2027.06.30`
  - 区间提取精简视图：`python3 scripts/tracking_tool.py range --date-from 2026.06.01 --date-to 2026.12.31 --view core`
  - 按当前总资产定位目标日期与进度差：`python3 scripts/tracking_tool.py progress --date 2026.06.10 --total-assets 35101`
- 实盘写回文件：`data/tracking/actual-entries.json`

## 重新打开项目时的优先顺序

- 先看 [docs/project-status.md](./docs/project-status.md)
- 再看 [README.md](./README.md)
- 再执行 `git status --short` 确认当前工作区状态
- 如需进入页面调试，先执行 `npm run dev`