<script setup lang="ts">
/**
 * RQ 02 — the critical-moment demo.
 *
 * Two branches, one canvas, one camera, one clock. The left branch sees vision
 * only; the right also receives the instrument named on the tab. Both run the
 * same approach path, so everything visible after the event is the consequence
 * of that one extra input.
 *
 * The scene, the predicted paths and the signal strip are authored, not
 * measured, and the figure says so where the reader will see it. A shared
 * timeline drives all three, which is the point: the signal strip starts
 * leaving baseline *before* the two hand paths separate, and that gap is what
 * the demo is for.
 */
import { computed, onBeforeUnmount, onMounted, ref, shallowRef, watch } from 'vue'
import { RESEARCH, type Bi } from '@/content'
import { useI18n } from '@/composables/useI18n'
import { createEventWorld, type EventWorldApi, type WorldLayers } from '@/data/eventWorld'
import { DURATION, EVENT, EVENT_CASES, type EventCaseDef } from '@/data/eventDemo'

const { t } = useI18n()

const index = ref(0)
const def = computed<EventCaseDef>(() => EVENT_CASES[index.value])
const accentVar = computed(() => `var(--c-${def.value.accent})`)

const time = ref(EVENT)
const playing = ref(false)
const layers = ref<WorldLayers>({ trail: true, predict: true, target: true })
const webglOk = ref(true)

const canvas = ref<HTMLCanvasElement | null>(null)
const world = shallowRef<EventWorldApi | null>(null)

const eventAt = EVENT
const playheadPct = computed(() => (time.value / DURATION) * 100)
const eventPct = (eventAt / DURATION) * 100
const leadPct = computed(() => (def.value.leadAt / DURATION) * 100)
const afterEvent = computed(() => time.value >= eventAt)

/** The strip is drawn from the case's own sketch, so it cannot drift from it. */
const sketchPath = computed(() => {
  const s = def.value.sketch
  const n = s.length
  return s
    .map((v, i) => {
      const x = (i / (n - 1)) * 100
      const y = 100 - Math.max(0, Math.min(100, v))
      return `${i === 0 ? 'M' : 'L'}${x.toFixed(2)},${y.toFixed(2)}`
    })
    .join(' ')
})

const caseOutcome = computed(() => ({
  vision: t(def.value.branches.vision.outcome),
  extra: t(def.value.branches.extra.outcome),
}))

const leadSeconds = computed(() => (eventAt - def.value.leadAt).toFixed(2))

/* ---------------- playback ---------------- */

let raf = 0
let last = 0

function tick(now: number) {
  if (!playing.value) return
  if (!last) last = now
  const dt = (now - last) / 1000
  last = now
  let next = time.value + dt
  if (next >= DURATION) {
    next = DURATION
    playing.value = false
  }
  time.value = next
  if (playing.value) raf = requestAnimationFrame(tick)
}

function setPlaying(v: boolean) {
  playing.value = v
  last = 0
  cancelAnimationFrame(raf)
  if (v) {
    if (time.value >= DURATION) time.value = 0
    raf = requestAnimationFrame(tick)
  }
}

function seek(v: number) {
  playing.value = false
  cancelAnimationFrame(raf)
  time.value = Math.max(0, Math.min(DURATION, v))
}

function jumpToEvent() {
  playing.value = false
  cancelAnimationFrame(raf)
  time.value = eventAt
}

function replay() {
  time.value = 0
  setPlaying(true)
}

function resetView() {
  world.value?.resetView()
}

function select(i: number) {
  if (i === index.value) return
  index.value = i
  playing.value = false
  cancelAnimationFrame(raf)
  time.value = eventAt
}

/* ---------------- scene lifecycle ---------------- */

function ensureWorld() {
  const el = canvas.value
  if (!el) return
  world.value?.dispose()
  try {
    const probe = document.createElement('canvas')
    webglOk.value = !!(probe.getContext('webgl2') || probe.getContext('webgl'))
    if (!webglOk.value) return
    world.value = createEventWorld(el, def.value, { onReady: () => world.value?.resize() })
  } catch {
    webglOk.value = false
  }
}

onMounted(() => {
  ensureWorld()
  // A WebGL context cannot be shared across two scenes, so the world is rebuilt
  // when the case switches; nothing else in the panel is torn down.
  watch(index, () => { ensureWorld() }, { flush: 'post' })
  watch([time, layers], () => {
    world.value?.update(time.value, layers.value)
  }, { deep: true, immediate: true })
})

onBeforeUnmount(() => {
  cancelAnimationFrame(raf)
  world.value?.dispose()
  world.value = null
})

const layerKeys = ['trail', 'predict', 'target'] as const
const layerLabels: Record<(typeof layerKeys)[number], Bi> = {
  trail: RESEARCH.layerTrail,
  predict: RESEARCH.layerPredict,
  target: RESEARCH.layerTarget,
}
</script>

