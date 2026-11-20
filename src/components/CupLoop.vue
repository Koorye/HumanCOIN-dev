<script setup lang="ts">
/**
 * Figure 2 — one manipulation, as a loop, and what HumanCOIN records.
 *
 * The loop runs o (right) → intent (bottom) → a (left) → env (top) → o, all
 * orthogonal. Intent branches downward into the proxy model m = f(z, o) + ε,
 * then into gaze, EMG and EEG in one row; a horizontal under-brace and a teal
 * pill name the recorded part. One `progress` state (16 s) drives the dot
 * position, the current station, the intent sub-step and the plate image;
 * reduced motion parks progress at 0 (o), highlights o, hides the dot, and lays
 * the five plates out side by side.
 */
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import type { Bi } from '@/content'
import { useI18n } from '@/composables/useI18n'
import FigFrame from '@/components/FigFrame.vue'

const { t } = useI18n()

interface Step {
  img: string
  name: Bi
  line: Bi
}

/** The five stations, in loop order. */
const STEPS: Step[] = [
  {
    img: 'cup/observe.jpg',
    name: { en: 'OBSERVE', zh: '观察' },
    line: { en: 'The cup enters view.', zh: '杯子进入视野。' },
  },
  {
    img: 'cup/think.jpg',
    name: { en: 'INTEND', zh: '意图' },
    line: { en: 'The grasp is chosen.', zh: '先定下抓握方式。' },
  },
  {
    img: 'cup/gaze-square.jpg',
    name: { en: 'GAZE', zh: '注视' },
    line: { en: 'The rim is fixated.', zh: '视线先落到杯沿。' },
  },
  {
    img: 'cup/force.jpg',
    name: { en: 'ACT', zh: '动作' },
    line: { en: 'Grip force is set.', zh: '握力在接触前加载。' },
  },
  {
    img: 'cup/act.jpg',
    name: { en: 'RESPOND', zh: '回应' },
    line: { en: 'The world pushes back.', zh: '世界随即给出回应。' },
  },
]

/** Four orthogonal station segments: env→o, o→intent (+ dwell), intent→a, a→env. */
const SEGMENTS: number[][][] = [
  [[150, 35], [260, 35], [260, 100]],
  [[260, 100], [260, 170], [150, 170]],
  [[150, 170], [40, 170], [40, 100]],
  [[40, 100], [40, 35], [150, 35]],
]
const LENS = SEGMENTS.map((pts) =>
  pts.slice(1).reduce((acc, p, i) => acc + Math.hypot(p[0] - pts[i][0], p[1] - pts[i][1]), 0),
)
/** o 3 s, intent 4 s (three sub-steps), a 3 s, env 3 s = 13 s. */
const DURATIONS = [3000, 4000, 3000, 3000]
const ENDS = [0, 3000, 7000, 10000, 13000]
const TOTAL = 13000

/** The three sub-steps inside the intent station. */
const SUB_STEPS = [
  { name: { en: 'EEG', zh: '脑电' } as Bi, line: { en: 'cortical preparation', zh: '皮层准备' } as Bi },
  { name: { en: 'gaze', zh: '注视' } as Bi, line: { en: 'the rim first', zh: '先看杯沿' } as Bi },
  { name: { en: 'EMG', zh: '肌电' } as Bi, line: { en: 'grip loads', zh: '握力加载' } as Bi },
]

function pointOn(seg: number, u: number) {
  const pts = SEGMENTS[seg]
  let d = Math.max(0, Math.min(1, u)) * LENS[seg]
  for (let i = 1; i < pts.length; i++) {
    const [x1, y1] = pts[i - 1]
    const [x2, y2] = pts[i]
    const len = Math.hypot(x2 - x1, y2 - y1)
    if (d <= len) {
      const k = len ? d / len : 0
      return { x: +(x1 + (x2 - x1) * k).toFixed(2), y: +(y1 + (y2 - y1) * k).toFixed(2) }
    }
    d -= len
  }
  const [x, y] = pts[pts.length - 1]
  return { x, y }
}

