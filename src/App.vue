<script setup lang="ts">
import { ElMessage } from 'element-plus'
import {
  Calendar,
  Coin,
  DataAnalysis,
  RefreshRight,
} from '@element-plus/icons-vue'
import { computed, onMounted, reactive, ref, watch } from 'vue'
import {
  type ActualEntriesPayload,
  deleteActualEntryFromFile,
  fetchActualEntries,
  saveActualEntryToFile,
} from './lib/actualEntriesApi'
import {
  buildComparisonRows,
  buildRows,
  DEFAULT_PARAMS,
  syncLotCostFromPrice,
  type ActualPositionEntry,
  type TrackingParams,
} from './lib/tracking'
import {
  ALL_TRADING_DATE_FROM,
  ALL_TRADING_DATE_TO,
  ALL_TRADING_DATES,
  CALENDAR_BY_YEAR,
  CALENDAR_YEARS,
  LEGACY_TRACKING_2026_2028,
} from './data/sources'

interface ActualEntryDraft {
  date: string
  actualShares: number | null
  actualCash: number | null
  closePrice: number | null
}

interface DisplayRangeDraft {
  dateFrom: string
  dateTo: string
}

interface YearScopeOption {
  value: string
  label: string
}

const roundMoney = (value: number) => Number(value.toFixed(2))
const normalizeShares = (value: number) => Math.trunc(value)
const toIsoDate = (value: string) => value.replaceAll('.', '-')
const toDateTime = (value: string) =>
  new Date(`${toIsoDate(value)}T00:00:00`).getTime()
const clampDateWithin = (value: string, min: string, max: string) => {
  if (value < min) {
    return min
  }

  if (value > max) {
    return max
  }

  return value
}

const form = reactive<TrackingParams>({ ...DEFAULT_PARAMS })
const availableDateFrom = ALL_TRADING_DATE_FROM
const availableDateTo = ALL_TRADING_DATE_TO
const totalAvailableTradingDays = ALL_TRADING_DATES.length
const firstCalendarYear = CALENDAR_YEARS[0]?.year
const lastCalendarYear = CALENDAR_YEARS[CALENDAR_YEARS.length - 1]?.year
const defaultYearScope = String(firstCalendarYear ?? 'all')

form.endDate = clampDateWithin(form.endDate, availableDateFrom, availableDateTo)

const showRecentOnly = ref(false)
const legacyTable = LEGACY_TRACKING_2026_2028
const selectedYearScope = ref(defaultYearScope)
const displayRange = reactive<DisplayRangeDraft>({
  dateFrom: availableDateFrom,
  dateTo: form.endDate,
})
const actualEntries = ref<Record<string, ActualPositionEntry>>({})
const actualEntryForm = reactive<ActualEntryDraft>({
  date: availableDateFrom,
  actualShares: null,
  actualCash: null,
  closePrice: DEFAULT_PARAMS.price,
})
const actualEntriesUpdatedAt = ref<string | null>(null)
const isLoadingActualEntries = ref(false)
const isSavingActualEntry = ref(false)

const yearScopeOptions = computed<YearScopeOption[]>(() => {
  const allLabel =
    firstCalendarYear && lastCalendarYear
      ? `全部年份（${firstCalendarYear}-${lastCalendarYear}）`
      : '全部年份'

  return [
    {
      value: 'all',
      label: allLabel,
    },
    ...CALENDAR_YEARS.map((calendar) => ({
      value: String(calendar.year),
      label: `${calendar.year}（${calendar.totalTradingDays}日）`,
    })),
  ]
})

const titleYearRange =
  firstCalendarYear && lastCalendarYear
    ? `${firstCalendarYear}-${lastCalendarYear}`
    : 'Multi-Year'

const calculatedDateBounds = computed(() => {
  if (!rows.value.length) {
    return {
      min: availableDateFrom,
      max: availableDateFrom,
    }
  }

  return {
    min: rows.value[0].date,
    max: rows.value[rows.value.length - 1].date,
  }
})

