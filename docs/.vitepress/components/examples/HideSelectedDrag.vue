<script setup lang="ts">
import { ref } from 'vue'
import { SelkitSelect } from '@selkit/vue'

const options = [
  { value: 'apple', label: 'Apple' },
  { value: 'banana', label: 'Banana' },
  { value: 'cherry', label: 'Cherry' },
  { value: 'date', label: 'Date' },
  { value: 'elderberry', label: 'Elderberry' },
]
const value = ref<string[]>([])
</script>

<template>
  <SelkitSelect
    v-model="value"
    :options="options"
    multiple
    hide-selected
    placeholder="Pick & drag tags to reorder"
  />
</template>
