<script setup lang="ts">
import { ref } from 'vue'
import { SelkitSelect } from '@selkit/vue'

const options = [
  { value: 'apple', label: 'Apple' },
  { value: 'banana', label: 'Banana' },
  { value: 'cherry', label: 'Cherry' },
]
const value = ref<string[]>([])

// taggable 允許建立不存在的選項；createTag 決定新選項的 value/label；
// tokenSeparators 讓輸入逗號或空白即自動切出 tag（貼上 "a, b, c" 一次建三個）
const createTag = (query: string) => ({ value: query, label: query })
</script>

<template>
  <SelkitSelect
    v-model="value"
    :options="options"
    multiple
    taggable
    :create-tag="createTag"
    :token-separators="[',', ' ']"
    placeholder="Pick or type new…"
  />
</template>
