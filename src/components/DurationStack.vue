<script setup lang="ts">
/**
 * Episode-length composition of the whole corpus, as one stacked histogram.
 *
 * The companion to the hours ring: the ring says how the 12,500 planned hours
 * split between tiers, and this figure re-cuts the same hours by episode length.
 * Each bar is one narrow bin with the three tiers stacked inside it, so a reader
 * sees what a bin holds and who it belongs to at once — which is what a
 * per-tier panel cannot show, because the tiers then never share an axis.
 *
 * The published resolution is 30 s; the bins here are 10 s, which reads the same
 * profile at more points without adding measurement. Nothing is splined across a
 * bin edge, and the bars sum to 100% of planned hours.
 *
 * Columns rise in bin order, so the shift from short to long episodes is read as
 * it is drawn rather than appearing whole.
 */
import { computed } from 'vue'
import { useI18n } from '@/composables/useI18n'
import { useInView } from '@/composables/useReveal'
import { DURATION_MEDIANS, durationStack } from '@/data/stats'

const { isZh } = useI18n()

const { el: histEl, shown: histIn } = useInView<SVGSVGElement>({ margin: '0px 0px -8% 0px' })

const BIN = 10
const bins = durationStack(30 / BIN)

const TIERS = [
  { id: 'L1' as const, color: 'var(--c-blue)' },
  { id: 'L2' as const, color: 'var(--c-teal)' },
  { id: 'L3' as const, color: 'var(--c-violet)' },
]

/* Same box as the hours ring beside it, so the paired figures share a height. */
const W = 560
const H = 348
const PAD = { l: 44, r: 14, t: 30, b: 76 }
const PLOT_W = W - PAD.l - PAD.r
const PLOT_H = H - PAD.t - PAD.b

const LO = 30
const HI = 300
const N = bins.length
const BIN_W = PLOT_W / N

/** 0–8% leaves headroom over the tallest bar (~6.2%). */
const Y_MAX = 8
const Y_TICKS = [0, 2, 4, 6, 8]

const xOf = (t: number) => PAD.l + ((t - LO) / (HI - LO)) * PLOT_W
const yOf = (v: number) => PAD.t + PLOT_H - (v / Y_MAX) * PLOT_H

const columns = computed(() =>
  bins.map((b, i) => {
    let base = 0
    const parts = TIERS.map((t) => {
      const v = b[t.id]
      const seg = { id: t.id, color: t.color, value: v, y: yOf(base + v), h: (v / Y_MAX) * PLOT_H }
      base += v
      return seg
    })
    return { key: b.lo, x: PAD.l + i * BIN_W + 1, w: Math.max(1, BIN_W - 2), parts, total: base, lo: b.lo }
  }),
)

const xTicks = [30, 60, 90, 120, 150, 180, 210, 240, 270, 300]
</script>

