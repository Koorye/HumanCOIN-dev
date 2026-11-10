<script setup lang="ts">
/**
 * Fig. 2c — eighty verbs, stacked by tier.
 *
 * The count curve is the report's long tail: a steep head, then seventy small
 * bars. All eighty are drawn at once so the tail is a shape rather than a
 * promise, and the pointer takes over the labelling — the readout names the
 * verb under the cursor and its three tier counts, so the x-axis can stay a
 * rank axis instead of eighty rotated words.
 *
 * "Top 20" rewrites the same series at a readable scale for the head; it does
 * not change the data, and the disclosure table always carries the first twenty.
 */
import { computed, ref, watch } from 'vue'
import type { Bi } from '@/content'
import { useI18n } from '@/composables/useI18n'
import { useChartPlay, useChartWidth } from '@/composables/useChart'
import { TIER_IDS, VERBS, VERB_TOTALS, tierOf } from '@/data/fig2'

defineProps<{ note?: Bi }>()

const { t, isZh } = useI18n()
const { el: playEl, playing, replay } = useChartPlay<HTMLDivElement>({ margin: '0px 0px -16% 0px' })
const { el: widthEl, width } = useChartWidth<HTMLDivElement>(1000)

const mode = ref<'all' | 'top'>('all')
const active = ref<number | null>(null)

const rows = computed(() => (mode.value === 'all' ? VERBS : VERBS.slice(0, 20)))
const n = computed(() => rows.value.length)

const H = 318
const PAD = { l: 42, r: 10, t: 28, b: 62 }
const MAX_Y = 80
const Y_TICKS = [0, 20, 40, 60, 80]

const W = computed(() => Math.max(320, width.value))
const plotW = computed(() => W.value - PAD.l - PAD.r)
const base = H - PAD.b
const plotH = base - PAD.t

const gap = computed(() => (mode.value === 'all' ? 2 : 8))
const barW = computed(() => Math.max(1.5, (plotW.value - gap.value * (n.value - 1)) / n.value))
const step = computed(() => barW.value + gap.value)

const yOf = (v: number) => base - (v / MAX_Y) * plotH
const xOf = (i: number) => PAD.l + i * step.value

const bars = computed(() =>
  rows.value.map((v, i) => {
    let acc = 0
    const segs = TIER_IDS.map((tid) => {
      const value = v.tiers[tid]
      const y = base - ((acc + value) / MAX_Y) * plotH
      acc += value
      return { tid, value, y, h: (value / MAX_Y) * plotH, color: tierOf(tid).color }
    })
    return {
      v,
      i,
      x: xOf(i),
      cx: xOf(i) + barW.value / 2,
      segs,
    }
  }),
)

const bracket = computed(() => {
  if (mode.value !== 'all' || bars.value.length < 10) return null
  const a = bars.value[0]
  const b = bars.value[9]
  return { x1: a.x, x2: b.x + barW.value, y: PAD.t - 6, cx: (a.x + b.x + barW.value) / 2 }
})

const topShare = Math.round((VERB_TOTALS.top10 / VERB_TOTALS.entries) * 100)

const current = computed(() => (active.value === null ? null : bars.value[active.value] ?? null))

const tooltip = computed(() => {
  const bar = current.value
  if (!bar) return null
  const total = bar.v.total
  const y = Math.max(12, yOf(total) - 7)
  return { x: Math.min(W.value - 16, Math.max(PAD.l + 12, bar.cx)), y, value: total }
})

const labelEvery = computed(() => (mode.value === 'top' ? 1 : W.value < 560 ? 4 : W.value < 820 ? 2 : 1))

function show(i: number) {
  active.value = i
}

function hide() {
  active.value = null
}

watch(mode, () => {
  active.value = null
})

const readout = computed(() => {
  const bar = current.value
  if (bar) {
    const v = bar.v
    return isZh.value
      ? `${v.verb} · 共 ${v.total} 条 · L1 ${v.tiers.L1} / L2 ${v.tiers.L2} / L3 ${v.tiers.L3}。`
      : `${v.verb} · ${v.total} entries · L1 ${v.tiers.L1} / L2 ${v.tiers.L2} / L3 ${v.tiers.L3}.`
  }
  return isZh.value
    ? `80 个动词共 ${VERB_TOTALS.entries.toLocaleString('en-US')} 条标注步骤。前十位占 ${topShare}%，其余七十个一路拖到尾。`
    : `Eighty verbs carry ${VERB_TOTALS.entries.toLocaleString('en-US')} annotated step entries. The first ten hold ${topShare}%; the remaining seventy trail off to a handful each.`
})

