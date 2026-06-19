<script setup lang="ts">
import { computed } from 'vue'
import type { DisplayRangeDraft } from '../composables/useTrackingDashboard'
import type { TrackingComparisonRow } from '../lib/tracking'
import {
  deltaTagType,
  formatMoney,
  formatOptionalCount,
  formatOptionalMoney,
  formatRatio,
  formatSignedCount,
  formatSignedMoney,
} from '../lib/trackingDisplay'

const props = defineProps<{
  visibleRows: TrackingComparisonRow[]
  displayRange: DisplayRangeDraft
  endDate: string
  showRecentOnly: boolean
}>()

const emit = defineEmits<{
  'update:showRecentOnly': [value: boolean]
}>()

const showRecentOnlyModel = computed({
  get: () => props.showRecentOnly,
  set: (value: boolean) => {
    emit('update:showRecentOnly', value)
  },
})

const rowClassName = ({ row }: { row: TrackingComparisonRow }) => {
  if (row.lotsBought > 0) {
    return 'buy-day-row'
  }

  return ''
}
</script>

<template>
  <el-card shadow="never" class="panel table-panel">
    <template #header>
      <div class="table-toolbar">
        <div>
          <span class="panel-heading">目标跟踪表</span>
          <p>
            买入日会高亮；当前展示 {{ displayRange.dateFrom }} -
            {{ displayRange.dateTo }}，计算累计截至 {{ endDate }}。
          </p>
        </div>
        <el-switch
          v-model="showRecentOnlyModel"
          active-text="最近10日"
          inactive-text="全部交易日"
        />
      </div>
    </template>

    <el-empty
      v-if="!visibleRows.length"
      description="当前参数未生成任何交易日数据"
    />

    <el-table
      v-else
      :data="visibleRows"
      stripe
      height="620"
      :row-class-name="rowClassName"
    >
      <el-table-column prop="index" label="#" width="72" />
      <el-table-column prop="date" label="日期" min-width="128" />
      <el-table-column label="买入手数" width="108" align="center">
        <template #default="scope">
          <el-tag
            :type="scope.row.lotsBought > 0 ? 'warning' : 'info'"
            effect="plain"
          >
            {{ scope.row.lotsBought }}
          </el-tag>
        </template>
      </el-table-column>
      <el-table-column
        prop="targetShares"
        label="预期股数"
        min-width="110"
        align="right"
      />
      <el-table-column label="做T利润" min-width="128" align="right">
        <template #default="scope">
          {{ formatMoney(scope.row.tProfit) }}
        </template>
      </el-table-column>
      <el-table-column label="预期现金" min-width="128" align="right">
        <template #default="scope">
          {{ formatMoney(scope.row.targetCash) }}
        </template>
      </el-table-column>
      <el-table-column
        label="预期总资产"
        min-width="150"
        align="right"
        class-name="target-assets-column"
        label-class-name="target-assets-column"
      >
        <template #default="scope">
          {{ formatMoney(scope.row.targetAssets) }}
        </template>
      </el-table-column>
      <el-table-column label="当前股数" min-width="110" align="right">
        <template #default="scope">
          {{ formatOptionalCount(scope.row.actualShares) }}
        </template>
      </el-table-column>
      <el-table-column label="当前现金" min-width="128" align="right">
        <template #default="scope">
          {{ formatOptionalMoney(scope.row.actualCash) }}
        </template>
      </el-table-column>
      <el-table-column label="当天实际获取现金" min-width="150" align="right">
        <template #default="scope">
          {{ formatOptionalMoney(scope.row.dailyCashGained) }}
        </template>
      </el-table-column>
      <el-table-column label="累计获取现金" min-width="140" align="right">
        <template #default="scope">
          {{ formatMoney(scope.row.cumulativeCashGained) }}
        </template>
      </el-table-column>
      <el-table-column label="收盘价" min-width="112" align="right">
        <template #default="scope">
          {{ formatOptionalMoney(scope.row.closePrice) }}
        </template>
      </el-table-column>
      <el-table-column label="当前总资产" min-width="150" align="right">
        <template #default="scope">
          {{ formatOptionalMoney(scope.row.actualTotalAssets) }}
        </template>
      </el-table-column>
      <el-table-column label="股数差额" min-width="120" align="center">
        <template #default="scope">
          <el-tag :type="deltaTagType(scope.row.shareDiff)" effect="plain">
            {{ formatSignedCount(scope.row.shareDiff) }}
          </el-tag>
        </template>
      </el-table-column>
      <el-table-column label="资产差额" min-width="132" align="center">
        <template #default="scope">
          <el-tag :type="deltaTagType(scope.row.assetDiff)" effect="light">
            {{ formatSignedMoney(scope.row.assetDiff) }}
          </el-tag>
        </template>
      </el-table-column>
      <el-table-column
        prop="targetMatchedDate"
        label="目标对应日期"
        min-width="168"
      >
        <template #default="scope">
          {{ scope.row.targetMatchedDate || '--' }}
        </template>
      </el-table-column>
      <el-table-column prop="progressDelta" label="进度差" min-width="140">
        <template #default="scope">
          {{ scope.row.progressDelta || '--' }}
        </template>
      </el-table-column>
      <el-table-column label="总资产百分比" min-width="132" align="right">
        <template #default="scope">
          {{ formatRatio(scope.row.totalAssetRatio) }}
        </template>
      </el-table-column>
    </el-table>
  </el-card>
</template>
