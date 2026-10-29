<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { MOTIVATION, type MotivationCase } from '@/content'
import { useI18n } from '@/composables/useI18n'

const { t } = useI18n()

/**
 * Four-step playback: the clip runs to a decisive moment, freezes so the
 * signal can be read, then continues. The two timed phases are driven off a
 * rAF clock rather than the video's own clock, so a stalled decode cannot
 * leave the annotation half-shown.
 */
const PHASE_ORDER = ['observe', 'freeze', 'read', 'continue'] as const
type Phase = (typeof PHASE_ORDER)[number]

const PHASE_SECONDS: Record<'freeze' | 'read', number> = { freeze: 1.6, read: 3.6 }
/** Seek slightly past the freeze point so the clip cannot re-trigger it. */
const RESUME_LEAD = 0.05
/** Hold on the finished clip before cycling back to the first frame. */
const CYCLE_HOLD = 3

const cases = MOTIVATION.cases
const index = ref(0)
const phase = ref<Phase>('observe')
const paused = ref(false)
const inView = ref(true)
const reduced = ref(false)
/** Reduced motion holds the clip still; an explicit Play press overrides it. */
const manual = ref(false)
const elapsed = ref(0)
const clipDone = ref(false)
/** The clip's own clock, tracked so the illustrative trace can be drawn *with*
    playback rather than as a one-shot flourish on mount. */
const clipTime = ref(0)
const clipDuration = ref(0)

const video = ref<HTMLVideoElement | null>(null)
const root = ref<HTMLElement | null>(null)

const current = computed<MotivationCase>(() => cases[index.value])
const accentVar = computed(() => `var(--c-${current.value.accent})`)

/** URL for the active clip; lives in `public/` so it stays a plain string. */
const clipSrc = computed(() => `motivation/${current.value.id}-task.mp4`)
const clipPoster = computed(() => `motivation/${current.value.id}-task.jpg`)

const phaseList = MOTIVATION.steps
const phaseIndex = computed(() => PHASE_ORDER.indexOf(phase.value))

const caption = computed(() => {
  const c = current.value
  if (phase.value === 'observe') return clipDone.value ? c.after : c.observe
  if (phase.value === 'continue') return c.after
  return c.event
})

/** Points across the small illustrative trace, drawn as an SVG polyline. */
const trace = computed(() => {
  const c = current.value
  const n = 140
  const pts: string[] = []
  for (let i = 0; i < n; i++) {
    const u = i / (n - 1)
    const bump = Math.exp(-(((u - 0.58) / 0.075) ** 2))
    const y =
      c.id === 'gaze'
        ? 50 - 22 * Math.tanh((u - 0.42) * 9)
        : 50 + Math.sin(u * 26) * 3 + (c.id === 'emg' ? -34 : 30) * bump
    pts.push(`${(u * 100).toFixed(2)},${y.toFixed(2)}`)
  }
  return pts.join(' ')
})

/**
 * How much of the trace is drawn. It tracks the clip's own clock rather than
 * animating once, so the signal rises with the moment it depicts — the trace
 * is at the event when the video is at the event. Freezing the video freezes
 * the trace with it, which is what makes the two legible together.
 */
const traceProgress = computed(() => {
  if (!clipDuration.value) return isFrozen.value ? 0.72 : 0
  return Math.min(1, Math.max(0, clipTime.value / clipDuration.value))
})

const traceKey = computed(() => `${current.value.id}-${phase.value}`)

let raf = 0
let last = 0
let observer: IntersectionObserver | null = null

function seek(to: number) {
  const v = video.value
  clipTime.value = to
  if (!v) return
  if (v.readyState >= 1) v.currentTime = to
  else v.addEventListener('loadedmetadata', () => { v.currentTime = to }, { once: true })
}

function setPhase(next: Phase) {
  phase.value = next
  elapsed.value = 0
  last = 0
}

function reset() {
  clipDone.value = false
  manual.value = false
  if (reduced.value) {
    paused.value = true
    setPhase('read')
    seek(current.value.freezeAt)
    return
  }
  setPhase('observe')
  seek(0)
}

