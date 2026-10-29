<script setup lang="ts">
import type { Bi } from '@/content'
import { useI18n } from '@/composables/useI18n'

defineProps<{ num: string; kicker: Bi; title: Bi; aside?: Bi; single?: boolean }>()
const { t } = useI18n()
</script>

<template>
  <header class="section__head" :class="{ 'section__head--single': single }">
    <div>
      <p class="section-num"><b>{{ num }}</b> {{ t(kicker) }}</p>
      <h2 class="section__title">{{ t(title) }}</h2>
    </div>
    <div v-if="aside" class="section__aside">
      <slot name="aside"><p>{{ t(aside) }}</p></slot>
    </div>
    <div v-else-if="$slots.aside" class="section__aside"><slot name="aside" /></div>
  </header>
</template>
