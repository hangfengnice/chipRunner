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

const rowClassName = ({
  row,
  rowIndex,
}: {
  row: TrackingComparisonRow
  rowIndex: number
}) => {
  if (row.lotsBought <= 0) return ''

  // 往前数连续买入日:偶数位(第2/4/6天)用深色,奇数位(含孤立买入)用默认浅色
  let streak = 1
  for (let i = rowIndex - 1; i >= 0; i -= 1) {
    if (props.visibleRows[i].lotsBought > 0) streak += 1
    else break
  }

  return streak % 2 === 0 ? 'buy-day-row buy-streak-deep' : 'buy-day-row'
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
      height="816"
      :row-class-name="rowClassName"
    >
      <el-table-column prop="index" label="#" width="72" />
      <el-table-column prop="date" label="日期" min-width="128" />
      <el-table-column label="买入手数" width="108" align="center">
        <template #default="{ row }">
          <el-tag
            :type="row.lotsBought > 0 ? 'success' : 'info'"
            effect="plain"
            :style="
              row.lotsBought > 0 ? 'font-weight: bolder; font-size: 16px' : ''
            "
          >
            {{ row.lotsBought }}
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
        <template #default="{ row }">
          {{ formatMoney(row.tProfit) }}
        </template>
      </el-table-column>
      <el-table-column label="预期现金" min-width="128" align="right">
        <template #default="{ row }">
          {{ formatMoney(row.targetCash) }}
        </template>
      </el-table-column>
      <el-table-column
        label="预期总资产"
        min-width="150"
        align="right"
        class-name="target-assets-column"
        label-class-name="target-assets-column"
      >
        <template #default="{ row }">
          {{ formatMoney(row.targetAssets) }}
        </template>
      </el-table-column>
      <el-table-column label="当前股数" min-width="110" align="right">
        <template #default="{ row }">
          {{ formatOptionalCount(row.actualShares) }}
        </template>
      </el-table-column>
      <el-table-column label="当前现金" min-width="128" align="right">
        <template #default="{ row }">
          {{ formatOptionalMoney(row.actualCash) }}
        </template>
      </el-table-column>
      <el-table-column label="当天实际获取现金" min-width="150" align="right">
        <template #default="{ row }">
          {{ formatOptionalMoney(row.dailyCashGained) }}
        </template>
      </el-table-column>
      <el-table-column label="累计获取现金" min-width="140" align="right">
        <template #default="{ row }">
          {{ formatMoney(row.cumulativeCashGained) }}
        </template>
      </el-table-column>
      <el-table-column label="收盘价" min-width="112" align="right">
        <template #default="{ row }">
          {{ formatOptionalMoney(row.closePrice) }}
        </template>
      </el-table-column>
      <el-table-column label="当前总资产" min-width="150" align="right">
        <template #default="{ row }">
          {{ formatOptionalMoney(row.actualTotalAssets) }}
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
