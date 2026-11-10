<script setup lang="ts">
/**
 * The cover's five non-visual streams, drawn from the released episode itself.
 *
 * The earlier cover drew one decorative polyline per channel. Each stream is
 * now drawn in the shape that carries its structure, because no two of them
 * measure the same kind of thing and one generic trace made them look
 * interchangeable:
 *
 *   gaze    the eye camera's x(t) and y(t) over the clip, plus a 22 × 22 dwell
 *           map — fixations read as plateaus and saccades as jumps, and the map
 *           shows where the eye actually spent the clip;
 *   pose    the horizontal track of all three rigs in one frame at one scale on
 *           both axes, so the two hands' reach reads against the head's much
 *           smaller drift;
 *   glove   both 25-node blocks at one frame with each fingertip's own trail
 *           behind it — one glove frame is only a pose, the trails carry motion;
 *   EMG     16 channels from the two wrist bands, one lane each;
 *   EEG     the 8 scalp electrodes, likewise.
 *
 * Every series comes from `src/data/coverSignals.ts`, which
 * `scripts/build_cover_signals.py` derives from `public/real/sample.json`. They
 * are in the capture's own units and are never rescaled to look alike; the one
 * deliberate exception is that EMG and EEG lanes share a scale *within* a
 * stream, so the recording's own amplitude spread stays visible instead of every
 * lane being flattened to the same height. The capture documents no amplifier
 * gain, so that spread is a property of the recording rather than a calibrated
 * physiological amplitude — which is what the row's caption says.
 *
 * Where a panel marks "now", every panel marks the same frame, so the five rows
 * really are one instant of one episode.
 */
import { computed } from 'vue'
import { COVER_SIGNALS as S } from '@/data/coverSignals'
import { COVER_STREAMS } from '@/data/cover'
import { useI18n } from '@/composables/useI18n'

const { t, isZh } = useI18n()

/** A plain word that has to exist in both languages. */
const w = (en: string, zh: string) => (isZh.value ? zh : en)

/** 199.9 → "199.9", 100.0 → "100". */
const num = (v: number) => v.toFixed(1).replace(/\.0$/, '')

/** Where in the clip every instantaneous mark sits, as a fraction. */
const AT = S.source.at / Math.max(1, S.source.frames - 1)

/**
 * Each stream's rate, taken from the episode's own metadata. Gaze, pose and
 * glove declare a native rate in the hundreds of hertz and are published on the
 * episode grid, so both are shown rather than only one.
 */
function rateText(key: 'gaze' | 'pose' | 'glove' | 'emg' | 'eeg'): string {
  const r = S.source.rates[key]
  const released = `${num(r.releasedFps)} Hz`
  if (!r.nativeHz || r.nativeHz === r.releasedFps) return released
  return `${num(r.nativeHz)} → ${released}`
}

const gazeRate = computed(() => rateText('gaze'))
const poseRate = computed(() => rateText('pose'))
const gloveRate = computed(() => rateText('glove'))

const gazeNativeNote = computed(() =>
  w(
    `captured at ${num(S.source.rates.gaze.nativeHz ?? 0)} Hz, released on the ${num(S.source.fps)} fps episode grid`,
    `采集 ${num(S.source.rates.gaze.nativeHz ?? 0)} Hz，按 ${num(S.source.fps)} fps 的 episode 网格发布`,
  ),
)

/** Tick labels on every time axis in the strip; they all span the same clip. */
const ticks = computed(() => {
  const total = S.source.seconds
  const step = Math.max(1, Math.round(total / 4))
  const out: { pct: number; label: string; edge: 'start' | 'end' | '' }[] = []
  for (let s = 0; s <= total + 1e-6; s += step) {
    out.push({
      pct: (s / total) * 100,
      label: `${s.toFixed(0)}s`,
      edge: s <= 1e-6 ? 'start' : s >= total - 1e-6 ? 'end' : '',
    })
  }
  return out
})

/** Largest absolute value in a series. */
const peak = (series: number[]) => series.reduce((m, v) => Math.max(m, Math.abs(v)), 0)