const syncDisplayRangeWithinCalculated = () => {
  const { min, max } = calculatedDateBounds.value

  displayRange.dateFrom = clampDateWithin(displayRange.dateFrom, min, max)
  displayRange.dateTo = clampDateWithin(
    displayRange.dateTo,
    displayRange.dateFrom,
    max,
  )
}

const applyYearScope = (scope: string) => {
  if (scope === 'all') {
    displayRange.dateFrom = calculatedDateBounds.value.min
    displayRange.dateTo = form.endDate
    syncDisplayRangeWithinCalculated()
    return
  }

  const calendar = CALENDAR_BY_YEAR.get(Number(scope))
  if (!calendar) {
    return
  }

  if (calendar.dateTo > form.endDate) {
    form.endDate = calendar.dateTo
  }

  const { min, max } = calculatedDateBounds.value
  displayRange.dateFrom = clampDateWithin(calendar.dateFrom, min, max)
  displayRange.dateTo = clampDateWithin(
    calendar.dateTo,
    displayRange.dateFrom,
    max,
  )
}

const restorePreset = () => {
  Object.assign(form, DEFAULT_PARAMS)
  form.endDate = clampDateWithin(
    form.endDate,
    availableDateFrom,
    availableDateTo,
  )
  selectedYearScope.value = defaultYearScope
}

const syncLotCost = () => {
  form.lotCost = syncLotCostFromPrice(form.price)
}

const rows = computed(() => buildRows({ ...form }, ALL_TRADING_DATES))
const comparisonRows = computed(() =>
  buildComparisonRows(rows.value, actualEntries.value),
)

const rangedComparisonRows = computed(() =>
  comparisonRows.value.filter(
    (row) =>
      row.date >= displayRange.dateFrom && row.date <= displayRange.dateTo,
  ),
)

const visibleRows = computed(() => {
  if (!showRecentOnly.value) {
    return rangedComparisonRows.value
  }

  return rangedComparisonRows.value.slice(-10)
})

const summary = computed(() => {
  const sourceRows = rangedComparisonRows.value
  const lastRow = sourceRows[sourceRows.length - 1]
  const firstRow = sourceRows[0]
  const buyDays = sourceRows.filter((row) => row.lotsBought > 0).length
  const firstBuyDate =
    sourceRows.find((row) => row.lotsBought > 0)?.date ?? '未触发买入'

  return {
    tradingDays: sourceRows.length,
    buyDays,
    firstBuyDate,
    rangeFrom: firstRow?.date ?? '--',
    rangeTo: lastRow?.date ?? '--',
    lastDate: lastRow?.date ?? '无可展示数据',
    lastShares: lastRow?.targetShares ?? 0,
    lastCash: lastRow?.targetCash ?? 0,
    lastAssets: lastRow?.targetAssets ?? 0,
  }
})

const savedEntryCount = computed(() => Object.keys(actualEntries.value).length)

const selectedComparisonRow = computed(
  () =>
    comparisonRows.value.find((row) => row.date === actualEntryForm.date) ??
    null,
)

const hydrateActualEntryForm = (date: string) => {
  const saved = actualEntries.value[date]
  if (saved) {
    actualEntryForm.actualShares = saved.actualShares
    actualEntryForm.actualCash = saved.actualCash
    actualEntryForm.closePrice = saved.closePrice
    return
  }

  const targetRow = rows.value.find((row) => row.date === date)
  actualEntryForm.actualShares = targetRow?.targetShares ?? null
  actualEntryForm.actualCash = null
  actualEntryForm.closePrice = form.price
}

watch(
  selectedYearScope,
  (scope) => {
    applyYearScope(scope)
  },
  { immediate: true },
)

watch(
  () => form.endDate,
  (nextEndDate) => {
    const clampedEndDate = clampDateWithin(
      nextEndDate,
      availableDateFrom,
      availableDateTo,
    )

    if (clampedEndDate !== nextEndDate) {
      form.endDate = clampedEndDate
      return
    }

    if (selectedYearScope.value === 'all') {
      displayRange.dateTo = clampedEndDate
    } else if (displayRange.dateTo > clampedEndDate) {
      displayRange.dateTo = clampedEndDate
    }

    if (displayRange.dateFrom > displayRange.dateTo) {
      displayRange.dateFrom = displayRange.dateTo
    }
  },
)

