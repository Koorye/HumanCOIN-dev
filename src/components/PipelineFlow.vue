<script setup lang="ts">
/**
 * The processing pipeline, after Figure 7 of the report.
 *
 * Five chains, one per physics: streams enter the group that handles their
 * noise (synchronization and calibration, geometry and motion, gaze,
 * electrophysiology), annotation consumes the rest last, and everything meets
 * on one clock before an episode is written. Each chain is a fixed sequence, so
 * the drawing is a column of steps rather than a free-form graph.
 *
 * The skin follows the reference architecture figure: white cards on a hairline
 * border, muted secondary type, dashed connectors — no fills, no colour coding,
 * nothing that competes with the labels.
 */
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { PIPELINE } from '@/content'
import type { Bi } from '@/content'
import { useI18n } from '@/composables/useI18n'
import { PF_FOOT, PF_PROV } from '@/data/pipelineFlow'

const { t } = useI18n()

/* ---- geometry, in user units ---- */
const W = 1220
const COL_W = 190
const PITCH = 228
const X0 = 10
const HEAD_Y = 34
const HEAD_H = 80
const STEP_Y = 136
const STEP_H = 34
const STEP_GAP = 72
const RULE_Y = 356
const EP_X = 1136
const EP_W = 74
const H = 410

interface Group {
  id: string
  icon: string
  accent: string
  inputs: Bi
  title: Bi
  sub: Bi
  steps: Bi[]
}

const ICONS: Record<string, string> = {
  camera: 'M2.5 6h3L7 4h6l1.5 2h3v9h-15z M10 8.2a2.6 2.6 0 1 0 0 5.2 2.6 2.6 0 0 0 0-5.2Z',
  depth: 'M10 2.6 17 6.4v7.2L10 17.4 3 13.6V6.4z M3 6.4 10 10.2l7-3.8 M10 10.2v7.2',
  eye: 'M1.2 10c2.1-3.5 5.1-5.3 8.8-5.3s6.7 1.8 8.8 5.3c-2.1 3.5-5.1 5.3-8.8 5.3S3.3 13.5 1.2 10Z M10 7.7a2.3 2.3 0 1 1 0 4.6 2.3 2.3 0 0 1 0-4.6Z',
  wave: 'M1 10h2.6l2-5.2 3 10.4 2.8-8.2 1.8 3h5.8',
  video: 'M2.5 5.5h10.5v9H2.5z M13 9l4.5-2.6v7.2L13 11z',
  doc: 'M4 2.5h8l4 4v11H4z M12 2.5v4.2h4.2 M7 10.5h6.5 M7 13.6h6.5',
}

const GROUPS: Group[] = [
  {
    id: 'sync',
    icon: 'camera',
    accent: '#4a6f9e',
    inputs: { en: 'head RGB · wrist RGB', zh: '头部 RGB · 腕部 RGB' },
    title: { en: 'Synchronize + calibrate', zh: '同步与标定' },
    sub: { en: 'soft sync, no resampling', zh: '软同步，不重采样' },
    steps: [
      { en: 'clock offsets', zh: '时钟偏移' },
      { en: 'intrinsics', zh: '相机内参' },
      { en: 'eye calibration', zh: '眼动标定' },
    ],
  },
  {
    id: 'geometry',
    icon: 'depth',
    accent: '#33796f',
    inputs: { en: 'depth · 6-DoF pose', zh: '深度 · 6-DoF 位姿' },
    title: { en: 'Geometry + motion', zh: '几何与运动' },
    sub: { en: 'built on the camera intrinsics', zh: '由相机内参构建' },
    steps: [
      { en: 'FoundationStereo', zh: 'FoundationStereo' },
      { en: 'point cloud', zh: '点云' },
      { en: '6-DoF pose · hand recon', zh: '6-DoF 位姿 · 手部重建' },
    ],
  },
  {
    id: 'gaze',
    icon: 'eye',
    accent: '#6f5aa0',
    inputs: { en: 'gaze', zh: '注视' },
    sub: { en: 'measured at L3, predicted below', zh: 'L3 实测，低层预测' },
    title: { en: 'Gaze', zh: '注视' },
    steps: [
      { en: 'L3 acquire', zh: 'L3 采集' },
      { en: 'L1/L2 EgoM2P', zh: 'L1/L2 EgoM2P' },
    ],
  },
  {
    id: 'ephys',
    icon: 'wave',
    accent: '#a8623c',
    inputs: { en: 'EMG · EEG', zh: '肌电 · 脑电' },
    title: { en: 'Electrophysiology', zh: '电生理' },
    sub: { en: 'per-channel cleanup', zh: '逐通道清洗' },
    steps: [
      { en: 'band-pass', zh: '带通滤波' },
      { en: 'notch', zh: '陷波' },
      { en: 'bad-channel interpolation', zh: '坏道插值' },
    ],
  },
  {
    id: 'annot',
    icon: 'video',
    accent: '#8a5a6e',
    inputs: { en: 'video', zh: '视频' },
    title: { en: 'Annotation', zh: '标注' },
    sub: { en: 'consumes the other four', zh: '依赖其余四组' },
    steps: [
      { en: 'action phases', zh: '动作阶段' },
      { en: 'subgoals + events', zh: '子目标与事件' },
      { en: 'human review', zh: '人工复核' },
    ],
  },
]