/**
 * Hardest-swinging channel against the quietest, as an exact ratio — the fact
 * the shared lane scale exists to show, so it is measured from the arrays the
 * lanes are drawn from rather than written down twice.
 */
function spread(series: number[][], channels: string[]): { name: string; ratio: number } {
  const peaks = series.map((s, i) => ({ name: channels[i] ?? '', peak: peak(s) }))
  const loud = peaks.reduce((a, b) => (b.peak > a.peak ? b : a))
  const quiet = peaks.filter((c) => c.peak > 0).reduce((a, b) => (b.peak < a.peak ? b : a))
  return { name: loud.name, ratio: quiet.peak ? loud.peak / quiet.peak : 1 }
}

/* ---------------- a scalar trace over the clip ---------------- */

/** One polyline in a 100 × `h` box, autoscaled about its own zero. */
function trace(series: number[], mid: number, hi: number, h: number): string {
  const n = series.length
  const amp = (h / 2) * 0.86
  return series
    .map((v, i) => {
      const x = (i / (n - 1)) * 100
      const y = mid - (v / (2 * hi)) * 2 * amp
      return `${i ? 'L' : 'M'}${x.toFixed(2)},${y.toFixed(2)}`
    })
    .join('')
}

/* ---------------- gaze ---------------- */

const GAZE_LANES = 2
const GAZE_LANE_H = 15

/**
 * The path's two coordinates as two traces. They are read off the same paired
 * array the dwell map is built from, so a point cannot be drawn on one and not
 * the other.
 */
const gazeX = computed(() => S.gaze.path.map((p) => p[0]))
const gazeY = computed(() => S.gaze.path.map((p) => p[1]))

/** x and y share one scale, because both coordinates are eye-camera pixels. */
const gazeHi = computed(() => Math.max(peak(gazeX.value), peak(gazeY.value), 1e-6))

const gazeLanes = computed(() =>
  [gazeX.value, gazeY.value].map((series, lane) => ({
    d: trace(series, lane * GAZE_LANE_H + GAZE_LANE_H / 2, gazeHi.value, GAZE_LANE_H),
  })),
)

const gazeBox = computed(
  () => `${num(S.gaze.extent.x[1] - S.gaze.extent.x[0])} × ${num(S.gaze.extent.y[1] - S.gaze.extent.y[0])}`,
)

/** The dwell map: one cell per bin, filled in proportion to occupancy. */
const dwell = computed(() => {
  const grid = S.gaze.density
  const rows = grid.length
  const cols = grid[0]?.length ?? 0
  const max = grid.reduce((m, r) => Math.max(m, ...r), 1)
  const cells: { x: number; y: number; o: number }[] = []
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      if (grid[r][c]) cells.push({ x: c, y: r, o: 0.13 + 0.87 * (grid[r][c] / max) })
    }
  }
  /** Share of the clip spent in its single busiest bin. */
  const busiest = max / S.source.frames
  return { rows, cols, cells, busiest }
})

/* ---------------- pose ---------------- */

const POSE_W = 100
const POSE_H = 44

/**
 * One frame for all three rigs, the same scale on both axes so no track is
 * stretched, and `v` flipped because the source frame is y-up.
 */
const poseView = computed(() => {
  const { x, z } = S.pose.extent
  const w = Math.max(1e-9, x[1] - x[0])
  const h = Math.max(1e-9, z[1] - z[0])
  const box = Math.max(w, h * (POSE_W / POSE_H)) * 1.1
  return {
    cx: (x[0] + x[1]) / 2,
    cz: (z[0] + z[1]) / 2,
    scale: POSE_W / box,
  }
})

const RIG_COLOR: Record<'head' | 'left' | 'right', string> = {
  head: 'var(--k-blue)',
  left: 'var(--k-teal)',
  right: 'var(--k-violet)',
}

