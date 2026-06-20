<script lang="ts">
export interface TicketDraft {
  name: string
  startDate: string
  price: number
  initialShares: number
  initialCash: number
  spread: number
}
</script>

<script setup lang="ts">
// 票的 6 个核心字段表单(新建/编辑对话框共用)。
// 通过传入的 reactive draft 对象直接双向绑定(引用共享),父组件管初始值/预填。
defineProps<{
  draft: TicketDraft
}>()
</script>

<template>
  <el-form label-position="top" class="ticket-fields-form">
    <el-form-item label="票名">
      <el-input v-model="draft.name" placeholder="如:紫金矿业" />
    </el-form-item>
    <el-form-item label="起始日">
      <el-date-picker
        v-model="draft.startDate"
        type="date"
        format="YYYY.MM.DD"
        value-format="YYYY.MM.DD"
        placeholder="选择起始日"
      />
    </el-form-item>
    <el-form-item label="股价(元)">
      <el-input-number
        v-model="draft.price"
        :min="0.01"
        :step="0.1"
        :precision="2"
        controls-position="right"
      />
    </el-form-item>
    <el-form-item label="初始股数(股)">
      <el-input-number
        v-model="draft.initialShares"
        :min="0"
        :step="100"
        controls-position="right"
      />
    </el-form-item>
    <el-form-item label="初始现金(元)">
      <el-input-number
        v-model="draft.initialCash"
        :min="0"
        :step="100"
        :precision="2"
        controls-position="right"
      />
    </el-form-item>
    <el-form-item label="每日差价(元)">
      <el-input-number
        v-model="draft.spread"
        :min="0"
        :step="0.1"
        :precision="2"
        controls-position="right"
      />
    </el-form-item>
  </el-form>
</template>

<style scoped>
.ticket-fields-form {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 8px 18px;
}

.ticket-fields-form :deep(.el-form-item:first-child) {
  grid-column: 1 / -1;
}
</style>
