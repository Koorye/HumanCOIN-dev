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
  AXIS_END_MS,
  FPS,
  FRAME_MS,
  FRAME_MS_AXIS,
  laneBracket,
  MF_LANES,
  WINDOW,
  QUERY_FRAME,
  SPAN_MS,
  WINDOW_FROM,
  laneRows,
  laneSamples,
  laneShape,
  laneFileRows,
  nearestMs,
} from '@/data/mfFormat'

const { t } = useI18n()

/* ---- geometry, in SVG user units ---- */
const W = 736
const H = 248
const X0 = 168
const X1 = 566
const RAIL_Y = 34
const LANE_Y0 = 74
const LANE_GAP = 36

const span = X1 - X0
const xOf = (ms: number) => X0 + (ms / AXIS_END_MS) * span
const queryX = xOf(SPAN_MS)

const windowFromX = xOf(WINDOW_FROM * SPAN_MS)

const lanes = MF_LANES.map((lane, i) => {
  const written = laneFileRows(lane)
  return {
    i,
    lane,
    y: LANE_Y0 + i * LANE_GAP,
    dots: laneSamples(lane, AXIS_END_MS).map((ms) => ({ ms, x: xOf(ms), inWindow: ms > SPAN_MS + WINDOW[0] * 1000 && ms <= SPAN_MS + 1e-6 })),
    written,
    rows: laneRows(lane),
    shape: laneShape(lane),
    nearX: xOf(nearestMs(lane)),
    wrap: laneBracket(lane),
    file: `${lane.key.replace('observation.', 'obs.').replace('.images', '.imgs')}.parquet`,
  }
})

const RAIL_NAME_X = 96
const hovered = ref<number | null>(null)
const hoverNote = computed(() => {
  const l = hovered.value === null ? null : lanes[hovered.value]
  return l ? t(l.lane.note) : ''
})

const frames = FRAME_MS_AXIS.map((ms, i) => ({
  ms,
  x: xOf(ms),
  /* the query sits on the frame marked n; earlier and later ticks are numbered
     from it */
  label: i === FRAME_MS.length - 1 ? 'n' : i === FRAME_MS.length - 2 ? 'n−1' : i === FRAME_MS.length - 3 ? 'n−2' : `n+${i - (FRAME_MS.length - 1)}`,
}))

