<script setup lang="ts">
/**
 * The processing framework, as one connected figure.
 *
 * Seven pathways run left to right: what the sensor emits, two per-modality
 * processing modules, then a single shared contract — temporal calibration,
 * spatial calibration, a quality gate and query fusion — before an output field
 * exists.
 *
 * That contract is drawn once, not once per lane, because it is one contract.
 * A lane that fails the gate leaves on the side branch instead of being
 * silently averaged into the rest, and the output boxes sit downstream of the
 * gate so the drawing itself says that nothing reaches a field unchecked.
 *
 * Geometry is fixed in user units; the figure is wider than the text column, so
 * it scrolls sideways on narrow screens rather than shrinking its labels below
 * the reading floor.
 */
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { PIPELINE } from '@/content'
import { useI18n } from '@/composables/useI18n'
import { PF_FOOT, PF_LANES, PF_NODES, PF_PROV, PF_STAGES } from '@/data/pipelineFlow'

const { t } = useI18n()

const W = 1188
const H = 852

/* ---- columns: raw | module A | module B | bus | contract | reject | bus | fields ---- */
const RAW_X = 12
const RAW_END = 170
const A_X = 186
const A_W = 170
const B_X = 372
const B_W = 170
const B_END = B_X + B_W
const BUS1 = 564
const CH_X = 586
const CH_W = 190
const CH_END = CH_X + CH_W
const REJ_X = 810
const REJ_W = 142
const BUS2 = 968
const OUT_X = 990
const OUT_W = 180

/* ---- rows ---- */
const LANE_Y0 = 130
const LANE_GAP = 88
const LANE_H = 74
const CH_Y0 = 130
const CH_GAP = 150
const CH_H = 100
const REJ_H = 58

const HEAD_RULE = 92
const LEGEND_Y = 114
/** Dashed key sits after the M/E/R/A legend line, in the same reading row. */
const LEG_KEY_X = 640
const BUS_TOP = 140

const lanes = PF_LANES.map((lane, i) => {
  const y = LANE_Y0 + i * LANE_GAP
  return { lane, i, y, mid: y + LANE_H / 2 }
})

const chain = PF_NODES.filter((n) => !n.branch).map((node, i) => {
  const y = CH_Y0 + i * CH_GAP
  return { node, i, y, mid: y + CH_H / 2 }
})
const reject = PF_NODES.find((n) => n.branch)!
/** Hung off the quality gate, so rejection is visibly a gate outcome. */
const qc = chain.find((c) => c.node.id === 'qc')!
const last = chain[chain.length - 1]
const rejY = qc.mid - REJ_H / 2

const BUS_BOTTOM = LANE_Y0 + (lanes.length - 1) * LANE_GAP + LANE_H + 8
const FOOT_RULE = BUS_BOTTOM + 32

const stageX = [RAW_X, A_X, CH_X, OUT_X]

/** Per-lane glyph, drawn in a 22×22 box at the lane origin. */
const GLYPHS: Record<string, string> = {
  geometry: 'M2 3h13l4 4v12H2z M11 3v5h5 M4 16l4-4 3 3 3-4 4 5',
  gaze: 'M0.5 11s4.4-7 10.5-7 10.5 7 10.5 7-4.4 7-10.5 7S0.5 11 0.5 11Z M11 11a2.8 2.8 0 1 0 .01 0Z',
  hand: 'M6.5 20.5 3.5 15c-1-2.2 1-3.8 2.8-2.2L7.5 14V6.2c0-2.2 2.8-2.2 2.8 0v6-8.4c0-2.2 2.8-2.2 2.8 0v8.4-6.2c0-2.2 2.8-2.2 2.8 0v7.2c0 4.2-2.6 7.3-5.6 7.3Z',
  eeg: 'M8.2 6.4c-1-3-4.8-2.6-5.4.4-2 .5-2.1 4.6-.2 6.2-1.4 2.4.2 5.9 2.6 5.9.6 3 4.4 3 5 .5V6.4Z M13.8 6.4c1-3 4.8-2.6 5.4.4 2 .5 2.1 4.6.2 6.2 1.4 2.4-.2 5.9-2.6 5.9-.6 3-4.4 3-5 .5V6.4Z M4 6.2c0 2 1.4 2.7 2.7 2.7',
  emg: 'M2 14.6l3.8-7.8 4 2-1.4 3.4c2.7-2.8 6-2.1 8 0 2 2.7.7 6-2.1 7.3-4.8 2-10-.8-12.3-2.8Z M6.6 6.8 5.2 3.8l2.6-1.4L11.2 6l-.7 2.7',
  audio: 'M7.6 2.6h5.4v11.6a3.5 3.5 0 1 1-2.1-3.2V4.8H7.6Z M15.4 11.6a5 5 0 0 1-6.4 4.7',
  semantic: 'M4 2h9.6l4.4 4.4v13.6H4Z M13.6 2v4.8h4.4 M7.2 10.8h7 M7.2 14.2h7 M7.2 17.6h4',
}

