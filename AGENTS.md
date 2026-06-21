# AGENTS.md

> **本项目的权威指引是 `CLAUDE.md`。** 本文件仅作 minimax code 的入口索引,不与 `CLAUDE.md` 重复;任何规范变更**只改 `CLAUDE.md`**,再同步本文件的指针,勿两处各改。

Vue 3 + Element Plus 多票(股票)交易跟踪原型(中文 UI),纯前端无后端,状态存浏览器 localStorage。计算内核按固定规则逐日累加。

## 命令

- `npm install`
- `npm run dev` — Vite dev server(无后端,状态存 localStorage)
- `npm run build` — vue-tsc -b 类型检查 + vite build
- `npm test` — Vitest 跑全部 `tests/`
- `npm run test:watch`
- 单个:`npx vitest run tests/useTrackingDashboard.test.ts`

## 开工前必读

完整架构 / 数据流 / 约定 / 域规则 **见 `CLAUDE.md`**。最易踩坑的几条(细节以 `CLAUDE.md` 为准):

- 计算内核 `src/lib/trackingCore.ts` 是权威,不要在 UI 层重算或绕过。
- 所有写回统一走 `onStateChange` → `useAppState.updateState`;不要直接改 `account.value` 或 `state.accounts[...]`。
- 票隔离:`useTrackingDashboard` / `useActualEntryState` 都从 `account.value`(当前选中票)读,不要绕过去读 `state.accounts[...]`。
- 改默认参数 → **必须**同步 `tests/trackingCore.test.ts` / `tests/tracking.test.ts` / `tests/appState.test.ts` 三处基线。
- 不要臆造交易日,所有日期必须来自 `data/calendar/*.json`。
- 重新打开项目:先读 `docs/project-status.md`,再看 `git status --short`,再启 `npm run dev`。

## PR & commit

- 从 `main` 拉分支,不直接 push `main`;commit 用中文一句话或 `feat:` / `fix:` / `docs:` / `refactor:`。
- 改 `vite.config.ts` / 依赖 / 目录结构 / `tsconfig.*.json` 后必须跑 `npm run build`。
