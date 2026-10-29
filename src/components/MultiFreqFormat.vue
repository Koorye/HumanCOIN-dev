<script setup lang="ts">
/**
 * The format's write/read cycle, animated.
 *
 * Phase 1 — write: every feature stamps its samples on its own grid, and the
 * task call is what closes a frame, so the fast sensors write many samples
 * between two frame markers. Phase 2 — on disk: each feature's buffer becomes
 * one parquet. Phase 3 — read: one master frame resolves into one lookup per
 * feature, in whichever mode that feature declares.
 *
 * Everything drawn comes from `mfFormat.ts`, and the counts printed are
 * computed from the same sampling grids, so the figure cannot claim a row
 * count its own data does not produce.
 */
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { FORMAT } from '@/content'
import { useI18n } from '@/composables/useI18n'
import {
  FPS,
  FRAME_MS,
  MF_LANES,
  MF_MODES,
  QUERY_FRAME,
  SPAN_MS,
  WINDOW_FROM,
  WRITE_CALLS,
  laneRows,
  laneSamples,
  laneShape,
  laneFileRows,
  nearestMs,
} from '@/data/mfFormat'

const { t, isZh } = useI18n()

/* ---- geometry, in SVG user units ---- */
const W = 720
const H = 254
const X0 = 106
const X1 = 512
const BOX_X = 526
const BOX_W = 190
const BOX_H = 30
const RAIL_Y = 44
const LANE_Y0 = 84
const LANE_GAP = 41

const span = X1 - X0
const xOf = (ms: number) => X0 + (ms / SPAN_MS) * span

const windowFromX = xOf(WINDOW_FROM * SPAN_MS)

const lanes = MF_LANES.map((lane, i) => {
  const written = laneFileRows(lane)
  return {
    i,
    lane,
    y: LANE_Y0 + i * LANE_GAP,
    dots: laneSamples(lane).map((ms) => ({ ms, x: xOf(ms), inWindow: ms > WINDOW_FROM * SPAN_MS + 1e-6 })),
    written,
    rows: laneRows(lane),
    shape: laneShape(lane),
    nearX: xOf(nearestMs(lane)),
    file: `${lane.key.replace('observation.', 'obs.').replace('.images', '.imgs')}.parquet`,
  }
})

const frames = FRAME_MS.map((ms) => ({ ms, x: xOf(ms) }))

/* ---- animation ---- */
/** Progress marks inside the 0..1 cycle. */
const AT_WRITE = 0.42
const AT_SAVED = 0.55
const AT_READ = 0.95
const CYCLE_SECONDS = 16

const progress = ref(1)
const playing = ref(false)
const reduced = ref(false)

const phase = computed(() => {
  const p = progress.value
  if (p < AT_WRITE) return 'write'
  if (p < AT_SAVED) return 'saved'
  if (p < AT_READ) return 'read'
  return 'aligned'
})

/** Which half of the story the figure is telling right now. */
const side = computed(() => (phase.value === 'write' || phase.value === 'saved' ? 'write' : 'read'))
const canAnimate = computed(() => !reduced.value)

/** Sweep position of the write animation, 0..1 across the drawn span. */
const writeFrac = computed(() => (phase.value === 'write' ? progress.value / AT_WRITE : 1))
/** Whether the buffers have been flushed to parquet. */
const saved = computed(() => phase.value !== 'write')
/** Resolution of the read phase, 0..1. */
const readFrac = computed(() => {
  if (side.value === 'write') return 0
  if (phase.value === 'aligned') return 1
  return (progress.value - AT_SAVED) / (AT_READ - AT_SAVED)
})

const queryOn = computed(() => side.value === 'read')
const dotOn = (ms: number) => ms <= writeFrac.value * SPAN_MS + 1e-6
const frameOn = (ms: number) => phase.value !== 'write' || ms <= writeFrac.value * SPAN_MS + 1e-6
/** Read-out rows resolve one at a time, so the order of lookup is visible. */
const rowOn = (i: number) => readFrac.value > (i + 0.4) / (lanes.length + 0.6)

const stepIndex = computed(() => ({ write: 0, saved: 1, read: 2, aligned: 3 })[phase.value])
const steps = computed(() =>
  [
    t(FORMAT.stepWrite),
    t(FORMAT.stepSaved),
    t(FORMAT.stepRead).replace('%n', String(QUERY_FRAME)),
    t(FORMAT.stepAligned),
  ].map((label, i) => ({ label, done: i < stepIndex.value, on: i === stepIndex.value })),
)