const progress = ref(0)
const reduced = ref(false)
const active = computed(() => {
  const t = progress.value * TOTAL
  let i = 0
  while (i < 3 && t >= ENDS[i + 1]) i++
  return i
})
const local = computed(() => {
  const t = progress.value * TOTAL
  const i = active.value
  return Math.min(1, Math.max(0, (t - ENDS[i]) / DURATIONS[i]))
})
const sub = computed(() =>
  active.value === 1 ? Math.min(2, Math.floor((Math.max(0, local.value - 0.1) / 0.9) * 3)) : -1,
)
/** o → 0; intent sub-steps → 1/2/3; a → 4 (act); env → 4 (act). */
const frameIndex = computed(() => {
  if (active.value === 0) return 0
  if (active.value === 1) return sub.value + 1
  return 4
})
const dot = computed(() => {
  if (active.value === 1) {
    return local.value < 0.1 ? pointOn(1, local.value / 0.1) : { x: 150, y: 170 }
  }
  return pointOn(active.value, local.value)
})
/** Station → plate: o 0, intent handled by sub-steps, a uses ACT (3), env uses RESPOND (4). */
const STATION_STEP = [0, 1, 3, 4]
const step = computed(() => STEPS[STATION_STEP[active.value]])
const capName = computed(() => (active.value === 1 ? t(SUB_STEPS[sub.value].name) : t(step.value.name)))
const capLine = computed(() => (active.value === 1 ? t(SUB_STEPS[sub.value].line) : t(step.value.line)))

let raf = 0
let last = 0
let acc = 0
let mq: MediaQueryList | null = null
let onMq: ((e: MediaQueryListEvent) => void) | null = null

function tick(now: number) {
  if (!last) last = now
  const dt = now - last
  last = now
  if (!document.hidden) acc = (acc + dt) % TOTAL
  progress.value = acc / TOTAL
  raf = requestAnimationFrame(tick)
}

function run(matches: boolean) {
  reduced.value = matches
  cancelAnimationFrame(raf)
  raf = 0
  last = 0
  if (matches) {
    progress.value = 0
    return
  }
  acc = 0
  progress.value = 0
  raf = requestAnimationFrame(tick)
}

onMounted(() => {
  mq = window.matchMedia('(prefers-reduced-motion: reduce)')
  onMq = (e: MediaQueryListEvent) => run(e.matches)
  mq.addEventListener?.('change', onMq)
  run(mq.matches)
})

onBeforeUnmount(() => {
  cancelAnimationFrame(raf)
  if (mq && onMq) mq.removeEventListener?.('change', onMq)
})
</script>