<template>
  <figure class="ev" :style="{ '--accent': accentVar }">
    <div class="ev__tabs" role="tablist" :aria-label="t(RESEARCH.casesLabel)">
      <button
        v-for="(c, i) in EVENT_CASES"
        :key="c.id"
        type="button"
        role="tab"
        class="ev__tab"
        :style="{ '--tab-accent': `var(--c-${c.accent})` }"
        :aria-selected="i === index"
        @click="select(i)"
      >
        <span class="ev__tab-t">{{ t(c.tab) }}</span>
        <span class="ev__tab-q">{{ t(c.task) }}</span>
      </button>
    </div>

    <div class="ev__stage">
      <div class="ev__scene">
        <canvas ref="canvas" class="ev__canvas" aria-label="Paired predicted outcomes" />
        <p v-if="!webglOk" class="ev__fallback">{{ t(RESEARCH.webglOff) }}</p>

        <div class="ev__branch ev__branch--a mono">
          <span>{{ t(RESEARCH.visionOnly) }}</span>
          <b>{{ t(def.target.label) }}</b>
        </div>
        <div class="ev__branch ev__branch--b mono">
          <span>{{ t(RESEARCH.withSignal) }}</span>
          <b>{{ def.signal }}</b>
        </div>
        <span v-if="afterEvent" class="ev__badge mono">{{ t(RESEARCH.afterEvent) }}</span>

        <div class="ev__tools">
          <label v-for="k in layerKeys" :key="k" class="ev__toggle">
            <input v-model="layers[k]" type="checkbox" />
            <span>{{ t(layerLabels[k]) }}</span>
          </label>
          <button type="button" class="ev__reset" @click="resetView">
            {{ t(RESEARCH.resetView) }}
          </button>
        </div>
        <p class="ev__hint">{{ t(RESEARCH.worldHint) }}</p>
      </div>

      <aside class="ev__readout">
        <header class="ev__head">
          <b class="mono">{{ def.signal }}</b>
          <span class="mono">{{ t(RESEARCH.authored) }}</span>
        </header>

        <svg
          class="ev__strip"
          viewBox="0 0 100 100"
          preserveAspectRatio="none"
          role="img"
          :aria-label="t(def.tab)"
        >
          <line v-for="x in [25, 50, 75]" :key="x" class="ev__grid" :x1="x" x2="x" y1="0" y2="100" />
          <rect class="ev__lead" :x="leadPct" y="0" :width="eventPct - leadPct" height="100" />
          <rect class="ev__post" :x="eventPct" y="0" :width="100 - eventPct" height="100" />
          <path class="ev__trace" :d="sketchPath" />
          <line class="ev__leadline" :x1="leadPct" x2="leadPct" y1="0" y2="100" />
          <line class="ev__eventline" :x1="eventPct" x2="eventPct" y1="0" y2="100" />
          <line class="ev__cursor" :x1="playheadPct" x2="playheadPct" y1="0" y2="100" />
        </svg>

        <p class="ev__lead-note">
          <b class="mono">{{ leadSeconds }} s</b>
          {{ t(RESEARCH.leadLabel) }}
        </p>
        <p class="ev__note">{{ t(def.lead) }}</p>

        <p class="ev__outcome">
          <span class="ev__outcome-k mono">{{ t(RESEARCH.visionOnly) }}</span>
          {{ caseOutcome.vision }}
        </p>
        <p class="ev__outcome ev__outcome--b">
          <span class="ev__outcome-k mono">{{ t(RESEARCH.withSignal) }} · {{ def.signal }}</span>
          {{ caseOutcome.extra }}
        </p>

        <p class="ev__adds mono">{{ t(RESEARCH.roleLabel) }}</p>
        <p class="ev__role">{{ t(def.role) }}</p>
      </aside>
    </div>

    <div class="ev__bar">
      <button class="btn ev__play" type="button" @click="setPlaying(!playing)">
        <span aria-hidden="true">{{ playing ? '❚❚' : '▶' }}</span>
        <span>{{ playing ? t(RESEARCH.pause) : t(RESEARCH.play) }}</span>
      </button>
      <input
        class="ev__scrub"
        type="range"
        min="0"
        :max="DURATION"
        step="0.02"
        :value="time"
        :aria-label="t(RESEARCH.sharedClock)"
        @input="seek(Number(($event.target as HTMLInputElement).value))"
      />
      <span class="ev__clock mono">{{ time.toFixed(2) }} / {{ DURATION.toFixed(1) }} s</span>
      <button type="button" class="ev__jump" @click="jumpToEvent">
        {{ t(RESEARCH.jumpEvent) }}
      </button>
      <button type="button" class="ev__jump" @click="replay">{{ t(RESEARCH.replay) }}</button>
    </div>

    <figcaption class="ev__caption">{{ t(def.event) }}</figcaption>
    <p class="ev__disclosure">{{ t(RESEARCH.eventNote) }}</p>
  </figure>
