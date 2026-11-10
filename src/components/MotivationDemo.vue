<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { MOTIVATION, OVERVIEW, type MotivationCase } from '@/content'
import { useI18n } from '@/composables/useI18n'

const { t } = useI18n()

/**
 * Four-step autoplay: the take runs to a decisive moment, freezes so the
 * signal can be read, then continues. There is no real footage here — the
 * takes are AI-rendered egocentric keyframes, four per case, cross-faded on a
 * synthetic clock. The clock is driven off a rAF loop, so the freeze phase and
 * the illustrative trace share one time base; hovering the figure pauses
 * everything wherever it stands.
 */
type Phase = 'observe' | 'freeze' | 'read' | 'continue'

const PHASE_SECONDS: Record<'freeze' | 'read', number> = { freeze: 1.6, read: 3.6 }
/** Hold on the finished take before cycling back to the first frame. */
const CYCLE_HOLD = 3

/**
 * The synthetic timeline. Four keyframes, one per span; the third frame is
 * the case's key moment and lands exactly on `freezeAt`, so the annotation
 * freezes on the frame it describes.
 */
const KEYFRAME_TIMES = [0, 1.25, 2.5, 3.75]
const CLIP_SECONDS = 6

const cases = MOTIVATION.cases
const index = ref(0)
const phase = ref<Phase>('observe')
const paused = ref(false)
/** Hovering the figure holds the cycle, frames and timers alike. */
const hover = ref(false)
const inView = ref(true)
const reduced = ref(false)
const elapsed = ref(0)
/** The synthetic clock; plays the same role the video's clock used to. */
const clipTime = ref(0)
const clipDone = ref(false)

const root = ref<HTMLElement | null>(null)

const current = computed<MotivationCase>(() => cases[index.value])
const accentVar = computed(() => `var(--c-${current.value.accent})`)
/**
 * The bright counterpart of the accent, for the overlays that sit on the clip.
 * The paper accents are dark hues tuned to pass contrast on white, so used
 * unchanged on the dark footage the anchor label and badge would disappear.
 */
const accentNightVar = computed(() => `var(--k-${current.value.accent})`)

/** Keyframe plates for the active case; keyed by take so switching remounts. */
const frameSrc = (i: number) => `motivation-ai/${current.value.id}-${i + 1}.jpg`

/**
 * The statement behind the current clip. The three cases and the three points
 * are written in one order (gaze, EMG, EEG), so the readout names the clip's
 * claim from the same list the section argues — one source, not two copies.
 */
const point = computed(() => OVERVIEW.points[index.value])

const caption = computed(() => {
  const c = current.value
  if (phase.value === 'observe') return clipDone.value ? c.after : c.observe
  if (phase.value === 'continue') return c.after
  return c.event
})

/**
 * The frame the clock is on. While frozen it is pinned to the key frame (the
 * third), whatever rounding the timeline would otherwise do; the cross-fade
 * itself is a CSS transition, so a frame change is a fade, never a snap.
 */
