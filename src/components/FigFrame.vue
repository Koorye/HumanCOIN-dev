<script setup lang="ts">
/**
 * A journal figure frame: number, title, optional aside, the plot, and a note.
 *
 * Every chart in the site is wrapped in this, so figure numbering, the rule
 * under the head and caption typography are decided once. The number is
 * display-serif and the title sans — the same split a printed paper uses to
 * separate a figure caption from running prose.
 */
import type { Bi } from '@/content'
import { useI18n } from '@/composables/useI18n'

withDefaults(
  defineProps<{
    /** Figure number, e.g. `3`. Rendered as `FIGURE 3`. */
    n: string | number
    title: Bi
    /** Right-aligned mono qualifier, e.g. a unit or a sample size. */
    aside?: Bi
    note?: Bi
    /** Untranslated note text, for mixed content the caller already built. */
    noteText?: string
  }>(),
  {},
)
const { t, isZh } = useI18n()
</script>

<template>
  <figure class="fig" v-reveal>
    <figcaption class="fig__head">
      <span class="fig__n">{{ isZh ? '图' : 'Figure' }} {{ n }}</span>
      <span class="fig__title">{{ t(title) }}</span>
      <span v-if="aside" class="fig__aside">{{ t(aside) }}</span>
    </figcaption>

    <slot />

    <!-- The note arrives either as a prop or as a `#note` slot; the rule is
         rendered when either is present, so a caller that supplies the slot
         is not silently dropped. -->
    <p v-if="note || noteText || $slots.note" class="fig__note">
      <slot name="note">{{ noteText ?? (note ? t(note) : '') }}</slot>
    </p>
  </figure>
</template>