function togglePlay() {
  if (paused.value) {
    // Resuming from a timed phase means the annotation already had its turn.
    if (phase.value === 'freeze' || phase.value === 'read') setPhase('continue')
    paused.value = false
    manual.value = true
    void video.value?.play().catch(() => {})
  } else {
    paused.value = true
    manual.value = false
  }
}

function jumpToEvent() {
  paused.value = true
  manual.value = false
  clipDone.value = false
  seek(current.value.freezeAt)
  setPhase('freeze')
  video.value?.pause()
}

function continueAction() {
  paused.value = false
  manual.value = true
  clipDone.value = false
  seek(current.value.freezeAt + RESUME_LEAD)
  setPhase('continue')
}

function select(i: number) {
  if (i === index.value) return
  index.value = i
  paused.value = false
  manual.value = false
  reset()
}

/** Video element is recreated per clip, so listeners re-attach and we re-seek. */
function onClipReady() {
  const v = video.value
  if (!v) return
  v.muted = true
  clipDuration.value = Number.isFinite(v.duration) ? v.duration : 0
  reset()
}

function onTimeUpdate() {
  const v = video.value
  if (!v) return
  clipTime.value = v.currentTime
  if (phase.value === 'observe' && !clipDone.value && v.currentTime >= current.value.freezeAt) {
    v.pause()
    seek(current.value.freezeAt)
    setPhase('freeze')
  }
}

function tick(now: number) {
  const v = video.value
  // Reduced motion keeps the clip parked on the key moment, but pressing Play
  // is an explicit request, so it takes over from the preference.
  const motion = !reduced.value || manual.value
  const active = !paused.value && inView.value && !document.hidden && motion

  if (active) {
    const delta = last ? Math.min(0.1, (now - last) / 1000) : 0
    last = now
    if (phase.value === 'freeze' || phase.value === 'read' || phase.value === 'continue') {
      elapsed.value += delta
    }
    if (phase.value === 'freeze' && elapsed.value >= PHASE_SECONDS.freeze) {
      setPhase('read')
    } else if (phase.value === 'read' && elapsed.value >= PHASE_SECONDS.read) {
      continueAction()
    } else if (phase.value === 'continue' && v && (v.ended || v.currentTime >= v.duration - 0.05)) {
      // Restart the cycle a beat after the clip runs out, so the freeze is
      // reachable again on its own rather than only via the Replay button.
      clipDone.value = true
      if (elapsed.value >= CYCLE_HOLD) reset()
    }
  } else {
    last = 0
  }

  if (v && !clipDone.value) {
    if (active && phase.value !== 'freeze' && phase.value !== 'read') {
      if (v.paused) void v.play().catch(() => {})
    } else if (!v.paused) {
      v.pause()
    }
  }

  raf = requestAnimationFrame(tick)
}

onMounted(() => {
  reduced.value = window.matchMedia('(prefers-reduced-motion: reduce)').matches

  const el = root.value
  if (el && 'IntersectionObserver' in window) {
    observer = new IntersectionObserver(
      (entries) => { inView.value = entries.some((e) => e.isIntersecting) },
      { threshold: 0.2 },
    )
    observer.observe(el)
  }

  document.addEventListener('visibilitychange', onVisibility)
  raf = requestAnimationFrame(tick)
})

onBeforeUnmount(() => {
  cancelAnimationFrame(raf)
  observer?.disconnect()
  document.removeEventListener('visibilitychange', onVisibility)
})

function onVisibility() {
  last = 0
}

/** Reduced motion: hold the key moment so the annotation is still readable. */
watch(reduced, (on) => {
  manual.value = false
  if (on) {
    paused.value = true
    setPhase('read')
    seek(current.value.freezeAt)
  }
})

// The clip element carries `:key="current.id"`, so switching tabs remounts it
// and `onClipReady` re-applies the correct start state for the new source.
watch(index, () => {
  paused.value = false
  manual.value = false
})

const isFrozen = computed(() => phase.value === 'freeze' || phase.value === 'read')
const showAnnotation = computed(() => isFrozen.value || phase.value === 'continue')
</script>