watch(
  () => displayRange.dateFrom,
  () => {
    syncDisplayRangeWithinCalculated()
  },
)

watch(
  () => displayRange.dateTo,
  () => {
    syncDisplayRangeWithinCalculated()
  },
)

watch(
  rows,
  (nextRows) => {
    if (!nextRows.length) {
      return
    }

    syncDisplayRangeWithinCalculated()

    if (!nextRows.some((row) => row.date === actualEntryForm.date)) {
      actualEntryForm.date = nextRows[nextRows.length - 1].date
    }
  },
  { immediate: true },
)

watch(
  () => actualEntryForm.date,
  (date) => {
    if (!date) {
      return
    }

    hydrateActualEntryForm(date)
  },
  { immediate: true },
)

const syncActualEntriesFromPayload = (
  entries: Record<string, ActualPositionEntry>,
  updatedAt: string | null,
) => {
  actualEntries.value = entries
  actualEntriesUpdatedAt.value = updatedAt
  hydrateActualEntryForm(actualEntryForm.date)
}

const loadActualEntries = async () => {
  isLoadingActualEntries.value = true

  try {
    const payload = await fetchActualEntries()
    syncActualEntriesFromPayload(payload.entries, payload.updatedAt)
  } catch (error) {
    const message = error instanceof Error ? error.message : '实盘记录读取失败'
    ElMessage.error(message)
  } finally {
    isLoadingActualEntries.value = false
  }
}

onMounted(() => {
  void loadActualEntries()
})

