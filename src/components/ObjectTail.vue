<script setup lang="ts">
/**
 * Fig. 2d — six hundred object entries, and one object opened at two depths.
 *
 * At 600 ranks the bars stop being individual marks and become a silhouette:
 * the shape is the distribution, and the pointer (or the arrow keys) reads the
 * entry under it into the readout. "Top 60" restores names to the head of the
 * list. The inset is the report's worked example — the cup is a name at L1 and
 * a measured record at L2 and L3 — and it sits beside the tail rather than
 * inside it, so neither is asked to carry the other's argument.
 */
import { computed, ref, watch } from 'vue'
import type { Bi } from '@/content'
import { useI18n } from '@/composables/useI18n'
import { useChartPlay, useChartWidth } from '@/composables/useChart'
import { CUP, OBJECTS, OBJECT_TOTALS, TIER_IDS, tierOf } from '@/data/fig2'

defineProps<{ note?: Bi }>()

const { t, isZh } = useI18n()
const { el: playEl, playing, replay } = useChartPlay<HTMLDivElement>({ margin: '0px 0px -16% 0px' })
const { el: widthEl, width } = useChartWidth<HTMLDivElement>(900)

const mode = ref<'all' | 'top'>('all')
const active = ref<number | null>(null)
const svgEl = ref<SVGSVGElement | null>(null)

const rows = computed(() => (mode.value === 'all' ? OBJECTS : OBJECTS.slice(0, 60)))
const n = computed(() => rows.value.length)

const H = computed(() => (mode.value === 'all' ? 290 : 306))
const PAD = { l: 42, r: 12, t: 30, b: 60 }
const MAX_Y = 200
const Y_TICKS = [0, 50, 100, 150, 200]

const W = computed(() => Math.max(320, width.value))
const plotW = computed(() => W.value - PAD.l - PAD.r)
const base = computed(() => H.value - PAD.b)
const plotH = computed(() => base.value - PAD.t)

const gap = computed(() => (mode.value === 'all' ? 0 : 2))
const barW = computed(() =>
  Math.max(0.35, (plotW.value - gap.value * (n.value - 1)) / n.value),
)
const step = computed(() => barW.value + gap.value)

const yOf = (v: number) => base.value - (v / MAX_Y) * plotH.value
const xOf = (i: number) => PAD.l + i * step.value

const bars = computed(() =>
  rows.value.map((obj, i) => {
    let acc = 0
    const segs = TIER_IDS.map((tid) => {
      const value = obj.tiers[tid]
      const y = base.value - ((acc + value) / MAX_Y) * plotH.value
      acc += value
      return { tid, value, y, h: (value / MAX_Y) * plotH.value, color: tierOf(tid).color }
    })
    return { obj, i, x: xOf(i), cx: xOf(i) + barW.value / 2, segs }
  }),
)

const current = computed(() => (active.value === null ? null : bars.value[active.value] ?? null))

const labelEvery = computed(() => (mode.value === 'top' ? (W.value < 450 ? 3 : W.value < 620 ? 2 : 1) : 1))

const rankTicks = computed(() => {
  if (mode.value !== 'all') return []
  return [1, 100, 200, 300, 400, 500, 600].map((rank) => ({
    rank,
    x: PAD.l + (rank - 0.5) * barW.value,
  }))
})

const topShare = Math.round((OBJECT_TOTALS.top20 / OBJECT_TOTALS.instances) * 100)
const head = computed(() => (mode.value === 'all' ? bars.value[0] : null))