<template>
  <figure
    ref="root"
    class="demo"
    :class="[`demo--${current.id}`, { 'demo--frozen': isFrozen }]"
    :style="{ '--accent': accentVar }"
  >
    <div class="demo__tabs" role="tablist" :aria-label="t(MOTIVATION.tabsLabel)">
      <button
        v-for="(c, i) in cases"
        :key="c.id"
        type="button"
        role="tab"
        class="demo__tab"
        :aria-selected="i === index"
        :style="{ '--accent': `var(--c-${c.accent})` }"
        @click="select(i)"
      >
        <span class="demo__tab-n mono">0{{ i + 1 }}</span>
        <span class="demo__tab-t">{{ t(c.tab) }}</span>
        <span class="demo__tab-s mono">{{ c.signal }}</span>
      </button>
    </div>

    <div class="demo__stage">
      <div class="demo__scene">
        <video
          ref="video"
          :key="current.id"
          :src="clipSrc"
          :poster="clipPoster"
          muted
          playsinline
          preload="metadata"
          @loadedmetadata="onClipReady"
          @timeupdate="onTimeUpdate"
        />

        <p class="demo__task">{{ t(current.task) }}</p>

        <Transition name="demo-fade">
          <span v-if="isFrozen" class="demo__badge mono">{{ t(MOTIVATION.keyMoment) }}</span>
        </Transition>

        <Transition name="demo-fade">
          <span
            v-if="showAnnotation"
            class="demo__anchor"
            :style="{ left: `${current.point.x}%`, top: `${current.point.y}%` }"
          >
            <i aria-hidden="true" />
            <b>{{ t(current.anchor) }}</b>
          </span>
        </Transition>
        <Transition name="demo-fade">
          <svg
            v-if="showAnnotation"
            class="demo__leader"
            viewBox="0 0 100 100"
            preserveAspectRatio="none"
            aria-hidden="true"
          >
            <path :d="`M${current.point.x} ${current.point.y} L92 30`" />
          </svg>
        </Transition>
      </div>

      <aside class="demo__readout">
        <p class="demo__signal mono">{{ current.signal }}</p>

        <svg class="demo__trace" viewBox="0 0 100 100" preserveAspectRatio="none" role="img"
             :aria-label="t(current.event)">
          <defs>
            <!-- Reveals the trace left to right in step with the clip. -->
            <clipPath id="demo-trace-clip">
              <rect x="0" y="0" :width="traceProgress * 100" height="100" />
            </clipPath>
          </defs>
          <!-- The window marks the span the annotation refers to. -->
          <rect x="50" width="18" height="100" class="demo__trace-window" />
          <!-- Full trace, faint: the part not yet reached still shows where the
               signal is going, so the drawn head reads as progress, not as a
               moving endpoint of an unknown curve. -->
          <polyline :key="`ghost-${traceKey}`" :points="trace" class="demo__trace-ghost" />
          <polyline
            :key="traceKey"
            :points="trace"
            class="demo__trace-path"
            clip-path="url(#demo-trace-clip)"
          />
          <line
            class="demo__trace-head"
            :x1="traceProgress * 100"
            :x2="traceProgress * 100"
            y1="0"
            y2="100"
          />
        </svg>

        <p class="demo__event">{{ t(current.event) }}</p>

        <p class="demo__adds mono">{{ t(MOTIVATION.adds) }}</p>
        <p class="demo__role">{{ t(current.role) }}</p>
      </aside>
    </div>

    <div class="demo__bar">
      <ol class="demo__steps">
        <li
          v-for="(s, i) in phaseList"
          :key="i"
          class="demo__step mono"
          :class="{ 'demo__step--on': i === phaseIndex }"
        >
          <span class="demo__step-n">0{{ i + 1 }}</span>{{ t(s) }}
        </li>
      </ol>

      <div class="demo__controls">
        <button type="button" class="btn demo__btn" @click="togglePlay">
          {{ paused || isFrozen ? t(MOTIVATION.play) : t(MOTIVATION.pause) }}
        </button>
        <button type="button" class="btn demo__btn" @click="jumpToEvent">{{ t(MOTIVATION.jump) }}</button>
        <button type="button" class="btn demo__btn" @click="continueAction">{{ t(MOTIVATION.cont) }}</button>
        <button type="button" class="btn demo__btn" @click="reset">{{ t(MOTIVATION.replay) }}</button>
      </div>
    </div>

    <figcaption class="demo__caption">{{ t(caption) }}</figcaption>
  </figure>