const posePaths = computed(() => {
  const { cx, cz, scale } = poseView.value
  const project = (x: number, z: number): [number, number] => [
    50 + (x - cx) * scale,
    POSE_H / 2 - (z - cz) * scale,
  ]
  return S.pose.rigs.map((rig) => ({
    id: rig.id,
    color: RIG_COLOR[rig.id],
    d: rig.x.map((x, i) => {
      const [u, v] = project(x, rig.z[i])
      return `${i ? 'L' : 'M'}${u.toFixed(2)},${v.toFixed(2)}`
    }).join(''),
    now: project(S.pose.now[rig.id][0], S.pose.now[rig.id][1]),
    /** Widest separation between any two samples, in the capture's own units. */
    span: rig.x.reduce((m, x, i) => {
      let best = m
      for (let j = i + 1; j < rig.x.length; j++) {
        best = Math.max(best, Math.hypot(rig.x[j] - x, rig.z[j] - rig.z[i]))
      }
      return best
    }, 0),
  }))
})

/* ---------------- glove ---------------- */

const pathOf = (pts: readonly [number, number][]) =>
  pts.map(([x, y], i) => `${i ? 'L' : 'M'}${x},${y}`).join('')

/** Node offset of each block, and the five fingertip trails that belong to it. */
const gloveBlocks = computed(() =>
  [0, 25].map((base, k) => ({
    base,
    label: String(k).padStart(2, '0'),
    bones: Array.from({ length: 5 }, (_, finger) =>
      Array.from({ length: 5 }, (_, seg) => S.glove.nodes[base + finger * 5 + seg]),
    ),
    palm: [0, 5, 10, 15, 20].map((i) => S.glove.nodes[base + i]),
    trails: S.glove.trails.slice(k * 5, k * 5 + 5),
  })),
)

/* ---------------- EMG / EEG ---------------- */

const LANE_H = 11

/** Every lane of one stream on one shared scale, about a zero line. */
function stack(series: number[][]) {
  const hi = Math.max(1e-6, ...series.map(peak))
  return {
    h: series.length * LANE_H,
    lanes: series.map((s, i) => ({ d: trace(s, i * LANE_H + LANE_H / 2, hi, LANE_H) })),
  }
}

const emg = computed(() => ({
  ...stack(S.emg.series),
  spread: spread(S.emg.series, S.emg.channels),
  split: S.emg.leftChannels * LANE_H,
}))
const eeg = computed(() => ({
  ...stack(S.eeg.series),
  spread: spread(S.eeg.series, S.eeg.channels),
}))
</script>