const readout = computed(() => {
  const bar = current.value
  if (bar) {
    const o = bar.obj
    return isZh.value
      ? `第 ${o.rank} 位 · ${o.name} · ${o.total} 个实例 · L1 ${o.tiers.L1} / L2 ${o.tiers.L2} / L3 ${o.tiers.L3}。`
      : `Rank ${o.rank} · ${o.name} · ${o.total} instances · L1 ${o.tiers.L1} / L2 ${o.tiers.L2} / L3 ${o.tiers.L3}.`
  }
  return isZh.value
    ? `600 条物体记录共 ${OBJECT_TOTALS.instances.toLocaleString('en-US')} 个实例。前二十条占 ${topShare}%，其余一路降到单件。`
    : `Six hundred object entries hold ${OBJECT_TOTALS.instances.toLocaleString('en-US')} instances. The first twenty account for ${topShare}%; the tail runs down to a handful.`
})

function indexAt(clientX: number): number | null {
  const svg = svgEl.value
  if (!svg) return null
  const box = svg.getBoundingClientRect()
  if (!box.width) return null
  const x = ((clientX - box.left) / box.width) * W.value
  if (x < PAD.l || x > W.value - PAD.r) return null
  const raw = Math.floor((x - PAD.l) / step.value)
  return Math.min(n.value - 1, Math.max(0, raw))
}

function onMove(event: PointerEvent) {
  active.value = indexAt(event.clientX)
}

function onKey(event: KeyboardEvent) {
  if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return
  event.preventDefault()
  const last = n.value - 1
  if (event.key === 'Home') active.value = 0
  else if (event.key === 'End') active.value = last
  else {
    const from = active.value ?? -1
    active.value = Math.min(last, Math.max(0, from + (event.key === 'ArrowRight' ? 1 : -1)))
  }
}

watch(mode, () => {
  active.value = null
})

const fmt = (v: number) => v.toLocaleString('en-US')
const pct = (v: number) => v.toFixed(1)
</script>

