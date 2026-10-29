<script setup lang="ts">
/**
 * Rank correlation between the six prediction targets, across the eight
 * modality combinations.
 *
 * The matrix is computed from the ablation table (`data/figures.ts`), not
 * authored, because the claim it supports — that the metrics move together and
 * therefore that a single "better" cannot be read off one of them — is only
 * meaningful if a reader can recompute the numbers from the table below it.
 * Signs are normalised first, so a positive cell always means "better together"
 * regardless of whether the metric is an accuracy or an error.
 *
 * Rank rather than raw correlation: the metrics are on four different scales
 * and one of them (FDE) is heavy-tailed, so a product-moment correlation would
 * be dominated by the widest-ranging column.
 */
import { computed, ref } from 'vue'
import { useI18n } from '@/composables/useI18n'
import { useInView } from '@/composables/useReveal'
import { METRIC_SHORT, metricCorrelation } from '@/data/figures'
import { ABLATION } from '@/data/stats'

const props = withDefaults(defineProps<{ highlight?: string }>(), { highlight: '' })
const { isZh } = useI18n()

/* Cells fade in on a short diagonal, so the matrix reads as a grid being
   filled rather than as 36 unrelated swatches. */
const { el: corrEl, shown: corrIn } = useInView<SVGSVGElement>({ margin: '0px 0px -8% 0px' })

const matrix = metricCorrelation()
const n = matrix.length

/** Row and column of the target selected in the section's metric picker. */
const focusIdx = computed(() => METRIC_SHORT.indexOf(props.highlight))

const SEL = 40
const PAD_L = 34
const PAD_T = 26
const W = PAD_L + n * SEL + 8
const H = PAD_T + n * SEL + 46

const hovered = ref<{ r: number; c: number } | null>(null)

/**
 * Diverging shading around zero. Both poles are dark enough to carry white
 * text, which is what lets the cell print its own number instead of relying on
 * a legend — the convention in a published correlation matrix.
 */
function fill(v: number): string {
  const a = Math.min(1, Math.abs(v)) ** 0.75
  if (Math.abs(v) < 0.05) return 'var(--paper)'
  const base = v > 0 ? '15, 107, 99' : '91, 69, 168'
  return `rgba(${base}, ${0.1 + a * 0.78})`
}

const labels = computed(() =>
  METRIC_SHORT.map((id) => {
    const m = ABLATION.find((x) => x.id === id)!
    return isZh ? m.label.zh : m.label.en
  }),
)

/** Short forms, so a 34 px gutter is enough for the row header. */
const SHORT: Record<string, string> = {
  gesture: 'GES',
  position: 'POS',
  angle: 'ANG',
  ade: 'ADE',
  fde: 'FDE',
  future: 'FUT',
}
</script>

