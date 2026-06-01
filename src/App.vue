<script setup lang="ts">
import TrackingActualPanel from './components/TrackingActualPanel.vue'
import TrackingHeroPanel from './components/TrackingHeroPanel.vue'
import TrackingNotesPanel from './components/TrackingNotesPanel.vue'
import TrackingOverviewSection from './components/TrackingOverviewSection.vue'
import TrackingTablePanel from './components/TrackingTablePanel.vue'
import { useTrackingDashboard } from './composables/useTrackingDashboard'

const {
  actualEntriesUpdatedAt,
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
  isLoadingActualEntries,
  isSavingActualEntry,
  legacyTableMeta,
  loadActualEntries,
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
} = useTrackingDashboard()

const updateSelectedYearScope = (value: string) => {
  selectedYearScope.value = value
}

const updateShowRecentOnly = (value: boolean) => {
  showRecentOnly.value = value
}
</script>

<template>
  <div class="page-shell">
    <TrackingHeroPanel
      :title-year-range="titleYearRange"
      @restore-preset="restorePreset"
      @sync-lot-cost="syncLotCost"
    />

    <TrackingOverviewSection
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
      @update:selected-year-scope="updateSelectedYearScope"
    />

    <TrackingActualPanel
      :actual-entry-form="actualEntryForm"
      :selected-comparison-row="selectedComparisonRow"
      :saved-entry-count="savedEntryCount"
      :has-saved-entry="hasSavedActualEntry"
      :actual-entries-updated-at="actualEntriesUpdatedAt"
      :is-loading-actual-entries="isLoadingActualEntries"
      :is-saving-actual-entry="isSavingActualEntry"
      :disable-outside-calculated-range="disableOutsideCalculatedRange"
      @save="saveActualEntry"
      @clear="clearActualEntry"
      @reload="loadActualEntries"
    />

    <TrackingNotesPanel :legacy-table-meta="legacyTableMeta" />

    <TrackingTablePanel
      :visible-rows="visibleRows"
      :display-range="displayRange"
      :end-date="form.endDate"
      :show-recent-only="showRecentOnly"
      @update:show-recent-only="updateShowRecentOnly"
    />
  </div>
</template>