<template>
  <div class="objects">
    <div class="objects__chart">
      <div class="chart-toolbar">
        <div class="chart-tabs" role="group" :aria-label="t({ en: 'Objects shown', zh: '显示的物体' })">
          <button type="button" :aria-pressed="mode === 'all'" @click="mode = 'all'">
            {{ t({ en: 'All 600', zh: '全部 600 个' }) }}
          </button>
          <button type="button" :aria-pressed="mode === 'top'" @click="mode = 'top'">
            {{ t({ en: 'Top 60', zh: '前 60 个' }) }}
          </button>
        </div>
        <button class="chart-replay" type="button" @click="replay">
          <svg viewBox="0 0 16 16" aria-hidden="true">
            <path d="M13.5 8a5.5 5.5 0 1 1-1.6-3.9M13.5 2v3.2H10.3" />
          </svg>
          {{ t({ en: 'Replay', zh: '重播' }) }}
        </button>
      </div>

      <div ref="playEl" class="objects__body chart-stage" :class="{ 'is-play': playing }">
        <div ref="widthEl" class="objects__inner">
        <svg
          ref="svgEl"
          :viewBox="`0 0 ${W} ${H}`"
          role="img"
          tabindex="0"
          :aria-label="t({
            en: 'Six hundred object entries by number of instances, stacked by tier. Move the pointer or use the arrow keys to inspect an entry.',
            zh: '六百条物体记录按实例数排序，并按层级堆叠。移动指针或使用方向键查看条目。',
          })"
          @pointermove="onMove"
          @pointerleave="active = null"
          @keydown="onKey"
          @blur="active = null"
        >
          <g aria-hidden="true">
            <text class="axis-title" x="6" y="12">{{ t({ en: 'instances', zh: '实例' }) }}</text>
            <g v-for="tick in Y_TICKS" :key="tick">
              <line class="ch-grid--strong" :x1="PAD.l" :x2="W - PAD.r" :y1="yOf(tick)" :y2="yOf(tick)" />
              <text class="y-tick" :x="PAD.l - 8" :y="yOf(tick) + 3.5" text-anchor="end">{{ tick }}</text>
            </g>
            <line class="baseline" :x1="PAD.l" :x2="W - PAD.r" :y1="base" :y2="base" />
          </g>

          <g class="bars">
            <g v-for="bar in bars" :key="bar.obj.rank">
              <rect
                v-for="seg in bar.segs"
                :key="seg.tid"
                :x="bar.x"
                :y="seg.y"
                :width="Math.max(0.35, barW)"
                :height="Math.max(0, seg.h)"
                :fill="seg.color"
                shape-rendering="crispEdges"
              />
            </g>
          </g>

          <g v-if="head" class="head-note" aria-hidden="true">
            <line :x1="head.cx" :x2="head.cx + 26" :y1="yOf(head.obj.total) + 2" :y2="yOf(head.obj.total) - 14" />
            <text :x="head.cx + 31" :y="yOf(head.obj.total) - 16">
              {{ head.obj.name }} · {{ head.obj.total }}
            </text>
          </g>

          <g v-if="current" class="cursor" aria-hidden="true">
            <rect :x="current.x - 2" :y="PAD.t" :width="Math.max(4, barW + 3)" :height="plotH" />
            <line :x1="current.cx" :x2="current.cx" :y1="PAD.t" :y2="base" />
            <circle :cx="current.cx" :cy="yOf(current.obj.total)" r="2.4" />
            <text
              :x="Math.min(W - 18, Math.max(PAD.l + 16, current.cx))"
              :y="Math.max(16, yOf(current.obj.total) - 7)"
              text-anchor="middle"
            >
              {{ current.obj.total }}
            </text>
          </g>

          <g v-if="mode === 'all'" aria-hidden="true">
            <text
              v-for="tick in rankTicks"
              :key="tick.rank"
              class="x-label"
              :x="tick.x"
              :y="base + 16"
              text-anchor="middle"
            >
              {{ tick.rank }}
            </text>
            <text class="axis-note" :x="(PAD.l + W - PAD.r) / 2" :y="base + 46" text-anchor="middle">
              {{ t({ en: 'object rank', zh: '物体排序' }) }}
            </text>
          </g>
          <g v-else aria-hidden="true">
            <template v-for="bar in bars" :key="`l-${bar.obj.rank}`">
              <text
                v-if="bar.i % labelEvery === 0"
                class="x-label"
                :x="bar.cx"
                :y="base + 12"
                :transform="`rotate(-90 ${bar.cx} ${base + 12})`"
                text-anchor="end"
              >
                {{ bar.obj.name }}
              </text>
            </template>
          </g>
        </svg>
        </div>
      </div>

      <ul class="chart-legend objects__legend">
        <li v-for="tid in TIER_IDS" :key="tid">
          <i :style="{ background: tierOf(tid).color }" />{{ tid }} · {{ t(tierOf(tid).name) }}
        </li>
      </ul>

      <p class="chart-readout" aria-live="polite">{{ readout }}</p>
    </div>

    <aside class="record" :class="{ 'is-play': playing }">
      <p class="record__eyebrow">{{ t({ en: 'One object, two depths', zh: '一个物体，两种深度' }) }}</p>
      <div class="record__head">
        <div class="record__photo" :style="{ '--i': 4 }">
          <img :src="CUP.image" :alt="t({ en: 'A white ceramic cup', zh: '一只白色陶瓷杯' })" loading="lazy" />
        </div>
        <div class="record__intro">
          <p class="record__tag record__tag--l1 mono">L1</p>
          <p class="record__name">{{ t(CUP.name) }}</p>
          <p class="record__note">{{ t(CUP.l1) }}</p>
        </div>
      </div>

      <div class="record__full">
        <p class="record__tag record__tag--l23 mono">+ L2 / L3</p>
        <dl class="record__attrs">
          <div v-for="attr in CUP.attrs" :key="attr.k.en">
            <dt>{{ t(attr.k) }}</dt>
            <dd>
              <span
                v-if="attr.swatch"
                class="record__sw"
                :style="{ background: attr.swatch }"
                aria-hidden="true"
              />
              {{ t(attr.v) }}
            </dd>
          </div>
        </dl>
        <p class="record__note">
          {{ t({ en: 'Measured at capture and linked to the instance.', zh: '采集时实测，并关联到该实例。' }) }}
        </p>
      </div>

      <p class="record__credit">
        {{ t({ en: 'Illustrative cup; attribute values are the report’s example.', zh: '杯子为示意图；属性值取自报告示例。' }) }}
      </p>
    </aside>

    <p v-if="note" class="fig__note objects__note">{{ t(note) }}</p>

    <details class="chart-data objects__data">
      <summary>{{ t({ en: 'Read the data', zh: '查看数据' }) }}</summary>
      <div class="chart-data__scroll">
      <table class="data-table data-table--object">
        <thead>
          <tr>
            <th>{{ t({ en: 'Rank', zh: '排序' }) }}</th>
            <th>{{ t({ en: 'Object', zh: '物体' }) }}</th>
            <th>{{ t({ en: 'L1', zh: 'L1' }) }}</th>
            <th>{{ t({ en: 'L2', zh: 'L2' }) }}</th>
            <th>{{ t({ en: 'L3', zh: 'L3' }) }}</th>
            <th>{{ t({ en: 'Instances', zh: '实例' }) }}</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="obj in OBJECTS.slice(0, 20)" :key="obj.rank">
            <td class="num">{{ obj.rank }}</td>
            <td>{{ obj.name }}</td>
            <td class="num">{{ obj.tiers.L1 }}</td>
            <td class="num">{{ obj.tiers.L2 }}</td>
            <td class="num">{{ obj.tiers.L3 }}</td>
            <td class="num">{{ obj.total }}</td>
          </tr>
        </tbody>
      </table>
      </div>
      <p class="chart-data__note">
        {{ t({ en: 'First twenty of 600 entries shown; the object index ships with the release.', zh: '此处列出 600 条中的前二十条；完整物体索引随数据发布。' }) }}
        {{ t({ en: 'Totals: ', zh: '合计：' }) }}{{ fmt(OBJECT_TOTALS.instances) }} {{ t({ en: 'instances', zh: '个实例' }) }}
        · L1 {{ pct((OBJECTS.reduce((n, o) => n + o.tiers.L1, 0) / OBJECT_TOTALS.instances) * 100) }}%
        · L2 {{ pct((OBJECTS.reduce((n, o) => n + o.tiers.L2, 0) / OBJECT_TOTALS.instances) * 100) }}%
        · L3 {{ pct((OBJECTS.reduce((n, o) => n + o.tiers.L3, 0) / OBJECT_TOTALS.instances) * 100) }}%
      </p>
    </details>
  </div>
