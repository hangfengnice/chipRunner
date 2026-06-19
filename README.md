# chipRunner

基于 Vue 3 + Element Plus 的多账户交易跟踪原型(中文 UI)。详细架构、命令、数据模型、约定见 [CLAUDE.md](./CLAUDE.md)。

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

- 多账户隔离:每个账户独立的参数 + 实盘记录,UI 顶部下拉切换
- 调整参数实时重算(默认 500 / 1650.30 / 36.14 / 1.2 / 3614,从 2026.06.15 起算)
- 2026 交易日连续计算、年份视图切换、展示区间筛选
- 预期股数/现金/总资产 + 当前股数/现金/收盘价对照(17 列)
- 进度差、总资产百分比、目标对应日期等派生指标
- 实盘录入通过 Vite 中间件直接写回 `state.json`
