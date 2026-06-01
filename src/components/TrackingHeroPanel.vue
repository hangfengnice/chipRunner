<script setup lang="ts">
import { RefreshRight } from '@element-plus/icons-vue'

defineProps<{
  titleYearRange: string
}>()

const emit = defineEmits<{
  restorePreset: []
  syncLotCost: []
}>()
</script>

<template>
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
      <el-button type="primary" @click="emit('restorePreset')">
        <el-icon><RefreshRight /></el-icon>
        应用底稿默认参数
      </el-button>
      <el-button @click="emit('syncLotCost')">每手成本跟随股价</el-button>
    </div>
  </section>
</template>