/* ---- transport ---- */
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
        :style="{ minWidth: `${W}px` }"
      >
        <title id="pf-title">{{ t(PIPELINE.figTitle) }}</title>
        <desc id="pf-desc">{{ t(PIPELINE.figDesc) }}</desc>
        <defs>
          <marker
            id="pf-arrow"
            viewBox="0 0 8 8"
            refX="7"
            refY="4"
            markerWidth="6"
            markerHeight="6"
            orient="auto-start-reverse"
          >
            <path d="M0 0L8 4L0 8Z" fill="#64717c" />
          </marker>
          <marker
            id="pf-arrow-rej"
            viewBox="0 0 8 8"
            refX="7"
            refY="4"
            markerWidth="6"
            markerHeight="6"
            orient="auto-start-reverse"
          >
            <path d="M0 0L8 4L0 8Z" fill="#a97667" />
          </marker>
        </defs>

        <!-- stage headers -->
        <g v-for="(s, i) in PF_STAGES" :key="s.n">
          <text class="pf__stage-n" :x="stageX[i]" y="30">{{ s.n }}</text>
          <text class="pf__stage-t" :x="stageX[i]" y="55">{{ t(s.title) }}</text>
          <text class="pf__stage-s" :x="stageX[i]" y="74">{{ t(s.sub) }}</text>
        </g>
        <path class="pf__rule" :d="`M${RAW_X} ${HEAD_RULE}H${W - 14}`" />

        <!-- legend -->
        <text class="pf__legend" :x="RAW_X" :y="LEGEND_Y">{{ t(PIPELINE.figLegend) }}</text>
        <path class="pf__key" :d="`M${LEG_KEY_X} ${LEGEND_Y - 4}h30`" />
        <text class="pf__legend" :x="LEG_KEY_X + 40" :y="LEGEND_Y">
          {{ t(PIPELINE.figKeyDashed) }}
        </text>

        <!-- the two buses: pre-contract, and post-contract -->
        <path class="pf__bus" :d="`M${BUS1} ${BUS_TOP}V${BUS_BOTTOM}`" />
        <path class="pf__bus pf__bus--live" :d="`M${BUS2} ${BUS_TOP}V${BUS_BOTTOM}`" />

        <!-- lanes -->
        <g v-for="l in lanes" :key="l.lane.id" class="pf__lane" :class="`is-${l.lane.tone}`">
          <path class="pf__lanerule" :d="`M${RAW_X} ${l.y + LANE_H + 8}H${B_END}`" />

          <g class="pf__glyph" :transform="`translate(${RAW_X} ${l.y + 2})`" aria-hidden="true">
            <path :d="GLYPHS[l.lane.id]" />
          </g>
          <text class="pf__lane-t" :x="RAW_X + 32" :y="l.y + 16">
            {{ String(l.i + 1).padStart(2, '0') }} / {{ t(l.lane.title) }}
          </text>
          <text
            v-for="(r, j) in l.lane.raw"
            :key="j"
            class="pf__raw"
            :x="RAW_X"
            :y="l.y + 42 + j * 16"
          >
            {{ r }}
          </text>

          <path class="pf__arrow" :d="`M${RAW_END} ${l.mid - 5}H${A_X - 6}`" />

          <g class="pf__mod">
            <rect :x="A_X" :y="l.y" :width="A_W" :height="LANE_H" />
            <text class="pf__mod-t" :x="A_X + 12" :y="l.y + 20">{{ t(l.lane.a.title) }}</text>
            <text
              v-for="(v, j) in l.lane.a.lines"
              :key="j"
              class="pf__mod-l"
              :x="A_X + 12"
              :y="l.y + 40 + j * 16"
            >
              {{ v }}
            </text>
          </g>

          <path class="pf__arrow" :d="`M${A_X + A_W + 6} ${l.mid - 5}H${B_X - 6}`" />

          <g class="pf__mod">
            <rect :x="B_X" :y="l.y" :width="B_W" :height="LANE_H" />
            <text class="pf__mod-t" :x="B_X + 12" :y="l.y + 20">{{ t(l.lane.b.title) }}</text>
            <text
              v-for="(v, j) in l.lane.b.lines"
              :key="j"
              class="pf__mod-l"
              :x="B_X + 12"
              :y="l.y + 40 + j * 16"
            >
              {{ v }}
            </text>
          </g>

          <path class="pf__arrow" :d="`M${B_END + 6} ${l.mid - 5}H${BUS1 - 4}`" />
          <circle class="pf__junction" :cx="BUS1" :cy="l.mid - 5" r="3" />

          <!-- fields are fed from the post-gate bus, so nothing skips the contract -->
          <path
            class="pf__arrow pf__arrow--live"
            :d="`M${BUS2 + 6} ${l.mid - 5}H${OUT_X - 6}`"
            :style="{ animationDelay: `${l.i * 0.24}s` }"
          />
          <g class="pf__out">
            <rect :x="OUT_X" :y="l.y" :width="OUT_W" :height="LANE_H" />
            <text class="pf__out-t" :x="OUT_X + 12" :y="l.y + 20">
              {{ t(PIPELINE.fields) }}
            </text>
            <text
              v-for="(v, j) in l.lane.out"
              :key="j"
              class="pf__out-l"
              :x="OUT_X + 12"
              :y="l.y + 40 + j * 16"
            >
              {{ v }}
            </text>
          </g>
        </g>

        <!-- lanes → the shared contract -->
        <path class="pf__arrow" :d="`M${BUS1 + 6} ${lanes[0].mid - 5}H${CH_X - 6}`" />

        <!-- the shared contract, drawn once -->
        <g v-for="(c, i) in chain" :key="c.node.id" class="pf__chain">
          <rect :x="CH_X" :y="c.y" :width="CH_W" :height="CH_H" />
          <text class="pf__chain-t" :x="CH_X + 12" :y="c.y + 21">{{ t(c.node.title) }}</text>
          <text
            v-for="(v, j) in c.node.lines"
            :key="j"
            class="pf__chain-l"
            :x="CH_X + 12"
            :y="c.y + 41 + j * 16"
          >
            {{ v }}
          </text>
          <path
            v-if="i < chain.length - 1"
            class="pf__arrow pf__arrow--live"
            :d="`M${CH_X + CH_W / 2} ${c.y + CH_H + 3}V${c.y + CH_GAP - 4}`"
            :style="{ animationDelay: `${i * 0.32}s` }"
          />
        </g>

        <!-- what the gate rejects leaves here, instead of being averaged in -->
        <path
          class="pf__arrow pf__arrow--rej"
          :d="`M${CH_END + 6} ${qc.mid - 5}H${REJ_X - 6}`"
        />
        <g class="pf__chain pf__chain--rej">
          <rect :x="REJ_X" :y="rejY" :width="REJ_W" :height="REJ_H" />
          <text class="pf__chain-t" :x="REJ_X + 12" :y="rejY + 20">
            {{ t(reject.title) }}
          </text>
          <text class="pf__chain-l" :x="REJ_X + 12" :y="rejY + 36">{{ reject.lines[0] }}</text>
        </g>

        <!-- the contract's own output, onto the post-gate bus -->
        <path
          class="pf__arrow pf__arrow--live"
          :d="`M${CH_END + 6} ${last.mid - 5}H${BUS2 - 4}`"
        />

        <!-- provenance footer -->
        <path class="pf__rule" :d="`M${RAW_X} ${FOOT_RULE}H${W - 14}`" />
        <text class="pf__foot-t" :x="RAW_X" :y="FOOT_RULE + 26">
          {{ t(PIPELINE.provTitle) }}
        </text>
        <text
          v-for="(p, i) in PF_PROV"
          :key="i"
          class="pf__foot-l"
          :x="RAW_X"
          :y="FOOT_RULE + 48 + i * 19"
        >
          {{ p }}
        </text>
      </svg>
    </div>

    <figcaption class="pf__cap">
      <p class="pf__foot">{{ t(PF_FOOT) }}</p>
    </figcaption>

    <!-- what each pathway contributes, in prose -->
    <div class="pf__lanes">
      <article v-for="l in PF_LANES" :key="l.id" class="pf__lanecard" :class="`is-${l.tone}`">
        <h4 class="pf__lanecard-t">{{ t(l.title) }}</h4>
        <p class="pf__lanecard-p">{{ t(l.prose) }}</p>
        <p v-if="l.method" class="pf__lanecard-m mono">{{ l.method }}</p>
      </article>
    </div>
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
  overflow-x: auto;
  overscroll-behavior-x: contain;
  border-top: 1px solid var(--line-strong);
  border-bottom: 1px solid var(--line-strong);
  background: var(--paper);
}
.pf__scroll:focus-visible { outline: var(--focus); outline-offset: 2px; }
.pf__svg { display: block; width: 100%; min-width: 1080px; height: auto; }

