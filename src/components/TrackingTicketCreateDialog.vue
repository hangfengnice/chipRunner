<script setup lang="ts">
import { reactive, watch } from 'vue'
import { ElMessage } from 'element-plus'
import {
  DEFAULT_PARAMS,
  syncLotCostFromPrice,
  type TrackingParams,
} from '../lib/tracking'
import { ALL_TRADING_DATES } from '../data/sources'
import TrackingFieldsForm, {
  type TicketDraft,
} from './TrackingFieldsForm.vue'

const props = defineProps<{
  modelValue: boolean
}>()

const emit = defineEmits<{
  'update:modelValue': [value: boolean]
  create: [name: string, params: TrackingParams]
}>()

const draft = reactive<TicketDraft>({
  name: '',
  startDate: DEFAULT_PARAMS.startDate,
  price: DEFAULT_PARAMS.price,
  initialShares: DEFAULT_PARAMS.initialShares,
  initialCash: DEFAULT_PARAMS.initialCash,
  spread: DEFAULT_PARAMS.spread,
})

// 每次打开重置为默认值
watch(
  () => props.modelValue,
  (visible) => {
    if (visible) {
      draft.name = ''
      draft.startDate = DEFAULT_PARAMS.startDate
      draft.price = DEFAULT_PARAMS.price
      draft.initialShares = DEFAULT_PARAMS.initialShares
      draft.initialCash = DEFAULT_PARAMS.initialCash
      draft.spread = DEFAULT_PARAMS.spread
    }
  },
)

const handleSubmit = () => {
  const name = draft.name.trim()
  if (!name) {
    ElMessage.warning('请输入票名')
    return
  }
  if (!ALL_TRADING_DATES.includes(draft.startDate)) {
    ElMessage.warning('起始日不是交易日,将从最近的下一个交易日开始')
  }
  const params: TrackingParams = {
    startDate: draft.startDate,
    initialShares: draft.initialShares,
    initialCash: draft.initialCash,
    price: draft.price,
    spread: draft.spread,
    lotCost: syncLotCostFromPrice(draft.price),
    hiddenTradingDays: 0,
    endDate: DEFAULT_PARAMS.endDate,
  }
  emit('create', name, params)
  emit('update:modelValue', false)
}
</script>

<template>
  <el-dialog
    :model-value="modelValue"
    title="新建票"
    width="520"
    @update:model-value="(value: boolean) => emit('update:modelValue', value)"
  >
    <TrackingFieldsForm :draft="draft" />
    <template #footer>
      <el-button @click="emit('update:modelValue', false)">取消</el-button>
      <el-button type="primary" @click="handleSubmit">创建</el-button>
    </template>
  </el-dialog>
</template>