</template>

<style scoped>
.mono { font-family: var(--ff-mono); }

.demo {
  margin: 0;
  border: 1px solid var(--line);
  border-radius: var(--r-md);
  background: var(--paper);
  overflow: hidden;
}

/* ---- Tabs ---- */
.demo__tabs {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  border-bottom: 1px solid var(--line);
  background: var(--surface);
}
@media (max-width: 620px) { .demo__tabs { grid-template-columns: minmax(0, 1fr); } }

.demo__tab {
  display: flex;
  align-items: baseline;
  gap: 0.5rem;
  padding: 0.7rem 0.9rem;
  border: 0;
  border-right: 1px solid var(--line);
  background: none;
  font: inherit;
  text-align: left;
  cursor: pointer;
  color: var(--ink-soft);
  border-bottom: 2px solid transparent;
  transition: color var(--dur) var(--ease), background var(--dur) var(--ease);
}
.demo__tab:last-child { border-right: 0; }
.demo__tab:hover { color: var(--ink); background: var(--paper); }
.demo__tab[aria-selected='true'] {
  color: var(--ink);
  background: var(--paper);
  border-bottom-color: var(--accent);
}
.demo__tab-n { font-size: var(--fs-tick); color: var(--ink-mute); }
.demo__tab[aria-selected='true'] .demo__tab-n { color: var(--accent); }
.demo__tab-t { font-size: var(--fs-small); font-weight: 560; }
.demo__tab-s {
  margin-left: auto;
  font-size: var(--fs-tick);
  letter-spacing: 0.08em;
  color: var(--ink-mute);
}
.demo__tab[aria-selected='true'] .demo__tab-s { color: var(--accent); }

/* ---- Stage ---- */
.demo__stage {
  display: grid;
  grid-template-columns: minmax(0, 1.55fr) minmax(0, 1fr);
}
@media (max-width: 820px) { .demo__stage { grid-template-columns: minmax(0, 1fr); } }

.demo__scene { position: relative; background: #0c1a24; }
.demo__scene video { display: block; width: 100%; height: 100%; object-fit: cover; aspect-ratio: 16 / 9; }

.demo__task {
  position: absolute;
  left: 0.75rem;
  top: 0.7rem;
  margin: 0;
  font-size: var(--fs-micro);
  color: #dfeaf1;
  background: rgba(6, 18, 26, 0.72);
  padding: 0.28rem 0.55rem;
  border-radius: var(--r-xs);
  max-width: calc(100% - 1.5rem);
}

.demo__badge {
  position: absolute;
  right: 0.75rem;
  top: 0.7rem;
  font-size: var(--fs-tick);
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--accent);
  border: 1px solid var(--accent);
  background: rgba(6, 18, 26, 0.72);
  padding: 0.24rem 0.5rem;
  border-radius: var(--r-xs);
}

/* The annotation appears and leaves with the phase rather than snapping in.
   The whole overlay group shares one fade so it reads as a single layer being
   switched on, not as three elements arriving separately. */
.demo-fade-enter-active,
.demo-fade-leave-active {
  transition:
    opacity var(--dur-3) var(--ease-out),
    transform var(--dur-3) var(--ease-out);
}
.demo-fade-enter-from,
.demo-fade-leave-to { opacity: 0; }
.demo-fade-enter-from.demo__anchor,
.demo-fade-leave-to.demo__anchor { transform: translate(-50%, -50%) scale(0.86); }
.demo__anchor.demo-fade-enter-active,
.demo__anchor.demo-fade-leave-active { transform: translate(-50%, -50%); }
.demo__leader.demo-fade-enter-from path { stroke-dashoffset: 60; }
.demo__leader.demo-fade-leave-to path { opacity: 0; }