/* ---- animation ---- */
/** Progress marks inside the 0..1 cycle. */
const AT_WRITE = 0.26
const AT_SAVED = 0.42
const AT_READ = 0.95
const CYCLE_SECONDS = 13

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
    <div class="mf__bar">
      <p class="mf__kicker mono">{{ t(FORMAT.figKicker) }}</p>
      <button
        v-if="canAnimate"
        type="button"
        class="mf__play mono"
        :aria-label="t(FORMAT.playback)"
        @click="toggle"
      >
        {{ playing ? t(FORMAT.pause) : phase === 'aligned' ? t(FORMAT.replay) : t(FORMAT.playback) }}
      </button>
    </div>

    <!-- the four stages, read left to right above the timeline -->
    <ol class="mf__steps">
      <li
        v-for="(s2, i) in steps"
        :key="i"
        class="mf__step"
        :class="{ 'is-done': s2.done, 'is-on': s2.on }"
      >
        <span class="mf__step-i mono">{{ String(i + 1).padStart(2, '0') }}</span>
        <span class="mf__step-t">{{ s2.label }}</span>
      </li>
    </ol>

    <!-- the timeline itself: clocks, samples, window. Nothing else. -->
    <div class="mf__stage">
      <svg class="mf__svg" :viewBox="`0 0 ${W} ${H}`" role="img" :aria-label="t(FORMAT.figRead)">
        <!-- master clock: one rail, three frames named around the query -->
        <text class="mf__name" x="0" :y="RAIL_Y + 3.5">Master Index</text>
        <text class="mf__hz mono" :x="RAIL_NAME_X" :y="RAIL_Y + 3.5">{{ FPS }} fps</text>
        <line class="mf__rail" :x1="X0" :x2="X1" :y1="RAIL_Y" :y2="RAIL_Y" />

        <g v-for="f in frames" :key="f.ms">
          <line class="mf__tick" :class="{ 'is-past': frameOn(f.ms) }" :x1="f.x" :x2="f.x" :y1="RAIL_Y - 6" :y2="RAIL_Y + 6" />
          <text class="mf__frame mono" :x="f.x" :y="RAIL_Y - 13" text-anchor="middle">{{ f.label }}</text>
        </g>

        <!-- the window the query reads from -->
        <rect
          class="mf__band"
          :class="{ 'is-on': queryOn }"
          :x="windowFromX"
          :y="LANE_Y0 - 9"
          :width="queryX - windowFromX"
          :height="LANE_Y0 + LANE_GAP * (lanes.length - 1) - LANE_Y0 + 18"
        />

        <g
          v-for="l in lanes"
          :key="l.lane.id"
          class="mf__lane"
          @mouseenter="hovered = l.i"
          @mouseleave="hovered = null"
        >
          <rect class="mf__hit" :x="0" :y="l.y - 15" :width="W" height="30" />
          <text class="mf__name" x="0" :y="l.y + 3.5">{{ t(l.lane.label) }}</text>
          <text class="mf__hz mono" :x="RAIL_NAME_X" :y="l.y + 3.5">{{ l.lane.rateLabel }}</text>
          <rect
            v-if="l.lane.mode === 'window'"
            class="mf__lane-band"
            :class="{ 'is-on': ((queryOn && rowOn(l.i)) || hovered === l.i) }"
            :x="windowFromX"
            :y="l.y - 8"
            :width="X1 - windowFromX"
            height="16"
            :fill="l.lane.color"
          />
          <line class="mf__axis" :x1="X0" :x2="X1" :y1="l.y" :y2="l.y" />
          <text class="mf__mode-tag mono" :x="X1 + 6" :y="l.y + 3" text-anchor="start">{{ l.lane.mode }}</text>

          <line
            v-for="(d, j) in l.dots"
            :key="j"
            class="mf__sample"
            :class="{ 'is-in': (queryOn || hovered === l.i) && d.inWindow && rowOn(l.i) }"
            :x1="d.x"
            :x2="d.x"
            :y1="l.y - l.lane.dotRadius * 2.4"
            :y2="l.y + l.lane.dotRadius * 2.4"
            :stroke="l.lane.color"
            :opacity="dotOn(d.ms) ? 0.85 : 0.14"
          />

          <!-- nearest: ring the one reading that is taken -->
          <circle
            v-if="((queryOn && rowOn(l.i)) || hovered === l.i) && (l.lane.mode === 'nearest' || l.lane.mode === 'video')"
            class="mf__pick"
            :cx="l.nearX"
            :cy="l.y"
            :r="4.6"
            :stroke="l.lane.color"
          />

          <!-- interpolate: the two readings either side, joined through n -->
          <g v-if="((queryOn && rowOn(l.i)) || hovered === l.i) && l.lane.mode === 'interpolate'" class="mf__interp" :stroke="l.lane.color">
            <line :x1="xOf(l.wrap.lo)" :x2="queryX" :y1="l.y" :y2="l.y" />
            <line :x1="queryX" :x2="xOf(l.wrap.hi)" :y1="l.y" :y2="l.y" />
            <circle :cx="xOf(l.wrap.lo)" :cy="l.y" r="3" fill="#fff" :stroke="l.lane.color" />
            <circle :cx="xOf(l.wrap.hi)" :cy="l.y" r="3" fill="#fff" :stroke="l.lane.color" />
            <circle :cx="queryX" :cy="l.y" r="3.2" :fill="l.lane.color" stroke="#fff" />
          </g>
        </g>

        <!-- the query instant, drawn through every lane -->
        <g class="mf__query" :class="{ 'is-on': queryOn }">
          <line :x1="queryX" :x2="queryX" :y1="RAIL_Y" :y2="LANE_Y0 + LANE_GAP * (lanes.length - 1) + 12" />
          <text :x="queryX - 5" :y="RAIL_Y - 13" text-anchor="end">{{ t(FORMAT.queryLabel) }}</text>
        </g>

        <!-- independent clocks: one bracket over the four lanes -->
        <path
          class="mf__brace"
          :d="`M ${X1 + 74} ${LANE_Y0 - 9} q 8 0 8 8 V ${LANE_Y0 + LANE_GAP * (lanes.length - 1) + 1} q 0 8 -8 8`"
        />
        <text
          class="mf__brace-label mono"
          :x="X1 + 92"
          :y="(LANE_Y0 + LANE_Y0 + LANE_GAP * (lanes.length - 1)) / 2"
          :transform="`rotate(90 ${X1 + 92} ${(LANE_Y0 + LANE_Y0 + LANE_GAP * (lanes.length - 1)) / 2})`"
          text-anchor="middle"
        >independent clocks</text>
      </svg>

      <p class="mf__hint mf__hint--hover" aria-live="polite">{{ hoverNote || t(FORMAT.readHint) }}</p>
      <p class="mf__hint">{{ side === 'write' ? t(FORMAT.writeHint) : t(FORMAT.readHint) }}</p>
      <p class="mf__hint mf__hint--cap">{{ t(FORMAT.episodeNote) }}</p>
    </div>

  </figure>
