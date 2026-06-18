<script setup lang="ts">
import { computed } from 'vue'
import { Plus } from '@element-plus/icons-vue'

const props = defineProps<{
  modelValue: string
  accounts: Array<{ id: string; name: string }>
}>()

const emit = defineEmits<{
  'update:modelValue': [value: string]
  create: []
  manage: []
}>()

const model = computed({
  get: () => props.modelValue,
  set: (value: string) => emit('update:modelValue', value),
})
</script>

<template>
  <div class="account-switcher">
    <span class="switcher-label">当前账户</span>
    <el-select v-model="model" placeholder="选择账户" class="switcher-select">
      <el-option
        v-for="account in accounts"
        :key="account.id"
        :label="account.name"
        :value="account.id"
      />
    </el-select>
    <el-button :icon="Plus" @click="emit('create')">新建账户</el-button>
    <el-button text @click="emit('manage')">管理</el-button>
  </div>
</template>

<style scoped>
.account-switcher {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
}

.switcher-label {
  font-size: 13px;
  color: var(--el-text-color-secondary);
}

.switcher-select {
  min-width: 200px;
}
</style>
