<script setup lang="ts">
import type { Bi } from '@/content'
import { useI18n } from '@/composables/useI18n'
import RichText from '@/components/RichText.vue'

defineProps<{
  /** Section number; omit for sections that sit outside the numbered argument. */
  num?: string
  kicker: Bi
  title: Bi
  aside?: Bi
  single?: boolean
  /** Widen the aside column, for sections whose aside carries the argument. */
  asideWide?: boolean
}>()
const { t } = useI18n()
</script>

<template>
  <header
    class="section__head"
    :class="{ 'section__head--single': single, 'section__head--aside-wide': asideWide }"
  >
    <div>
      <p class="section-num"><b v-if="num">{{ num }}</b> {{ t(kicker) }}</p>
      <h2 class="section__title">{{ t(title) }}</h2>
    </div>
    <div v-if="aside" class="section__aside">
      <slot name="aside"><p><RichText :text="t(aside)" /></p></slot>
    </div>
    <div v-else-if="$slots.aside" class="section__aside"><slot name="aside" /></div>
  </header>
</template>