</template>

<style scoped>
.mono { font-family: var(--ff-mono); }

.mf {
  margin: 0;
  /* bar, the four stages, the timeline at full width, then the cards */
  display: block;
}
.mf__bar {
  grid-column: 1 / -1;
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 1rem;
  padding-bottom: 0.55rem;
  border-bottom: 1px solid #e4e7ea;
  margin-bottom: 1rem;
}
.mf__kicker {
  margin: 0;
  font-size: var(--fs-tick);
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: var(--ink-mute);
}
.mf__play {
  border: 0;
  border-bottom: 1px solid var(--line-strong);
  background: none;
  padding: 0 0 0.1rem;
  font-size: var(--fs-tick);
  color: var(--ink-soft);
  cursor: pointer;
}
.mf__play:hover { color: var(--ink); border-color: var(--ink); }

.mf__stage { min-width: 0; }
.mf__svg { width: 100%; height: auto; display: block; }
.mf__data { min-width: 0; margin-top: 1rem; }

/* ---- the four stages, as a strip above the timeline ---- */
.mf__steps {
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  gap: 0.35rem 1.6rem;
  list-style: none;
  margin: 0 0 0.9rem;
  padding: 0 0 0.7rem;
  border-bottom: 1px solid #eef1f3;
}
.mf__step {
  position: relative;
  display: inline-flex;
  align-items: baseline;
  gap: 0.42rem;
  padding: 0;
  color: var(--ink-mute);
  font-size: 0.82rem;
  line-height: 1.34;
  transition: color var(--dur) var(--ease);
}
.mf__step-i { font-size: 10px; letter-spacing: 0.06em; opacity: 0.7; }
.mf__step.is-done { color: var(--ink-soft); }
.mf__step.is-on { color: var(--ink); font-weight: 620; }
.mf__step.is-on .mf__step-i { color: var(--c-blue); opacity: 1; }



/* ---- data panel: shapes, rows, files ---- */
.feat { list-style: none; margin: 0; padding: 0; display: grid; grid-template-columns: repeat(auto-fit, minmax(14rem, 1fr)); gap: 0.45rem; }
.feat li {
  padding: 0.42rem 0.55rem;
  border: 1px solid #e4e7ea;
  border-radius: 9px;
  background: #fff;
  break-inside: avoid;
}
.feat__top { display: flex; align-items: baseline; justify-content: space-between; gap: 0.5rem; }
.feat__key { font-size: var(--fs-tick); color: var(--ink); }
.feat__meta { display: flex; flex-wrap: wrap; gap: 0.15rem 0.8rem; margin: 0.15rem 0 0; font-size: var(--fs-micro); color: var(--ink-soft); }
.feat__file { margin: 0.12rem 0 0; font-size: var(--fs-micro); color: var(--ink-mute); }
.feat li.is-on { background: var(--t-blue); border-color: var(--c-blue); }
.feat li.is-on .feat__meta { color: var(--ink); }



@media (max-width: 1180px) {
  .mf { grid-template-columns: minmax(0, 170px) minmax(0, 1fr); }
  .mf__data {
    grid-column: 1 / -1;
    border-left: 0;
    border-top: 1px solid var(--line);
    padding-left: 0;
    padding-top: 0.9rem;
  }
  .feat { columns: 2; column-gap: 1.6rem; }
}

@media (max-width: 860px) {
  .mf { grid-template-columns: minmax(0, 1fr); }
  .mf__data { grid-column: auto; }
  .feat { columns: 1; }
  .mf__side { position: static; }
  .mf__steps { flex-direction: row; flex-wrap: wrap; gap: 0.3rem; padding-left: 0; border-left: 0; }
  .mf__step { grid-template-columns: auto auto; gap: 0.35rem; padding: 0.28rem 0.6rem; border: 1px solid var(--line); border-radius: var(--r-pill); }
  .mf__step::before { display: none; }
}

