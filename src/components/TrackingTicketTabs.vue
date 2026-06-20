<script setup lang="ts">
import { Edit, Plus } from '@element-plus/icons-vue'
import type { Account } from '../lib/accountState'

defineProps<{
  accounts: Account[]
  selectedAccountId: string
}>()

const emit = defineEmits<{
  select: [id: string]
  create: []
  edit: []
}>()
</script>

<template>
  <div class="ticket-tabs-bar">
    <el-tabs
      class="ticket-tabs"
      :model-value="selectedAccountId"
      type="card"
      @update:model-value="(id: string | number) => emit('select', String(id))"
    >
      <el-tab-pane
        v-for="account in accounts"
        :key="account.id"
        :label="account.name"
        :name="account.id"
      />
    </el-tabs>
    <el-button :icon="Edit" @click="emit('edit')">编辑</el-button>
    <el-button type="primary" :icon="Plus" @click="emit('create')">新建票</el-button>
  </div>
</template>

<style scoped>
.ticket-tabs-bar {
  display: flex;
  align-items: flex-end;
  gap: 12px;
}

.ticket-tabs {
  flex: 1;
  min-width: 0;
}

/* 仅把 el-tabs 当切换器用:隐藏内容区、去掉 header 下边距 */
.ticket-tabs :deep(.el-tabs__content) {
  display: none;
}

.ticket-tabs :deep(.el-tabs__header) {
  margin: 0;
}
</style>