let raf = 0
let last = 0
let observer: IntersectionObserver | null = null
const root = ref<HTMLElement | null>(null)
const inView = ref(true)

function tick(now: number) {
  if (!playing.value) return
  if (!last) last = now
  const dt = (now - last) / 1000
  last = now
  let p = progress.value + dt / CYCLE_SECONDS
  if (p >= 1) p -= 1
  progress.value = p
  raf = requestAnimationFrame(tick)
}

function setPlaying(v: boolean) {
  if (!canAnimate.value) {
    progress.value = 1
    return
  }
  playing.value = v
  last = 0
  cancelAnimationFrame(raf)
  if (v) raf = requestAnimationFrame(tick)
}

function replay() {
  progress.value = 0
  setPlaying(true)
}

function toggle() {
  if (phase.value === 'aligned' && !playing.value) return replay()
  setPlaying(!playing.value)
}

onMounted(() => {
  const mq = window.matchMedia?.('(prefers-reduced-motion: reduce)')
  reduced.value = !!mq?.matches
  if (reduced.value) {
    progress.value = 1
    return
  }

  if (typeof IntersectionObserver !== 'undefined' && root.value) {
    observer = new IntersectionObserver(
      ([entry]) => {
        inView.value = entry.isIntersecting
        setPlaying(entry.isIntersecting)
      },
      { threshold: 0.25 },
    )
    observer.observe(root.value)
  } else {
    setPlaying(true)
  }
})

onBeforeUnmount(() => {
  cancelAnimationFrame(raf)
  observer?.disconnect()
  observer = null
})

void inView
</script>

