<script setup lang="ts">
import { onMounted } from 'vue'
import TrackingActualPanel from './components/TrackingActualPanel.vue'
import TrackingOverviewSection from './components/TrackingOverviewSection.vue'
import TrackingTablePanel from './components/TrackingTablePanel.vue'
import { useAppState } from './composables/useAppState'
import { useTrackingDashboard } from './composables/useTrackingDashboard'

const {
  isLoading,
  isSaving,
  lastSavedAt,
  load,
  selectedAccount,
  state,
  updateState,
} = useAppState()

const {
  actualEntryForm,
  availableDateFrom,
  availableDateTo,
  clearActualEntry,
  disableDisplayDateFrom,
  disableDisplayDateTo,
  disableOutsideAvailableRange,
  disableOutsideCalculatedRange,
  displayRange,
  form,
  hasSavedActualEntry,
  restorePreset,
  saveActualEntry,
  savedEntryCount,
  selectedComparisonRow,
  selectedYearScope,
  showRecentOnly,
  summary,
  syncLotCost,
  titleYearRange,
  totalAvailableTradingDays,
  visibleRows,
  yearScopeOptions,
} = useTrackingDashboard({
  account: selectedAccount,
  state,
  onStateChange: updateState,
})

onMounted(() => {
  void load()
})
</script>

<template>
  <div class="page-shell">
    <header class="page-header">
      <div class="page-header-copy">
        <span class="eyebrow">Chip Runner Prototype</span>
        <h1>{{ titleYearRange }} Tracking Console</h1>
        <p>
          用 Vue3 + Element Plus
          把跟踪模型做成一个最小可用界面,支持参数实时重算、年份切换与展示区间筛选。
        </p>
      </div>
    </header>

    <TrackingOverviewSection
      :account="selectedAccount"
      :available-date-from="availableDateFrom"
      :available-date-to="availableDateTo"
      :total-available-trading-days="totalAvailableTradingDays"
      :year-scope-options="yearScopeOptions"
      :selected-year-scope="selectedYearScope"
      :form="form"
      :display-range="displayRange"
      :summary="summary"
      :disable-outside-available-range="disableOutsideAvailableRange"
      :disable-display-date-from="disableDisplayDateFrom"
      :disable-display-date-to="disableDisplayDateTo"
      @update:selected-year-scope="(value: string) => (selectedYearScope = value)"
      @restore-preset="restorePreset"
      @sync-lot-cost="syncLotCost"
    />

    <TrackingActualPanel
      :account-name="selectedAccount?.name ?? '默认账户'"
      :actual-entry-form="actualEntryForm"
      :selected-comparison-row="selectedComparisonRow"
      :saved-entry-count="savedEntryCount"
      :has-saved-entry="hasSavedActualEntry"
      :actual-entries-updated-at="lastSavedAt"
      :is-loading-actual-entries="isLoading"
      :is-saving-actual-entry="isSaving"
      :disable-outside-calculated-range="disableOutsideCalculatedRange"
      @save="saveActualEntry"
      @clear="clearActualEntry"
    />

    <TrackingTablePanel
      :visible-rows="visibleRows"
      :display-range="displayRange"
      :end-date="form.endDate"
      :show-recent-only="showRecentOnly"
      @update:show-recent-only="(value: boolean) => (showRecentOnly = value)"
    />
  </div>
</template>

<style scoped>
.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 24px;
  padding: 24px 28px;
  background: var(--el-fill-color-blank);
  border-radius: 12px;
  border: 1px solid var(--el-border-color-lighter);
  flex-wrap: wrap;
}

.page-header-copy {
  display: flex;
  flex-direction: column;
  gap: 6px;
  min-width: 0;
}

.eyebrow {
  font-size: 12px;
  letter-spacing: 0.08em;
  color: var(--el-text-color-secondary);
  text-transform: uppercase;
}

h1 {
  margin: 0;
  font-size: 24px;
  font-weight: 600;
}

.page-header-copy p {
  margin: 0;
  color: var(--el-text-color-regular);
  font-size: 14px;
  max-width: 720px;
}
</style>
