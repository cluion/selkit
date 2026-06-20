<script setup lang="ts">
import { ref } from 'vue'
import { SelkitSelect } from '@selkit/vue'

// 2000 個選項只渲染可視切片；item-height 須與實際樣式列高一致（base 主題為 36px）
const options = Array.from({ length: 2000 }, (_, i) => ({
  value: `opt-${i}`,
  label: `Option ${i + 1}`,
}))
const value = ref<string | null>(null)
</script>

<template>
  <SelkitSelect
    v-model="value"
    :options="options"
    virtual-scroll
    :item-height="36"
    placeholder="2000 options — scroll away"
  />
</template>
