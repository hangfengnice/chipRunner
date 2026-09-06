<script setup lang="ts">
import { ref } from 'vue'
import { ElMessageBox } from 'element-plus'
import TrackingActualPanel from './components/TrackingActualPanel.vue'
import TrackingOverviewSection from './components/TrackingOverviewSection.vue'
import TrackingTablePanel from './components/TrackingTablePanel.vue'
import TrackingTicketCreateDialog from './components/TrackingTicketCreateDialog.vue'
import TrackingTicketEditDialog from './components/TrackingTicketEditDialog.vue'
import TrackingTicketTabs from './components/TrackingTicketTabs.vue'
import { useAppState } from './composables/useAppState'
import { useTrackingDashboard } from './composables/useTrackingDashboard'
import { ALL_TRADING_DATES } from './data/sources'
import type { TrackingParams } from './lib/tracking'

const {
  accounts,
  firstTradingDate,
  isSaving,
  lastSavedAt,
  paidInterest,
  selectedAccount,
  selectedAccountId,
  state,
  updateState,
  createTicket,
  editTicket,
  selectTicket,
  removeTicket,
  setFirstTradingDate,
  setPaidInterest,
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

const createDialogVisible = ref(false)
const editDialogVisible = ref(false)
const tradingDateOptions = ALL_TRADING_DATES

const handleCreate = () => {
  createDialogVisible.value = true
}

const handleCreateSubmit = (name: string, params: TrackingParams) => {
  createTicket(name, params)
}

const handleEdit = () => {
  editDialogVisible.value = true
}

const handleEditSave = (id: string, name: string, params: TrackingParams) => {
  editTicket(id, name, params)
}

const handleEditRemove = async (id: string) => {
  try {
    await ElMessageBox.confirm('确定删除这只票？', '删除票', {
      type: 'warning',
      confirmButtonText: '删除',
      cancelButtonText: '取消',
    })
    removeTicket(id)
    editDialogVisible.value = false
  } catch {
    // 用户取消
  }
}
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
      <div class="page-header-actions">
        <span class="first-day-label">首交易日</span>
        <el-select
          :model-value="firstTradingDate"
          filterable
          placeholder="选择首交易日"
          class="first-day-select"
          @change="(value: string) => setFirstTradingDate(value)"
        >
          <el-option
            v-for="date in tradingDateOptions"
            :key="date"
            :label="date"
            :value="date"
          />
        </el-select>
        <span class="first-day-label">已支付利息</span>
        <el-input-number
          :model-value="paidInterest"
          :min="0"
          :precision="2"
          :controls="false"
          placeholder="0.00"
          class="paid-interest-input"
          @change="(value: number | undefined) => value != null && setPaidInterest(value)"
        />
      </div>
    </header>

    <TrackingTicketTabs
      :accounts="accounts"
      :selected-account-id="selectedAccountId"
      @select="selectTicket"
      @create="handleCreate"
      @edit="handleEdit"
    />

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
      :account-name="selectedAccount?.name ?? '默认票'"
      :actual-entry-form="actualEntryForm"
      :selected-comparison-row="selectedComparisonRow"
      :saved-entry-count="savedEntryCount"
      :has-saved-entry="hasSavedActualEntry"
      :actual-entries-updated-at="lastSavedAt"
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

    <TrackingTicketCreateDialog
      v-model="createDialogVisible"
      :first-trading-date="firstTradingDate"
      @create="handleCreateSubmit"
    />

    <TrackingTicketEditDialog
      v-model="editDialogVisible"
      :account="selectedAccount"
      :first-trading-date="firstTradingDate"
      @save="handleEditSave"
      @remove="handleEditRemove"
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

.page-header-actions {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-shrink: 0;
}

.first-day-label {
  font-size: 13px;
  color: var(--el-text-color-secondary);
  white-space: nowrap;
}

.first-day-select {
  width: 170px;
}

.paid-interest-input {
  width: 120px;
}
</style>
