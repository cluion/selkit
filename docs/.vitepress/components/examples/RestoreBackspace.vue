<script setup lang="ts">
import { ref } from 'vue'
import { SelkitSelect } from '@selkit/vue'

const options = [
  { value: 'apple', label: 'Apple' },
  { value: 'banana', label: 'Banana' },
  { value: 'cherry', label: 'Cherry' },
]
const value = ref<string[]>([])
const createTag = (q: string) => ({ value: q.toLowerCase(), label: q })
</script>

<template>
  <SelkitSelect
    v-model="value"
    :options="options"
    multiple
    taggable
    :create-tag="createTag"
    restore-on-backspace
    placeholder="Pick, then press Backspace…"
  />
</template>