<template>
  <FigFrame
    n="02"
    :title="{ en: 'One manipulation, as a loop.', zh: '一次操作，闭成一个环。' }"
    :aside="{ en: 'RECORDED', zh: '记录' }"
  >
    <div class="loop">
      <div class="loop__plate">
        <svg
          class="loop__svg"
          viewBox="0 0 500 340"
          role="img"
          :data-progress="progress.toFixed(4)"
          :data-station="active"
          :data-sub="active === 1 ? sub : -1"
          :aria-label="t({
            en: 'An orthogonal loop from o on the right to intent at the bottom, to a on the left, to env at the top, and back to o. Intent branches downward to the proxy model m = f(z,o) + epsilon and three proxies, gaze, EMG and EEG, in one row; a horizontal brace and a teal label name what HumanCOIN records.',
            zh: '从右侧的观测 o 到下方的意图、再到左侧的动作 a、上方的 env，并回到 o 的正交环路。意图向下接到代理模型 m = f(z,o) + ε 与同一行的眼动、肌电、脑电三路代理量；横向大括号与青色标签标出 HumanCOIN 记录的部分。',
          })"
        >
          <defs>
            <marker id="loop-arrow" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
              <path d="M0 0L8 4L0 8Z" fill="#9aa1a9" />
            </marker>
            <marker id="loop-arrow-teal" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
              <path d="M0 0L8 4L0 8Z" fill="#0f6f68" />
            </marker>
            <marker id="loop-arrow-amber" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
              <path d="M0 0L8 4L0 8Z" fill="#8a6136" />
            </marker>
            <marker id="loop-arrow-violet" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
              <path d="M0 0L8 4L0 8Z" fill="#6a4c9c" />
            </marker>
          </defs>

          <g transform="translate(60 -13) scale(1.2)">
          <!-- ---------- the orthogonal loop: o(right) → intent(bottom) → a(left) → env(top) → o ---------- -->
          <path class="loop__arc" d="M260 118V166Q260 170 256 170H190" marker-end="url(#loop-arrow)" />
          <path class="loop__arc" d="M110 170H44Q40 170 40 166V118" marker-end="url(#loop-arrow)" />
          <path class="loop__arc" d="M40 82V39Q40 35 44 35H110" marker-end="url(#loop-arrow)" />
          <path class="loop__arc" d="M190 35H256Q260 35 260 39V82" marker-end="url(#loop-arrow)" />

          <circle class="loop__dot" :cx="dot.x" :cy="dot.y" r="2.6" />

          <g class="loop__node loop__node--o" :class="{ 'is-lit': active === 0 }">
            <rect class="loop__card" x="230" y="82" width="60" height="36" rx="7" />
            <text class="loop__sym" x="260" y="106">o</text>
            <text class="loop__nodecap" x="300" y="110" text-anchor="start">OBSERVATION</text>
          </g>
          <g class="loop__node loop__node--z" :class="{ 'is-lit': active === 1 }">
            <rect class="loop__card loop__card--intent" x="110" y="152" width="80" height="36" rx="7" />
            <text class="loop__name" x="150" y="176" text-anchor="middle">{{ t({ en: 'intent (z)', zh: '意图 (z)' }) }}</text>
          </g>
          <g class="loop__node loop__node--a" :class="{ 'is-lit': active === 2 }">
            <rect class="loop__card" x="10" y="82" width="60" height="36" rx="7" />
            <text class="loop__sym" x="40" y="106">a</text>
            <text class="loop__nodecap" x="80" y="110" text-anchor="start">ACTION</text>
          </g>
          <g class="loop__node loop__node--world" :class="{ 'is-lit': active === 3 }">
            <rect class="loop__card" x="110" y="17" width="80" height="36" rx="7" />
            <text class="loop__name" x="150" y="41" text-anchor="middle">env</text>
            <text class="loop__nodecap" x="150" y="66" text-anchor="middle">THE WORLD</text>
          </g>

          <!-- ---------- intent ↓ m = f(z, o) + ε ↓ three proxies ---------- -->
          <path class="loop__line" d="M150 188V198" />
          <rect
            class="loop__station"
            :class="{ 'is-lit': active === 1 }"
            x="72"
            y="194"
            width="156"
            height="56"
            rx="8"
          />
          <text class="loop__m" x="150" y="208" text-anchor="middle">m = f(z, o) + ε</text>

          <path
            class="loop__line loop__proxyline loop__proxyline--gaze"
            :class="{ 'is-sub': active === 1 && sub === 1 }"
            d="M90 212V230"
            marker-end="url(#loop-arrow-teal)"
          />
          <path
            class="loop__line loop__proxyline loop__proxyline--emg"
            :class="{ 'is-sub': active === 1 && sub === 2 }"
            d="M150 212V230"
            marker-end="url(#loop-arrow-amber)"
          />
          <path
            class="loop__line loop__proxyline loop__proxyline--eeg"
            :class="{ 'is-sub': active === 1 && sub === 0 }"
            d="M210 212V230"
            marker-end="url(#loop-arrow-violet)"
          />

          <text
            class="loop__proxy loop__proxy--gaze"
            :class="{ 'is-sub': active === 1 && sub === 1 }"
            x="90"
            y="240"
            text-anchor="middle"
          >gaze</text>
          <text
            class="loop__proxy loop__proxy--emg"
            :class="{ 'is-sub': active === 1 && sub === 2 }"
            x="150"
            y="240"
            text-anchor="middle"
          >EMG</text>
          <text
            class="loop__proxy loop__proxy--eeg"
            :class="{ 'is-sub': active === 1 && sub === 0 }"
            x="210"
            y="240"
            text-anchor="middle"
          >EEG</text>

          <!-- horizontal brace + horizontal label -->
          <path class="loop__brace" d="M80 250C80 258 88 260 96 260H132C142 260 148 262 150 266C152 262 158 260 168 260H204C212 260 220 258 220 250" />
          <rect class="loop__recordpill" x="80" y="274" width="140" height="14" rx="3" />
          <text class="loop__recordlabel" x="150" y="284" text-anchor="middle">
            {{ t({ en: 'what HumanCOIN records', zh: 'HumanCOIN 记录的内容' }) }}
          </text>
          </g>
        </svg>
      </div>

      <!-- ---------- five-step cup plate ---------- -->
      <div class="demo">
        <div class="demo__stage">
          <figure
            v-for="(s, i) in STEPS"
            :key="s.img"
            class="demo__frame"
            :class="{ 'is-active': frameIndex === i }"
          >
            <img :src="s.img" :alt="`${t(s.name)} — ${t(s.line)}`" loading="eager" decoding="async" />
            <figcaption class="demo__label">{{ t(s.name) }}</figcaption>
          </figure>
        </div>
        <p class="demo__cap" :aria-hidden="reduced">
          <span class="demo__capname">{{ capName }}</span>
          <span class="demo__capline">{{ capLine }}</span>
        </p>
      </div>
    </div>
  </FigFrame>
