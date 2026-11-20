<script setup lang="ts">
/**
 * The head of a lexicon as vertical columns.
 *
 * Same language as the plate: one accent in three weights, a hairline baseline,
 * no frame and no grid. Each column is stacked by tier (L1 light at the foot,
 * L3 deep at the head, a 1px paper gap between segments), so the chart carries
 * the composition as well as the rank.
 *
 * Twenty columns is what this half of the article column can hold. The counts
 * are seven characters wide at 11px mono — `180,876` — so a horizontal number
 * would need about 46px, while at twenty columns the pitch is only 19–23px.
 * Counts therefore run up the column above the bar and class names run down it
 * below the axis, both rotated −90°: the only arrangement in which every column
 * keeps its own number and its own name without a collision.
 */
import { computed } from 'vue'
import type { Bi } from '@/content'
import { useI18n } from '@/composables/useI18n'
import { useInView } from '@/composables/useReveal'
import PlotBox from '@/components/PlotBox.vue'
import { TIER_RAMP } from '@/data/fig8'
import type { TierId } from '@/data/fig2'

interface BarRow {
  label: string
  total: number
  tiers: Record<TierId, number>
}

const props = withDefaults(
  defineProps<{
    kicker: Bi
    /** The whole lexicon's size, for the "Top n of N" qualifier. */
    total: number
    rows: BarRow[]
    n?: number
    /** Inside another panel: the host draws its own head, so drop ours. */
    bare?: boolean
  }>(),
  { n: 20, bare: false },
)

const { t, isZh } = useI18n()
const fmt = (n: number) => Math.round(n).toLocaleString('en-US')

/* the columns rise once, when the panel first comes into view */
const { el: rootEl, shown } = useInView<HTMLElement>({
  margin: '0px 0px -10% 0px',
  threshold: 0.25,
})
const reduced =
  typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches
const on = computed(() => reduced || shown.value)

const H = 264
const TOP = 54
const PLOT = 120
const BASE = TOP + PLOT
const PAD_X = 6

const rows = computed(() => props.rows.slice(0, props.n))
const summary = computed(() =>
  isZh.value ? `${props.total} 中的前 ${rows.value.length}` : `Top ${rows.value.length} of ${props.total}`,
)

const pitchOf = (w: number) => (w - PAD_X * 2) / Math.max(rows.value.length, 1)
const barWOf = (w: number) => Math.max(4, pitchOf(w) - 3)
const cxOf = (w: number, i: number) => PAD_X + i * pitchOf(w) + pitchOf(w) / 2
const xOf = (w: number, i: number) => cxOf(w, i) - barWOf(w) / 2

const layout = computed(() => {
  const max = Math.max(1, ...rows.value.map((r) => r.total))
  return rows.value.map((row) => {
    let acc = 0
    const segs = (['L1', 'L2', 'L3'] as TierId[])
      .map((id) => {
        const value = row.tiers[id]
        const y = BASE - ((acc + value) / max) * PLOT
        const h = (value / max) * PLOT
        acc += value
        return { id, y, h, fill: TIER_RAMP[id] }
      })
      .filter((s) => s.h > 0.2)
    return { row, top: BASE - (row.total / max) * PLOT, segs }
  })
})
</script>

<template>
  <section ref="rootEl" class="top" :class="{ 'top--bare': bare }">
    <header v-if="!bare" class="top__bar">
      <p class="top__k mono">{{ t(kicker) }}</p>
      <p class="top__a mono">{{ summary }}</p>
    </header>

    <PlotBox :h="H" v-slot="{ w }">
      <svg
        class="plot"
        :data-on="on ? 'true' : 'false'"
        :width="w"
        :height="H"
        :viewBox="`0 0 ${w} ${H}`"
        role="img"
        :aria-label="`${summary}, ranked by count`"
      >
        <line class="base" :x1="PAD_X" :x2="w - PAD_X" :y1="BASE + 0.5" :y2="BASE + 0.5" />
        <g v-for="(bar, i) in layout" :key="bar.row.label">
          <title>{{ bar.row.label }} · {{ fmt(bar.row.total) }}</title>
          <g class="grow" :style="{ '--i': i }">
            <rect
              v-for="seg in bar.segs"
              :key="seg.id"
              :x="xOf(w, i)"
              :y="seg.y"
              :width="barWOf(w)"
              :height="Math.max(0.4, seg.h - 1)"
              :fill="seg.fill"
            />
          </g>
          <text
            class="t-val"
            :x="cxOf(w, i) + 3.6"
            :y="bar.top - 5"
            :transform="`rotate(-90 ${cxOf(w, i) + 3.6} ${bar.top - 5})`"
            text-anchor="start"
          >{{ fmt(bar.row.total) }}</text>
          <text
            class="t-lab"
            :x="cxOf(w, i) + 3.6"
            :y="BASE + 8"
            :transform="`rotate(-90 ${cxOf(w, i) + 3.6} ${BASE + 8})`"
            text-anchor="end"
          >{{ bar.row.label }}</text>
        </g>
      </svg>
    </PlotBox>
  </section>
</template>

<style scoped>
.top { min-width: 0; }

.top__bar {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 0.1rem 0.9rem;
  padding-bottom: 0.4rem;
  border-bottom: 1px solid var(--line);
}
.top__k,
.top__a {
  margin: 0;
  font-family: var(--ff-mono);
  font-size: var(--fs-tick);
  letter-spacing: 0.08em;
  text-transform: uppercase;
  line-height: 1.4;
  color: var(--ink-mute);
}
.top__k { color: var(--ink-soft); }
.top__a { text-align: right; }

.plot { display: block; }

.base { stroke: var(--line-strong); stroke-width: 0.65; }

.t-val {
  font-family: var(--ff-mono);
  font-size: 11px;
  fill: var(--ink-soft);
  font-variant-numeric: tabular-nums;
}
.t-lab {
  font-family: var(--ff-sans);
  font-size: 11px;
  fill: var(--ink-soft);
}

/* ---- entrance: the columns rise once, labels settle after them ---- */
.grow {
  transform-box: fill-box;
  transform-origin: bottom;
  transform: none;
  transition: transform 500ms var(--ease-out) calc(var(--i, 0) * 24ms);
}
.plot[data-on='false'] .grow { transform: scaleY(0); }

.t-val,
.t-lab {
  opacity: 1;
  transition: opacity 300ms linear 340ms;
}
.plot[data-on='false'] .t-val,
.plot[data-on='false'] .t-lab { opacity: 0; }

@media (prefers-reduced-motion: reduce) {
  .grow,
  .t-val,
  .t-lab { transition: none; }
}
</style>
