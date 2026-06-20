<script setup lang="ts">
import type { ActualEntryDraft } from '../composables/useActualEntryState'
import type { TrackingComparisonRow } from '../lib/tracking'
import { formatOptionalMoney } from '../lib/trackingDisplay'

const props = defineProps<{
  accountName: string
  actualEntryForm: ActualEntryDraft
  selectedComparisonRow: TrackingComparisonRow | null
  savedEntryCount: number
  hasSavedEntry: boolean
  actualEntriesUpdatedAt: string | null
  isLoadingActualEntries: boolean
  isSavingActualEntry: boolean
  disableOutsideCalculatedRange: (date: Date) => boolean
}>()

const emit = defineEmits<{
  clear: []
  save: []
}>()

void props
</script>

<template>
  <el-card shadow="never" class="panel actual-panel">
    <template #header>
      <div class="panel-title">
        <span>实盘录入</span>
        <small>
          当前账户:
          <strong>{{ accountName }}</strong>
          · 录入后点击保存，会通过当前开发服务直接写回 data/tracking/state.json
          并参与下方对照计算。
        </small>
      </div>
    </template>

    <div class="actual-grid">
      <el-form label-position="top" class="actual-form">
        <el-form-item label="记录日期" class="wide-field">
          <el-date-picker
            v-model="actualEntryForm.date"
            type="date"
            format="YYYY.MM.DD"
            value-format="YYYY.MM.DD"
            :disabled-date="disableOutsideCalculatedRange"
            placeholder="选择录入日期"
          />
        </el-form-item>

        <div class="field-group-title">当日实盘</div>
        <el-form-item label="当前股数(股)">
          <el-input-number
            v-model="actualEntryForm.actualShares"
            :min="0"
            :step="100"
            controls-position="right"
          />
        </el-form-item>
        <el-form-item label="当前现金(元)">
          <el-input-number
            v-model="actualEntryForm.actualCash"
            :min="0"
            :step="0.01"
            :precision="2"
            controls-position="right"
          />
        </el-form-item>
        <el-form-item label="收盘价(元)">
          <el-input-number
            v-model="actualEntryForm.closePrice"
            :min="0.01"
            :step="0.01"
            :precision="2"
            controls-position="right"
          />
        </el-form-item>
        <el-form-item label="当天实际获取现金(元)">
          <el-input-number
            v-model="actualEntryForm.dailyCashGained"
            :min="0"
            :step="0.01"
            :precision="2"
            controls-position="right"
            placeholder="可留空"
          />
        </el-form-item>

        <div class="actual-actions">
          <el-button
            type="primary"
            :loading="isSavingActualEntry"
            @click="emit('save')"
          >
            保存当日记录
          </el-button>
          <el-popconfirm
            title="确定删除当日实盘记录？"
            confirm-button-text="删除"
            cancel-button-text="取消"
            @confirm="emit('clear')"
          >
            <template #reference>
              <el-button :disabled="isSavingActualEntry" type="primary">
                删除当日实盘
              </el-button>
            </template>
          </el-popconfirm>
        </div>
      </el-form>

      <div class="actual-side">
        <div class="snapshot-card">
          <span class="note-title">当前目标基准</span>
          <p>
            预期股数
            <strong>{{ selectedComparisonRow?.targetShares ?? '--' }}</strong>
          </p>
          <p>
            预期现金
            <strong>
              {{
                formatOptionalMoney(selectedComparisonRow?.targetCash ?? null)
              }}
            </strong>
          </p>
          <p>
            预期总资产
            <strong>
              {{
                formatOptionalMoney(selectedComparisonRow?.targetAssets ?? null)
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
            <el-tag :type="hasSavedEntry ? 'primary' : 'info'" effect="plain">
              {{ hasSavedEntry ? '当前日期已保存' : '当前日期未保存' }}
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
            只要当前开发服务在运行，页面保存和清除都会直接改写仓库里的
            state.json。
          </p>
        </div>
      </div>
    </div>
  </el-card>
</template>
