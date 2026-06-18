<script setup lang="ts">
import { computed, ref } from 'vue'
import { Delete, Edit } from '@element-plus/icons-vue'
import type { Account } from '../lib/accountState'

const props = defineProps<{
  modelValue: boolean
  accounts: Account[]
  selectedAccountId: string
}>()

const emit = defineEmits<{
  'update:modelValue': [value: boolean]
  create: []
  rename: [id: string, name: string]
  remove: [id: string]
  select: [id: string]
}>()

const visible = computed({
  get: () => props.modelValue,
  set: (value: boolean) => emit('update:modelValue', value),
})

const editingId = ref<string | null>(null)
const draftName = ref('')

const beginEdit = (account: Account) => {
  editingId.value = account.id
  draftName.value = account.name
}

const commitEdit = () => {
  if (editingId.value && draftName.value.trim()) {
    emit('rename', editingId.value, draftName.value.trim())
  }
  editingId.value = null
  draftName.value = ''
}

const cancelEdit = () => {
  editingId.value = null
  draftName.value = ''
}

const entryCountOf = (account: Account) =>
  Object.keys(account.actualEntries).length
</script>

<template>
  <el-dialog
    v-model="visible"
    title="账户管理"
    width="640"
    :close-on-click-modal="false"
  >
    <div class="manager-toolbar">
      <el-button type="primary" @click="emit('create')">+ 新建账户</el-button>
    </div>

    <el-table :data="props.accounts" stripe>
      <el-table-column label="当前" width="84" align="center">
        <template #default="scope">
          <el-tag
            v-if="scope.row.id === selectedAccountId"
            type="success"
            effect="light"
            size="small"
          >
            当前
          </el-tag>
          <el-button
            v-else
            text
            size="small"
            type="primary"
            @click="emit('select', scope.row.id)"
          >
            切到该账户
          </el-button>
        </template>
      </el-table-column>
      <el-table-column label="账户名" min-width="200">
        <template #default="scope">
          <el-input
            v-if="editingId === scope.row.id"
            v-model="draftName"
            size="small"
            @keyup.enter="commitEdit"
            @keyup.esc="cancelEdit"
          />
          <span v-else>{{ scope.row.name }}</span>
        </template>
      </el-table-column>
      <el-table-column label="实盘条数" width="100" align="right">
        <template #default="scope">
          {{ entryCountOf(scope.row) }}
        </template>
      </el-table-column>
      <el-table-column label="最后更新" min-width="200">
        <template #default="scope">
          {{ scope.row.updatedAt }}
        </template>
      </el-table-column>
      <el-table-column label="操作" width="180" align="center">
        <template #default="scope">
          <template v-if="editingId === scope.row.id">
            <el-button text type="primary" size="small" @click="commitEdit">
              保存
            </el-button>
            <el-button text size="small" @click="cancelEdit">取消</el-button>
          </template>
          <template v-else>
            <el-button
              text
              :icon="Edit"
              size="small"
              @click="beginEdit(scope.row)"
            >
              重命名
            </el-button>
            <el-popconfirm
              title="确定删除这个账户?"
              confirm-button-text="删除"
              cancel-button-text="取消"
              @confirm="emit('remove', scope.row.id)"
            >
              <template #reference>
                <el-button
                  text
                  :icon="Delete"
                  size="small"
                  type="danger"
                >
                  删除
                </el-button>
              </template>
            </el-popconfirm>
          </template>
        </template>
      </el-table-column>
    </el-table>

    <p v-if="props.accounts.length <= 1" class="manager-hint">
      当前为唯一账户，至少保留 1 个。
    </p>
  </el-dialog>
</template>

<style scoped>
.manager-toolbar {
  display: flex;
  justify-content: flex-end;
  margin-bottom: 12px;
}

.manager-hint {
  margin-top: 12px;
  font-size: 12px;
  color: var(--el-text-color-secondary);
}
</style>