const formatMoney = (value: number) =>
  value.toLocaleString('zh-CN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })

const formatOptionalMoney = (value: number | null) =>
  value === null ? '--' : formatMoney(value)

const formatOptionalCount = (value: number | null) =>
  value === null ? '--' : value.toLocaleString('zh-CN')

const formatSignedMoney = (value: number | null) =>
  value === null ? '--' : `${value > 0 ? '+' : ''}${formatMoney(value)}`

const formatSignedCount = (value: number | null) =>
  value === null
    ? '--'
    : `${value > 0 ? '+' : ''}${value.toLocaleString('zh-CN')}`

const formatRatio = (value: number | null) =>
  value === null ? '--' : `${value.toFixed(2)}%`

const deltaTagType = (value: number | null) => {
  if (value === null) {
    return 'info'
  }

  if (value > 0) {
    return 'success'
  }

  if (value < 0) {
    return 'danger'
  }

  return 'info'
}

const disableOutsideAvailableRange = (date: Date) => {
  const time = date.getTime()
  const minTime = toDateTime(availableDateFrom)
  const maxTime = toDateTime(availableDateTo)

  return time < minTime || time > maxTime
}

const disableOutsideCalculatedRange = (date: Date) => {
  const time = date.getTime()
  const minTime = toDateTime(calculatedDateBounds.value.min)
  const maxTime = toDateTime(calculatedDateBounds.value.max)

  return time < minTime || time > maxTime
}

const disableDisplayDateFrom = (date: Date) => {
  const time = date.getTime()
  const minTime = toDateTime(calculatedDateBounds.value.min)
  const maxTime = toDateTime(displayRange.dateTo)

  return time < minTime || time > maxTime
}

const disableDisplayDateTo = (date: Date) => {
  const time = date.getTime()
  const minTime = toDateTime(displayRange.dateFrom)
  const maxTime = toDateTime(calculatedDateBounds.value.max)

  return time < minTime || time > maxTime
}

const rowClassName = ({ row }: { row: { lotsBought: number } }) => {
  if (row.lotsBought > 0) {
    return 'buy-day-row'
  }

  return ''
}

const saveActualEntry = () => {
  if (!rows.value.some((row) => row.date === actualEntryForm.date)) {
    ElMessage.warning('当前录入日期不在计算区间内，请先调整截止日期')
    return
  }

  if (
    actualEntryForm.actualShares === null ||
    actualEntryForm.actualCash === null ||
    actualEntryForm.closePrice === null
  ) {
    ElMessage.warning('请完整录入实盘股、实盘现和收盘价后再保存')
    return
  }

  isSavingActualEntry.value = true

  void saveActualEntryToFile({
    date: actualEntryForm.date,
    actualShares: normalizeShares(actualEntryForm.actualShares),
    actualCash: roundMoney(actualEntryForm.actualCash),
    closePrice: roundMoney(actualEntryForm.closePrice),
  })
    .then((payload: ActualEntriesPayload) => {
      syncActualEntriesFromPayload(payload.entries, payload.updatedAt)
      ElMessage.success(`已写回 ${actualEntryForm.date} 的实盘记录`)
    })
    .catch((error: unknown) => {
      const message =
        error instanceof Error ? error.message : '实盘记录写回失败'
      ElMessage.error(message)
    })
    .finally(() => {
      isSavingActualEntry.value = false
    })
}

const clearActualEntry = () => {
  if (!actualEntries.value[actualEntryForm.date]) {
    ElMessage.info('当前日期还没有已写回的实盘记录')
    return
  }

  isSavingActualEntry.value = true

  void deleteActualEntryFromFile(actualEntryForm.date)
    .then((payload: ActualEntriesPayload) => {
      syncActualEntriesFromPayload(payload.entries, payload.updatedAt)
      ElMessage.success(`已清除 ${actualEntryForm.date} 的实盘记录`)
    })
    .catch((error: unknown) => {
      const message =
        error instanceof Error ? error.message : '实盘记录清除失败'
      ElMessage.error(message)
    })
    .finally(() => {
      isSavingActualEntry.value = false
    })
}
</script>

<template>
  <div class="page-shell">
    <section class="hero-panel">
      <div class="hero-copy">
        <span class="eyebrow">Chip Runner Prototype</span>
        <h1>{{ titleYearRange }} Tracking Console</h1>
        <p>
          用 Vue3 + Element Plus
          把跟踪模型做成一个最小可用界面，支持多年度连续重算、年份切换和区间筛选。
        </p>
      </div>

      <div class="hero-actions">
        <el-button type="primary" @click="restorePreset">
          <el-icon><RefreshRight /></el-icon>
          应用底稿默认参数
        </el-button>
        <el-button @click="syncLotCost">每手成本跟随股价</el-button>
      </div>
    </section>

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
            <el-select v-model="selectedYearScope" placeholder="选择年份视图">
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
          title="最新基础数据从 2026.06.01 起算，默认前置交易日为 0；年份视图和展示区间只影响展示，不会重置累计过程。"
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

    <el-card shadow="never" class="panel actual-panel">
      <template #header>
        <div class="panel-title">
          <span>实盘录入</span>
          <small>
            录入后点击保存，会通过当前开发服务直接写回
            data/tracking/actual-entries.json 并参与下方对照计算。
          </small>
        </div>
      </template>

      <div class="actual-grid">
        <el-form label-position="top" class="actual-form">
          <el-form-item label="记录日期">
            <el-date-picker
              v-model="actualEntryForm.date"
              type="date"
              format="YYYY.MM.DD"
              value-format="YYYY.MM.DD"
              :disabled-date="disableOutsideCalculatedRange"
              placeholder="选择录入日期"
            />
          </el-form-item>

          <el-form-item label="实盘股">
            <el-input-number
              v-model="actualEntryForm.actualShares"
              :min="0"
              :step="100"
              controls-position="right"
            />
          </el-form-item>

          <el-form-item label="实盘现">
            <el-input-number
              v-model="actualEntryForm.actualCash"
              :min="0"
              :step="100"
              :precision="2"
              controls-position="right"
            />
          </el-form-item>

          <el-form-item label="收盘价">
            <el-input-number
              v-model="actualEntryForm.closePrice"
              :min="0.01"
              :step="0.01"
              :precision="2"
              controls-position="right"
            />
          </el-form-item>

          <div class="actual-actions">
            <el-button
              type="primary"
              :loading="isSavingActualEntry"
              @click="saveActualEntry"
            >
              保存当日记录
            </el-button>
            <el-button
              :disabled="isSavingActualEntry"
              @click="clearActualEntry"
            >
              清除当前记录
            </el-button>
            <el-button
              :loading="isLoadingActualEntries"
              @click="loadActualEntries"
            >
              重新读取文件
            </el-button>
          </div>
        </el-form>

        <div class="actual-side">
          <div class="snapshot-card">
            <span class="note-title">当前目标基准</span>
            <p>
              目标股
              <strong>{{ selectedComparisonRow?.targetShares ?? '--' }}</strong>
            </p>
            <p>
              目标现
              <strong>
                {{
                  formatOptionalMoney(selectedComparisonRow?.targetCash ?? null)
                }}
              </strong>
            </p>
            <p>
              目标资产
              <strong>
                {{
                  formatOptionalMoney(
                    selectedComparisonRow?.targetAssets ?? null,
                  )
                }}
              </strong>
            </p>
          </div>

          <div class="snapshot-card">
            <span class="note-title">保存状态</span>
            <div class="save-state">
              <el-tag type="success" effect="light">
                已保存 {{ savedEntryCount }} 条
              </el-tag>
              <el-tag
                :type="actualEntries[actualEntryForm.date] ? 'primary' : 'info'"
                effect="plain"
              >
                {{
                  actualEntries[actualEntryForm.date]
                    ? '当前日期已保存'
                    : '当前日期未保存'
                }}
              </el-tag>
            </div>
            <p>
              {{
                actualEntriesUpdatedAt
                  ? `最近写回时间：${actualEntriesUpdatedAt}`
                  : '当前还没有已写回的实盘记录'
              }}
            </p>
            <p>
              只要当前开发服务在运行，页面保存和清除都会直接改写仓库里的 JSON
              文件。
            </p>
          </div>
        </div>
      </div>
    </el-card>

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
            默认参数对应最新基础数据：4900 股 / 2313.83 现金 / 25.35 元 / 0.4
            差价。
          </p>
          <p>当前页面已支持 2026-2030 多年度交易日，展示区间可独立筛选。</p>
          <p>
            已迁入的历史总表 JSON 覆盖 {{ legacyTable.dateFrom }} -
            {{ legacyTable.dateTo }}，共 {{ legacyTable.rowCount }} 行。
          </p>
        </div>
      </div>
    </el-card>

    <el-card shadow="never" class="panel table-panel">
      <template #header>
        <div class="table-toolbar">
          <div>
            <span class="panel-heading">目标跟踪表</span>
            <p>
              买入日会高亮；当前展示 {{ displayRange.dateFrom }} -
              {{ displayRange.dateTo }}，计算累计截至 {{ form.endDate }}。
            </p>
          </div>
          <el-switch
            v-model="showRecentOnly"
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
          label="目标股"
          min-width="110"
          align="right"
        />
        <el-table-column label="做T利润" min-width="128" align="right">
          <template #default="scope">
            {{ formatMoney(scope.row.tProfit) }}
          </template>
        </el-table-column>
        <el-table-column label="目标现" min-width="128" align="right">
          <template #default="scope">
            {{ formatMoney(scope.row.targetCash) }}
          </template>
        </el-table-column>
        <el-table-column
          label="目标资产"
          min-width="150"
          align="right"
          class-name="target-assets-column"
          label-class-name="target-assets-column"
        >
          <template #default="scope">
            {{ formatMoney(scope.row.targetAssets) }}
          </template>
        </el-table-column>
        <el-table-column label="实盘股" min-width="110" align="right">
          <template #default="scope">
            {{ formatOptionalCount(scope.row.actualShares) }}
          </template>
        </el-table-column>
        <el-table-column label="实盘现" min-width="128" align="right">
          <template #default="scope">
            {{ formatOptionalMoney(scope.row.actualCash) }}
          </template>
        </el-table-column>
        <el-table-column label="做T差额" min-width="132" align="center">
          <template #default="scope">
            <el-tag :type="deltaTagType(scope.row.cashDelta)" effect="light">
              {{ formatSignedMoney(scope.row.cashDelta) }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="收盘价" min-width="112" align="right">
          <template #default="scope">
            {{ formatOptionalMoney(scope.row.closePrice) }}
          </template>
        </el-table-column>
        <el-table-column label="实盘总资产" min-width="150" align="right">
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
  </div>
</template>
