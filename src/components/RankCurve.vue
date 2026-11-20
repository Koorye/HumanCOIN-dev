<script setup lang="ts">
/**
 * Per-tier rank–frequency curves.
 *
 * One curve per tier: that tier's count for the lexicon entry sitting at that
 * rank, on a log rank axis and a log count axis. The three curves are nested —
 * every entry is mostly L1 — so the overlay reads as depth rather than as three
 * unrelated series, and each area is filled so the volume between the curves is
 * visible.
 *
 * A tier that records nothing at a rank has no line there: the run is broken
 * rather than dropped to the axis, because a zero is an absence, not a floor.
 * That is also what makes the deeper tiers end inside the plot for the object
 * lexicon.
 *
 * The drawing is in layout pixels, so the ticks stay 11px at any width.
 */
import type { Bi } from '@/content'
import { useI18n } from '@/composables/useI18n'
import PlotBox from '@/components/PlotBox.vue'

interface Series {
  id: string
  colour: string
  /** dash rhythm, so the tiers are separable without relying on a hue */
  dash?: string
  /** Count at rank 1, 2, … Zero breaks the run. */
  values: number[]
}

defineProps<{
  series: Series[]
  yMax: number
  h: number
  aria: Bi
  /** When false the curves are held at their start, ready to be drawn. */
  on?: boolean
}>()

const { t } = useI18n()

interface Run {
  line: string
  area: string
}

interface Plot {
  runs: { id: string; colour: string; dash?: string; paths: Run[] }[]
  /** Where each tier's curve stops, and how many classes it covers. */
  ends: { id: string; colour: string; x: number; y: number; count: number }[]
  yt: { y: number; label: string }[]
  xt: { x: number; label: string }[]
  x0: number
  x1: number
  base: number
}

function build(series: Series[], w: number, h: number, yMax: number): Plot {
  const pl = 30
  /* room at the right for the class count that closes each curve */
  const pr = 46
  const pt = 10
  const pb = 26
  const x0 = pl
  const x1 = Math.max(pl + 40, w - pr)
  const y0 = pt
  const y1 = h - pb
  const n = Math.max(2, ...series.map((s) => s.values.length))
  const lx = Math.log10(n)
  const X = (rank: number) => x0 + (Math.log10(Math.max(rank, 1)) / lx) * (x1 - x0)
  const ly = Math.log10(yMax)
  const Y = (v: number) => y1 - (Math.log10(Math.max(v, 1)) / ly) * (y1 - y0)

  const runs = series.map((s) => {
    const paths: Run[] = []
    let cur: { x: number; y: number }[] = []

    const flush = () => {
      if (!cur.length) return
      const pts = cur.map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' L')
      const line = `M${pts}`
      const area = `M${cur[0].x.toFixed(1)},${y1.toFixed(1)} L${pts} L${cur[cur.length - 1].x.toFixed(1)},${y1.toFixed(1)} Z`
      paths.push({ line, area })
      cur = []
    }

    s.values.forEach((v, i) => {
      if (v > 0) cur.push({ x: X(i + 1), y: Y(v) })
      else flush()
    })
    flush()

    return { id: s.id, colour: s.colour, dash: s.dash, paths }
  })

  const tickLabel = (v: number) =>
    v >= 1000000 ? `${v / 1000000}M` : v >= 1000 ? `${v / 1000}k` : String(v)
  /* a six-decade axis cannot carry seven labels at this height: take every other */
  const decades = Math.log10(yMax)
  const stride = decades >= 6 ? 2 : 1
  const allTicks = [1, 10, 100, 1000, 10000, 100000, 1000000].filter((v) => v <= yMax)
  const yt = allTicks
    .filter((_, i) => i % stride === 0 || i === allTicks.length - 1)
    .map((v) => ({ y: Y(v), label: tickLabel(v) }))
  const rankMax = series[0]?.values.length ?? 0
  const xt = [1, 10, 100, rankMax]
    .filter((v, i, arr) => v >= 1 && v <= rankMax && arr.indexOf(v) === i)
    .map((v) => ({ x: X(v), label: String(v) }))

  /* each curve closes on the number of classes it actually reaches */
  const ends = series.map((s) => {
    const n = s.values.length
    const last = s.values[n - 1] ?? 1
    return { id: s.id, colour: s.colour, x: X(n) + 5, y: Y(last), count: n }
  })
  /* never let two of those collide: nudge the later one down by a line */
  ends.sort((a, b) => a.y - b.y)
  for (let i = 1; i < ends.length; i += 1) {
    const prev = ends[i - 1]
    if (Math.abs(ends[i].x - prev.x) < 58 && ends[i].y - prev.y < 14) ends[i].y = prev.y + 14
  }

  return { runs, ends, yt, xt, x0, x1, base: y1 }
}
</script>