</template>

<style scoped>
.mono { font-family: var(--ff-mono); }

.ev {
  margin: 0.5rem 0 0;
  border: 1px solid var(--line);
  border-radius: var(--r-md);
  background: var(--paper);
  overflow: hidden;
}

/* ---- case tabs ---- */
.ev__tabs { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); border-bottom: 1px solid var(--line); background: var(--surface); }
@media (max-width: 620px) { .ev__tabs { grid-template-columns: minmax(0, 1fr); } }
.ev__tab {
  display: flex; flex-direction: column; gap: 0.15rem;
  padding: 0.7rem 0.95rem; border: 0; border-right: 1px solid var(--line);
  background: none; font: inherit; text-align: left; cursor: pointer;
  border-bottom: 2px solid transparent;
  transition: color var(--dur) var(--ease), background var(--dur) var(--ease);
}
.ev__tab:last-child { border-right: 0; }
.ev__tab:hover { background: var(--paper); }
.ev__tab[aria-selected='true'] { background: var(--paper); border-bottom-color: var(--tab-accent); }
.ev__tab-t { font-size: var(--fs-small); font-weight: 600; color: var(--ink); }
.ev__tab-q { font-size: var(--fs-tick); color: var(--ink-mute); }
.ev__tab[aria-selected='true'] .ev__tab-q { color: var(--ink-soft); }

/* ---- stage ---- */
.ev__stage { display: grid; grid-template-columns: minmax(0, 1.6fr) minmax(0, 1fr); align-items: stretch; }
@media (max-width: 900px) { .ev__stage { grid-template-columns: minmax(0, 1fr); } }

/* The renderer writes the canvas's intrinsic height from its measured client height,
   so the canvas must stay out of flow: in flow it feeds its own height back into the
   row track and the panel grows without bound. */
