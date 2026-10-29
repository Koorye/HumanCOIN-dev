<script setup lang="ts">
import { computed } from 'vue'

const props = withDefaults(
  defineProps<{
    /** One array per channel, in native units, all the same length. */
    channels: number[][]
    labels: string[]
    color: string
    label: string
    sublabel?: string
    /** Lane height in px. */
    laneHeight?: number
    textHeight?: number
    /** 0..1 position of the playhead. */
    playhead?: number
    /** Length of the drawn span in seconds, which the ticks are laid out over. */
    totalSeconds?: number
    tickSeconds?: number
    /** Seconds added to every tick label, so a slice can be labelled in episode time. */
    tickOrigin?: number
    /** Decimals in the tick labels; 1 or more once the span is under a few seconds. */
    tickDecimals?: number
    /**
     * Width of the query window, as a fraction of the whole plot. Shaded
     * immediately left of the playhead, which is where the window sits.
     */
    band?: number
    /** Short label pinned beside the playhead, e.g. the window's row count. */
    bandLabel?: string
    /**
     * Positions (0..1 of the time axis) of the samples a read actually returns
     * at the current frame. Drawn as full-height hairlines, so the handful of
     * rows inside a window is visible rather than counted.
     */
    marks?: number[]
  }>(),
  { laneHeight: 26, textHeight: 66, playhead: 0, totalSeconds: 16, tickSeconds: 4 },
)

const W = 1000

/** Clamped, because a slice that starts after the frame puts the head outside it. */
const head = computed(() => Math.min(1, Math.max(0, props.playhead)))

/** The band's left edge, never thinner than a hairline at this width. */
const bandX = computed(() => {
  const b = props.band ?? 0
  if (b <= 0) return null
  const w = Math.max(1.5, b * W)
  return { x: Math.min(W - w, Math.max(0, head.value * W - w)), w }
})

/**
 * The label is pinned at the playhead but kept inside the plot: at the first
 * frame a label hung to the left of the playhead would be clipped away.
 */
const bandTag = computed(() => Math.min(97, Math.max(3, head.value * 100)))
/**
 * Every sample is drawn: the released streams are already bin-averaged to
 * 100 Hz, so a further stride would flatten exactly the transients the plots
 * are for. Each channel gets its own vertical scale (its own min/max) so all
 * eight stay legible on one shared time axis, and lanes are separated by a
 * small gap to keep neighbouring traces from reading as one signal.
 */
const lanes = computed(() => {
  const gap = 6
  const h = props.laneHeight
  return props.channels.map((series, i) => {
    let lo = Infinity
    let hi = -Infinity
    for (const v of series) {
      if (!Number.isFinite(v)) continue
      if (v < lo) lo = v
      if (v > hi) hi = v
    }
    if (!Number.isFinite(lo)) {
      lo = -1
      hi = 1
    }
    if (hi - lo < 1e-9) hi = lo + 1
    const pad = (hi - lo) * 0.08
    lo -= pad
    hi += pad
    const top = i * (h + gap)
    const mid = top + h / 2
    const amp = (h / 2) * 0.92
    const n = series.length
    let d = ''
    let started = false
    for (let k = 0; k < n; k++) {
      const v = series[k]
      if (!Number.isFinite(v)) {
        started = false
        continue
      }
      const x = n === 1 ? W / 2 : (k / (n - 1)) * W
      const y = mid - ((v - lo) / (hi - lo) - 0.5) * 2 * amp
      d += `${started ? 'L' : 'M'}${x.toFixed(1)},${y.toFixed(1)}`
      started = true
    }
    return { d, top, h, label: props.labels[i] ?? `ch${i}`, zero: lo < 0 && hi > 0 ? mid : null }
  })
})

const viewH = computed(() => Math.max(1, lanes.value.length * (props.laneHeight + 6) - 6))

const ticks = computed(() => {
  const out: { x: number; label: string; edge: 'start' | 'end' | '' }[] = []
  const last = props.totalSeconds
  if (!last) return out
  const origin = props.tickOrigin ?? 0
  const digits = props.tickDecimals ?? 0
  for (let t = 0; t <= last + 1e-6; t += props.tickSeconds) {
    const edge: 'start' | 'end' | '' = t <= 1e-6 ? 'start' : t >= last - 1e-6 ? 'end' : ''
    out.push({ x: (t / last) * W, label: `${(t + origin).toFixed(digits)}s`, edge })
  }
  return out
})
</script>