<template>
  <div class="cs">
    <!-- gaze: x(t) and y(t) over the clip, and where the eye actually dwelt -->
    <div class="cs__row">
      <div class="cs__gutter">
        <span class="cs__id mono">{{ t(COVER_STREAMS.gaze.label) }}</span>
        <span class="cs__rate mono">{{ gazeRate }}</span>
        <span class="cs__tag mono">x · y</span>
      </div>
      <div class="cs__graphic cs__graphic--gaze">
        <div class="cs__time">
          <svg :viewBox="`0 0 100 ${GAZE_LANES * GAZE_LANE_H}`" preserveAspectRatio="none" role="img">
            <title>{{ t(COVER_STREAMS.gaze.note) }}</title>
            <path v-for="(l, i) in gazeLanes" :key="i" class="cs__lane" :d="l.d" stroke="var(--k-teal)" />
          </svg>
          <span class="cs__playhead" :style="{ left: `${AT * 100}%` }" />
          <div class="cs__ticks">
            <span
              v-for="tk in ticks"
              :key="tk.label"
              :class="tk.edge ? `cs__tick--${tk.edge}` : ''"
              :style="{ left: `${tk.pct}%` }"
            >{{ tk.label }}</span>
          </div>
        </div>
        <figure class="cs__dwell">
          <svg :viewBox="`0 0 ${dwell.cols} ${dwell.rows}`" preserveAspectRatio="xMidYMid meet" role="img">
            <title>{{ w('Where the gaze dwelt over the clip, 22 × 22 bins', '整段注视停留分布，22 × 22 分箱') }}</title>
            <rect
              v-for="(c, i) in dwell.cells"
              :key="i"
              :x="c.x"
              :y="c.y"
              width="1"
              height="1"
              fill="var(--k-teal)"
              :opacity="c.o"
            />
            <line class="cs__cross" x1="0" :x2="dwell.cols" :y1="AT * dwell.rows" :y2="AT * dwell.rows" />
          </svg>
          <figcaption class="cs__cap mono">{{ gazeBox }} {{ w('px', '像素') }}</figcaption>
        </figure>
      </div>
    </div>

    <!-- pose: all three rigs over the clip, in one frame, at one scale -->
    <div class="cs__row">
      <div class="cs__gutter">
        <span class="cs__id mono">{{ t(COVER_STREAMS.pose.label) }}</span>
        <span class="cs__rate mono">{{ poseRate }}</span>
        <span class="cs__tag mono">{{ w('travel', '行程') }}</span>
      </div>
      <div class="cs__graphic cs__graphic--pose">
        <svg class="cs__plane" :viewBox="`0 0 ${POSE_W} ${POSE_H}`" preserveAspectRatio="none" role="img">
          <title>{{ t(COVER_STREAMS.pose.note) }}</title>
          <path v-for="p in posePaths" :key="p.id" class="cs__track" :d="p.d" :stroke="p.color" />
          <circle v-for="p in posePaths" :key="`n-${p.id}`" :cx="p.now[0]" :cy="p.now[1]" r="1.6" :fill="p.color" />
        </svg>
        <ul class="cs__legend mono">
          <li v-for="p in posePaths" :key="p.id">
            <span class="cs__swatch" :style="{ background: p.color }" />
            <span class="cs__name">{{ p.id }}</span>
            <span class="cs__val">{{ p.span.toFixed(2) }}</span>
          </li>
        </ul>
      </div>
    </div>

    <!-- glove: both blocks at the mark, each fingertip with its own trail -->
    <div class="cs__row">
      <div class="cs__gutter">
        <span class="cs__id mono">{{ t(COVER_STREAMS.glove.label) }}</span>
        <span class="cs__rate mono">{{ gloveRate }}</span>
        <span class="cs__tag mono">{{ S.glove.nodes.length }} {{ w('nodes', '节点') }}</span>
      </div>
      <div class="cs__graphic cs__graphic--glove">
        <figure v-for="b in gloveBlocks" :key="b.base" class="cs__hand">
          <svg :viewBox="S.glove.view" preserveAspectRatio="xMidYMid meet" role="img">
            <title>{{ t(COVER_STREAMS.glove.note) }}</title>
            <path v-for="(tr, i) in b.trails" :key="`t-${i}`" class="cs__trail" :d="pathOf(tr)" />
            <path class="cs__palm" :d="`${pathOf(b.palm)}Z`" />
            <path v-for="(bone, i) in b.bones" :key="`b-${i}`" class="cs__bone" :d="pathOf(bone)" />
          </svg>
          <figcaption class="cs__cap mono">{{ w('block', '数据块') }} {{ b.label }}</figcaption>
        </figure>
      </div>
    </div>

    <!-- EMG: both wrist bands, every channel, on one scale -->
    <div class="cs__row">
      <div class="cs__gutter">
        <span class="cs__id mono">{{ t(COVER_STREAMS.emg.label) }}</span>
        <span class="cs__rate mono">{{ num(S.emg.rate) }} Hz</span>
        <span class="cs__tag mono">{{ S.emg.channels.length }} {{ w('ch', '通道') }}</span>
        <span class="cs__spread mono">{{ emg.spread.ratio.toFixed(1) }}×</span>
      </div>
      <div class="cs__graphic cs__graphic--phys">
        <div class="cs__time">
          <svg :viewBox="`0 0 100 ${emg.h}`" preserveAspectRatio="none" role="img">
            <title>{{ t(COVER_STREAMS.emg.note) }}</title>
            <line class="cs__split" x1="0" x2="100" :y1="emg.split" :y2="emg.split" />
            <path v-for="(l, i) in emg.lanes" :key="i" class="cs__lane" :d="l.d" stroke="var(--k-rose)" />
          </svg>
          <span class="cs__playhead" :style="{ left: `${AT * 100}%` }" />
          <div class="cs__ticks">
            <span
              v-for="tk in ticks"
              :key="tk.label"
              :class="tk.edge ? `cs__tick--${tk.edge}` : ''"
              :style="{ left: `${tk.pct}%` }"
            >{{ tk.label }}</span>
          </div>
        </div>
        <ul class="cs__legend mono">
          <li>
            <span class="cs__swatch" style="background: var(--k-rose)" />
            <span class="cs__name">{{ w('left', '左腕') }}</span>
            <span class="cs__val">{{ S.emg.leftChannels }}</span>
          </li>
          <li>
            <span class="cs__swatch" style="background: var(--k-rose); opacity: 0.45" />
            <span class="cs__name">{{ w('right', '右腕') }}</span>
            <span class="cs__val">{{ S.emg.channels.length - S.emg.leftChannels }}</span>
          </li>
          <li class="cs__legend--peak">
            <span class="cs__name">{{ emg.spread.name }}</span>
          </li>
        </ul>
      </div>
    </div>

    <!-- EEG: the scalp electrodes -->
    <div class="cs__row">
      <div class="cs__gutter">
        <span class="cs__id mono">{{ t(COVER_STREAMS.eeg.label) }}</span>
        <span class="cs__rate mono">{{ num(S.eeg.rate) }} Hz</span>
        <span class="cs__tag mono">{{ S.eeg.channels.length }} {{ w('ch', '通道') }}</span>
        <span class="cs__spread mono">{{ eeg.spread.ratio.toFixed(1) }}×</span>
      </div>
      <div class="cs__graphic cs__graphic--phys">
        <div class="cs__time">
          <svg :viewBox="`0 0 100 ${eeg.h}`" preserveAspectRatio="none" role="img">
            <title>{{ t(COVER_STREAMS.eeg.note) }}</title>
            <path v-for="(l, i) in eeg.lanes" :key="i" class="cs__lane" :d="l.d" stroke="var(--k-violet)" />
          </svg>
          <span class="cs__playhead" :style="{ left: `${AT * 100}%` }" />
          <div class="cs__ticks">
            <span
              v-for="tk in ticks"
              :key="tk.label"
              :class="tk.edge ? `cs__tick--${tk.edge}` : ''"
              :style="{ left: `${tk.pct}%` }"
            >{{ tk.label }}</span>
          </div>
        </div>
        <ul class="cs__legend mono">
          <li v-for="c in S.eeg.channels" :key="c"><span class="cs__name">{{ c }}</span></li>
        </ul>
      </div>
    </div>

    <p class="cs__foot mono">{{ gazeNativeNote }}</p>
  </div>
