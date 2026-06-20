<script setup lang="ts">
import { ref } from 'vue'
import { SelkitSelect } from '@selkit/vue'

// optgroup：選項帶 options 子陣列即自動分組（僅一層）
const options = [
  {
    label: 'Berries',
    options: [
      { value: 'blueberry', label: 'Blueberry' },
      { value: 'raspberry', label: 'Raspberry' },
    ],
  },
  {
    label: 'Citrus',
    options: [
      { value: 'lemon', label: 'Lemon' },
      { value: 'orange', label: 'Orange' },
    ],
  },
  {
    label: 'Stone fruits',
    options: [
      { value: 'peach', label: 'Peach' },
      { value: 'plum', label: 'Plum' },
    ],
  },
]
const value = ref<string | null>(null)
</script>

<template>
  <SelkitSelect v-model="value" :options="options" placeholder="Pick one…" />
</template>