</template>

<style scoped>
.loop {
  padding-top: 0;
}
.loop__plate {
  width: 100%;
}
.loop__svg {
  display: block;
  width: 100%;
  height: auto;
  overflow: visible;
}

/* same card, rule and type as Figure 1 */
.loop__card {
  fill: #fff;
  stroke: var(--line-strong);
  stroke-width: 1;
  transition: stroke 200ms ease, fill 200ms ease;
}
.loop__card--intent {
  fill: var(--c-blue);
  fill-opacity: 0.08;
  stroke: var(--c-blue);
}
.loop__sym {
  font-family: Georgia, 'Times New Roman', serif;
  font-style: italic;
  font-size: 16px;
  text-anchor: middle;
  fill: var(--ink);
}
.loop__name {
  font-family: var(--ff-sans);
  font-size: 12px;
  fill: var(--ink);
}
.loop__nodecap {
  font-family: var(--ff-mono);
  font-size: 8.5px;
  font-weight: 400;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  fill: var(--ink-mute);
}
.loop__m {
  font-family: Georgia, 'Times New Roman', serif;
  font-style: italic;
  font-size: 16px;
  fill: var(--ink);
}
.loop__arc {
  fill: none;
  stroke: var(--line-strong);
  stroke-width: 1.1;
}
.loop__line {
  fill: none;
  stroke: var(--line-strong);
  stroke-width: 1.1;
}
.loop__proxyline--gaze { stroke: var(--c-teal); }
.loop__proxyline--emg { stroke: var(--c-amber); }
.loop__proxyline--eeg { stroke: var(--c-violet); }
.loop__proxyline.is-sub {
  stroke: var(--c-amber);
  stroke-width: 1.6;
}
.loop__proxy {
  font-family: var(--ff-mono);
  font-size: 10px;
  letter-spacing: 0.04em;
  fill: var(--ink-soft);
}
.loop__proxy--gaze { fill: var(--c-teal); }
.loop__proxy--emg { fill: var(--c-amber); }
.loop__proxy--eeg { fill: var(--c-violet); }
.loop__proxy.is-sub {
  fill: var(--c-amber);
}
.loop__brace {
  fill: none;
  stroke: var(--c-teal);
  stroke-width: 1.1;
}
.loop__recordpill {
  fill: var(--c-teal);
  fill-opacity: 0.08;
  stroke: var(--c-teal);
  stroke-width: 1;
}
.loop__recordlabel {
  font-family: var(--ff-mono);
  font-size: 9.5px;
  font-weight: 400;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  fill: var(--c-teal);
}
.loop__dot {
  fill: var(--c-blue);
  opacity: 0.7;
}