.demo__anchor {
  position: absolute;
  transform: translate(-50%, -50%);
  color: var(--accent);
  pointer-events: none;
}
.demo__anchor i {
  display: block;
  width: 1.5rem;
  height: 1.5rem;
  margin: 0 auto;
  border: 2px solid currentColor;
  border-radius: 50%;
  box-shadow: 0 0 0 6px color-mix(in srgb, var(--accent) 14%, transparent);
}
.demo__anchor b {
  position: absolute;
  left: 50%;
  top: 2.1rem;
  transform: translateX(-50%);
  white-space: nowrap;
  font-size: var(--fs-tick);
  font-weight: 550;
  background: rgba(6, 18, 26, 0.82);
  border-left: 2px solid currentColor;
  padding: 0.2rem 0.45rem;
}
.demo__leader {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  pointer-events: none;
}
.demo__leader path {
  fill: none;
  stroke: var(--accent);
  stroke-width: 0.35;
  stroke-dasharray: 60;
  stroke-dashoffset: 0;
  transition: stroke-dashoffset var(--dur-3) var(--ease-out), opacity var(--dur-2) var(--ease);
}

/* ---- Readout ---- */
.demo__readout {
  padding: 1rem 1.1rem 1.1rem;
  border-left: 1px solid var(--line);
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  min-width: 0;
}
@media (max-width: 820px) { .demo__readout { border-left: 0; border-top: 1px solid var(--line); } }

.demo__signal {
  margin: 0;
  font-size: var(--fs-h4);
  font-weight: 620;
  letter-spacing: 0.04em;
  color: var(--accent);
}
.demo__trace { width: 100%; height: 5.5rem; display: block; overflow: visible; }
.demo__trace-window { fill: var(--accent); opacity: 0.1; }
/* Two copies of the same curve: the ghost states where the signal is going, the
   clipped one is how much of it has happened. The head rides the clip edge. */
.demo__trace-ghost {
  fill: none;
  stroke: var(--accent);
  stroke-width: 1.6;
  vector-effect: non-scaling-stroke;
  opacity: 0.22;
}
.demo__trace-path {
  fill: none;
  stroke: var(--accent);
  stroke-width: 1.8;
  stroke-linejoin: round;
  stroke-linecap: round;
  vector-effect: non-scaling-stroke;
}
.demo__trace-head {
  stroke: var(--accent);
  stroke-width: 1;
  vector-effect: non-scaling-stroke;
  opacity: 0.55;
  transition: opacity var(--dur-2) var(--ease);
}
.demo--frozen .demo__trace-head { opacity: 1; stroke-dasharray: 3 2; }

.demo__event { margin: 0; font-size: var(--fs-small); line-height: 1.6; color: var(--ink-body); }
.demo__adds {
  margin: 0.35rem 0 0;
  font-size: var(--fs-tick);
  letter-spacing: 0.09em;
  text-transform: uppercase;
  color: var(--ink-mute);
  padding-top: 0.55rem;
  border-top: 1px solid var(--line);
}
.demo__role { margin: 0; font-size: var(--fs-small); line-height: 1.6; color: var(--ink-soft); }

/* ---- Control bar ---- */
.demo__bar {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
  padding: 0.65rem 0.9rem;
  border-top: 1px solid var(--line);
  background: var(--surface);
}
.demo__steps { display: flex; flex-wrap: wrap; gap: 0.9rem; list-style: none; margin: 0; padding: 0; }
.demo__step {
  display: flex;
  align-items: center;
  gap: 0.35rem;
  font-size: var(--fs-tick);
  letter-spacing: 0.05em;
  color: var(--ink-mute);
  transition: color var(--dur) var(--ease);
}
.demo__step-n { color: var(--line-strong); }
.demo__step--on { color: var(--accent); }
.demo__step--on .demo__step-n { color: var(--accent); }

.demo__controls { display: flex; flex-wrap: wrap; gap: 0.4rem; }
.demo__btn { font-size: var(--fs-micro); padding: 0.38rem 0.7rem; }

.demo__caption {
  margin: 0;
  padding: 0.7rem 0.9rem 0.85rem;
  border-top: 1px solid var(--line);
  font-size: var(--fs-micro);
  line-height: 1.6;
  color: var(--ink-soft);
  min-height: 3.1em;
}

@media (prefers-reduced-motion: reduce) {
  .demo__leader path { stroke-dashoffset: 0; }
  .demo-fade-enter-active,
  .demo-fade-leave-active { transition: none; }
}
</style>
