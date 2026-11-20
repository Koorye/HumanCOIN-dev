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
import FigCaption from '@/components/FigCaption.vue'

const { t } = useI18n()

/* ---- geometry, in user units ---- */
const W = 1220
const COL_W = 190
const PITCH = 228
const X0 = 10
const HEAD_Y = 34
const HEAD_H = 128
const STEP_Y = 186
const STEP_H = 60
const STEP_GAP = 18
const RULE_Y = 444
const EP_X = 1136
const EP_W = 74
const H = 500

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
    accent: 'var(--c-blue)',
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
    accent: 'var(--c-teal)',
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
    accent: 'var(--c-violet)',
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
    accent: 'var(--c-amber)',
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
    accent: 'var(--c-rose)',
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

const cols = computed(() =>
  GROUPS.map((g, i) => ({
    g,
    x: X0 + i * PITCH,
    i,
    headLines: wrap(t(g.title), 13, COL_W - 58),
    subLines: wrap(t(g.sub), 10.5, COL_W - 58),
    steps: g.steps.map((s, k) => ({
      ...s,
      lines: wrap(t(s.label), 11.5, COL_W - 56),
      y: STEP_Y + k * (STEP_H + STEP_GAP),
    })),
  })),
)

/**
 * Greedy two-line wrapper for SVG labels. SVG `<text>` does not wrap, so the
 * lines are measured here and drawn as tspans; cards are sized for two lines
 * and grow taller rather than shrinking the type.
 */
function textWidth(text: string, fs: number): number {
  let w = 0
  for (const ch of text) {
    if (/\s/.test(ch)) w += fs * 0.26
    else if (/[\u2e80-\u9fff\uf900-\ufaff\uff00-\uffef]/.test(ch)) w += fs
    else if (/[A-Z]/.test(ch)) w += fs * 0.62
    else if (/[a-z]/.test(ch)) w += fs * 0.5
    else if (/[0-9]/.test(ch)) w += fs * 0.55
    else if ('·—–-+/'.includes(ch)) w += fs * 0.4
    else w += fs * 0.35
  }
  return w
}

function wrap(text: string, fs: number, maxW: number, maxLines = 2): string[] {
  const full = text.trim()
  if (textWidth(full, fs) <= maxW) return [full]
  /* A middle dot is a designed break: prefer it over splitting a phrase. */
  if (full.includes(' · ')) {
    const parts = full.split(' · ')
    if (parts.length === 2 && parts.every((p) => textWidth(p, fs) <= maxW)) return parts
  }
  const tokens = full.match(/[\u2e80-\u9fff\uf900-\ufaff\uff00-\uffef]|[^\s\u2e80-\u9fff\uf900-\ufaff\uff00-\uffef]+/g) ?? [full]
  const lines: string[] = []
  let line = ''
  const push = () => {
    if (line) {
      lines.push(line)
      line = ''
    }
  }
  for (const token of tokens) {
    const candidate = line ? `${line} ${token}` : token
    if (!line || textWidth(candidate, fs) <= maxW) {
      line = candidate
      continue
    }
    push()
    line = token
  }
  push()
  /* Rebalance a short final line instead of leaving one orphan word. */
  if (lines.length === 2) {
    const a = lines[0].split(' ')
    const b = lines[1].split(' ')
    if (a.length > 1 && b.length === 1) {
      const moved = a[a.length - 1]
      /* Keep a lone operator with the first phrase: "+ calibrate" is worse
         than "Synchronize +" / "calibrate". */
      if (!/^[+·—–-]$/.test(moved)) {
        a.pop()
        lines[0] = a.join(' ')
        lines[1] = `${moved} ${b[0]}`
      }
    }
  }
  if (lines.length > maxLines) {
    const head = lines.slice(0, maxLines - 1)
    head.push(lines.slice(maxLines - 1).join(' '))
    return head
  }
  return lines
}

/* ---- per-step detail, on hover or keyboard focus ---- */
/* The detail is written under the figure rather than floated over it, so the
   drawing never covers the thing it is explaining. */
const hovered = ref<{ label: string; detail: string } | null>(null)

function showTip(_e: Event, step: Step) {
  hovered.value = { label: t(step.label), detail: t(step.detail) }
}
function hideTip() {
  hovered.value = null
}

