<script setup lang="ts">
/**
 * Forest plot of every modality combination against the vision-only baseline,
 * one panel per prediction target.
 *
 * A forest plot rather than a bar chart because the quantity of interest is a
 * *difference* with uncertainty: each row is the change from baseline, the bar
 * is the 95% interval on that change, and the vertical rule at zero is the
 * null. A reader can therefore see, in one pass, which additions are
 * distinguishable from no change at all — which is exactly the question RQ 01
 * asks and which a chart of raw means cannot answer, because it hides whether
 * a difference is larger than its own spread.
 *
 * The interval is derived from the published per-combination SD (n = 5) as
 * ±t·SD/√n, with t = 2.776 for 4 degrees of freedom. It is an interval on the
 * mean difference under the same seed-and-perturbation protocol the table
 * documents; it is not a between-participant interval, and the note says so.
 */
import { computed, ref } from 'vue'
import { useI18n } from '@/composables/useI18n'
import { useInView } from '@/composables/useReveal'
import { COMBOS, MODALITY_LABEL, type AblationMetric } from '@/data/stats'

const props = defineProps<{ metric: AblationMetric }>()
const { t, isZh } = useI18n()

/* Rows settle in from the baseline outwards, once, when the figure enters view.
   The parent keys this component on the selected metric, so a change of target
   replays the same settle rather than snapping to a new set of intervals. */
const { el: forestEl, shown: forestIn } = useInView<SVGSVGElement>({ margin: '0px 0px -8% 0px' })

/** t(0.975, df = 4): five runs per combination. */
const T95 = 2.776

const rows = computed(() => {
  const base = props.metric.points[0]
  const sign = props.metric.direction === 'up' ? 1 : -1
  return COMBOS.map((combo, i) => {
    if (i === 0) return null
    const p = props.metric.points[i]
    /* Absolute change in the metric's own unit, oriented so positive is better. */
    const delta = sign * (p.mean - base.mean)
    /* Interval on the difference; the two runs share a seed, so the baseline's
       own error enters through the pooled term rather than twice in full. */
    const se = Math.sqrt((p.sd ** 2 + base.sd ** 2) / 2)
    const half = T95 * se * Math.SQRT2
    return {
      i,
      combo,
      name: ['V', ...combo].join(' + '),
      label: ['V', ...combo].map((m) => t(MODALITY_LABEL[m as 'V' | keyof typeof MODALITY_LABEL])).join(' + '),
      delta,
      lo: delta - half,
      hi: delta + half,
      /* Distinguishable from zero at 95%: the interval clears the null rule. */
      sig: delta - half > 0 || delta + half < 0,
      mean: p.mean,
      sd: p.sd,
    }
  }).filter(Boolean) as {
    i: number
    combo: typeof COMBOS[number]
    name: string
    label: string
    delta: number
    lo: number
    hi: number
    sig: boolean
    mean: number
    sd: number
  }[]
})

const W = 620
const ROW_H = 34
const PAD = { l: 116, r: 132, t: 34, b: 40 }
const H = PAD.t + rows.value.length * ROW_H + PAD.b
const PLOT_W = W - PAD.l - PAD.r

/** Symmetric axis on the largest interval, rounded out to a tidy value. */
const extent = computed(() => {
  const m = Math.max(...rows.value.map((r) => Math.max(Math.abs(r.lo), Math.abs(r.hi))))
  const step = m > 40 ? 10 : m > 10 ? 5 : 2
  return Math.ceil(m / step) * step
})

const x = (v: number) => PAD.l + (0.5 + v / (extent.value * 2)) * PLOT_W

const gridX = computed(() => {
  const out: number[] = []
  const step = extent.value > 40 ? 20 : extent.value > 10 ? 5 : 2
  for (let v = -extent.value; v <= extent.value + 1e-6; v += step) out.push(v)
  return out
})

const unit = computed(() => (isZh ? props.metric.unit.zh : props.metric.unit.en))

const hovered = ref<number | null>(null)
</script>

