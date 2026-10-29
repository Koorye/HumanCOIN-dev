<script setup lang="ts">
import type { Bi } from '@/content'
import { useI18n } from '@/composables/useI18n'

export interface Series {
  id: string
  label: Bi
  color: string
  values: number[]
}

const props = withDefaults(
  defineProps<{
    series: Series[]
    categories: Bi[]
    yLabel?: Bi
    yMin?: number
    yMax?: number
    height?: number
    decimals?: number
  }>(),
  { height: 210, decimals: 1 },
)
const { t } = useI18n()

const W = 640
const PAD = { l: 44, r: 12, t: 12, b: 30 }

function scaleY(v: number) {
  const lo = props.yMin ?? Math.min(...props.series.flatMap((s) => s.values))
  const hi = props.yMax ?? Math.max(...props.series.flatMap((s) => s.values))
  const pad = (hi - lo) * 0.12 || 1
  const min = lo - pad
  const max = hi + pad
  const h = props.height - PAD.t - PAD.b
  return { y: PAD.t + h - ((v - min) / (max - min)) * h, min, max }
}
function scaleX(i: number) {
  const n = props.categories.length
  const w = W - PAD.l - PAD.r
  return PAD.l + (n === 1 ? w / 2 : (i / (n - 1)) * w)
}
function path(values: number[]) {
  return values.map((v, i) => `${i === 0 ? 'M' : 'L'}${scaleX(i).toFixed(1)},${scaleY(v).y.toFixed(1)}`).join(' ')
}
function gridLines() {
  const { min, max } = scaleY(0)
  const h = props.height - PAD.t - PAD.b
  return [0, 0.25, 0.5, 0.75, 1].map((f) => ({
    y: PAD.t + h - f * h,
    v: min + f * (max - min),
  }))
}
</script>

<template>
  <figure class="line">
    <svg :viewBox="`0 0 ${W} ${height}`" role="img" :aria-label="yLabel ? t(yLabel) : 'chart'">
      <g class="line__grid">
        <line
          v-for="g in gridLines()"
          :key="g.y"
          :x1="PAD.l"
          :x2="W - PAD.r"
          :y1="g.y"
          :y2="g.y"
        />
      </g>
      <g class="line__ylabels">
        <text v-for="g in gridLines()" :key="`t${g.y}`" :x="PAD.l - 8" :y="g.y + 3.5">
          {{ g.v.toFixed(decimals) }}
        </text>
      </g>
      <path
        v-for="s in series"
        :key="s.id"
        :d="path(s.values)"
        :stroke="s.color"
        fill="none"
        stroke-width="2"
        stroke-linejoin="round"
        stroke-linecap="round"
      />
      <g v-for="(s, si) in series" :key="`dots${si}`">
        <circle
          v-for="(v, i) in s.values"
          :key="`d${si}-${i}`"
          :cx="scaleX(i)"
          :cy="scaleY(v).y"
          r="3.1"
          :fill="s.color"
        />
      </g>
      <g class="line__xlabels">
        <text v-for="(c, i) in categories" :key="`x${i}`" :x="scaleX(i)" :y="height - 9">
          {{ t(c) }}
        </text>
      </g>
    </svg>
    <figcaption class="line__legend">
      <span v-for="s in series" :key="s.id">
        <i :style="{ background: s.color }" />{{ t(s.label) }}
      </span>
    </figcaption>
  </figure>
</template>

<style scoped>
.line { margin: 0; }
.line svg { width: 100%; height: auto; }
.line__grid line { stroke: var(--line); stroke-width: 1; }
.line__ylabels text,
.line__xlabels text {
  font-family: var(--ff-mono);
  font-size: var(--fs-tick);
  fill: var(--ink-mute);
}
.line__ylabels text { text-anchor: end; }
.line__xlabels text { text-anchor: middle; }
.line__legend {
  display: flex;
  flex-wrap: wrap;
  gap: 0.35rem 1.1rem;
  margin-top: 0.6rem;
  font-size: var(--fs-micro);
  color: var(--ink-soft);
}
.line__legend span { display: inline-flex; align-items: center; gap: 0.4rem; }
.line__legend i { width: 0.7rem; height: 2px; border-radius: 2px; }
</style>