<template>
  <svg
    ref="corrEl"
    class="corr"
    :class="{ 'is-in': corrIn, 'has-focus': focusIdx >= 0 }"
    :viewBox="`0 0 ${W} ${H}`"
    role="img"
    :aria-label="isZh ? '预测指标之间的秩相关矩阵' : 'Rank correlation matrix between prediction targets'"
  >
    <g v-for="(row, r) in matrix" :key="`r${r}`">
      <text
        class="corr__head"
        :class="{ 'is-focus': r === focusIdx }"
        :x="PAD_L - 8"
        :y="PAD_T + r * SEL + SEL / 2 + 3.5"
        text-anchor="end"
      >
        {{ SHORT[METRIC_SHORT[r]] }}
      </text>
      <g v-for="(v, c) in row" :key="`c${r}-${c}`">
        <rect
          class="corr__cell"
          :style="{ '--i': r + c }"
          :x="PAD_L + c * SEL"
          :y="PAD_T + r * SEL"
          :width="SEL - 2"
          :height="SEL - 2"
          rx="2"
          :fill="fill(v)"
          :class="{
            'is-on': hovered && hovered.r === r && hovered.c === c,
            'is-focus': focusIdx >= 0 && (r === focusIdx || c === focusIdx),
          }"
          @mouseenter="hovered = { r, c }"
          @mouseleave="hovered = null"
        />
        <text
          class="corr__val"
          :class="{
            'is-dark': Math.abs(v) > 0.45,
            'is-focus': focusIdx >= 0 && (r === focusIdx || c === focusIdx),
          }"
          :style="{ '--i': r + c }"
          :x="PAD_L + c * SEL + SEL / 2 - 1"
          :y="PAD_T + r * SEL + SEL / 2 + 3.5"
          text-anchor="middle"
        >
          {{ v.toFixed(2).replace('0.', '.') }}
        </text>
        <title>{{ labels[r] }} × {{ labels[c] }}: ρ = {{ v.toFixed(3) }}</title>
      </g>
    </g>

    <!-- column headers, rotated so full words fit -->
    <g v-for="c in n" :key="`h${c}`">
      <text
        class="corr__head"
        :class="{ 'is-focus': c - 1 === focusIdx }"
        :x="PAD_L + (c - 1) * SEL + SEL / 2"
        :y="PAD_T - 8"
        text-anchor="start"
        :transform="`rotate(-45 ${PAD_L + (c - 1) * SEL + SEL / 2} ${PAD_T - 8})`"
      >
        {{ SHORT[METRIC_SHORT[c - 1]] }}
      </text>
    </g>

    <!-- colour key -->
    <g :transform="`translate(${PAD_L}, ${H - 22})`">
      <rect class="corr__key" x="0" y="0" width="14" height="9" fill="rgba(91, 69, 168, 0.88)" />
      <rect class="corr__key" x="14" y="0" width="14" height="9" fill="rgba(91, 69, 168, 0.3)" />
      <rect class="corr__key" x="28" y="0" width="14" height="9" fill="var(--paper)" />
      <rect class="corr__key" x="42" y="0" width="14" height="9" fill="rgba(15, 107, 99, 0.3)" />
      <rect class="corr__key" x="56" y="0" width="14" height="9" fill="rgba(15, 107, 99, 0.88)" />
      <text class="corr__key-label" x="-6" y="8" text-anchor="end">−1</text>
      <text class="corr__key-label" x="76" y="8">+1</text>
      <text class="corr__key-label" x="96" y="8">
        {{ isZh ? '斯皮尔曼 ρ（符号已归一）' : 'Spearman ρ, sign-normalised' }}
      </text>
    </g>
  </svg>
</template>

<style scoped>
.corr { width: 100%; max-width: 30rem; height: auto; display: block; }

.corr__cell {
  stroke: var(--paper);
  stroke-width: 2;
  opacity: 0;
  transition:
    stroke var(--dur-1) var(--ease),
    opacity var(--dur-3) var(--ease-out) 0ms;
}
.corr.is-in .corr__cell {
  opacity: 1;
  transition:
    stroke var(--dur-1) var(--ease),
    opacity var(--dur-3) var(--ease-out) calc(var(--i) * 18ms);
}
.corr__val { opacity: 0; transition: opacity var(--dur-3) var(--ease-out) 0ms; }
.corr.is-in .corr__val {
  opacity: 1;
  transition: opacity var(--dur-3) var(--ease-out) calc(var(--i) * 18ms);
}
/* The metric selected in the section's picker keeps its row and column at full
   strength; the rest recede, so the picker answers "where does this target
   correlate" in every figure it drives, not only in the bars. */
.corr.has-focus .corr__cell { opacity: 0.42; }
.corr.has-focus .corr__val { opacity: 0.5; }
.corr.has-focus .corr__cell.is-focus,
.corr.has-focus .corr__val.is-focus { opacity: 1; }
.corr__cell.is-on { stroke: var(--ink); stroke-width: 2; }
.corr__head.is-focus { fill: var(--ink); font-weight: 700; }

.corr__val {
  font-family: var(--ff-mono);
  font-size: var(--fs-tick);
  fill: var(--ink);
  font-variant-numeric: tabular-nums;
  pointer-events: none;
}
.corr__val.is-dark { fill: #fff; }

.corr__head {
  font-family: var(--ff-mono);
  font-size: var(--fs-tick);
  fill: var(--ink-mute);
}
.corr__key { stroke: var(--line); stroke-width: 1; }
.corr__key-label {
  font-family: var(--ff-mono);
  font-size: var(--fs-tick);
  fill: var(--ink-mute);
}
</style>