<template>
  <figure ref="root" class="mf">
    <!-- step rail + transport -->
    <div class="mf__bar">
      <ol class="mf__steps">
        <li
          v-for="(s, i) in steps"
          :key="i"
          class="mf__step"
          :class="{ 'is-done': s.done, 'is-on': s.on }"
        >
          <span class="mf__step-i mono">{{ String(i + 1).padStart(2, '0') }}</span>
          <span class="mf__step-t">{{ s.label }}</span>
        </li>
      </ol>
      <button
        v-if="canAnimate"
        type="button"
        class="mf__play"
        :aria-label="t(FORMAT.playback)"
        @click="toggle"
      >
        <span aria-hidden="true">{{ playing ? '❚❚' : '▶' }}</span>
        <span>{{ playing ? t(FORMAT.pause) : phase === 'aligned' ? t(FORMAT.replay) : t(FORMAT.playback) }}</span>
      </button>
    </div>

    <svg class="mf__svg" :viewBox="`0 0 ${W} ${H}`" role="img" :aria-label="t(FORMAT.figRead)">
      <!-- master clock rail -->
      <text class="mf__rail-label" x="0" :y="RAIL_Y + 4">{{ isZh ? '主时钟' : 'master clock' }}</text>
      <text class="mf__rail-sub mono" x="0" :y="RAIL_Y + 17">{{ FPS }} fps</text>
      <line class="mf__rail" :x1="X0" :x2="X1" :y1="RAIL_Y" :y2="RAIL_Y" />
      <g v-for="f in frames" :key="f.ms">
        <line
          class="mf__tick"
          :class="{ 'is-past': frameOn(f.ms) }"
          :x1="f.x"
          :x2="f.x"
          :y1="RAIL_Y - 7"
          :y2="H - 18"
        />
        <circle class="mf__tick-dot" :class="{ 'is-past': frameOn(f.ms) }" :cx="f.x" :cy="RAIL_Y" r="3.2" />
      </g>

      <!-- the read window -->
      <rect
        class="mf__band"
        :class="{ 'is-on': queryOn }"
        :x="windowFromX"
        :y="RAIL_Y - 7"
        :width="X1 - windowFromX"
        :height="H - 18 - (RAIL_Y - 7)"
      />

      <!-- feature lanes -->
      <g v-for="l in lanes" :key="l.lane.id">
        <text class="mf__name" x="0" :y="l.y + 4">{{ t(l.lane.label) }}</text>
        <text class="mf__hz mono" x="0" :y="l.y + 17">{{ l.lane.rateLabel }}</text>
        <line class="mf__axis" :x1="X0" :x2="X1" :y1="l.y" :y2="l.y" />

        <circle
          v-for="(d, j) in l.dots"
          :key="j"
          class="mf__dot"
          :class="{ 'is-in': queryOn && d.inWindow && rowOn(l.i) }"
          :cx="d.x"
          :cy="l.y"
          :r="l.lane.dotRadius"
          :fill="l.lane.color"
          :opacity="dotOn(d.ms) ? 1 : 0.12"
        />

        <!-- the single reading a nearest-mode lookup lands on -->
        <circle
          v-if="queryOn && l.lane.mode === 'nearest' && rowOn(l.i)"
          class="mf__pick"
          :cx="l.nearX"
          :cy="l.y"
          :r="l.lane.dotRadius + 4.5"
          :stroke="l.lane.color"
        />

        <!-- this feature's own parquet -->
        <g class="mf__file" :class="{ 'is-on': saved }">
          <rect :x="BOX_X" :y="l.y - BOX_H / 2" :width="BOX_W" :height="BOX_H" rx="4" />
          <rect class="mf__file-bar" :x="BOX_X" :y="l.y - BOX_H / 2" width="3.5" :height="BOX_H" :fill="l.lane.color" />
          <text class="mf__file-k mono" :x="BOX_X + 11" :y="l.y - 2">{{ l.file }}</text>
          <text class="mf__file-v mono" :x="BOX_X + 11" :y="l.y + 11">
            <tspan>{{ saved ? `${l.written.toLocaleString('en-US')} ${t(FORMAT.rowsWord)}` : t(FORMAT.buffering) }}</tspan>
            <tspan v-if="queryOn && rowOn(l.i)" class="mf__file-r">  →  {{ l.shape }}</tspan>
          </text>
        </g>
      </g>

      <!-- query cursor -->
      <g class="mf__query" :class="{ 'is-on': queryOn }">
        <line :x1="X1" :x2="X1" :y1="RAIL_Y - 7" :y2="H - 18" />
        <text :x="X1 - 3" :y="RAIL_Y - 12" text-anchor="end">{{ t(FORMAT.queryLabel) }}</text>
      </g>
      <text
        v-if="queryOn"
        class="mf__band-label mono"
        :x="(windowFromX + X1) / 2"
        :y="H - 4"
        text-anchor="middle"
      >
        {{ t(FORMAT.windowBand) }}
      </text>
    </svg>

    <p class="mf__hint">{{ side === 'write' ? t(FORMAT.writeHint) : t(FORMAT.readHint) }}</p>
    <p class="mf__hint mf__hint--cap">{{ t(FORMAT.episodeNote) }}</p>

    <!-- what one master frame resolves to -->
    <div class="mf__out" :class="{ 'is-on': queryOn }">
      <table class="mf__tbl">
        <caption class="mf__cap">
          {{ t(FORMAT.perFeature) }}
        </caption>
        <thead>
          <tr>
            <th scope="col">{{ isZh ? '特征' : 'feature' }}</th>
            <th scope="col" class="mf__num">{{ t(FORMAT.rowsCol) }}</th>
            <th scope="col">{{ t(FORMAT.modeCol) }}</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="l in lanes" :key="l.lane.id" :class="{ 'is-on': rowOn(l.i) }">
            <th scope="row" class="mono">{{ l.lane.key }}</th>
            <td class="mf__num mono">{{ rowOn(l.i) ? l.shape : '·' }}</td>
            <td>
              <code class="mf__mode" :style="{ '--mode': l.lane.color }">{{ l.lane.mode }}</code>
              <span class="mf__note">{{ t(l.lane.note) }}</span>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- the three modes -->
    <div class="mf__modes">
      <p class="mf__subhead mono">{{ t(FORMAT.modeTitle) }}</p>
      <ul class="mf__modelist">
        <li v-for="m in MF_MODES" :key="m.id">
          <code class="mono">{{ m.id }}</code>
          <span class="mf__modeshape mono">{{ m.shape }}</span>
          <span class="mf__modeex">{{ t(m.example) }}</span>
        </li>
      </ul>
      <p class="mf__rule">{{ t(FORMAT.modeNote) }}</p>
    </div>

    <!-- the write call, line for line -->
    <div class="mf__write">
      <p class="mf__subhead mono">{{ t(FORMAT.figWrite) }}</p>
      <pre class="mf__code">{{ WRITE_CALLS.join('\n') }}</pre>
      <p class="mf__rule">{{ t(FORMAT.timingRule) }}</p>
    </div>
  </figure>