</script>

<template>
  <div class="tail">
    <div class="chart-toolbar">
      <div class="chart-tabs" role="group" :aria-label="t({ en: 'Verbs shown', zh: '显示的动词' })">
        <button type="button" :aria-pressed="mode === 'all'" @click="mode = 'all'">
          {{ t({ en: 'All 80', zh: '全部 80 个' }) }}
        </button>
        <button type="button" :aria-pressed="mode === 'top'" @click="mode = 'top'">
          {{ t({ en: 'Top 20', zh: '前 20 个' }) }}
        </button>
      </div>
      <button class="chart-replay" type="button" @click="replay">
        <svg viewBox="0 0 16 16" aria-hidden="true">
          <path d="M13.5 8a5.5 5.5 0 1 1-1.6-3.9M13.5 2v3.2H10.3" />
        </svg>
        {{ t({ en: 'Replay', zh: '重播' }) }}
      </button>
    </div>

    <div ref="playEl" class="tail__body chart-stage" :class="{ 'is-play': playing }">
      <div ref="widthEl" class="tail__inner" @pointerleave="hide">
      <svg
        :viewBox="`0 0 ${W} ${H}`"
        role="img"
        :aria-label="t({
          en: 'Eighty verbs by number of annotated step entries, stacked by tier',
          zh: '八十个动词按标注步骤数排序，并按层级堆叠',
        })"
        @click.self="hide"
      >
        <!-- grid and axis -->
        <g aria-hidden="true">
          <g v-for="tick in Y_TICKS" :key="tick">
            <line
              class="ch-grid--strong"
              :x1="PAD.l"
              :x2="W - PAD.r"
              :y1="yOf(tick)"
              :y2="yOf(tick)"
            />
            <text class="y-tick" :x="PAD.l - 8" :y="yOf(tick) + 3.5" text-anchor="end">{{ tick }}</text>
          </g>
          <line class="baseline" :x1="PAD.l" :x2="W - PAD.r" :y1="base" :y2="base" />
        </g>

        <!-- the ten-verb head, bracketed -->
        <g v-if="bracket" class="bracket" aria-hidden="true">
          <path :d="`M${bracket.x1} ${bracket.y + 5}V${bracket.y}H${bracket.x2}V${bracket.y + 5}`" />
          <text :x="bracket.cx" :y="bracket.y - 5" text-anchor="middle">
            {{ t({ en: `top 10 · ${topShare}% of entries`, zh: `前 10 个 · 占 ${topShare}% 条目` }) }}
          </text>
        </g>

        <!-- bars -->
        <g class="bars" :class="{ 'is-hover': current }">
          <g
            v-for="bar in bars"
            :key="bar.v.verb"
            class="bar"
            :class="{ 'is-active': active === bar.i }"
            :style="{ '--i': bar.i }"
          >
            <rect
              v-for="seg in bar.segs"
              :key="seg.tid"
              :x="bar.x"
              :y="seg.y"
              :width="barW"
              :height="Math.max(0, seg.h)"
              :fill="seg.color"
            />
          </g>
        </g>

        <!-- pointer guide and value label -->
        <g v-if="current && tooltip" class="cursor" aria-hidden="true">
          <line :x1="current.cx" :x2="current.cx" :y1="PAD.t - 4" :y2="base" />
          <circle :cx="current.cx" :cy="yOf(current.v.total)" r="2.4" />
          <text :x="tooltip.x" :y="tooltip.y" text-anchor="middle">{{ tooltip.value }}</text>
        </g>

        <!-- x labels -->
        <g aria-hidden="true">
          <template v-for="bar in bars" :key="`l-${bar.v.verb}`">
            <text
              v-if="bar.i % labelEvery === 0"
              class="x-label"
              :x="bar.cx"
              :y="base + 12"
              :transform="`rotate(-90 ${bar.cx} ${base + 12})`"
              text-anchor="end"
            >
              {{ bar.v.verb }}
            </text>
          </template>
        </g>

        <!-- hit areas, above the marks so every bar is inspectable -->
        <g>
          <rect
            v-for="bar in bars"
            :key="`hit-${bar.v.verb}`"
            class="hit"
            :x="bar.x - gap / 2"
            :y="PAD.t"
            :width="step"
            :height="plotH"
            tabindex="0"
            :aria-label="
              isZh
                ? `${bar.v.verb}，${bar.v.total} 条；L1 ${bar.v.tiers.L1}，L2 ${bar.v.tiers.L2}，L3 ${bar.v.tiers.L3}`
                : `${bar.v.verb}, ${bar.v.total} entries; L1 ${bar.v.tiers.L1}, L2 ${bar.v.tiers.L2}, L3 ${bar.v.tiers.L3}`
            "
            @pointerenter="show(bar.i)"
            @focus="show(bar.i)"
            @blur="hide"
          />
        </g>
      </svg>
      </div>
    </div>

    <p class="chart-readout" aria-live="polite">{{ readout }}</p>

    <p v-if="note" class="fig__note">{{ t(note) }}</p>

    <details class="chart-data">
      <summary>{{ t({ en: 'Read the data', zh: '查看数据' }) }}</summary>
      <div class="chart-data__scroll">
      <table class="data-table data-table--verb">
        <thead>
          <tr>
            <th>{{ t({ en: 'Verb', zh: '动词' }) }}</th>
            <th>{{ t({ en: 'L1', zh: 'L1' }) }}</th>
            <th>{{ t({ en: 'L2', zh: 'L2' }) }}</th>
            <th>{{ t({ en: 'L3', zh: 'L3' }) }}</th>
            <th>{{ t({ en: 'Total', zh: '合计' }) }}</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="v in VERBS.slice(0, 20)" :key="v.verb">
            <td>{{ v.verb }}</td>
            <td class="num">{{ v.tiers.L1 }}</td>
            <td class="num">{{ v.tiers.L2 }}</td>
            <td class="num">{{ v.tiers.L3 }}</td>
            <td class="num">{{ v.total }}</td>
          </tr>
        </tbody>
      </table>
      </div>
      <p class="chart-data__note">
        {{ t({ en: 'First twenty of eighty shown; the full lexicon is in the release.', zh: '此处列出八十个中的前二十个；完整词表随数据发布。' }) }}
      </p>
    </details>
  </div>
