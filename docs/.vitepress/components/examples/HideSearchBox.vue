<script setup lang="ts">
import { ref } from 'vue'
import { SelkitSelect } from '@selkit/vue'

const options = [
  { value: 'apple', label: 'Apple' },
  { value: 'banana', label: 'Banana' },
  { value: 'cherry', label: 'Cherry' },
]
const value = ref<string | null>(null)
</script>

<template>
  <SelkitSelect
    v-model="value"
    :options="options"
    :min-results-for-search="10"
    placeholder="No search box (few options)"
  />
</template>