</template>

<style scoped>
.mono { font-family: var(--ff-mono); }

.mf { margin: 0; }

/* ---- step rail ---- */
.mf__bar {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
  padding-bottom: 0.8rem;
  margin-bottom: 0.95rem;
  border-bottom: 1px solid var(--line);
}
.mf__steps { display: flex; flex-wrap: wrap; gap: 0.3rem; list-style: none; margin: 0; padding: 0; }
.mf__step {
  display: inline-flex;
  align-items: baseline;
  gap: 0.4rem;
  padding: 0.28rem 0.62rem;
  border: 1px solid var(--line);
  border-radius: var(--r-pill);
  font-size: var(--fs-tick);
  color: var(--ink-mute);
  transition: color var(--dur) var(--ease), border-color var(--dur) var(--ease), background var(--dur) var(--ease);
}
.mf__step-i { font-size: var(--fs-mark); opacity: 0.75; }
.mf__step.is-done { color: var(--ink-soft); border-color: var(--line-strong); }
.mf__step.is-on { color: var(--ink); border-color: var(--c-blue); background: var(--t-blue); font-weight: 600; }
.mf__play {
  display: inline-flex;
  align-items: center;
  gap: 0.42rem;
  border: 1px solid var(--line-strong);
  background: var(--paper);
  color: var(--ink);
  font: inherit;
  font-size: var(--fs-tick);
  padding: 0.32rem 0.72rem;
  border-radius: var(--r-sm);
  cursor: pointer;
  transition: background var(--dur) var(--ease);
}
.mf__play:hover { background: var(--surface-2); }

/* ---- svg ---- */
.mf__svg { width: 100%; height: auto; display: block; }
.mf__rail-label { font-size: var(--fs-tick); fill: var(--ink); font-weight: 600; font-family: var(--ff-sans); }
.mf__rail-sub { font-size: var(--fs-mark); fill: var(--ink-mute); }
.mf__rail { stroke: var(--line-strong); stroke-width: 1.4; }
.mf__tick { stroke: var(--line); stroke-width: 1; stroke-dasharray: 2 3; transition: stroke var(--dur) var(--ease); }
.mf__tick.is-past { stroke: var(--c-slate); stroke-dasharray: none; opacity: 0.45; }
.mf__tick-dot { fill: var(--surface-2); stroke: var(--line-strong); stroke-width: 1; transition: fill var(--dur) var(--ease); }
.mf__tick-dot.is-past { fill: var(--c-slate); stroke: var(--c-slate); }
.mf__band { fill: var(--c-amber); opacity: 0; transition: opacity 320ms var(--ease); }
.mf__band.is-on { opacity: 0.1; }

.mf__name { font-size: var(--fs-tick); fill: var(--ink); font-weight: 600; font-family: var(--ff-sans); }
.mf__hz { font-size: var(--fs-mark); fill: var(--ink-mute); }
.mf__axis { stroke: var(--line); stroke-width: 1.2; }
.mf__dot { transition: opacity 240ms var(--ease); }
.mf__dot.is-in { stroke: var(--ink); stroke-width: 1.1; }
.mf__pick { fill: none; stroke-width: 1.7; }

.mf__file rect:first-of-type {
  fill: var(--surface-2);
  stroke: var(--line);
  transition: fill var(--dur) var(--ease), stroke var(--dur) var(--ease);
}
.mf__file.is-on rect:first-of-type { fill: var(--paper); stroke: var(--line-strong); }
.mf__file-k { font-size: var(--fs-mark); fill: var(--ink-soft); }
.mf__file-v { font-size: var(--fs-mark); fill: var(--ink-mute); }
.mf__file-r { fill: var(--ink); font-weight: 600; }

.mf__query { opacity: 0; transition: opacity 320ms var(--ease); }
.mf__query.is-on { opacity: 1; }
.mf__query line { stroke: var(--ink); stroke-width: 1.3; stroke-dasharray: 4 4; }
.mf__query text { font-family: var(--ff-mono); font-size: var(--fs-tick); fill: var(--ink); }
.mf__band-label { font-size: var(--fs-mark); fill: var(--ink-soft); }

