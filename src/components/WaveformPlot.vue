<script setup lang="ts">
import { computed } from 'vue'

const props = withDefaults(
  defineProps<{
    series: number[]          // normalised, roughly [-1, 1]
    color: string
    label: string
    sublabel?: string
    height?: number
    /** 0..1 position of the playhead */
    playhead?: number
    totalSeconds?: number
    tickSeconds?: number
  }>(),
  { height: 90, playhead: 0, totalSeconds: 16, tickSeconds: 4 },
)

const W = 1000
const VIEW_H = 100

/** Build a polyline path with min/max envelope preserved. */
const path = computed(() => {
  const s = props.series
  if (!s.length) return ''
  const n = s.length
  const mid = VIEW_H / 2
  const amp = VIEW_H * 0.42
  let d = ''
  for (let i = 0; i < n; i++) {
    const x = (i / (n - 1)) * W
    const y = mid - s[i] * amp
    d += `${i === 0 ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)}`
  }
  return d
})

const ticks = computed(() => {
  const out: { x: number; label: string; edge: 'start' | 'end' | '' }[] = []
  const last = props.totalSeconds
  for (let t = 0; t <= last + 1e-6; t += props.tickSeconds) {
    // Edge ticks are pulled inside the plot box so their labels are not halved
    // by the container's `overflow: hidden`.
    const edge: 'start' | 'end' | '' = t <= 1e-6 ? 'start' : t >= last - 1e-6 ? 'end' : ''
    out.push({ x: (t / last) * W, label: `${t.toFixed(0)}s`, edge })
  }
  return out
})
</script>

<template>
  <div class="wf">
    <div class="wf__head">
      <span class="wf__label">{{ label }}</span>
      <span v-if="sublabel" class="wf__sub">{{ sublabel }}</span>
    </div>
    <div class="wf__plot" :style="{ height: `${height}px` }">
      <svg :viewBox="`0 0 ${W} ${VIEW_H}`" preserveAspectRatio="none" aria-hidden="true">
        <line class="wf__axis" x1="0" :x2="W" y1="50" y2="50" />
        <path class="wf__trace" :d="path" :stroke="color" />
        <line
          class="wf__playhead"
          :x1="playhead * W"
          :x2="playhead * W"
          y1="0"
          :y2="VIEW_H"
        />
      </svg>
      <div class="wf__ticks">
        <span
          v-for="tk in ticks"
          :key="tk.label"
          :class="tk.edge ? `wf__tick--${tk.edge}` : ''"
          :style="{ left: `${(tk.x / W) * 100}%` }"
        >
          {{ tk.label }}
        </span>
      </div>
    </div>
  </div>
</template>

<style scoped>
.wf { display: grid; gap: 0.25rem; }
.wf__head { display: flex; align-items: baseline; gap: 0.5rem; }
.wf__label {
  font-family: var(--ff-mono);
  font-size: var(--fs-micro);
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: var(--ink);
}
.wf__sub { font-size: var(--fs-micro); color: var(--ink-mute); }
.wf__plot {
  position: relative;
  border: 1px solid var(--line);
  border-radius: var(--r-sm);
  background: var(--surface);
  overflow: hidden;
}
.wf__plot svg { width: 100%; height: 100%; display: block; }
.wf__axis { stroke: var(--line-strong); stroke-width: 0.4; vector-effect: non-scaling-stroke; }
.wf__trace { fill: none; stroke-width: 1.15; vector-effect: non-scaling-stroke; stroke-linejoin: round; }
.wf__playhead { stroke: var(--c-rose); stroke-width: 1.5; vector-effect: non-scaling-stroke; }
.wf__ticks {
  position: absolute;
  inset: auto 0 0 0;
  height: 1rem;
  pointer-events: none;
}
.wf__ticks span {
  position: absolute;
  bottom: 1px;
  transform: translateX(-50%);
  font-family: var(--ff-mono);
  font-size: var(--fs-tick);
  color: var(--ink-mute);
  background: var(--surface);
  padding-inline: 2px;
}
.wf__ticks .wf__tick--start { transform: none; }
.wf__ticks .wf__tick--end { transform: translateX(-100%); }
</style>
