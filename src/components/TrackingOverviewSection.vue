<script setup lang="ts">
import { Calendar, Coin, DataAnalysis } from '@element-plus/icons-vue'
import { computed } from 'vue'
import type { TrackingParams } from '../lib/tracking'
import { formatMoney } from '../lib/trackingDisplay'
import type {
  DisplayRangeDraft,
  TrackingSummary,
  YearScopeOption,
} from '../composables/useTrackingDashboard'

const props = defineProps<{
  availableDateFrom: string
  availableDateTo: string
  totalAvailableTradingDays: number
  yearScopeOptions: YearScopeOption[]
  selectedYearScope: string
  form: TrackingParams
  displayRange: DisplayRangeDraft
  summary: TrackingSummary
  disableOutsideAvailableRange: (date: Date) => boolean
  disableDisplayDateFrom: (date: Date) => boolean
  disableDisplayDateTo: (date: Date) => boolean
}>()

const emit = defineEmits<{
  'update:selectedYearScope': [value: string]
}>()

const selectedYearScopeModel = computed({
  get: () => props.selectedYearScope,
  set: (value: string) => {
    emit('update:selectedYearScope', value)
  },
})
</script>

<template>
  <section class="overview-grid">
    <el-card shadow="never" class="panel form-panel">
      <template #header>
        <div class="panel-title">
          <span>模型参数</span>
          <small>
            当前原型接入 {{ availableDateFrom }} - {{ availableDateTo }} 的
            {{ totalAvailableTradingDays }} 个交易日
          </small>
        </div>
      </template>

      <el-form label-position="top" class="form-grid">
        <el-form-item label="年份视图">
          <el-select
            v-model="selectedYearScopeModel"
            placeholder="选择年份视图"
          >
            <el-option
              v-for="option in yearScopeOptions"
              :key="option.value"
              :label="option.label"
              :value="option.value"
            />
          </el-select>
        </el-form-item>

        <el-form-item label="初始股数">
          <el-input-number
            v-model="form.initialShares"
            :min="0"
            :step="100"
            controls-position="right"
          />
        </el-form-item>

        <el-form-item label="初始现金">
          <el-input-number
            v-model="form.initialCash"
            :min="0"
            :step="100"
            :precision="2"
            controls-position="right"
          />
        </el-form-item>

        <el-form-item label="固定股价">
          <el-input-number
            v-model="form.price"
            :min="0.01"
            :step="0.1"
            :precision="2"
            controls-position="right"
          />
        </el-form-item>

        <el-form-item label="每日差价">
          <el-input-number
            v-model="form.spread"
            :min="0"
            :step="0.1"
            :precision="2"
            controls-position="right"
          />
        </el-form-item>

        <el-form-item label="每手成本">
          <el-input-number
            v-model="form.lotCost"
            :min="0.01"
            :step="100"
            :precision="2"
            controls-position="right"
          />
        </el-form-item>

        <el-form-item label="前置交易日">
          <el-input-number
            v-model="form.hiddenTradingDays"
            :min="0"
            :step="1"
            controls-position="right"
          />
        </el-form-item>

        <el-form-item label="截止日期" class="wide-field">
          <el-date-picker
            v-model="form.endDate"
            type="date"
            format="YYYY.MM.DD"
            value-format="YYYY.MM.DD"
            :disabled-date="disableOutsideAvailableRange"
            placeholder="选择截止日期"
          />
        </el-form-item>

        <el-form-item label="展示起始日">
          <el-date-picker
            v-model="displayRange.dateFrom"
            type="date"
            format="YYYY.MM.DD"
            value-format="YYYY.MM.DD"
            :disabled-date="disableDisplayDateFrom"
            placeholder="选择展示起始日"
          />
        </el-form-item>

        <el-form-item label="展示截止日">
          <el-date-picker
            v-model="displayRange.dateTo"
            type="date"
            format="YYYY.MM.DD"
            value-format="YYYY.MM.DD"
            :disabled-date="disableDisplayDateTo"
            placeholder="选择展示截止日"
          />
        </el-form-item>
      </el-form>

      <el-alert
        type="warning"
        :closable="false"
        show-icon
        title="最新基础数据从 2026.06.03 起算，默认前置交易日为 0；年份视图和展示区间只影响展示，不会重置累计过程。"
      />
    </el-card>

    <div class="stat-grid">
      <el-card shadow="never" class="stat-card">
        <div class="stat-label">
          <el-icon><Calendar /></el-icon>
          <span>展示区间</span>
        </div>
        <strong>{{ summary.tradingDays }}</strong>
        <p>{{ summary.rangeFrom }} - {{ summary.rangeTo }}</p>
      </el-card>

      <el-card shadow="never" class="stat-card accent-card">
        <div class="stat-label">
          <el-icon><Coin /></el-icon>
          <span>截止日资产</span>
        </div>
        <strong>{{ formatMoney(summary.lastAssets) }}</strong>
        <p>
          {{ summary.lastDate }}，目标现金 {{ formatMoney(summary.lastCash) }}
        </p>
      </el-card>

      <el-card shadow="never" class="stat-card deep-card">
        <div class="stat-label">
          <el-icon><DataAnalysis /></el-icon>
          <span>截止日持股</span>
        </div>
        <strong>{{ summary.lastShares }}</strong>
        <p>
          {{ summary.buyDays }} 个买入日，首个买入日
          {{ summary.firstBuyDate }}
        </p>
      </el-card>
    </div>
  </section>
</template>