.mf__hint { margin: 0.7rem 0 0; font-size: var(--fs-micro); color: var(--ink-mute); min-height: 1.4em; }
.mf__hint--cap { margin-top: 0.4rem; color: var(--ink-mute); }

/* ---- returned item ---- */
.mf__out {
  margin-top: 1.15rem;
  border: 1px solid var(--line);
  border-radius: var(--r-md);
  padding: 0.9rem 1rem 1rem;
  background: var(--surface);
  opacity: 0.6;
  transition: opacity 320ms var(--ease);
  /* The mode column carries prose notes, so the table's min-content width exceeds
     a phone-width column; scroll it inside the card instead of widening the page. */
  overflow-x: auto;
}
.mf__out.is-on { opacity: 1; }
.mf__tbl { width: 100%; border-collapse: collapse; font-size: var(--fs-micro); }
.mf__cap {
  text-align: left;
  font-size: var(--fs-tick);
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--ink-mute);
  padding: 0 0 0.5rem;
}
.mf__tbl th, .mf__tbl td { text-align: left; padding: 0.36rem 0.6rem 0.36rem 0; border-bottom: 1px solid var(--line); vertical-align: top; }
.mf__tbl tbody tr { opacity: 0.3; transition: opacity 300ms var(--ease); }
.mf__tbl tbody tr.is-on { opacity: 1; }
.mf__tbl tbody tr:last-child th, .mf__tbl tbody tr:last-child td { border-bottom: 0; }
.mf__tbl thead th {
  font-size: var(--fs-tick);
  font-weight: 600;
  color: var(--ink-mute);
  text-transform: uppercase;
  letter-spacing: 0.06em;
  white-space: nowrap;
}
.mf__tbl tbody th { font-weight: 500; color: var(--ink); font-size: var(--fs-tick); }
.mf__num { text-align: right; font-variant-numeric: tabular-nums; white-space: nowrap; color: var(--ink); }
.mf__mode {
  display: inline-block;
  font-family: var(--ff-mono);
  font-size: var(--fs-tick);
  color: var(--ink);
  border: 1px solid var(--line);
  border-left: 3px solid var(--mode);
  border-radius: var(--r-xs);
  padding: 0.1rem 0.4rem;
}
.mf__note { display: block; margin-top: 0.32rem; color: var(--ink-mute); line-height: 1.5; }

/* ---- modes + write call ---- */
.mf__modes, .mf__write { margin-top: 1.25rem; }
.mf__subhead {
  font-size: var(--fs-tick);
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--ink-mute);
  margin: 0 0 0.55rem;
}
.mf__modelist { display: grid; gap: 0.4rem; list-style: none; margin: 0; padding: 0; }
.mf__modelist li {
  display: grid;
  grid-template-columns: 7.5rem 4rem minmax(0, 1fr);
  gap: 0.6rem;
  align-items: baseline;
  font-size: var(--fs-micro);
}
.mf__modelist code {
  font-size: var(--fs-tick);
  color: var(--ink);
  border: 1px solid var(--line);
  border-radius: var(--r-xs);
  padding: 0.1rem 0.4rem;
  justify-self: start;
}
.mf__modeshape { color: var(--ink-soft); font-size: var(--fs-tick); }
.mf__modeex { color: var(--ink-mute); }
.mf__code {
  margin: 0;
  padding: 0.8rem 0.9rem;
  background: var(--surface-2);
  border: 1px solid var(--line);
  border-radius: var(--r-sm);
  font-size: var(--fs-tick);
  line-height: 1.8;
  color: var(--ink-body);
  overflow-x: auto;
}
.mf__rule { margin: 0.6rem 0 0; font-size: var(--fs-micro); color: var(--ink-mute); line-height: 1.6; }

@media (max-width: 560px) {
  .mf__modelist li { grid-template-columns: 6.5rem minmax(0, 1fr); }
  .mf__modeex { grid-column: 2; }
}

@media (prefers-reduced-motion: reduce) {
  .mf__band, .mf__query, .mf__dot, .mf__tick, .mf__tick-dot,
  .mf__file rect:first-of-type, .mf__out, .mf__tbl tbody tr { transition: none; }
}
</style>