</template>

<style scoped>
.mono { font-family: var(--ff-mono); }

.objects {
  display: grid;
  grid-template-columns: minmax(0, 1.58fr) minmax(0, 0.72fr);
  gap: clamp(0.9rem, 0.7rem + 0.8vw, 1.4rem);
  align-items: start;
}
@media (max-width: 900px) {
  .objects { grid-template-columns: minmax(0, 1fr); }
}

.objects__chart { min-width: 0; }
.objects__body { width: 100%; min-width: 0; }
.objects__inner { width: 100%; min-width: 0; }
.objects__inner > svg { display: block; width: 100%; height: auto; overflow: visible; }
.objects__inner > svg:focus-visible { outline: 1px solid var(--c-blue); outline-offset: 6px; }

.axis-title {
  font-family: var(--ff-mono);
  font-size: 10px;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  fill: var(--ink-mute);
}
.y-tick {
  font-family: var(--ff-mono);
  font-size: 10px;
  fill: var(--ink-mute);
  font-variant-numeric: tabular-nums;
}
.baseline { stroke: var(--line-strong); stroke-width: 1; }

.cursor rect { fill: var(--ink); opacity: 0.06; }
.cursor line { stroke: var(--ink); stroke-width: 1; opacity: 0.55; }
.cursor circle { fill: var(--ink); }
.cursor text {
  font-family: var(--ff-mono);
  font-size: 10px;
  fill: var(--ink);
  font-variant-numeric: tabular-nums;
}