const hint: Bi = {
  en: 'Hover or tab to a step to read what it does.',
  zh: '悬停或用 Tab 选中某一步，可读取它的说明。',
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
    <FigCaption n="07" :title="{ en: 'Processing framework', zh: '处理框架' }">
      <template #action>
        <button
          v-if="!reduced"
          type="button"
          class="pf__toggle"
          :aria-pressed="running"
          @click="toggle"
        >
          {{ running ? t(PIPELINE.pauseFlow) : t(PIPELINE.playFlow) }}
        </button>
      </template>
    </FigCaption>

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
          <g class="pf__glyph" :transform="`translate(${c.x + 14} ${HEAD_Y + 16}) scale(0.85)`" aria-hidden="true">
            <path :d="ICONS[c.g.icon]" />
          </g>
          <text class="pf__head" :x="c.x + 44" :y="HEAD_Y + 34">
            <tspan v-for="(line, li) in c.headLines" :key="li" :x="c.x + 44" :dy="li === 0 ? 0 : 16">{{ line }}</tspan>
          </text>
          <text class="pf__sub" :x="c.x + 44" :y="HEAD_Y + 34 + c.headLines.length * 16 + 6">
            <tspan v-for="(line, li) in c.subLines" :key="li" :x="c.x + 44" :dy="li === 0 ? 0 : 14">{{ line }}</tspan>
          </text>

          <!-- the steps, in the order they run -->
          <path class="pf__link" :d="`M${c.x + COL_W / 2} ${HEAD_Y + HEAD_H + 2}V${STEP_Y - 6}`" />
          <g
            v-for="(s, k) in c.steps"
            :key="k"
            class="pf__step"
            tabindex="0"
            @mouseenter="showTip($event, s)"
            @mouseleave="hideTip"
            @focus="showTip($event, s)"
            @blur="hideTip"
          >
            <rect class="pf__chip" :x="c.x + 16" :y="s.y" :width="COL_W - 32" :height="STEP_H" rx="8" />
            <circle class="pf__dot" :cx="c.x + 30" :cy="s.y + STEP_H / 2 - (s.lines.length > 1 ? 6 : 0)" r="2.4" />
            <text class="pf__chip-t" :x="c.x + 36" :y="s.y + STEP_H / 2 + (s.lines.length > 1 ? -5 : 4)">
              <tspan v-for="(line, li) in s.lines" :key="li" :x="c.x + 36" :dy="li === 0 ? 0 : 15">{{ line }}</tspan>
            </text>
            <path
              v-if="k < c.steps.length - 1"
              class="pf__link pf__link--live"
              :d="`M${c.x + COL_W / 2} ${s.y + STEP_H + 2}V${c.steps[k + 1].y - 6}`"
              :style="{ animationDelay: `${k * 0.18}s` }"
            />
          </g>

          <!-- every chain lands on the shared clock -->
          <path
            class="pf__link pf__link--drop"
            :d="`M${c.x + COL_W / 2} ${STEP_Y + (c.steps.length - 1) * (STEP_H + STEP_GAP) + STEP_H + 2}V${RULE_Y - 8}`"
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

    <p class="pf__detail" aria-live="polite">
      <template v-if="hovered">
        <span class="pf__detail-label">{{ hovered.label }}</span>
        <span class="pf__detail-dash">—</span>{{ hovered.detail }}
      </template>
      <span v-else class="pf__detail-idle">{{ t(hint) }}</span>
    </p>

  </figure>
</template>

<style scoped>
.mono { font-family: var(--ff-mono); }
.pf {
  margin: 0;
  /* the drawing gains width to the right of the column, where the contents
     column is not in the way, so its labels are not scaled down */
}
/* the article column is now as wide as this figure wants to be */

/* ---- transport ---- */
.pf__toggle {
  border: 0;
  border-bottom: 1px solid var(--line-strong);
  background: none;
  color: var(--ink-soft);
  font: inherit;
  font-size: var(--fs-micro);
  line-height: 1.1;
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
}
.pf__input { font-size: 10.5px; fill: var(--ink-mute); }
.pf__head { font-size: 13px; font-weight: 500; fill: var(--ink); letter-spacing: 0; }
.pf__sub { font-size: 10.5px; fill: var(--ink-mute); }
.pf__chip-t { font-size: 11.5px; fill: var(--ink-soft); font-weight: 400; }
.pf__note { font-size: 9.5px; fill: var(--ink-mute); letter-spacing: 0.04em; }
.pf__ep { font-size: 11.5px; font-weight: 500; fill: var(--ink); }

.pf__card { fill: var(--surface); stroke: var(--line); stroke-width: 1; }
.pf__step { cursor: default; outline: none; }
.pf__step:hover .pf__chip,
.pf__step:focus-visible .pf__chip { stroke: var(--accent, var(--ink-mute)); }
.pf__step:hover .pf__chip-t,
.pf__step:focus-visible .pf__chip-t { fill: var(--ink); }

/* the reading line under the figure: fixed height, so hovering never shifts
   the page */
.pf__detail {
  margin: 0.75rem 0 0;
  min-height: 3.1em;
  font-size: var(--fs-micro);
  line-height: 1.6;
  color: var(--ink-soft);
  max-width: 78ch;
}
.pf__detail-label { font-weight: 400; color: var(--ink); }
.pf__detail-dash { margin: 0 0.4em; color: var(--ink-mute); }
.pf__detail-idle { color: var(--ink-mute); font-style: italic; }
.pf__tint { fill: var(--accent, transparent); opacity: 0.11; }
.pf__chip { fill: var(--surface); stroke: var(--line); stroke-width: 1; }
.pf__dot { fill: var(--accent, var(--ink-mute)); }
.pf__glyph path {
  fill: none;
  stroke: var(--accent, var(--ink-mute));
  stroke-width: 1.35;
  stroke-linecap: round;
  stroke-linejoin: round;
}
.pf__link { fill: none; stroke: var(--line-strong); stroke-width: 1; stroke-dasharray: 4 4; marker-end: url(#pf-arrow); }
.pf__link--drop { marker-end: none; stroke: var(--accent, var(--line-strong)); opacity: 0.55; }
.pf__rule { fill: none; stroke: var(--line-strong); stroke-width: 1.2; }
.pf__rule-arrow { fill: none; stroke: var(--line-strong); stroke-width: 1.2; stroke-linecap: round; stroke-linejoin: round; }

/* ---- the flow reads as motion, but only while the figure is in view ---- */
.pf__link--live { animation: pf-flow 2.4s linear infinite; animation-play-state: paused; }
.pf[data-running='true'] .pf__link--live { animation-play-state: running; }
@keyframes pf-flow { to { stroke-dashoffset: -32; } }
@media (prefers-reduced-motion: reduce) {
  .pf__link--live { animation: none; }
}

</style>
