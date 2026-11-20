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

interface Step {
  label: Bi
  detail: Bi
}
interface Group {
  id: string
  icon: string
  accent: string
  inputs: Bi
  title: Bi
  sub: Bi
  steps: Step[]
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
      {
        label: { en: 'clock offsets', zh: '时钟偏移' },
        detail: {
          en: 'Every sample is stamped against the start of the recording, and the sync host logs arrival offsets, so streams on a shared transport land on one base without resampling.',
          zh: '每个样本相对录制起点打时间戳，同步主机记录到达偏移，同一传输上的流因此落在同一基准上，且不做重采样。',
        },
      },
      {
        label: { en: 'intrinsics', zh: '相机内参' },
        detail: {
          en: 'Intrinsics and distortion ship per camera, in both encodings, so the geometry can be re-derived rather than trusted.',
          zh: '每台相机的内参与畸变参数随片段发布，并提供两种编码，几何可自行重新推导。',
        },
      },
      {
        label: { en: 'eye calibration', zh: '眼动标定' },
        detail: {
          en: 'The eye tracker’s calibration is stored beside the episode instead of being baked into the gaze values.',
          zh: '眼动仪的标定结果与片段存放在一起，而不是烘焙进注视数值里。',
        },
      },
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
      {
        label: { en: 'FoundationStereo', zh: 'FoundationStereo' },
        detail: {
          en: 'The front pair is hardware-synchronised and rectified, then passed to FoundationStereo, which returns a depth map stored with the intrinsics that produced it.',
          zh: '前视双目硬件同步并矫正后送入 FoundationStereo，返回的深度图与产生它所用的内参一起存储。',
        },
      },
      {
        label: { en: 'point cloud', zh: '点云' },
        detail: {
          en: 'Depth is projected through the intrinsics into a metric point cloud and subsampled to a fixed budget per frame.',
          zh: '深度经内参投影成米制点云，并按每帧固定预算下采样。',
        },
      },
      {
        label: { en: '6-DoF pose · hand recon', zh: '6-DoF 位姿 · 手部重建' },
        detail: {
          en: 'At L3 three trackers give head and wrists directly; below that, both hands are reconstructed from the rectified front view, with two confidence fields per hand.',
          zh: 'L3 由三个追踪器直接给出头与双腕位姿；更低层级从矫正后的前视重建双手，并给出两个置信度字段。',
        },
      },
    ],
  },
  {
    id: 'gaze',
    icon: 'eye',
    accent: '#6f5aa0',
    inputs: { en: 'gaze', zh: '注视' },
    title: { en: 'Gaze', zh: '注视' },
    sub: { en: 'measured at L3, predicted below', zh: 'L3 实测，低层预测' },
    steps: [
      {
        label: { en: 'L3 acquire', zh: 'L3 采集' },
        detail: {
          en: 'Gaze is measured on the controlled L3 sessions with the head-mounted eye tracker.',
          zh: '在受控 L3 会话中用头戴眼动仪实测注视。',
        },
      },
      {
        label: { en: 'L1/L2 EgoM2P', zh: 'L1/L2 EgoM2P' },
        detail: {
          en: 'Elsewhere gaze is predicted from head video by EgoM2P, and the field is tagged as estimated rather than measured.',
          zh: '其余层级由 EgoM2P 从头部视频预测注视，字段标记为估计而非实测。',
        },
      },
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
      {
        label: { en: 'band-pass', zh: '带通滤波' },
        detail: {
          en: 'Each EMG and EEG channel is band-passed in its own physiological band before anything else touches it.',
          zh: '每条肌电、脑电通道先按各自的生理频带做带通，再做其他处理。',
        },
      },
      {
        label: { en: 'notch', zh: '陷波' },
        detail: {
          en: 'Line noise is removed with a notch at the mains frequency.',
          zh: '用陷波器去掉工频干扰。',
        },
      },
      {
        label: { en: 'bad-channel interpolation', zh: '坏道插值' },
        detail: {
          en: 'Channels that fail the audit are interpolated, and the failure is written into the episode metadata rather than hidden.',
          zh: '未通过检查的通道做插值，并把失败写进片段元数据，而不是隐去。',
        },
      },
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
      {
        label: { en: 'action phases', zh: '动作阶段' },
        detail: {
          en: 'Each captured segment carries a verb and a short description, and is cut into phases on the shared clock.',
          zh: '每段录制带一个动词与简短描述，并按统一时钟切分为阶段。',
        },
      },
      {
        label: { en: 'subgoals + events', zh: '子目标与事件' },
        detail: {
          en: 'Subgoals and contact events are annotated against the same timestamps the signals carry.',
          zh: '子目标与接触事件按与信号相同的时间戳标注。',
        },
      },
      {
        label: { en: 'human review', zh: '人工复核' },
        detail: {
          en: 'A human pass checks the annotation before the episode is released.',
          zh: '片段发布前由人工复核标注。',
        },
      },
    ],
  },
]

const cols = GROUPS.map((g, i) => ({ g, x: X0 + i * PITCH, i }))

/* ---- per-step detail, on hover or keyboard focus ---- */
const scroller = ref<HTMLElement | null>(null)
const tip = ref<{ x: number; y: number; text: string } | null>(null)

function showTip(e: Event, step: Step) {
  const box = scroller.value?.getBoundingClientRect()
  if (!box) return
  const r = (e.currentTarget as SVGGElement).getBoundingClientRect()
  tip.value = {
    x: r.left - box.left + r.width / 2,
    y: r.top - box.top,
    text: t(step.detail),
  }
}
function hideTip() {
  tip.value = null
}

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

    <div ref="scroller" class="pf__scroll" role="region" :aria-label="t(PIPELINE.figScrollAria)">
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
          <g
            v-for="(s, k) in c.g.steps"
            :key="k"
            class="pf__step"
            tabindex="0"
            @mouseenter="showTip($event, s)"
            @mouseleave="hideTip"
            @focus="showTip($event, s)"
            @blur="hideTip"
          >
            <rect class="pf__chip" :x="c.x + 16" :y="STEP_Y + k * STEP_GAP" :width="COL_W - 32" :height="STEP_H" rx="8" />
            <circle class="pf__dot" :cx="c.x + 30" :cy="STEP_Y + k * STEP_GAP + STEP_H / 2" r="2.4" />
            <text class="pf__chip-t" :x="c.x + 40" :y="STEP_Y + k * STEP_GAP + STEP_H / 2 + 3.6">{{ t(s.label) }}</text>
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
      <div
        v-if="tip"
        class="pf__tip"
        :style="{ left: `${tip.x}px`, top: `${tip.y}px` }"
        role="tooltip"
      >{{ tip.text }}</div>
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
  position: relative;
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
.pf__step { cursor: default; outline: none; }
.pf__step:hover .pf__chip,
.pf__step:focus-visible .pf__chip { stroke: var(--accent, #9aa3ad); }
.pf__step:hover .pf__chip-t,
.pf__step:focus-visible .pf__chip-t { fill: #16191d; }

.pf__tip {
  position: absolute;
  transform: translate(-50%, calc(-100% - 10px));
  width: max-content;
  max-width: 260px;
  padding: 0.55rem 0.65rem;
  border: 1px solid #e4e7ea;
  border-radius: 8px;
  background: #fff;
  box-shadow: 0 8px 24px rgba(20, 26, 33, 0.1);
  font-size: var(--fs-micro);
  line-height: 1.55;
  color: var(--ink-soft);
  pointer-events: none;
  z-index: 5;
}
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
