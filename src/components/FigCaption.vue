<script setup lang="ts">
/**
 * The one caption bar every journal figure uses.
 *
 * A figure carries a number, a title and an optional qualifier. They are set
 * here once — mono number and aside, sans title — so a reader cannot tell a
 * caption by its typography whether it sits above a framed chart or a custom
 * drawing. Callers may pass controls through the `action` slot; they sit at the
 * right edge exactly where an aside would.
 */
import type { Bi } from '@/content'
import { useI18n } from '@/composables/useI18n'

withDefaults(
  defineProps<{
    /** Figure number, e.g. `3` renders as `FIGURE 03`. */
    n: string | number
    title: Bi
    /** Right-aligned mono qualifier, e.g. a unit or a sample size. */
    aside?: Bi
  }>(),
  {},
)

const { t, isZh } = useI18n()

const pad = (v: string | number) => String(v).padStart(2, '0')
</script>

<template>
  <figcaption class="figcap">
    <span class="figcap__n">{{ isZh ? '图' : 'Figure' }} {{ pad(n) }}</span>
    <span class="figcap__title">{{ t(title) }}</span>
    <span v-if="aside" class="figcap__aside">{{ t(aside) }}</span>
    <span v-if="$slots.action" class="figcap__action"><slot name="action" /></span>
  </figcaption>
</template>

<style scoped>
.figcap {
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  gap: 0.3rem 0.7rem;
  margin: 0 0 0.85rem;
  padding: 0 0 0.55rem;
  border-bottom: 1px solid var(--line);
}
.figcap__n {
  font-family: var(--ff-mono);
  font-size: var(--fs-tick);
  font-weight: 400;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  color: var(--ink-mute);
  white-space: nowrap;
}
.figcap__title {
  font-family: var(--ff-sans);
  font-size: var(--fs-small);
  font-weight: 400;
  letter-spacing: -0.01em;
  color: var(--ink);
}
.figcap__aside {
  margin-left: auto;
  font-family: var(--ff-mono);
  font-size: var(--fs-tick);
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: var(--ink-mute);
}
.figcap__action {
  margin-left: auto;
  display: inline-flex;
  align-items: baseline;
}
</style>