const cols = GROUPS.map((g, i) => ({ g, x: X0 + i * PITCH, i }))

const oneClock: Bi = { en: 'one clock', zh: '统一时钟' }
const episodeLabel: Bi = { en: 'episode', zh: '片段' }

/* ---- transport: the flow pauses when the figure leaves the viewport ---- */
const playing = ref(false)
const reduced = ref(false)
const root = ref<HTMLElement | null>(null)
let observer: IntersectionObserver | null = null

function setPlaying(v: boolean) {
  playing.value = reduced.value ? false : v
}
function toggle() {
  setPlaying(!playing.value)
}

onMounted(() => {
  const mq = window.matchMedia?.('(prefers-reduced-motion: reduce)')
  reduced.value = !!mq?.matches
  if (reduced.value) return

  if (typeof IntersectionObserver !== 'undefined' && root.value) {
    observer = new IntersectionObserver(([entry]) => setPlaying(entry.isIntersecting), {
      threshold: 0.2,
    })
    observer.observe(root.value)
  } else {
    setPlaying(true)
  }
})

onBeforeUnmount(() => {
  observer?.disconnect()
  observer = null
})

const running = computed(() => playing.value && !reduced.value)
</script>

<template>
  <figure ref="root" class="pf" :data-running="running ? 'true' : 'false'">
    <div class="pf__bar">
      <p class="pf__kicker mono">{{ t(PIPELINE.figKicker) }}</p>
      <button
        v-if="!reduced"
        type="button"
        class="pf__toggle"
        :aria-pressed="running"
        @click="toggle"
      >
        {{ running ? t(PIPELINE.pauseFlow) : t(PIPELINE.playFlow) }}
      </button>
    </div>

    <div class="pf__scroll" tabindex="0" role="region" :aria-label="t(PIPELINE.figScrollAria)">
      <svg
        class="pf__svg"
        :viewBox="`0 0 ${W} ${H}`"
        :width="W"
        :height="H"
        role="img"
        aria-labelledby="pf-title pf-desc"
        :style="{ maxWidth: `${W}px` }"
      >
        <title id="pf-title">{{ t(PIPELINE.figTitle) }}</title>
        <desc id="pf-desc">{{ t(PIPELINE.figDesc) }}</desc>
        <defs>
          <marker id="pf-arrow" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
            <path d="M0 0L8 4L0 8Z" fill="#9aa1a9" />
          </marker>
        </defs>

        <!-- one column per chain -->
        <g v-for="c in cols" :key="c.g.id" class="pf__col" :style="{ '--accent': c.g.accent }">
          <!-- what arrives -->
          <text class="pf__input" :x="c.x" :y="18">{{ t(c.g.inputs) }}</text>

          <!-- the chain's header -->
          <rect class="pf__tint" :x="c.x" :y="HEAD_Y" :width="COL_W" :height="HEAD_H" rx="9" />
          <rect class="pf__card" :x="c.x" :y="HEAD_Y" :width="COL_W" :height="HEAD_H" rx="9" />
          <g class="pf__glyph" :transform="`translate(${c.x + 14} ${HEAD_Y + 13})`" aria-hidden="true">
            <path :d="ICONS[c.g.icon]" />
          </g>
          <text class="pf__head" :x="c.x + 14" :y="HEAD_Y + 45">{{ t(c.g.title) }}</text>
          <text class="pf__sub" :x="c.x + 14" :y="HEAD_Y + 63">{{ t(c.g.sub) }}</text>

          <!-- the steps, in the order they run -->
          <path class="pf__link" :d="`M${c.x + COL_W / 2} ${HEAD_Y + HEAD_H + 2}V${STEP_Y - 6}`" />
          <g v-for="(s, k) in c.g.steps" :key="k" class="pf__step">
            <rect class="pf__chip" :x="c.x + 16" :y="STEP_Y + k * STEP_GAP" :width="COL_W - 32" :height="STEP_H" rx="8" />
            <circle class="pf__dot" :cx="c.x + 30" :cy="STEP_Y + k * STEP_GAP + STEP_H / 2" r="2.4" />
            <text class="pf__chip-t" :x="c.x + 40" :y="STEP_Y + k * STEP_GAP + STEP_H / 2 + 3.6">{{ t(s) }}</text>
            <path
              v-if="k < c.g.steps.length - 1"
              class="pf__link pf__link--live"
              :d="`M${c.x + COL_W / 2} ${STEP_Y + k * STEP_GAP + STEP_H + 2}V${STEP_Y + (k + 1) * STEP_GAP - 6}`"
              :style="{ animationDelay: `${k * 0.18}s` }"
            />
          </g>

          <!-- every chain lands on the shared clock -->
          <path
            class="pf__link pf__link--drop"
            :d="`M${c.x + COL_W / 2} ${STEP_Y + (c.g.steps.length - 1) * STEP_GAP + STEP_H + 2}V${RULE_Y - 8}`"
          />
        </g>

        <!-- one clock, then the episode -->
        <path class="pf__rule" :d="`M${X0} ${RULE_Y}H${EP_X - 8}`" />
        <text class="pf__note" :x="X0" :y="RULE_Y + 22">{{ t(oneClock) }}</text>
        <path class="pf__rule-arrow" :d="`M${EP_X - 14} ${RULE_Y - 4}l6 4-6 4`" />

        <rect class="pf__card" :x="EP_X" :y="RULE_Y - 34" :width="EP_W" :height="68" rx="9" />
        <g class="pf__glyph" :transform="`translate(${EP_X + (EP_W - 20) / 2} ${RULE_Y - 24})`" aria-hidden="true">
          <path :d="ICONS.doc" />
        </g>
        <text class="pf__ep" :x="EP_X + EP_W / 2" :y="RULE_Y + 24" text-anchor="middle">{{ t(episodeLabel) }}</text>
      </svg>
    </div>

    <figcaption class="pf__cap">
      <p class="pf__foot">{{ t(PF_FOOT) }}</p>
      <p v-for="(line, i) in PF_PROV" :key="i" class="pf__prov mono">{{ line }}</p>
    </figcaption>

  </figure>