/* text */
.pf__svg text {
  font-family: var(--ff-sans);
  fill: var(--ink-body);
  font-size: 11.5px;
}
.pf__stage-n { font-size: 12px; font-weight: 600; fill: var(--ink-mute); letter-spacing: 0.08em; }
.pf__stage-t { font-size: 16px; font-weight: 600; fill: var(--ink); }
.pf__stage-s { font-size: 11.5px; fill: var(--ink-mute); }
.pf__legend { font-size: 11.5px; fill: var(--ink-mute); }
.pf__lane-t { font-size: 12.5px; font-weight: 600; }
.pf__raw { font-size: 11px; fill: var(--ink-mute); }
.pf__mod-t { font-size: 12px; font-weight: 600; fill: var(--ink); }
.pf__mod-l, .pf__out-l, .pf__chain-l { font-size: 11px; fill: var(--ink-body); }
.pf__out-t, .pf__chain-t { font-size: 12px; font-weight: 600; fill: var(--ink); }
.pf__foot-t { font-size: 12px; font-weight: 600; fill: var(--ink); letter-spacing: 0.06em; }
.pf__foot-l { font-size: 11px; fill: var(--ink-mute); }

/* strokes */
.pf__rule { fill: none; stroke: var(--line-strong); stroke-width: 1; }
.pf__lanerule { fill: none; stroke: var(--line); stroke-width: 1; }
.pf__key { fill: none; stroke: var(--ink-mute); stroke-width: 1.2; stroke-dasharray: 5 3; }
.pf__arrow { fill: none; stroke: var(--line-strong); stroke-width: 1.2; stroke-linejoin: round; marker-end: url(#pf-arrow); }
.pf__arrow--rej { stroke: #a97667; stroke-dasharray: 3 3; marker-end: url(#pf-arrow-rej); }
.pf__bus { fill: none; stroke: var(--line-strong); stroke-width: 1.5; }
.pf__bus--live { stroke: var(--c-blue); }
.pf__junction { fill: var(--ink-mute); }

/* lane accent, so a row reads as one pathway */
.pf__lane.is-blue { --pf: var(--c-blue); }
.pf__lane.is-teal { --pf: var(--c-teal); }
.pf__lane.is-rose { --pf: var(--c-rose); }
.pf__lane.is-violet { --pf: var(--c-violet); }
.pf__lane.is-amber { --pf: var(--c-amber); }
.pf__lane.is-slate { --pf: var(--c-slate); }
.pf__lane.is-ink { --pf: var(--ink-soft); }

.pf__lane .pf__lane-t { fill: var(--pf, var(--ink)); }
.pf__glyph path {
  fill: none;
  stroke: var(--pf, var(--ink-soft));
  stroke-width: 1.6;
  stroke-linecap: round;
  stroke-linejoin: round;
}
.pf__mod rect { fill: var(--surface); stroke: var(--line-strong); stroke-width: 1; }
.pf__chain rect { fill: var(--paper); stroke: var(--ink-mute); stroke-width: 1; }
.pf__chain--rej rect { fill: #fdf6f8; stroke: #a97667; stroke-dasharray: 4 3; }
.pf__out rect { fill: var(--surface); stroke: var(--line-strong); stroke-width: 1; }

/* ---- flow motion: dash travel along the post-contract connectors ---- */
.pf__arrow--live {
  stroke: var(--c-blue);
  stroke-dasharray: 5 4;
  animation: pf-travel 2.6s linear infinite;
  animation-play-state: paused;
}
.pf[data-running='true'] .pf__arrow--live { animation-play-state: running; }
@keyframes pf-travel {
  to { stroke-dashoffset: -36; }
}
@media (prefers-reduced-motion: reduce) {
  .pf__arrow--live { animation: none; }
}

/* ---- caption + per-lane prose ---- */
.pf__cap { margin: 0.85rem 0 0; }
.pf__foot {
  margin: 0;
  font-size: var(--fs-micro);
  line-height: 1.65;
  color: var(--ink-soft);
  max-width: 84ch;
}

.pf__lanes {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(232px, 1fr));
  gap: 1.1rem 1.75rem;
  margin-top: 1.5rem;
  padding-top: 1.35rem;
  border-top: 1px solid var(--line);
}
.pf__lanecard { border-left: 2px solid var(--line-strong); padding-left: 0.7rem; }
.pf__lanecard.is-blue { border-color: var(--c-blue); }
.pf__lanecard.is-teal { border-color: var(--c-teal); }
.pf__lanecard.is-rose { border-color: var(--c-rose); }
.pf__lanecard.is-violet { border-color: var(--c-violet); }
.pf__lanecard.is-amber { border-color: var(--c-amber); }
.pf__lanecard.is-slate { border-color: var(--c-slate); }
.pf__lanecard.is-ink { border-color: var(--ink-soft); }
.pf__lanecard-t { font-size: var(--fs-small); font-weight: 620; margin-bottom: 0.3rem; }
.pf__lanecard-p { margin: 0; font-size: var(--fs-micro); line-height: 1.65; color: var(--ink-body); }
.pf__lanecard-m { margin: 0.45rem 0 0; font-size: var(--fs-tick); color: var(--ink-mute); }
</style>
