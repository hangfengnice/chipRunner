# chipRunner

基于 Vue 3 + Element Plus 的交易跟踪原型(中文 UI)。详细架构、命令、数据模型、约定见 [CLAUDE.md](./CLAUDE.md)。

## 常用命令

- `npm install`:安装依赖
- `npm run dev`:启动本地开发服务(`/api/state` 写回依赖此服务)
- `npm run build`:类型检查 + 构建
- `npm test`:跑全部 Vitest 测试

## 目录

- `src/`:Vue 组件、composables、计算内核
- `data/calendar/`:交易日 JSON(当前仅 2026)
- `data/tracking/state.json`:多账户状态持久化文件
- `docs/`:项目状态记录
- `tests/`:Vitest 测试

## 当前能力

- 多账户数据模型(每账户独立参数 + 实盘),UI 聚焦当前账户
- 调整参数实时重算(默认 1200 股 / 现金 0 / 股价 23.06 / 差价 0.35 / 每手 2306,从 2026.06.22 起算)
- 2026 交易日连续计算、年份视图、展示区间筛选
- 预期股数/现金/总资产 + 实盘对照,含当天/累计实际获取现金(18 列)
- 进度差、总资产百分比、目标对应日期等派生指标
- 实盘录入通过 Vite 中间件直接写回 `state.json`