<template>
  <figure class="mix">
    <svg
      ref="histEl"
      class="mix__svg"
      :class="{ 'is-in': histIn }"
      :viewBox="`0 0 ${W} ${H}`"
      role="img"
      :aria-label="
        isZh
          ? '全部规划小时按片段时长的堆叠直方图，三层堆在同一条内'
          : 'Planned hours by episode length; the three tiers stack within each bin'
      "
    >
      <!-- y grid and ticks, in per cent of all planned hours -->
      <g>
        <template v-for="v in Y_TICKS" :key="v">
          <line class="mix__grid" :x1="PAD.l" :x2="W - PAD.r" :y1="yOf(v)" :y2="yOf(v)" />
          <text class="mix__tick" :x="PAD.l - 7" :y="yOf(v) + 4" text-anchor="end">{{ v }}%</text>
        </template>
      </g>
      <text class="mix__auxtitle" :x="PAD.l" :y="PAD.t - 12">
        {{ isZh ? '占全部规划小时' : 'OF PLANNED HOURS' }}
      </text>

      <!-- stacked columns, one per bin -->
      <g v-for="c in columns" :key="c.key" class="mix__col" :style="{ '--i': c.lo / BIN }">
        <rect
          v-for="p in c.parts"
          :key="p.id"
          :x="c.x"
          :y="p.y"
          :width="c.w"
          :height="Math.max(0, p.h)"
          :fill="p.color"
        >
          <title>
            {{ p.id }} · {{ c.lo }}–{{ c.lo + BIN }}s · {{ p.value.toFixed(2) }}%
            {{ isZh ? '的全部规划小时' : 'of planned hours' }}
          </title>
        </rect>
      </g>

      <!-- x axis -->
      <line class="mix__axis" :x1="PAD.l" :x2="W - PAD.r" :y1="yOf(0)" :y2="yOf(0)" />
      <template v-for="t in xTicks" :key="t">
        <line class="mix__axis" :x1="xOf(t)" :x2="xOf(t)" :y1="yOf(0)" :y2="yOf(0) + 4" />
        <text class="mix__tick" :x="xOf(t)" :y="yOf(0) + 18" text-anchor="middle">{{ t }}</text>
      </template>
      <text class="mix__auxtitle" :x="PAD.l" :y="yOf(0) + 36">
        {{ isZh ? '片段时长（秒）' : 'EPISODE LENGTH (S)' }}
      </text>

      <!-- where each tier's median lands: the legend numbers get a position -->
      <g v-for="t in TIERS" :key="`med-${t.id}`" class="mix__median">
        <line
          :x1="xOf(DURATION_MEDIANS[t.id])"
          :x2="xOf(DURATION_MEDIANS[t.id])"
          :y1="yOf(0) + 42"
          :y2="yOf(0) + 50"
          :stroke="t.color"
        />
        <text :x="xOf(DURATION_MEDIANS[t.id])" :y="yOf(0) + 65" text-anchor="middle" :fill="t.color">
          {{ t.id }} · {{ DURATION_MEDIANS[t.id] }}s
        </text>
      </g>

      <!-- legend: the volume each tier contributes to the whole -->
      <g v-for="(t, i) in TIERS" :key="`leg-${t.id}`" :transform="`translate(${PAD.l + i * 172} ${H - 16})`">
        <rect x="0" y="-9" width="9" height="9" rx="1.5" :fill="t.color" />
        <text class="mix__legtext" :x="14" y="0" :fill="t.color">{{ t.id }}</text>
        <text class="mix__legtext mix__legtext--dim" :x="36" y="0">
          {{ { L1: '10,000', L2: '2,000', L3: '500' }[t.id] }} h ·
          {{ isZh ? '中位' : 'med' }} {{ DURATION_MEDIANS[t.id] }}s
        </text>
      </g>
    </svg>
  </figure>
</template>

<style scoped>
.mix { margin: 0; }
.mix__svg { width: 100%; height: auto; display: block; }

.mix__grid { stroke: var(--line); stroke-width: 1; }
.mix__axis { stroke: var(--line-strong); stroke-width: 1; }
.mix__tick {
  font-family: var(--ff-mono);
  font-size: var(--fs-tick);
  fill: var(--ink-mute);
  font-variant-numeric: tabular-nums;
}
.mix__auxtitle {
  font-family: var(--ff-mono);
  font-size: var(--fs-tick);
  letter-spacing: 0.08em;
  fill: var(--ink-mute);
}
.mix__median text {
  font-family: var(--ff-mono);
  font-size: var(--fs-tick);
  font-weight: 600;
}
.mix__legtext {
  font-family: var(--ff-mono);
  font-size: var(--fs-tick);
  font-weight: 650;
  font-variant-numeric: tabular-nums;
}
.mix__legtext--dim { fill: var(--ink-mute); font-weight: 400; }

/* Columns rise in bin order, so the shift from short to long is read while it
   is drawn rather than appearing whole. */
.mix__col { transform-box: fill-box; transform-origin: 50% 100%; }
@media (prefers-reduced-motion: no-preference) {
  .mix.is-in .mix__col {
    animation: mix-rise var(--dur-3) var(--ease-out) backwards;
    animation-delay: calc(var(--i) * 14ms);
  }
}
@keyframes mix-rise {
  from { transform: scaleY(0.02); opacity: 0.35; }
  to { transform: scaleY(1); opacity: 1; }
}
</style>
