<script setup lang="ts">
/**
 * Planned hours by tier, as one ring.
 *
 * Drawn as a single SVG rather than an SVG plus an HTML legend, so the ring and
 * its key scale together and the figure fills its frame at any width — an
 * HTML legend beside a fixed-size ring left most of the panel empty.
 *
 * The viewBox matches the figure it is paired with, so the two panels in a row
 * share a height without either one being stretched.
 *
 * Arcs are drawn end to end from the top of the ring, in share order, with a
 * fixed gap separating adjacent shares. Each arc grows from nothing to its own
 * length in sequence, so the ring assembles in reading order.
 */
import { computed } from 'vue'
import { useI18n } from '@/composables/useI18n'
import { useInView } from '@/composables/useReveal'
import { TIER_HOURS, TOTAL_HOURS, SCENE_ALLOCATION } from '@/data/stats'
import { TASK_TOTALS } from '@/data/tasks'

const { isZh } = useI18n()

const sceneEntries = Object.values(SCENE_ALLOCATION).reduce((n, list) => n + list.length, 0)

/* Same box as the stacked duration figure beside it. */
const W = 560
const H = 348
const CX = 158
const CY = 168
const R = 104
const STROKE = 32

const circumference = computed(() => 2 * Math.PI * R)

const arcs = computed(() => {
  let offset = 0
  return TIER_HOURS.map((tier) => {
    const len = (tier.hours / TOTAL_HOURS) * circumference.value
    const arc = {
      id: tier.id,
      color: tier.color,
      hours: tier.hours,
      share: (tier.hours / TOTAL_HOURS) * 100,
      len: Math.max(0, len - 6),
      pad: 999 - len,
      offset: -offset,
    }
    offset += len
    return arc
  })
})

const legend = computed(() =>
  arcs.value.map((a) => ({
    ...a,
    shareText: `${a.share < 1 ? a.share.toFixed(1) : Math.round(a.share)}%`,
  })),
)

const legendRows = computed(() => {
  const ly = [96, 168, 240]
  return legend.value.map((l, i) => ({ ...l, y: ly[i] }))
})

const { el: donutEl, shown: donutIn } = useInView<SVGSVGElement>({ margin: '0px 0px -10% 0px' })
</script>

<template>
  <div class="donut">
    <svg
      ref="donutEl"
      class="donut__svg"
      :viewBox="`0 0 ${W} ${H}`"
      role="img"
      :aria-label="
        isZh
          ? '三层规划时长环形图：10,000 / 2,000 / 500 小时'
          : 'Planned hours by tier: 10,000 / 2,000 / 500 hours'
      "
    >
      <!-- track -->
      <circle :cx="CX" :cy="CY" :r="R" fill="none" stroke="var(--surface-2)" :stroke-width="STROKE" />

      <!-- arcs -->
      <circle
        v-for="(a, i) in arcs"
        :key="a.id"
        class="donut__arc"
        :style="{ '--i': i }"
        :cx="CX"
        :cy="CY"
        :r="R"
        fill="none"
        :stroke="a.color"
        :stroke-width="STROKE"
        :stroke-dasharray="donutIn ? `${a.len} ${a.pad}` : `0 999`"
        :stroke-dashoffset="a.offset"
        :transform="`rotate(-90 ${CX} ${CY})`"
      >
        <title>{{ a.id }}: {{ a.hours.toLocaleString('en-US') }} h</title>
      </circle>

      <!-- centre: the total the ring divides -->
      <text class="donut__value" :x="CX" :y="CY + 2" text-anchor="middle">12,500</text>
      <text class="donut__unit" :x="CX" :y="CY + 26" text-anchor="middle">
        {{ isZh ? '规划小时' : 'PLANNED HOURS' }}
      </text>
      <text class="donut__scale" :x="CX" :y="CY + 48" text-anchor="middle">
        {{ isZh ? '三层合计' : 'ALL TIERS' }}
      </text>

      <!-- legend, drawn in the same coordinate system so it scales with the ring -->
      <g v-for="l in legendRows" :key="`l-${l.id}`" :transform="`translate(330 ${l.y})`">
        <rect :x="0" y="-9" width="11" height="11" rx="2" :fill="l.color" />
        <text class="donut__key" :x="20" y="0" :fill="l.color">{{ l.id }}</text>
        <text class="donut__share" :x="58" y="0">{{ l.shareText }}</text>
        <text class="donut__hours" :x="106" y="0">{{ l.hours.toLocaleString('en-US') }} h</text>
        <line class="donut__rule" x1="0" y1="20" x2="196" y2="20" />
      </g>

      <!-- the two figures this ring feeds, so the section reads as one set -->
      <text class="donut__foot" :x="330" y="300">
        {{ isZh ? '场景条目' : 'SCENE ENTRIES' }} {{ sceneEntries }} ·
        {{ isZh ? '任务条目' : 'TASK ENTRIES' }} {{ TASK_TOTALS.total }}
      </text>
    </svg>
  </div>
</template>

<style scoped>
.donut { margin: 0; }
.donut__svg { width: 100%; height: auto; display: block; }

.donut__arc {
  transition: stroke-dasharray var(--dur-4) var(--ease-out);
  transition-delay: calc(var(--i) * 200ms);
}
.donut__value {
  font-family: var(--ff-sans);
  font-size: 44px;
  font-weight: 660;
  letter-spacing: -0.02em;
  fill: var(--ink);
}
.donut__unit {
  font-family: var(--ff-mono);
  font-size: 10px;
  letter-spacing: 0.1em;
  fill: var(--ink-soft);
}
.donut__scale {
  font-family: var(--ff-mono);
  font-size: 10px;
  letter-spacing: 0.1em;
  fill: var(--ink-mute);
}
.donut__key {
  font-family: var(--ff-mono);
  font-size: var(--fs-small);
  font-weight: 650;
}
.donut__share {
  font-family: var(--ff-mono);
  font-size: var(--fs-small);
  fill: var(--ink-soft);
  font-variant-numeric: tabular-nums;
}
.donut__hours {
  font-family: var(--ff-mono);
  font-size: var(--fs-small);
  fill: var(--ink-mute);
  font-variant-numeric: tabular-nums;
}
.donut__rule { stroke: var(--line); stroke-width: 1; }
.donut__foot {
  font-family: var(--ff-mono);
  font-size: var(--fs-tick);
  letter-spacing: 0.08em;
  fill: var(--ink-mute);
}
</style>