.x-label {
  font-family: var(--ff-sans);
  font-size: 9.5px;
  fill: var(--ink-soft);
}
.axis-note {
  font-family: var(--ff-mono);
  font-size: 9.5px;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  fill: var(--ink-mute);
}

.is-play .bars { animation: ch-grow-y 950ms var(--ease-out) both; transform-box: fill-box; transform-origin: center bottom; }

.record {
  border: 1px solid var(--line);
  padding: 0.8rem 0.85rem;
  background: var(--paper);
}
.record__eyebrow {
  margin: 0 0 0.75rem;
  font-family: var(--ff-mono);
  font-size: var(--fs-tick);
  letter-spacing: 0.09em;
  text-transform: uppercase;
  color: var(--ink-mute);
}
.record__head { display: flex; gap: 0.7rem; align-items: flex-start; }
.record__photo {
  flex: none;
  width: 4.8rem;
  aspect-ratio: 1;
  overflow: hidden;
}
.record__photo img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  mix-blend-mode: multiply;
  filter: contrast(1.03);
}
.is-play .record__photo { animation: ch-pop 620ms var(--ease-out) both; animation-delay: 260ms; }
.record__intro { min-width: 0; padding-top: 0.15rem; }
.record__tag {
  margin: 0;
  font-size: var(--fs-tick);
  letter-spacing: 0.06em;
  color: var(--ink-mute);
}
.record__tag--l1 { color: var(--c-blue); }
.record__tag--l23 { color: var(--c-violet); }
.record__name {
  margin: 0.1rem 0 0;
  font-size: var(--fs-h4);
  font-weight: 560;
  color: var(--ink);
  line-height: 1.2;
}
.record__note {
  margin: 0.3rem 0 0;
  font-size: var(--fs-tick);
  line-height: 1.45;
  color: var(--ink-mute);
}
.record__full {
  margin-top: 0.55rem;
  padding-top: 0.45rem;
  border-top: 1px solid var(--line);
}
.record__attrs {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 0.25rem 0.7rem;
  margin: 0.4rem 0 0;
}
.record__attrs div { display: grid; gap: 0.05rem; }
.record__attrs dt {
  font-family: var(--ff-mono);
  font-size: var(--fs-tick);
  color: var(--ink-mute);
  letter-spacing: 0.04em;
  text-transform: uppercase;
}
.record__attrs dd {
  margin: 0;
  font-size: var(--fs-small);
  color: var(--ink);
  display: flex;
  align-items: center;
  gap: 0.35rem;
}
.record__sw {
  width: 0.6rem;
  height: 0.6rem;
  display: inline-block;
  border: 1px solid var(--line-strong);
}
.record__credit {
  margin: 0.5rem 0 0;
  font-size: var(--fs-tick);
  line-height: 1.45;
  color: var(--ink-mute);
  font-style: italic;
}

.objects__data { grid-column: 1 / -1; }
.objects__note { grid-column: 1 / -1; }
.objects__legend {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.3rem 1.1rem;
  list-style: none;
  margin: 0.55rem 0 0;
  padding: 0;
}
.objects__legend li { display: inline-flex; align-items: center; gap: 0.35rem; }
.objects__legend i { width: 0.5rem; height: 0.5rem; display: inline-block; }
.chart-data__note { margin: 0.6rem 0 0; font-size: var(--fs-tick); color: var(--ink-mute); }

.head-note line { stroke: var(--line-strong); stroke-width: 1; }
.head-note text {
  font-family: var(--ff-mono);
  font-size: 9.5px;
  fill: var(--ink-soft);
}

@media (max-width: 420px) {
  .record__attrs { grid-template-columns: minmax(0, 1fr); }
}
</style>