</template>

<style scoped>
.tail__body { width: 100%; min-width: 0; }
.tail__inner { width: 100%; min-width: 0; }
.tail__inner > svg { display: block; width: 100%; height: auto; overflow: visible; }

.y-tick {
  font-family: var(--ff-mono);
  font-size: 10px;
  fill: var(--ink-mute);
  font-variant-numeric: tabular-nums;
}
.baseline { stroke: var(--line-strong); stroke-width: 1; }

.bracket path { fill: none; stroke: var(--line-strong); stroke-width: 1; }
.bracket text {
  font-family: var(--ff-mono);
  font-size: 9.5px;
  letter-spacing: 0.02em;
  fill: var(--ink-mute);
}

.bar { transition: opacity 180ms var(--ease); }
.bar.is-active { opacity: 1; }
.bars.is-hover .bar:not(.is-active) { opacity: 0.72; }
.is-play .bar { animation: ch-grow-y 820ms var(--ease-out) both; animation-delay: calc(var(--i) * 8ms); }

.cursor line { stroke: var(--ink-mute); stroke-width: 1; stroke-dasharray: 2 3; opacity: 0.7; }
.cursor circle { fill: var(--ink); }
.cursor text {
  font-family: var(--ff-mono);
  font-size: 10px;
  fill: var(--ink);
  font-variant-numeric: tabular-nums;
}

.x-label {
  font-family: var(--ff-sans);
  font-size: 10px;
  fill: var(--ink-soft);
}
.hit { fill: transparent; cursor: crosshair; outline: none; }
.hit:focus-visible { outline: none; stroke: var(--c-blue); stroke-width: 1.2; }

.chart-data__note { margin: 0.6rem 0 0; font-size: var(--fs-tick); color: var(--ink-mute); }

@media (prefers-reduced-motion: reduce) {
  .bar { transition: none; }
}
</style>
