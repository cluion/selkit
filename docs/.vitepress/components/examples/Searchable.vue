<script setup lang="ts">
import { ref } from 'vue'
import { SelkitSelect } from '@selkit/vue'

// 30 個選項讓搜尋有感；fuzzy 讓 "blbr" 也能搜到 "Blackberry"
const options = Array.from({ length: 30 }, (_, i) => ({
  value: `item-${i}`,
  label: `Option #${i + 1}`,
}))
const value = ref<string | null>(null)
</script>

<template>
  <SelkitSelect
    v-model="value"
    :options="options"
    fuzzy
    placeholder="Type to search…"
  />
</template>
