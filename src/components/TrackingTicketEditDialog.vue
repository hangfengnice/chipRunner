<script setup lang="ts">
import { reactive, watch } from 'vue'
import {
  DEFAULT_PARAMS,
  syncLotCostFromPrice,
  type TrackingParams,
} from '../lib/tracking'
import type { Account } from '../lib/accountState'
import TrackingFieldsForm, {
  type TicketDraft,
} from './TrackingFieldsForm.vue'

const props = defineProps<{
  modelValue: boolean
  account: Account | undefined
}>()

const emit = defineEmits<{
  'update:modelValue': [value: boolean]
  save: [id: string, name: string, params: TrackingParams]
  remove: [id: string]
}>()

const draft = reactive<TicketDraft>({
  name: '',
  startDate: DEFAULT_PARAMS.startDate,
  price: DEFAULT_PARAMS.price,
  initialShares: DEFAULT_PARAMS.initialShares,
  initialCash: DEFAULT_PARAMS.initialCash,
  spread: DEFAULT_PARAMS.spread,
})

// 打开时用当前票数据预填
watch(
  () => props.modelValue,
  (visible) => {
    if (visible && props.account) {
      const p = props.account.params
      draft.name = props.account.name
      draft.startDate = p.startDate
      draft.price = p.price
      draft.initialShares = p.initialShares
      draft.initialCash = p.initialCash
      draft.spread = p.spread
    }
  },
)

const handleSave = () => {
  if (!props.account) return
  const params: TrackingParams = {
    startDate: draft.startDate,
    initialShares: draft.initialShares,
    initialCash: draft.initialCash,
    price: draft.price,
    spread: draft.spread,
    lotCost: syncLotCostFromPrice(draft.price),
    hiddenTradingDays: props.account.params.hiddenTradingDays,
    endDate: props.account.params.endDate,
  }
  emit('save', props.account.id, draft.name.trim() || '票', params)
  emit('update:modelValue', false)
}

const handleRemove = () => {
  if (!props.account) return
  emit('remove', props.account.id)
}
</script>

<template>
  <el-dialog
    :model-value="modelValue"
    title="编辑票"
    width="520"
    @update:model-value="(value: boolean) => emit('update:modelValue', value)"
  >
    <TrackingFieldsForm :draft="draft" />
    <template #footer>
      <div class="edit-footer">
        <el-button type="danger" @click="handleRemove">删除这只票</el-button>
        <div class="edit-footer-right">
          <el-button @click="emit('update:modelValue', false)">取消</el-button>
          <el-button type="primary" @click="handleSave">保存</el-button>
        </div>
      </div>
    </template>
  </el-dialog>
</template>

<style scoped>
.edit-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.edit-footer-right {
  display: flex;
  gap: 8px;
}
</style>
