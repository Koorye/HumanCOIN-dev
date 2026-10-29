<script setup lang="ts">
/**
 * RQ 02 — event-centred evaluation, as a forest plot of controls.
 *
 * One row per quantity (event detected, response recovered, hand error after the
 * event), one marker per condition. Every marker is placed by its *change from
 * the vision-only baseline*, in the metric's own direction, as a percentage, so
 * four quantities in three units share one axis and positive always means
 * better — the same normalisation the RQ 01 scatter uses.
 *
 * The interval is the 95% interval on that change, derived from the published
 * per-run SD (n = 5) as ±t·SE with t = 2.776 for 4 degrees of freedom, matching
 * the forest plot in RQ 01. It is an interval on a mean difference under the
 * seeded-simulation protocol, not a between-participant interval.
 *
 * What the reader should take from it: the proposed condition clears the null
 * rule on every row, and both ablation controls cross it on every row. That
 * contrast — not the proposed row's height on its own — is what makes the
 * comparison an experiment rather than a number.
 */
import { computed } from 'vue'
import { useI18n } from '@/composables/useI18n'
import { useInView } from '@/composables/useReveal'
import {
  EVENT_CONTROLS,
  EVENT_TARGETS,
  PROPOSED_ROW,
  eventResults,
  type EventCell,
} from '@/data/eventEval'

const { t, isZh } = useI18n()

const { el: chartEl, shown: chartIn } = useInView<SVGSVGElement>({ margin: '0px 0px -8% 0px' })

/** t(0.975, df = 4): five runs per condition. */
const T95 = 2.776

const cells = computed<EventCell[][]>(() => eventResults())

interface Mark {
  row: number
  change: number
  lo: number
  hi: number
  sig: boolean
  proposed: boolean
  control: boolean
  name: string
}

interface Row {
  index: number
  label: string
  unit: string
  window: string
  up: boolean
  marks: Mark[]
}

/**
 * Change in per cent and its 95% interval, both taken in the metric's own
 * direction so that a positive number is always an improvement. The baseline's
 * own spread enters the interval through the pooled term, the same way the RQ 01
 * forest plot does it, because the two conditions share a seed.
 */
function mark(target: number, row: number): Mark {
  const base = cells.value[0][target]
  const cell = cells.value[row][target]
  const dir = EVENT_TARGETS[target].direction === 'up' ? 1 : -1
  /* Relative change, oriented so positive is better, and its half-width from
     the pooled per-run SD. Both are in per cent of the baseline. */
  const change = (dir * (cell.mean - base.mean)) / base.mean
  const se = Math.sqrt((cell.sd ** 2 + base.sd ** 2) / 2) / base.mean
  const half = T95 * se * Math.SQRT2
  const c = EVENT_CONTROLS[row]
  return {
    row,
    change: change * 100,
    lo: (change - half) * 100,
    hi: (change + half) * 100,
    sig: change - half > 0 || change + half < 0,
    proposed: Boolean(c.proposedRow),
    control: Boolean(c.ablationControl),
    name: t(c.label),
  }
}

const rows = computed<Row[]>(() =>
  EVENT_TARGETS.map((target, j) => ({
    index: j,
    label: isZh.value ? target.label.zh : target.label.en,
    unit: isZh.value ? target.unit.zh : target.unit.en,
    window: target.window ? (isZh.value ? target.window.zh : target.window.en) : '',
    up: target.direction === 'up',
    marks: EVENT_CONTROLS.map((_, i) => mark(j, i)),
  })),
)

const W = 760
const ROW_H = 52
const PAD = { l: 176, r: 118, t: 30, b: 62 }
const H = PAD.t + rows.value.length * ROW_H + PAD.b
const PLOT_W = W - PAD.l - PAD.r

/** Symmetric axis, rounded out to a tidy step on the largest interval. */
const extent = computed(() => {
  const m = Math.max(...rows.value.flatMap((r) => r.marks.flatMap((k) => [Math.abs(k.lo), Math.abs(k.hi)])))
  const step = m > 40 ? 20 : m > 15 ? 10 : 5
  return Math.ceil(m / step) * step
})

const x = (v: number) => PAD.l + (0.5 + v / (extent.value * 2)) * PLOT_W

const ticks = computed(() => {
  const step = extent.value > 40 ? 20 : extent.value > 15 ? 10 : 5
  const out: number[] = []
  for (let v = -extent.value; v <= extent.value + 1e-6; v += step) out.push(v)
  return out
})