.ev__scene { position: relative; height: 100%; background: radial-gradient(ellipse at 50% 20%, #17222c 0%, #0f171e 55%, #0a1016 100%); min-height: 20rem; }
.ev__canvas { position: absolute; inset: 0; display: block; width: 100%; height: 100%; touch-action: none; cursor: grab; }
.ev__canvas:active { cursor: grabbing; }
.ev__fallback { position: absolute; inset: auto 1rem 1rem; margin: 0; font-size: var(--fs-small); color: #cfe0ea; }

/* Branch titles straddle the seam between the two viewports. */
.ev__branch {
  position: absolute; top: 0.7rem; display: flex; flex-direction: column; gap: 0.1rem;
  padding: 0.3rem 0.55rem; border-radius: var(--r-xs);
  background: rgba(6, 18, 26, 0.74); font-size: var(--fs-tick); letter-spacing: 0.06em;
  text-transform: uppercase; color: #9fb6c6; pointer-events: none;
}
.ev__branch b { font-size: var(--fs-micro); font-weight: 600; color: #dce9f2; letter-spacing: 0; text-transform: none; }
.ev__branch--a { left: 0.7rem; }
.ev__branch--b { right: 0.7rem; text-align: right; }
.ev__branch--b b { color: var(--accent); }

.ev__badge {
  position: absolute; left: 50%; bottom: 3.1rem; transform: translateX(-50%);
  padding: 0.24rem 0.6rem; border-radius: var(--r-xs); border: 1px solid var(--accent);
  background: rgba(6, 18, 26, 0.76); color: var(--accent);
  font-size: var(--fs-tick); letter-spacing: 0.08em; text-transform: uppercase;
}

.ev__tools {
  position: absolute; top: 0.7rem; left: 50%; transform: translateX(-50%);
  display: flex; flex-wrap: wrap; align-items: center; gap: 0.5rem 0.8rem;
  padding: 0.35rem 0.6rem; border-radius: var(--r-sm);
  background: rgba(255, 255, 255, 0.93); border: 1px solid var(--line);
}
.ev__toggle { display: inline-flex; align-items: center; gap: 0.3rem; min-height: 22px; font-size: var(--fs-micro); color: var(--ink-soft); cursor: pointer; }
.ev__toggle input { accent-color: var(--accent); width: 0.8rem; height: 0.8rem; margin: 0; }
.ev__reset {
  border: 0; background: none; padding: 0; min-height: 22px; font: inherit;
  font-size: var(--fs-micro); color: var(--c-blue); cursor: pointer;
  text-decoration: underline; text-underline-offset: 0.15em;
}
.ev__hint { position: absolute; left: 0.75rem; bottom: 0.7rem; margin: 0; font-size: var(--fs-micro); color: #8fa6b4; }

/* ---- readout ---- */
.ev__readout {
  padding: 0.9rem 1rem 1rem; border-left: 1px solid var(--line);
  display: flex; flex-direction: column; gap: 0.45rem; min-width: 0;
}
@media (max-width: 900px) { .ev__readout { border-left: 0; border-top: 1px solid var(--line); } }

.ev__head { display: flex; align-items: baseline; justify-content: space-between; gap: 0.6rem; }
.ev__head b { font-size: var(--fs-h4); font-weight: 620; color: var(--accent); letter-spacing: 0.04em; }
.ev__head span { font-size: var(--fs-mark); letter-spacing: 0.07em; color: var(--ink-mute); text-transform: uppercase; }

.ev__strip { display: block; width: 100%; height: 7rem; overflow: visible; }
.ev__grid { stroke: var(--line); stroke-width: 0.3; }
.ev__lead { fill: var(--accent); opacity: 0.1; }
.ev__post { fill: var(--c-rose); opacity: 0.05; }
.ev__trace { fill: none; stroke: var(--accent); stroke-width: 1.5; vector-effect: non-scaling-stroke; stroke-linejoin: round; }
.ev__leadline { stroke: var(--accent); stroke-width: 0.6; stroke-dasharray: 2 2; vector-effect: non-scaling-stroke; }
.ev__eventline { stroke: var(--c-rose); stroke-width: 1.3; stroke-dasharray: 4 3; vector-effect: non-scaling-stroke; }
.ev__cursor { stroke: var(--ink); stroke-width: 0.6; opacity: 0.45; vector-effect: non-scaling-stroke; }

.ev__lead-note { display: flex; align-items: baseline; gap: 0.4rem; margin: 0; font-size: var(--fs-micro); color: var(--ink-soft); }
.ev__lead-note b { color: var(--accent); }
.ev__note { margin: 0; font-size: var(--fs-micro); line-height: 1.6; color: var(--ink-mute); }

.ev__outcome { margin: 0; font-size: var(--fs-small); line-height: 1.55; color: var(--ink-body); padding-top: 0.5rem; border-top: 1px solid var(--line); }
.ev__outcome--b { border-top: 0; padding-top: 0.15rem; }
.ev__outcome-k { display: block; font-size: var(--fs-mark); letter-spacing: 0.09em; text-transform: uppercase; color: var(--ink-mute); margin-bottom: 0.1rem; }
.ev__outcome--b .ev__outcome-k { color: var(--accent); }

.ev__adds { margin: 0.5rem 0 0; font-size: var(--fs-tick); letter-spacing: 0.09em; text-transform: uppercase; color: var(--ink-mute); }
.ev__role { margin: 0; font-size: var(--fs-small); line-height: 1.6; color: var(--ink-soft); }

/* ---- transport ---- */
.ev__bar {
  display: flex; flex-wrap: wrap; align-items: center; gap: 0.7rem;
  padding: 0.6rem 0.9rem; border-top: 1px solid var(--line); background: var(--surface);
}
.ev__play { min-width: 5.5rem; justify-content: center; font-size: var(--fs-micro); padding: 0.4rem 0.7rem; }
.ev__scrub {
  flex: 1 1 8rem; min-width: 0; appearance: none; height: 4px;
  border-radius: var(--r-pill); background: var(--line-strong); cursor: pointer;
  accent-color: var(--accent);
}
.ev__scrub::-webkit-slider-thumb {
  appearance: none; width: 13px; height: 13px; border-radius: 50%;
  background: var(--accent); border: 2px solid #fff; box-shadow: var(--e-1);
}
.ev__scrub::-moz-range-thumb { width: 13px; height: 13px; border-radius: 50%; background: var(--accent); border: 2px solid #fff; }
.ev__clock { font-size: var(--fs-micro); color: var(--ink); font-variant-numeric: tabular-nums; white-space: nowrap; }
.ev__jump {
  border: 1px solid var(--line-strong); border-radius: var(--r-sm); background: var(--paper);
  font: inherit; font-size: var(--fs-micro); color: var(--ink); padding: 0.36rem 0.65rem;
  cursor: pointer; transition: border-color var(--dur) var(--ease);
}
.ev__jump:hover { border-color: var(--ink-mute); }

.ev__caption { margin: 0; padding: 0.7rem 0.95rem 0; font-size: var(--fs-micro); line-height: 1.6; color: var(--ink-soft); }
.ev__disclosure { margin: 0; padding: 0.5rem 0.95rem 0.85rem; font-size: var(--fs-tick); line-height: 1.6; color: var(--ink-mute); }

@media (prefers-reduced-motion: reduce) {
  .ev__canvas { cursor: default; }
}
</style>