/* ---- svg ---- */
.mf__svg { width: 100%; height: auto; display: block; }
.mf__rail-label { font-size: 8.8px; fill: #2b323a; font-weight: 400; font-family: var(--ff-sans); }
.mf__rail-sub { display: none; }
.mf__rail { stroke: var(--line-strong); stroke-width: 1.4; }
.mf__tick { stroke: var(--line); stroke-width: 1; stroke-dasharray: 2 3; transition: stroke var(--dur) var(--ease); }
.mf__tick.is-past { stroke: var(--c-slate); stroke-dasharray: none; opacity: 0.45; }
.mf__tick-dot { fill: var(--surface-2); stroke: var(--line-strong); stroke-width: 1; transition: fill var(--dur) var(--ease); }
.mf__tick-dot.is-past { fill: var(--c-slate); stroke: var(--c-slate); }
.mf__band { fill: var(--c-amber); opacity: 0; transition: opacity 320ms var(--ease); }
.mf__band.is-on { opacity: 0.1; }

.mf__name { font-size: 8.8px; fill: #2b323a; font-weight: 400; font-family: var(--ff-sans); letter-spacing: 0; }
.mf__hz { font-size: 7.6px; fill: #6d747c; }
.mf__mode-tag { font-size: 7px; letter-spacing: 0.04em; fill: #8b929a; letter-spacing: 0.02em; }
.mf__frame { font-size: 8.4px; fill: #16191d; }
.mf__sample { stroke-width: 1; }
.mf__sample.is-in { stroke-width: 1.2; }
.mf__brace { fill: none; stroke: #b8c0c8; stroke-width: 1; }
.mf__brace-label { font-size: 7.2px; fill: #8b929a; letter-spacing: 0.08em; }
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

.mf__reveal { opacity: 0; transition: opacity 360ms var(--ease); }
.mf__reveal.is-on { opacity: 1; }
.mf__lead { fill: none; stroke-width: 1.2; stroke-dasharray: 4 3; }
.mf__card rect { fill: var(--paper); stroke: var(--line-strong); }
.mf__card image { border-radius: 3px; }
.mf__card-k { font-size: var(--fs-mark); fill: var(--ink-soft); }
.mf__spark { fill: none; stroke: var(--c-violet); stroke-width: 1; opacity: 0.8; }
.mf__query { opacity: 0; transition: opacity 320ms var(--ease); }
.mf__query.is-on { opacity: 1; }
.mf__query line { stroke: var(--ink); stroke-width: 1.3; stroke-dasharray: 4 4; }
.mf__query text { font-family: var(--ff-mono); font-size: 7.6px; fill: var(--ink); }
.mf__band-label { font-size: 7.6px; fill: var(--ink-soft); }

.mf__hint { margin: 0.7rem 0 0; font-size: var(--fs-micro); color: var(--ink-mute); min-height: 1.4em; }
.mf__hint--cap { margin-top: 0.4rem; color: var(--ink-mute); }

/* ---- returned item ---- */
.mf__out {
  margin-top: 1.15rem;
  border: 0;
  border-top: 1px solid var(--line);
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
.mf__notes { margin: 0.5rem 0 0; }
.mf__note { display: block; margin-top: 0.32rem; color: var(--ink-mute); line-height: 1.5; }
.mf__hint--hover {
  min-height: 1.9em;
  margin-top: 0.7rem;
  color: var(--ink);
}
.mf__note--hover {
  min-height: 1.9em;
  margin-top: 0.65rem;
  color: var(--ink-soft);
}
.mf__lane { cursor: default; }
.mf__hit { fill: transparent; }
.mf__lane-band { opacity: 0; transition: opacity 260ms var(--ease); }
.mf__lane-band.is-on { opacity: 0.14; }
.mf__interp line { stroke-width: 1; stroke-dasharray: 2 2; opacity: 0.8; }
.mf__interp circle { stroke-width: 1; }

.mf__subhead {
  font-size: var(--fs-tick);
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--ink-mute);
  margin: 0 0 0.55rem;
}
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

@media (prefers-reduced-motion: reduce) {
  .mf__band, .mf__query, .mf__dot, .mf__tick, .mf__tick-dot,
  .mf__file rect:first-of-type, .mf__out, .mf__tbl tbody tr { transition: none; }
}
</style>
