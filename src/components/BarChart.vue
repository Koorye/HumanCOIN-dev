<script setup lang="ts">
import type { Bi } from '@/content'
import { useI18n } from '@/composables/useI18n'

export interface Bar {
  label: Bi
  value: number
  color: string
}

const props = withDefaults(
  defineProps<{
    bars: Bar[]
    unit?: Bi
    max?: number
    valueFormat?: (v: number) => string
    /** Width of the label column, in rem. Must fit the longest label. */
    labelWidth?: number
  }>(),
  { labelWidth: 9, valueFormat: (v: number) => String(v) },
)
const { t } = useI18n()
const top = () => props.max ?? Math.max(...props.bars.map((b) => b.value)) * 1.12
</script>

<template>
  <div class="bars" role="img" :style="{ '--lw': `${labelWidth}rem` }">
    <div v-for="b in bars" :key="b.label.en" class="bars__row">
      <span class="bars__label" :title="t(b.label)">{{ t(b.label) }}</span>
      <span class="bars__track">
        <span
          class="bars__fill"
          :style="{ width: `${(b.value / top()) * 100}%`, background: b.color }"
        />
      </span>
      <span class="bars__value">
        {{ valueFormat(b.value) }}<span v-if="unit" class="bars__unit">{{ t(unit) }}</span>
      </span>
    </div>
  </div>
</template>

<style scoped>
.bars { display: grid; gap: 0.5rem; }
.bars__row {
  display: grid;
  grid-template-columns: minmax(3.5rem, var(--lw, 9rem)) minmax(0, 1fr) minmax(3rem, auto);
  align-items: center;
  gap: 0.75rem;
  font-size: var(--fs-small);
}
.bars__label { color: var(--ink-soft); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.bars__track {
  height: 0.55rem;
  background: var(--surface-2);
  border-radius: var(--r-pill);
  overflow: hidden;
}
.bars__fill {
  display: block;
  height: 100%;
  border-radius: var(--r-pill);
  transition: width var(--dur) var(--ease);
}
.bars__value {
  color: var(--ink);
  font-weight: 550;
  font-variant-numeric: tabular-nums;
  text-align: right;
  white-space: nowrap;
}
.bars__unit { color: var(--ink-mute); font-weight: 400; margin-left: 0.15em; }

@media (max-width: 560px) {
  .bars__row { grid-template-columns: minmax(0, 1fr) minmax(3rem, auto); }
  .bars__label { grid-column: 1 / -1; }
  .bars__track { grid-column: 1; }
}
</style>
