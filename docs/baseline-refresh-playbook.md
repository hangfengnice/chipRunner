# 基础数据替换流程

更新时间：2026-05-31

## 本次替换记录

- 起始交易日：`2026.06.01`
- 初始持股：`4900`
- 初始现金：`2313.83`
- 固定价格：`25.35`
- 每股每日可获取差价：`0.4`
- 每手成本：`2535`
- 前置交易日：`0`

## 这次实际改动了什么

本次基础数据替换涉及 5 组文件：

1. 运行时默认参数
- `src/lib/tracking.ts`

2. 权威底稿与示例
- `docs/dialog-tracking-draft.md`

3. Markdown 总表
- `docs/2026-tracking-total-table.md`
- `docs/2026-2028-tracking-total-table.md`

4. 前端读取的结构化 JSON
- `data/tracking/2026-tracking-total-table.json`
- `data/tracking/2026-2028-tracking-total-table.json`

5. 说明文案与验证基线
- `src/App.vue`
- `README.md`
- `docs/project-status.md`
- `AGENTS.md`
- `tests/trackingCore.test.ts`
- `tests/tracking.test.ts`

## 本次执行链路

这次替换的实际顺序如下：

1. 先改默认参数入口 `src/lib/tracking.ts`
2. 再同步 `docs/dialog-tracking-draft.md` 的参数、公式、输入日期与前 10 个交易日示例
3. 使用 `tracking_tool.py recalc` 重算两份 Markdown 总表
4. 执行 `npm run migrate:data`，把 Markdown 总表重新迁移为前端读取的 JSON
5. 同步页面和文档中的说明文案
6. 同步测试里的基线样例
7. 最后执行 `npm test` 和 `npm run build`

## 下次替换推荐步骤

### 1. 先确定这一组基础参数

至少确认以下字段：

- `startDate`
- `initialShares`
- `initialCash`
- `price`
- `spread`
- `lotCost`
- `hiddenTradingDays`

备注：

- 如果新的基础数据就是从页面首个展示日开始，通常 `hiddenTradingDays = 0`
- 如果基础数据来自展示日前一个隐藏交易日，则要明确补算天数
- 当前项目里每手成本通常等于 `price * 100`，但仍建议显式确认，不要默认猜测

### 2. 更新权威参数与默认入口

优先同步：

- `docs/dialog-tracking-draft.md`
- `src/lib/tracking.ts`

### 3. 重算 Markdown 总表

示例命令：

```bash
python3 scripts/tracking_tool.py recalc \
  --file docs/2026-tracking-total-table.md \
  --start-date 2026.06.01 \
  --initial-shares 4900 \
  --initial-cash 2313.83 \
  --price 25.35 \
  --spread 0.4 \
  --lot-cost 2535 \
  --pre-days 0

python3 scripts/tracking_tool.py recalc \
  --file docs/2026-2028-tracking-total-table.md \
  --start-date 2026.06.01 \
  --initial-shares 4900 \
  --initial-cash 2313.83 \
  --price 25.35 \
  --spread 0.4 \
  --lot-cost 2535 \
  --pre-days 0
```

### 4. 重新生成 JSON

```bash
npm run migrate:data
```

### 5. 同步说明文案

至少复核以下文件中的样例和口径说明：

- `src/App.vue`
- `README.md`
- `docs/project-status.md`
- `AGENTS.md`

### 6. 同步验证基线

复核：

- `tests/trackingCore.test.ts`
- `tests/tracking.test.ts`

### 7. 收口验证

```bash
npm test
npm run build
```

## 这次替换暴露出的优化点

### 优化点 1：基础参数仍然是多点分散维护

当前最主要的成本不是“重算总表”，而是同一组基础参数同时散落在：

- `src/lib/tracking.ts`
- `docs/dialog-tracking-draft.md`
- 页面说明文案
- README / AGENTS / 项目状态
- 测试基线

建议的下一个优化方向：

- 抽出单一的结构化基础参数文件，例如 `data/tracking/baseline-config.json`
- 让运行时默认参数、测试基线、脚本刷新入口都优先读取这份文件

这样下次替换时，先改 1 处，再触发后续生成步骤即可。

### 优化点 2：当前缺少“一键刷新基础数据”的脚本

这次替换的核心命令链已经比较稳定，但仍然需要人工串联：

- 更新参数
- 重算 Markdown
- 迁移 JSON
- 跑测试与构建

建议增加一个专用脚本，例如：

- `python3 scripts/refresh_baseline.py --start-date ... --initial-shares ...`

目标是让它至少完成：

1. 更新基础参数源
2. 重算两份总表
3. 迁移 JSON
4. 输出首 10 行样例
5. 可选执行测试和构建

### 优化点 3：文档样例仍有人工复制成本

`docs/dialog-tracking-draft.md` 里的前 10 个交易日样例目前仍靠人工同步。

建议后续把这部分样例改为：

- 从当前基础参数自动生成
- 或至少由刷新脚本统一写回

这样能避免文档和真实计算结果偏离。

### 优化点 4：减少 Python 运行产物对替换流程的干扰

这类文件不属于业务变更，例如：

- `scripts/__pycache__/tracking_tool.cpython-314.pyc`

当前 `.gitignore` 已补充：

- `__pycache__/`
- `*.pyc`

后续新产生的 Python 缓存文件不应再进入替换检查清单。

## 下次替换时的最低复核项

下次如果只想快速确认是否替换完整，至少检查这 5 项：

1. `src/lib/tracking.ts` 的默认参数是否已改
2. `docs/dialog-tracking-draft.md` 的参数和前 10 行样例是否已改
3. 两份 Markdown 总表是否已重算
4. `data/tracking/*.json` 是否已重新迁移
5. `npm test` 与 `npm run build` 是否通过
