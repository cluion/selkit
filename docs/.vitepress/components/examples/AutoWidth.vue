<script setup lang="ts">
import { ref } from 'vue'
import { SelkitSelect } from '@selkit/vue'

// 長短不一的標籤：dropdownAutoWidth 讓下拉貼齊最寬內容（至少與控制項同寬）
const options = [
  { value: 1, label: 'Short' },
  { value: 2, label: 'A considerably longer option label here' },
  { value: 3, label: 'Another fairly long option to widen the menu' },
]
const value = ref<number | null>(null)
</script>

<template>
  <SelkitSelect
    v-model="value"
    :options="options"
    dropdown-auto-width
    placeholder="Open me…"
  />
</template>