</template>

<style scoped>
.mono { font-family: var(--ff-mono); }

.cs { display: grid; gap: 0.55rem; align-content: start; }

/* Label gutter, then the graphic: every row is read down the same two columns,
   which is what makes five different drawings read as one instrument. */
.cs__row { display: grid; grid-template-columns: 4.6rem minmax(0, 1fr); gap: 0.55rem; align-items: start; }
.cs__gutter { display: grid; gap: 0.06rem; align-content: start; min-width: 0; }
.cs__id {
  font-size: var(--fs-tick);
  letter-spacing: 0.09em;
  text-transform: uppercase;
  color: #dcebf3;
}
.cs__rate { font-size: var(--fs-mark); color: #7fa8c4; white-space: nowrap; }
.cs__tag { font-size: var(--fs-mark); color: #5f8aa6; white-space: nowrap; }
.cs__spread { font-size: var(--fs-mark); color: var(--k-rose); white-space: nowrap; }

.cs__graphic { min-width: 0; display: grid; gap: 0.45rem; }
.cs__graphic--gaze { grid-template-columns: minmax(0, 1fr) 5.4rem; }
.cs__graphic--pose,
.cs__graphic--phys { grid-template-columns: minmax(0, 1fr) 3.4rem; }
.cs__graphic--glove { grid-template-columns: repeat(2, minmax(0, 1fr)); }

.cs__time { position: relative; min-width: 0; }
.cs__time svg { display: block; width: 100%; }
.cs__graphic--gaze .cs__time svg { height: 30px; }
.cs__graphic--phys .cs__time svg { height: 88px; }
.cs__lane { fill: none; stroke-width: 0.9; vector-effect: non-scaling-stroke; stroke-linejoin: round; }
.cs__split { stroke: rgba(255, 255, 255, 0.24); stroke-width: 1; vector-effect: non-scaling-stroke; }

/* The shared instant: one rule per stream, so "same frame" is a mark rather
   than a claim. */
.cs__playhead {
  position: absolute;
  top: 0;
  bottom: 0.9rem;
  width: 1px;
  background: linear-gradient(180deg, transparent, rgba(255, 255, 255, 0.55) 10%, rgba(255, 255, 255, 0.55) 90%, transparent);
  pointer-events: none;
}

.cs__ticks { position: relative; height: 0.9rem; }
.cs__ticks span {
  position: absolute; bottom: 0; transform: translateX(-50%);
  font-family: var(--ff-mono); font-size: var(--fs-mark);
  letter-spacing: 0.04em; color: #6d97b1;
}
.cs__ticks .cs__tick--start { transform: none; }
.cs__ticks .cs__tick--end { transform: translateX(-100%); }

/* ---- gaze dwell map ---- */
.cs__dwell { margin: 0; display: grid; gap: 0.15rem; align-content: start; }
.cs__dwell svg {
  display: block; width: 100%; height: 4.6rem;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.14);
  border-radius: var(--r-xs);
}
.cs__cross { stroke: rgba(255, 255, 255, 0.55); stroke-width: 0.12; }
.cs__cap { font-size: var(--fs-mark); color: #6d97b1; text-align: center; white-space: nowrap; }

/* ---- pose ---- */
.cs__plane {
  display: block; width: 100%; height: 4.4rem;
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid rgba(255, 255, 255, 0.11);
  border-radius: var(--r-xs);
}
.cs__track { fill: none; stroke-width: 1; vector-effect: non-scaling-stroke; stroke-linejoin: round; }
.cs__track:first-of-type { opacity: 0.5; }

/* ---- glove ---- */
.cs__hand { margin: 0; display: grid; gap: 0.1rem; min-width: 0; }
.cs__hand svg {
  display: block; width: 100%; height: 4.9rem;
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid rgba(255, 255, 255, 0.11);
  border-radius: var(--r-xs);
}
.cs__trail { fill: none; stroke: var(--k-amber); stroke-width: 0.7; opacity: 0.3; vector-effect: non-scaling-stroke; stroke-linejoin: round; }
.cs__palm { fill: rgba(224, 178, 92, 0.14); stroke: var(--k-amber); stroke-width: 1; }
.cs__bone { fill: none; stroke: var(--k-amber); stroke-width: 1.2; vector-effect: non-scaling-stroke; stroke-linejoin: round; }

/* ---- legends ---- */
.cs__legend { list-style: none; margin: 0; padding: 0; display: grid; gap: 0.08rem; align-content: start; min-width: 0; }
.cs__legend li { display: flex; align-items: baseline; gap: 0.3rem; min-width: 0; }
.cs__legend--peak { border-top: 1px solid rgba(255, 255, 255, 0.14); padding-top: 0.15rem; margin-top: 0.1rem; }
.cs__name {
  font-size: var(--fs-mark); letter-spacing: 0.04em; color: #9fbccd;
  white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
}
.cs__val { font-size: var(--fs-mark); color: #7fa8c4; font-variant-numeric: tabular-nums; margin-left: auto; }
.cs__swatch { flex: none; width: 7px; height: 2px; border-radius: 1px; margin-top: 0.42em; }

.cs__foot { margin: 0.1rem 0 0 5.15rem; font-size: var(--fs-mark); color: #5f8aa6; }

@media (max-width: 1180px) {
  .cs__graphic--gaze { grid-template-columns: minmax(0, 1fr) 4.4rem; }
  .cs__graphic--pose, .cs__graphic--phys { grid-template-columns: minmax(0, 1fr); }
  .cs__legend { grid-auto-flow: column; gap: 0.7rem; }
  .cs__legend--peak { border-top: 0; padding-top: 0; margin-top: 0; }
}
@media (max-width: 640px) {
  .cs__row { grid-template-columns: 3.6rem minmax(0, 1fr); gap: 0.4rem; }
  .cs__graphic--gaze { grid-template-columns: minmax(0, 1fr); }
  .cs__foot { margin-left: 4rem; }
}
</style>