</template>

<style scoped>
.mono { font-family: var(--ff-mono); }
.pf { margin: 0; }

/* ---- transport ---- */
.pf__bar {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 1rem;
  padding-bottom: 0.7rem;
}
.pf__kicker {
  margin: 0;
  font-size: var(--fs-tick);
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: var(--ink-mute);
}
.pf__toggle {
  border: 0;
  border-bottom: 1px solid var(--line-strong);
  background: none;
  color: var(--ink-soft);
  font: inherit;
  font-size: var(--fs-tick);
  padding: 0;
  cursor: pointer;
}
.pf__toggle:hover { color: var(--ink); border-color: var(--ink); }

/* ---- the figure ---- */
.pf__scroll {
  width: 100%;
  overflow: visible;
  border-top: 1px solid var(--line-strong);
  border-bottom: 1px solid var(--line-strong);
  background: #fff;
}
.pf__scroll:focus-visible { outline: var(--focus); outline-offset: 2px; }
.pf__svg { display: block; width: 100%; height: auto; }

.pf__svg text {
  font-family: var(--ff-sans);
  fill: #7f868f;
  font-size: 11px;
}
.pf__input { font-size: 10.5px; fill: #9aa1a9; }
.pf__head { font-size: 12.5px; font-weight: 600; fill: #16191d; letter-spacing: -0.008em; }
.pf__sub { font-size: 10px; fill: #969da5; }
.pf__chip-t { font-size: 11px; fill: #596069; }
.pf__note { font-size: 10.5px; fill: #9aa1a9; letter-spacing: 0.04em; }
.pf__ep { font-size: 11px; font-weight: 600; fill: #16191d; }

.pf__card { fill: #fff; stroke: #e4e7ea; stroke-width: 1; }
.pf__tint { fill: var(--accent, transparent); opacity: 0.11; }
.pf__chip { fill: #fff; stroke: #e7eaed; stroke-width: 1; }
.pf__dot { fill: var(--accent, #b4bcc4); }
.pf__glyph path {
  fill: none;
  stroke: var(--accent, #9aa3ad);
  stroke-width: 1.35;
  stroke-linecap: round;
  stroke-linejoin: round;
}
.pf__link { fill: none; stroke: #ccd2d8; stroke-width: 1; stroke-dasharray: 4 4; marker-end: url(#pf-arrow); }
.pf__link--drop { marker-end: none; stroke: var(--accent, #ccd2d8); opacity: 0.55; }
.pf__rule { fill: none; stroke: #a8b0b8; stroke-width: 1.2; }
.pf__rule-arrow { fill: none; stroke: #9aa1a9; stroke-width: 1.2; stroke-linecap: round; stroke-linejoin: round; }

/* ---- the flow reads as motion, but only while the figure is in view ---- */
.pf__link--live { animation: pf-flow 2.4s linear infinite; animation-play-state: paused; }
.pf[data-running='true'] .pf__link--live { animation-play-state: running; }
@keyframes pf-flow { to { stroke-dashoffset: -32; } }
@media (prefers-reduced-motion: reduce) {
  .pf__link--live { animation: none; }
}

/* ---- caption + per-chain prose ---- */
.pf__cap { margin: 0.85rem 0 0; }
.pf__foot {
  margin: 0;
  font-size: var(--fs-micro);
  line-height: 1.65;
  color: var(--ink-soft);
  max-width: 84ch;
}
.pf__prov {
  margin: 0.5rem 0 0;
  font-size: var(--fs-tick);
  color: var(--ink-mute);
  line-height: 1.6;
}

</style>