<template>
  <div class="mc">
    <div class="mc__head">
      <span class="mc__label">{{ label }}</span>
      <span v-if="sublabel" class="mc__sub">{{ sublabel }}</span>
    </div>
    <div class="mc__plot" :style="{ height: `${viewH}px` }">
      <svg :viewBox="`0 0 ${W} ${viewH}`" preserveAspectRatio="none" aria-hidden="true">
        <rect
          v-if="bandX"
          class="mc__band"
          :x="bandX.x"
          :width="bandX.w"
          y="0"
          :height="viewH"
        />
        <template v-for="(ln, i) in lanes" :key="i">
          <line
            v-if="ln.zero !== null"
            class="mc__zero"
            x1="0"
            :x2="W"
            :y1="ln.zero"
            :y2="ln.zero"
          />
          <path class="mc__trace" :d="ln.d" :stroke="color" />
        </template>
        <line
          class="mc__playhead"
          :x1="playhead * W"
          :x2="playhead * W"
          y1="0"
          :y2="viewH"
        />
        <line
          v-for="(m, i) in marks"
          :key="`m-${i}`"
          class="mc__mark"
          :x1="m * W"
          :x2="m * W"
          y1="0"
          :y2="viewH"
        />
      </svg>
      <span
        v-for="ln in lanes"
        :key="`l-${ln.label}`"
        class="mc__name mono"
        :style="{ top: `${ln.top + 1}px` }"
      >
        {{ ln.label }}
      </span>
      <span
        v-if="bandLabel"
        class="mc__tag mono"
        :class="{ 'mc__tag--flip': playhead > 0.7 }"
        :style="{ left: `${bandTag}%` }"
      >
        {{ bandLabel }}
      </span>
      <div class="mc__ticks">
        <span
          v-for="tk in ticks"
          :key="tk.label"
          :class="tk.edge ? `mc__tick--${tk.edge}` : ''"
          :style="{ left: `${(tk.x / W) * 100}%` }"
        >
          {{ tk.label }}
        </span>
      </div>
    </div>
  </div>
</template>

<style scoped>
.mc { display: grid; gap: 0.25rem; }
.mc__head { display: flex; align-items: baseline; gap: 0.5rem; }
.mc__label {
  font-family: var(--ff-mono);
  font-size: var(--fs-micro);
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: var(--ink);
}
.mc__sub { font-size: var(--fs-micro); color: var(--ink-mute); }
.mc__plot {
  position: relative;
  border: 1px solid var(--line);
  border-radius: var(--r-sm);
  background: var(--surface);
  overflow: hidden;
}
.mc__plot svg { width: 100%; height: 100%; display: block; }
.mc__trace { fill: none; stroke-width: 0.75; vector-effect: non-scaling-stroke; stroke-linejoin: round; }
.mc__zero { stroke: var(--line); stroke-width: 0.4; stroke-dasharray: 2 3; vector-effect: non-scaling-stroke; }
.mc__playhead { stroke: var(--c-rose); stroke-width: 1.5; vector-effect: non-scaling-stroke; }
.mc__band { fill: var(--t-rose, rgba(190, 60, 90, 0.12)); }
.mc__mark { stroke: var(--c-violet); stroke-width: 0.7; opacity: 0.55; vector-effect: non-scaling-stroke; }
.mc__tag {
  position: absolute;
  top: 2px;
  transform: translateX(-100%);
  padding: 0 3px;
  font-size: var(--fs-mark);
  color: var(--c-rose);
  background: var(--surface);
  border: 1px solid var(--t-rose, rgba(190, 60, 90, 0.3));
  border-radius: var(--r-xs);
  line-height: 1.35;
  pointer-events: none;
  white-space: nowrap;
}
.mc__tag--flip { transform: none; }
.mc__name {
  position: absolute;
  left: 3px;
  font-size: var(--fs-mark);
  color: var(--ink-mute);
  pointer-events: none;
  line-height: 1;
}
.mc__ticks {
  position: absolute;
  inset: auto 0 0 0;
  height: 1rem;
  pointer-events: none;
}
.mc__ticks span {
  position: absolute;
  bottom: 1px;
  transform: translateX(-50%);
  font-family: var(--ff-mono);
  font-size: var(--fs-tick);
  color: var(--ink-mute);
  background: var(--surface);
  padding-inline: 2px;
}
.mc__ticks .mc__tick--start { transform: none; }
.mc__ticks .mc__tick--end { transform: translateX(-100%); }
</style>
