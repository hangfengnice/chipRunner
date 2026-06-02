<script setup lang="ts">
import type { TrackingTableMeta } from '../data/sources'

defineProps<{
  legacyTableMeta: TrackingTableMeta
}>()
</script>

<template>
  <el-card shadow="never" class="panel notes-panel">
    <div class="notes-grid">
      <div>
        <span class="note-title">计算规则</span>
        <p>每日做T利润 = 开盘持股 x 每日差价</p>
        <p>盘后现金 >= 每手成本时，按整手尽可能买入</p>
        <p>跨年时继续沿上一交易日状态累计，不按年份重置股数或现金</p>
      </div>
      <div>
        <span class="note-title">样例校验</span>
        <p>
          默认参数对应最新基础数据：2600 股 / 1376.18 现金 / 40.20 元 / 0.5
          差价。
        </p>
        <p>当前页面已支持 2026-2030 多年度交易日，展示区间可独立筛选。</p>
        <p>
          已迁入的历史总表元数据覆盖 {{ legacyTableMeta.dateFrom }} -
          {{ legacyTableMeta.dateTo }}，共 {{ legacyTableMeta.rowCount }} 行。
        </p>
      </div>
    </div>
  </el-card>
</template>
