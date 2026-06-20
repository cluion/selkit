<script setup lang="ts">
import { ref } from 'vue'
import { SelkitSelect } from '@selkit/vue'

const options = [
  { value: 'apple', label: 'Apple' },
  { value: 'banana', label: 'Banana' },
  { value: 'cherry', label: 'Cherry' },
  { value: 'date', label: 'Date' },
]
const value = ref<string[]>([])
</script>

<template>
  <SelkitSelect
    v-model="value"
    :options="options"
    multiple
    checkboxes
    placeholder="Tick fruits…"
  />
</template>
