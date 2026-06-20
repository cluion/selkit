<script setup lang="ts">
import { ref } from 'vue'
import { SelkitSelect } from '@selkit/vue'

// 10 群 × 100 = 1000 列；虛擬捲動 + 分組並存，header 與選項列高不同
const options = Array.from({ length: 10 }, (_, g) => ({
  label: `Group ${g + 1}`,
  options: Array.from({ length: 100 }, (_, i) => ({
    value: `g${g}-${i}`,
    label: `Group ${g + 1} · Item ${i + 1}`,
  })),
}))
const value = ref<string | null>(null)
</script>

<template>
  <SelkitSelect
    v-model="value"
    :options="options"
    virtual-scroll
    :item-height="36"
    :group-height="28"
    placeholder="10 groups × 100"
  />
</template>