const legend = computed(() => [
  { mark: 'proposed', text: t(EVENT_CONTROLS[PROPOSED_ROW].label) },
  { mark: 'control', text: `${t(EVENT_CONTROLS[2].label)} · ${t(EVENT_CONTROLS[3].label)}` },
  { mark: 'base', text: t(EVENT_CONTROLS[0].label) },
])
</script>

<template>
  <svg
    ref="chartEl"
    class="efp"
    :class="{ 'is-in': chartIn }"
    :viewBox="`0 0 ${W} ${H}`"
    role="img"
    :aria-label="isZh
      ? '事件为中心的评估：各条件相对仅视觉基线的变化，附 95% 区间'
      : 'Event-centred evaluation: change from the vision-only baseline per condition, with 95% intervals'"
  >
    <!-- grid + null rule -->
    <g>
      <line
        v-for="v in ticks"
        :key="v"
        :class="Math.abs(v) < 1e-6 ? 'efp__null' : 'efp__grid'"
        :x1="x(v)"
        :x2="x(v)"
        :y1="PAD.t - 12"
        :y2="H - PAD.b + 8"
      />
      <text
        v-for="v in ticks"
        :key="`t${v}`"
        class="efp__tick"
        :x="x(v)"
        :y="H - PAD.b + 24"
        text-anchor="middle"
      >
        {{ v > 0 ? `+${v}` : v }}
      </text>
    </g>
    <text class="efp__axis" :x="PAD.l + PLOT_W / 2" :y="H - PAD.b + 44" text-anchor="middle">
      {{ isZh ? '相对仅视觉基线的变化（%）· 正值为更好' : 'change vs vision-only (%) · positive is better' }}
    </text>

    <!-- rows -->
    <g v-for="(r, ri) in rows" :key="r.index" class="efp__row" :style="{ '--i': ri }">
      <text class="efp__name" :x="PAD.l - 14" :y="PAD.t + ri * ROW_H + ROW_H / 2 + 4" text-anchor="end">
        {{ r.label }}
      </text>
      <text class="efp__sub" :x="PAD.l - 14" :y="PAD.t + ri * ROW_H + ROW_H / 2 + 20" text-anchor="end">
        {{ [r.window, r.unit, r.up ? (isZh ? '越高越好' : 'higher better') : (isZh ? '越低越好' : 'lower better')].filter(Boolean).join(' · ') }}
      </text>

      <g
        v-for="k in r.marks"
        :key="k.row"
        :class="['efp__mark', k.proposed ? 'efp__mark--proposed' : k.control ? 'efp__mark--control' : 'efp__mark--base']"
      >
        <line
          class="efp__ci"
          :x1="x(k.lo)"
          :x2="x(k.hi)"
          :y1="PAD.t + ri * ROW_H + ROW_H / 2"
          :y2="PAD.t + ri * ROW_H + ROW_H / 2"
        />
        <line
          class="efp__cap"
          :x1="x(k.lo)"
          :x2="x(k.lo)"
          :y1="PAD.t + ri * ROW_H + ROW_H / 2 - 4"
          :y2="PAD.t + ri * ROW_H + ROW_H / 2 + 4"
        />
        <line
          class="efp__cap"
          :x1="x(k.hi)"
          :x2="x(k.hi)"
          :y1="PAD.t + ri * ROW_H + ROW_H / 2 - 4"
          :y2="PAD.t + ri * ROW_H + ROW_H / 2 + 4"
        />
        <circle
          class="efp__dot"
          :cx="x(k.change)"
          :cy="PAD.t + ri * ROW_H + ROW_H / 2"
          :r="k.proposed ? 5.6 : 4.2"
          :class="{ 'is-sig': k.sig }"
        >
          <title>
            {{ k.name }} · {{ r.label }}: {{ k.change >= 0 ? '+' : '' }}{{ k.change.toFixed(1) }}%
            [{{ k.lo.toFixed(1) }}, {{ k.hi.toFixed(1) }}]{{ k.sig ? ' · clears zero' : ' · crosses zero' }}
          </title>
        </circle>
      </g>

      <!-- proposed value, in the row's own right margin -->
      <text class="efp__val" :x="W - 14" :y="PAD.t + ri * ROW_H + ROW_H / 2 - 1" text-anchor="end">
        {{ r.marks[PROPOSED_ROW].change >= 0 ? '+' : '' }}{{ r.marks[PROPOSED_ROW].change.toFixed(1) }}%
      </text>
      <text class="efp__val efp__val--dim" :x="W - 14" :y="PAD.t + ri * ROW_H + ROW_H / 2 + 14" text-anchor="end">
        [{{ r.marks[PROPOSED_ROW].lo.toFixed(1) }}, {{ r.marks[PROPOSED_ROW].hi.toFixed(1) }}]
      </text>
    </g>

    <!-- mark legend -->
    <g class="efp__legend" :transform="`translate(${PAD.l}, ${H - 12})`">
      <g v-for="(l, li) in legend" :key="l.text" :transform="`translate(${li * 250}, 0)`">
        <circle
          class="efp__dot"
          :class="[`efp__key--${l.mark}`]"
          cx="0"
          cy="-3"
          :r="l.mark === 'proposed' ? 4.6 : 3.8"
        />
        <text class="efp__key" x="10" y="1">{{ l.text }}</text>
      </g>
    </g>
  </svg>