<template>
  <PlotBox :h="h" v-slot="{ w }">
    <!-- the geometry is built once per render, not once per mark -->
    <template v-for="P in [build(series, w, h, yMax)]" :key="0">
      <svg
        class="plot"
        :data-on="on === false ? 'false' : 'true'"
        :width="w"
        :height="h"
        :viewBox="`0 0 ${w} ${h}`"
        role="img"
        :aria-label="t(aria)"
      >
        <g aria-hidden="true">
          <line
            v-for="yt in P.yt"
            :key="`g${yt.label}`"
            class="grid"
            :x1="P.x0"
            :x2="P.x1"
            :y1="yt.y"
            :y2="yt.y"
          />
          <text
            v-for="yt in P.yt"
            :key="`y${yt.label}`"
            class="t-tick"
            x="25"
            :y="yt.y + 3.6"
            text-anchor="end"
          >{{ yt.label }}</text>
          <line class="base" :x1="P.x0" :x2="P.x1" :y1="P.base" :y2="P.base" />
          <text
            v-for="xt in P.xt"
            :key="`x${xt.label}`"
            class="t-tick"
            :x="xt.x"
            :y="h - 10"
            text-anchor="middle"
          >{{ xt.label }}</text>
        </g>
        <!-- L1 under L2 under L3, so the deepest tier stays visible -->
        <g v-for="(s, si) in P.runs" :key="s.id">
          <path
            v-for="(run, i) in s.paths"
            :key="`a${i}`"
            class="area"
            :d="run.area"
            :style="{ fill: s.colour, '--i': si }"
          />
          <path
            v-for="(run, i) in s.paths"
            :key="`l${i}`"
            class="curve"
            :class="{ 'curve--dash': !!s.dash }"
            :pathLength="1"
            :d="run.line"
            :style="{ stroke: s.colour, strokeDasharray: s.dash || undefined, '--i': si }"
          />
        </g>
        <!-- the class count each tier closes on -->
        <text
          v-for="e in P.ends"
          :key="`e${e.id}`"
          class="t-end"
          :x="e.x"
          :y="e.y + 3.6"
          :fill="e.colour"
        >{{ e.id }} {{ e.count }}</text>
      </svg>
    </template>
  </PlotBox>
</template>

<style scoped>
.plot { display: block; }
.t-tick {
  font-family: var(--ff-mono);
  font-size: 11px;
  fill: var(--ink-mute);
  font-variant-numeric: tabular-nums;
}
.t-end {
  font-family: var(--ff-mono);
  font-size: 11px;
  font-variant-numeric: tabular-nums;
  opacity: 1;
  transition: opacity 300ms linear 700ms;
}
.plot[data-on='false'] .t-end { opacity: 0; }
.grid { stroke: var(--line); stroke-width: 1; stroke-dasharray: 2 4; }
.base { stroke: var(--line-strong); stroke-width: 1; }
.area {
  fill-opacity: 0.1;
  opacity: 1;
  transition: opacity 340ms linear calc(180ms + var(--i, 0) * 80ms);
}
.curve { fill: none; stroke-width: 1.35; stroke-linejoin: round; }

/* the solid tier is drawn along its own length; pathLength=1 makes 1 the path */
.curve:not(.curve--dash) {
  stroke-dasharray: 1;
  stroke-dashoffset: 0;
  transition: stroke-dashoffset 800ms var(--ease-out) calc(var(--i, 0) * 80ms);
}
/* a dashed tier keeps its pattern, so it fades in instead of drawing */
.curve--dash {
  opacity: 1;
  transition: opacity 640ms var(--ease-out) calc(120ms + var(--i, 0) * 80ms);
}

.plot[data-on='false'] .area { opacity: 0; }
.plot[data-on='false'] .curve:not(.curve--dash) { stroke-dashoffset: 1; }
.plot[data-on='false'] .curve--dash { opacity: 0; }

@media (prefers-reduced-motion: reduce) {
  .area,
  .curve { transition: none; }
}
</style>