/* active station: amber, distinct from the blue node and the blue z */
.loop__node.is-lit .loop__card {
  stroke: var(--c-amber);
  stroke-width: 1.6;
  fill: var(--c-amber);
  fill-opacity: 0.12;
  filter: drop-shadow(0 0 5px rgba(138, 97, 54, 0.38));
}
.loop__station {
  fill: transparent;
  stroke: transparent;
  stroke-width: 1.6;
  transition: fill 200ms ease, stroke 200ms ease;
}
.loop__station.is-lit {
  fill: var(--c-amber);
  fill-opacity: 0.12;
  stroke: var(--c-amber);
  filter: drop-shadow(0 0 5px rgba(138, 97, 54, 0.38));
}

/* sparse dashed flow and a light z breath; reduced motion is solid */
@media (prefers-reduced-motion: no-preference) {
  .loop__arc,
  .loop__proxyline {
    stroke-dasharray: 8 6;
    animation: loop-flow 2.8s linear infinite;
  }
  .loop__card--intent {
    animation: loop-breath 4s ease-in-out infinite;
  }
  @keyframes loop-flow {
    to { stroke-dashoffset: -28; }
  }
  @keyframes loop-breath {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.92; }
  }
}
@media (prefers-reduced-motion: reduce) {
  .loop__dot { display: none; }
}

/* ---- the five plates ---- */
.demo {
  margin-top: 20px;
}
.demo__stage {
  position: relative;
  width: 80%;
  margin-inline: auto;
  aspect-ratio: 16 / 10;
  overflow: hidden;
  border: 1px solid var(--line);
  border-radius: 8px;
  background: #f7f9fb;
}
.demo__frame {
  position: absolute;
  inset: 0;
  margin: 0;
  opacity: 0;
  transition: opacity 350ms ease;
}
.demo__frame.is-active { opacity: 1; }
.demo__frame img {
  display: block;
  width: 100%;
  height: 100%;
  object-fit: cover;
}
.demo__label { display: none; }
.demo__cap {
  display: flex;
  align-items: baseline;
  gap: 8px;
  width: 80%;
  height: 22px;
  margin: 8px auto 0;
  font-size: 14px;
  line-height: 22px;
  color: var(--ink-soft);
  white-space: nowrap;
  overflow: hidden;
}
.demo__capname {
  flex: none;
  font-family: var(--ff-mono);
  font-size: 10.5px;
  font-weight: 400;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: var(--ink-mute);
}
.demo__capline {
  overflow: hidden;
  text-overflow: ellipsis;
}

@media (prefers-reduced-motion: reduce) {
  .demo__stage {
    width: 100%;
    aspect-ratio: auto;
    display: grid;
    grid-template-columns: repeat(5, minmax(0, 1fr));
    gap: 6px;
    border: 0;
    overflow: visible;
    background: none;
  }
  .demo__frame {
    position: static;
    opacity: 1;
    transition: none;
  }
  .demo__frame img {
    height: auto;
    aspect-ratio: 16 / 10;
    border: 1px solid var(--line);
    border-radius: 6px;
  }
  .demo__label {
    display: block;
    margin-top: 5px;
    font-family: var(--ff-mono);
    font-size: 8.5px;
    font-weight: 400;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    color: var(--ink-mute);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .demo__cap { display: none; }
}

@media (max-width: 1000px) {
  .loop__plate {
    max-width: 620px;
    margin-inline: auto;
  }
}
</style>