</template>

<style scoped>
.efp { width: 100%; height: auto; display: block; }

.efp__grid { stroke: var(--line); stroke-width: 1; }
.efp__null { stroke: var(--ink-mute); stroke-width: 1.2; stroke-dasharray: 3 3; }
.efp__tick,
.efp__val,
.efp__key {
  font-family: var(--ff-mono);
  font-size: var(--fs-tick);
  font-variant-numeric: tabular-nums;
}
.efp__tick { fill: var(--ink-mute); }
.efp__val { fill: var(--c-teal); }
.efp__val--dim { fill: var(--ink-mute); }
.efp__key { fill: var(--ink-mute); }
.efp__axis {
  font-family: var(--ff-mono);
  font-size: var(--fs-tick);
  letter-spacing: 0.06em;
  text-transform: uppercase;
  fill: var(--ink-mute);
}
.efp__name { font-family: var(--ff-sans); font-size: var(--fs-small); font-weight: 600; fill: var(--ink); }
.efp__sub { font-family: var(--ff-mono); font-size: var(--fs-tick); fill: var(--ink-mute); }

.efp__ci, .efp__cap { stroke: var(--line-strong); stroke-width: 1.4; }
.efp__dot { fill: var(--paper); stroke: var(--line-strong); stroke-width: 1.6; }

.efp__mark--base .efp__dot { fill: var(--ink-mute); stroke: var(--ink-mute); stroke-width: 1.4; }
.efp__mark--base .efp__ci, .efp__mark--base .efp__cap { stroke: var(--ink-mute); opacity: 0.5; }

/* The proposed row is the claim: full weight, teal. */
.efp__mark--proposed .efp__ci, .efp__mark--proposed .efp__cap { stroke: var(--c-teal); stroke-width: 1.8; }
.efp__mark--proposed .efp__dot { stroke: var(--c-teal); stroke-width: 2; }
.efp__mark--proposed .efp__dot.is-sig { fill: var(--c-teal); }

/* Ablation controls: present but subordinate, so the eye reads them as the check. */
.efp__mark--control { opacity: 0.75; }
.efp__mark--control .efp__dot { fill: var(--paper); stroke: var(--c-blue); stroke-dasharray: none; }
.efp__mark--control .efp__ci, .efp__mark--control .efp__cap { stroke: var(--c-blue); opacity: 0.7; }

.efp__key--base { fill: var(--ink-mute); stroke: var(--ink-mute); }
.efp__key--control { fill: var(--paper); stroke: var(--c-blue); }
.efp__key--proposed { fill: var(--c-teal); stroke: var(--c-teal); }

@media (prefers-reduced-motion: no-preference) {
  .efp.is-in .efp__row {
    animation: efp-row var(--dur-3) var(--ease-out) backwards;
    animation-delay: calc(var(--i) * var(--stagger) + 100ms);
  }
  .efp.is-in .efp__mark {
    animation: efp-mark var(--dur-2) var(--ease-out) backwards;
    animation-delay: calc(var(--i) * var(--stagger) + 220ms);
  }
}
@keyframes efp-row {
  from { opacity: 0; transform: translateY(5px); }
  to { opacity: 1; transform: none; }
}
@keyframes efp-mark {
  from { opacity: 0; }
  to { opacity: 1; }
}
</style>