const frameIndex = computed(() => {
  if (phase.value === 'freeze' || phase.value === 'read') return 2
  const tt = clipTime.value
  let k = 0
  for (let i = 0; i < KEYFRAME_TIMES.length; i++) if (tt >= KEYFRAME_TIMES[i]) k = i
  return k
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
 * How much of the trace is drawn. It tracks the synthetic clock, so the signal
 * rises with the moment it depicts and freezing the clock freezes the trace.
 */
const traceProgress = computed(() => Math.min(1, Math.max(0, clipTime.value / CLIP_SECONDS)))

let raf = 0
let last = 0
let observer: IntersectionObserver | null = null

function setPhase(next: Phase) {
  phase.value = next
  elapsed.value = 0
  last = 0
}

function reset() {
  clipDone.value = false
  if (reduced.value) {
    paused.value = true
    clipTime.value = current.value.freezeAt
    setPhase('read')
    return
  }
  clipTime.value = 0
  setPhase('observe')
}

function continueAction() {
  paused.value = false
  clipDone.value = false
  clipTime.value = current.value.freezeAt + 0.05
  setPhase('continue')
}

function select(i: number) {
  if (i === index.value) return
  index.value = i
  paused.value = false
  reset()
}

function tick(now: number) {
  // Reduced motion keeps the take parked on the key moment; hovering holds
  // whatever phase is current, so the annotation stays readable as long as
  // the reader wants it.
  const motion = !reduced.value
  const active = !paused.value && !hover.value && inView.value && !document.hidden && motion

  if (active) {
    const delta = last ? Math.min(0.1, (now - last) / 1000) : 0
    last = now
    if (phase.value === 'observe') {
      clipTime.value = Math.min(CLIP_SECONDS, clipTime.value + delta)
      // The key moment is reached on the clock, not by a video element.
      if (clipTime.value >= current.value.freezeAt) {
        clipTime.value = current.value.freezeAt
        setPhase('freeze')
      }
    } else {
      elapsed.value += delta
      if (phase.value === 'freeze' && elapsed.value >= PHASE_SECONDS.freeze) {
        setPhase('read')
      } else if (phase.value === 'read' && elapsed.value >= PHASE_SECONDS.read) {
        continueAction()
      } else if (phase.value === 'continue') {
        clipTime.value = Math.min(CLIP_SECONDS, clipTime.value + delta)
        if (clipTime.value >= CLIP_SECONDS - 0.05) {
          // Restart the cycle a beat after the take runs out, so the freeze is
          // reachable again on its own.
          clipDone.value = true
          if (elapsed.value >= CYCLE_HOLD) reset()
        }
      }
    }
  } else {
    last = 0
  }

  raf = requestAnimationFrame(tick)
}

onMounted(() => {
  reduced.value = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  reset()

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
  if (on) {
    paused.value = true
    clipTime.value = current.value.freezeAt
    setPhase('read')
  }
})

// Switching tabs restarts the clock at the new case's first frame.
watch(index, () => {
  paused.value = false
})

const isFrozen = computed(() => phase.value === 'freeze' || phase.value === 'read')
const showAnnotation = computed(() => isFrozen.value || phase.value === 'continue')
</script>

<template>
  <figure
    ref="root"
    class="demo"
    :class="[`demo--${current.id}`, { 'demo--frozen': isFrozen }]"
    :style="{ '--accent': accentVar, '--accent-night': accentNightVar }"
    @pointerenter="hover = true"
    @pointerleave="hover = false"
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
        <!-- The take: four AI-rendered keyframes on one synthetic clock. The
             stack never changes height, and exactly one frame is fully lit. -->
        <div class="demo__frames">
          <img
            v-for="i in 4"
            :key="`${current.id}-${i}`"
            class="demo__frame"
            :class="{ 'demo__frame--on': frameIndex === i - 1 }"
            :src="frameSrc(i - 1)"
            :alt="i === 3 ? t(current.event) : ''"
            :aria-hidden="i !== 3 || undefined"
            draggable="false"
          />
        </div>

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
            <!-- Reveals the trace left to right in step with the clock. -->
            <clipPath id="demo-trace-clip">
              <rect x="0" y="0" :width="traceProgress * 100" height="100" />
            </clipPath>
          </defs>
          <!-- The window marks the span the annotation refers to. -->
          <rect x="50" width="18" height="100" class="demo__trace-window" />
          <!-- Full trace, faint: the part not yet reached still shows where the
               signal is going, so the drawn head reads as progress, not as a
               moving endpoint of an unknown curve. -->
          <polyline :key="`ghost-${current.id}`" :points="trace" class="demo__trace-ghost" />
          <polyline
            :key="current.id"
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
        <h3 class="demo__claim">{{ t(point.t) }}</h3>
        <p class="demo__role">{{ t(point.d) }}</p>
      </aside>
    </div>

    <figcaption class="demo__caption">
      {{ t(caption) }}
      <span class="demo__hint mono">{{ t(MOTIVATION.hint) }}</span>
    </figcaption>
  </figure>
</template>

<style scoped>
.mono { font-family: var(--ff-mono); }

.demo {
  margin: 0;
  border: 0;
  border-top: 1px solid var(--line);
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

/* The take as a frame stack: one fixed 16:9 box, frames cross-faded by the
   synthetic clock. `object-fit: cover` holds composition across the fade. */
.demo__frames {
  position: relative;
  aspect-ratio: 16 / 9;
  overflow: hidden;
}
.demo__frame {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
  opacity: 0;
  transition: opacity 0.55s var(--ease-out);
  user-select: none;
}
.demo__frame--on { opacity: 1; }

/* Every overlay on the clip carries its own opaque ground: the footage behind
   is arbitrary, so a label is only legible if it never depends on what happens
   to be under it. */
.demo__task {
  position: absolute;
  left: 0.75rem;
  top: 0.7rem;
  margin: 0;
  font-size: var(--fs-small);
  font-weight: 520;
  color: #f2f8fb;
  background: rgba(4, 13, 20, 0.88);
  padding: 0.32rem 0.6rem;
  border-radius: var(--r-xs);
  border-left: 2px solid rgba(255, 255, 255, 0.55);
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.6);
  max-width: calc(100% - 1.5rem);
}

.demo__badge {
  position: absolute;
  right: 0.75rem;
  top: 0.7rem;
  font-size: var(--fs-tick);
  font-weight: 600;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--accent-night);
  border: 1px solid var(--accent-night);
  background: rgba(4, 13, 20, 0.88);
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
  color: var(--accent-night);
  pointer-events: none;
}
.demo__anchor i {
  display: block;
  width: 1.5rem;
  height: 1.5rem;
  margin: 0 auto;
  border: 2px solid currentColor;
  border-radius: 50%;
  box-shadow: 0 0 0 6px color-mix(in srgb, var(--accent-night) 22%, transparent);
}
.demo__anchor b {
  position: absolute;
  left: 50%;
  top: 2.1rem;
  transform: translateX(-50%);
  white-space: nowrap;
  font-size: var(--fs-tick);
  font-weight: 600;
  color: #f2f8fb;
  background: rgba(4, 13, 20, 0.9);
  border-left: 3px solid var(--accent-night);
  padding: 0.24rem 0.5rem;
  border-radius: var(--r-xs);
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.6);
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
  stroke: var(--accent-night);
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
   clipped one is how much of it has happened. The head rides the clock edge. */
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
/* The clip's claim, named in the card rather than as a separate panel below. */
.demo__claim {
  margin: 0.15rem 0 0.25rem;
  font-size: var(--fs-h4);
  color: var(--accent);
}
.demo__role { margin: 0; font-size: var(--fs-small); line-height: 1.6; color: var(--ink-soft); }

/* ---- Caption ---- */
.demo__caption {
  margin: 0;
  padding: 0.7rem 0.9rem 0.85rem;
  border-top: 1px solid var(--line);
  font-size: var(--fs-micro);
  line-height: 1.6;
  color: var(--ink-soft);
  min-height: 3.1em;
}
/* The only affordance left, stated once in the caption corner rather than as
   a control bar the figure no longer has. */
.demo__hint {
  float: right;
  margin-left: 1rem;
  color: var(--ink-mute);
  letter-spacing: 0.05em;
}

@media (prefers-reduced-motion: reduce) {
  .demo__leader path { stroke-dashoffset: 0; }
  .demo-fade-enter-active,
  .demo-fade-leave-active { transition: none; }
  .demo__frame { transition: none; }
}
</style>