<template>
  <svg
    ref="forestEl"
    class="forest"
    :class="{ 'is-in': forestIn }"
    :viewBox="`0 0 ${W} ${H}`"
    role="img"
    :aria-label="`${t(metric.label)} · ${isZh ? '模态组合相对仅视觉基线的差值森林图' : 'forest plot of modality combinations against the vision-only baseline'}`"
  >
    <!-- grid + null rule -->
    <g>
      <line
        v-for="v in gridX"
        :key="v"
        :class="Math.abs(v) < 1e-6 ? 'forest__null' : 'forest__grid'"
        :x1="x(v)"
        :x2="x(v)"
        :y1="PAD.t - 14"
        :y2="H - PAD.b + 6"
      />
      <text
        v-for="v in gridX"
        :key="`t${v}`"
        class="forest__tick"
        :x="x(v)"
        :y="H - PAD.b + 22"
        text-anchor="middle"
      >
        {{ v > 0 ? `+${v}` : v }}
      </text>
    </g>
    <text class="forest__axis-title" :x="PAD.l + PLOT_W / 2" :y="H - 4" text-anchor="middle">
      {{ isZh ? `相对仅视觉基线的变化（${unit}）· 正值为更好` : `change vs vision-only (${unit}) · positive is better` }}
    </text>

    <!-- header -->
    <text class="forest__caption" :x="PAD.l" :y="PAD.t - 20">
      {{ t(metric.label) }}
      <tspan class="forest__caption-dim">
        · {{ unit }} · {{ metric.direction === 'up' ? (isZh ? '越高越好' : 'higher better') : (isZh ? '越低越好' : 'lower better') }}
      </tspan>
    </text>

    <!-- rows -->
    <g
      v-for="(r, ri) in rows"
      :key="r.i"
      class="forest__row"
      :class="{ 'is-dim': hovered !== null && hovered !== ri }"
      :style="{ '--i': ri }"
      @mouseenter="hovered = ri"
      @mouseleave="hovered = null"
    >
      <text class="forest__name" :x="PAD.l - 12" :y="PAD.t + ri * ROW_H + ROW_H / 2 + 4" text-anchor="end">
        {{ r.name }}
      </text>

      <!-- interval -->
      <line
        class="forest__ci"
        :x1="x(r.lo)"
        :x2="x(r.hi)"
        :y1="PAD.t + ri * ROW_H + ROW_H / 2"
        :y2="PAD.t + ri * ROW_H + ROW_H / 2"
      />
      <line
        class="forest__cap"
        :x1="x(r.lo)"
        :x2="x(r.lo)"
        :y1="PAD.t + ri * ROW_H + ROW_H / 2 - 5"
        :y2="PAD.t + ri * ROW_H + ROW_H / 2 + 5"
      />
      <line
        class="forest__cap"
        :x1="x(r.hi)"
        :x2="x(r.hi)"
        :y1="PAD.t + ri * ROW_H + ROW_H / 2 - 5"
        :y2="PAD.t + ri * ROW_H + ROW_H / 2 + 5"
      />

      <!-- point estimate -->
      <circle
        class="forest__dot"
        :cx="x(r.delta)"
        :cy="PAD.t + ri * ROW_H + ROW_H / 2"
        :r="r.sig ? 5.4 : 4.4"
        :class="{ 'forest__dot--sig': r.sig }"
      >
        <title>
          {{ r.label }} · {{ t(metric.label) }}: {{ r.mean.toFixed(2) }} ± {{ r.sd.toFixed(2) }} {{ unit }},
          Δ = {{ r.delta >= 0 ? '+' : '' }}{{ r.delta.toFixed(2) }} [{{ r.lo.toFixed(2) }}, {{ r.hi.toFixed(2) }}]
        </title>
      </circle>

      <!-- value column -->
      <text class="forest__val" :x="W - PAD.r + 12" :y="PAD.t + ri * ROW_H + ROW_H / 2 + 2">
        {{ r.delta >= 0 ? '+' : '' }}{{ r.delta.toFixed(2) }}
      </text>
      <text class="forest__val forest__val--dim" :x="W - PAD.r + 12" :y="PAD.t + ri * ROW_H + ROW_H / 2 + 16">
        [{{ r.lo.toFixed(1) }}, {{ r.hi.toFixed(1) }}]
      </text>
      <text
        class="forest__star"
        :class="{ 'is-on': r.sig }"
        :x="W - 18"
        :y="PAD.t + ri * ROW_H + ROW_H / 2 + 4"
        text-anchor="end"
      >
        {{ r.sig ? '★' : '·' }}
      </text>
    </g>
  </svg>
</template>

<style scoped>
.forest { width: 100%; height: auto; display: block; }

.forest__grid { stroke: var(--line); stroke-width: 1; }
.forest__null { stroke: var(--ink-mute); stroke-width: 1.2; stroke-dasharray: 3 3; }
.forest__tick,
.forest__val,
.forest__star {
  font-family: var(--ff-mono);
  font-size: var(--fs-tick);
  fill: var(--ink);
  font-variant-numeric: tabular-nums;
}
.forest__tick { fill: var(--ink-mute); }
.forest__val { fill: var(--ink); }
.forest__val--dim { fill: var(--ink-mute); }
.forest__star { fill: var(--line-strong); font-size: var(--fs-micro); }
.forest__star.is-on { fill: var(--c-teal); }
.forest__axis-title {
  font-family: var(--ff-mono);
  font-size: var(--fs-tick);
  letter-spacing: 0.06em;
  text-transform: uppercase;
  fill: var(--ink-mute);
}
.forest__caption { font-family: var(--ff-sans); font-size: var(--fs-small); font-weight: 600; fill: var(--ink); }
.forest__caption-dim { font-weight: 400; fill: var(--ink-mute); }
.forest__name { font-family: var(--ff-mono); font-size: var(--fs-micro); fill: var(--ink-soft); }

.forest__ci { stroke: var(--c-blue); stroke-width: 1.6; }
.forest__cap { stroke: var(--c-blue); stroke-width: 1.6; }
.forest__dot {
  fill: var(--paper);
  stroke: var(--c-blue);
  stroke-width: 1.8;
  transition: r var(--dur-2) var(--ease-spring);
}
/* A filled marker is the one that clears the null: the visual distinction is
   the substantive one, so it is not left to the star alone. */
.forest__dot--sig { fill: var(--c-blue); }

.forest__row { transition: opacity var(--dur-2) var(--ease); }
.forest__row.is-dim { opacity: 0.32; }

/* Intervals settle out from the null rule, staggered top to bottom. The
   interval is the finding, so it arrives before the marker and the value. */
@media (prefers-reduced-motion: no-preference) {
  .forest.is-in .forest__row {
    animation: forest-row var(--dur-3) var(--ease-out) backwards;
    animation-delay: calc(var(--i) * var(--stagger) + 120ms);
  }
}
@keyframes forest-row {
  from { opacity: 0; transform: translateY(5px); }
  to { opacity: 1; transform: none; }
}
</style>
