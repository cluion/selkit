<script setup lang="ts">
import { ref } from 'vue'
import { SelkitSelect } from '@selkit/vue'

const options = Array.from({ length: 30 }, (_, i) => ({
  value: `o-${i}`,
  label: `Option #${i + 1}`,
}))
const value = ref<string | null>(null)
</script>

<template>
  <SelkitSelect
    v-model="value"
    :options="options"
    :min-input-length="2"
    placeholder="Type 2+ chars…"
  />
</template>
