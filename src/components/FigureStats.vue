<script setup lang="ts">
/**
 * The distribution as one plate of six panels — the section's single chart.
 *
 *   a. hours per tier, linear, open solid and controlled pale;
 *   b. episode length per tier, nine bins of thirty seconds, as a sparkline;
 *   c. breadth — of the 38 scene classes, how many each tier actually records;
 *   d. the 38 classes in zone order, stacked by tier;
 *   e. the verb lexicon as per-tier rank–frequency curves;
 *   f. the object lexicon on the same two cuts.
 *
 * The drawing follows one rule taken from the reference the section was redrawn
 * against: a single muted accent carries every series, and the tiers are
 * separated by weight — light for L1, mid for L2, deep for L3 — never by hue.
 * Everything else is ink, secondary grey and 1px hairlines; there is no fill
 * behind a bar, no boxed plot and no shadow. Marks are thin, grids are weaker
 * than the data, and the numbers sit beside the marks in 11px mono.
 *
 * (c) is the only panel whose numbers are not printed in the report: it counts
 * the non-zero per-class hours that (d) draws, and the note says so.
 *
 * The scene strip is a row of this same grid, between (d) and (e): the frames
 * belong to the scene vocabulary, not to a separate figure below the plate.
 */
import { computed } from 'vue'
import { useI18n } from '@/composables/useI18n'
import { useInView } from '@/composables/useReveal'
import PlotBox from '@/components/PlotBox.vue'
import RankCurve from '@/components/RankCurve.vue'
import TierGlyph from '@/components/TierGlyph.vue'
import TopBars from '@/components/TopBars.vue'
import {
  DURATION_MEDIANS,
  DURATION_PROFILE,
  OBJECTS,
  OBJECT_TOTALS,
  TIERS,
  TIER_IDS,
  VERBS,
  VERB_TOTALS,
  ZONE_GROUPS,
  type TierId,
} from '@/data/fig2'
import { TIER_DASH, TIER_RAMP, TIER_SHAPE, glyphPath } from '@/data/fig8'

const { t, isZh } = useI18n()

/**
 * The plate draws itself once, when it first comes into view: bars grow from
 * their baseline and curves are drawn along their length. Only presentation is
 * animated — transform, opacity and dash offset — so the geometry a reader ends
 * on is exactly the geometry a reader who asked for reduced motion sees at once.
 */
const { el: rootEl, shown } = useInView<HTMLDivElement>({
  margin: '0px 0px -10% 0px',
  threshold: 0.25,
})
const reduced =
  typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches
const on = computed(() => reduced || shown.value)
const fmt = (n: number) => Math.round(n).toLocaleString('en-US')
/** hours to one decimal, as the table reports them */
const hours1 = (n: number) =>
  n.toLocaleString('en-US', { minimumFractionDigits: 1, maximumFractionDigits: 1 })

/* One accent, three weights, everywhere on the plate. */
const TIER_FILL: Record<TierId, string> = TIER_RAMP

/* Row bands shared by (a), (b), (c). */
const ROW_Y = [10, 44, 78]
const ROW_H = 22
const LABEL_W = 24
const H1 = 118
const H2 = 320
const H3 = 150

/* ---- (a) hours ---- */
const HOURS_MAX = Math.max(...TIERS.map((tier) => tier.hours))
const hourRows = TIERS.map((tier) => {
  const ctrl = (tier.hours * tier.setting.controlled) / 100
  return { id: tier.id, hours: tier.hours, open: tier.hours - ctrl, ctrl }
})
const aX = (w: number, v: number) =>
  LABEL_W + (v / HOURS_MAX) * Math.max(40, w - LABEL_W - 62)

/* ---- (b) episode length ---- */
const durRows = TIER_IDS.map((id) => ({ id, shares: DURATION_PROFILE.map((r) => r[id]) }))
const DUR_MAX = Math.max(...durRows.flatMap((r) => r.shares))
const bStep = (w: number) => Math.max(2, (w - LABEL_W - 4) / Math.max(1, DURATION_PROFILE.length))

/** One 22px sparkline per tier: nine points, a light fill, a 1.3px line. */
function durSpark(w: number, i: number, shares: number[]) {
  const step = bStep(w)
  const y0 = ROW_Y[i]
  const pts = shares.map((v, k) => {
    const x = LABEL_W + (k + 0.5) * step
    const y = y0 + ROW_H - (v / DUR_MAX) * ROW_H
    return `${x.toFixed(1)},${y.toFixed(1)}`
  })
  const base = (y0 + ROW_H).toFixed(1)
  const firstX = (LABEL_W + 0.5 * step).toFixed(1)
  const lastX = (LABEL_W + (shares.length - 0.5) * step).toFixed(1)
  return {
    line: `M${pts.join(' L')}`,
    area: `M${firstX},${base} L${pts.join(' L')} L${lastX},${base} Z`,
  }
}

/* ---- (c)/(d) scenes ---- */
const dGroups = computed(() =>
  ZONE_GROUPS.map((g) => ({
    id: g.zone.id as string,
    name: t(g.zone.name),
    scenes: g.scenes.map((s) => ({
      key: s.key,
      name: t(s.name),
      total: s.total,
      hours: s.hours,
    })),
  })),
)
const sceneOrder = computed(() => dGroups.value.flatMap((g) => g.scenes))
const sceneCount = computed(() => sceneOrder.value.length)
const breadth = computed(() =>
  TIER_IDS.map((id) => {
    const cells = sceneOrder.value.map((s) => s.hours[id] > 0)
    return { id, cells, reached: cells.filter(Boolean).length }
  }),
)
const cPitch = (w: number) =>
  Math.max(1.2, (w - LABEL_W - 52) / Math.max(sceneCount.value, 1))
/* the matrix starts a little clear of the row labels, which carry a marker */
const C_PAD = 5

/* ---- (d) the class vocabulary ---- */
const D_MAX = Math.max(...sceneOrder.value.map((s) => s.total))
/* the zone names head their groups at the top of the drawing; under them a band
   holds each column's hours, then the bars, then the rotated class names */
const D_ZONE_Y = 11
const D_GROUP_RULE = 18.5
const D_TOP = 74
const D_BASE = 190
const D_LAB = 194

interface DBar {
  key: string
  name: string
  total: number
  /** the column's top, where its hours label starts */
  top: number
  x: number
  w: number
  segs: { id: TierId; y: number; h: number; fill: string }[]
}

interface DLayout {
  bars: DBar[]
  zones: { id: string; name: string; cx: number; x0: number; x1: number }[]
}

function dLayout(w: number): DLayout {
  const x0 = 1
  const x1 = w - 1
  const gap = 12
  const groups = dGroups.value
  const n = Math.max(1, groups.reduce((k, g) => k + g.scenes.length, 0))
  const pitch = (x1 - x0 - gap * (groups.length - 1)) / n
  const barW = Math.max(1.5, pitch - 6)
  const span = D_BASE - D_TOP

  const bars: DBar[] = []
  const zones: { id: string; name: string; cx: number; x0: number; x1: number }[] = []
  let x = x0

  groups.forEach((g) => {
    const start = x
    for (const s of g.scenes) {
      let acc = 0
      const segs = TIER_IDS.map((id) => {
        const v = s.hours[id]
        const y = D_BASE - ((acc + v) / D_MAX) * span
        const h = (v / D_MAX) * span
        acc += v
        return { id, y, h, fill: TIER_FILL[id] }
      }).filter((seg) => seg.h > 0.15)
      bars.push({
        key: s.key,
        name: s.name,
        total: s.total,
        top: D_BASE - (s.total / D_MAX) * span,
        x,
        w: barW,
        segs,
      })
      x += pitch
    }
    const end = x - pitch + barW
    /* the residual group can be a single class, so its name would hang off the
       right edge; keep every zone name inside the drawing */
    zones.push({
      id: g.id,
      name: g.name,
      cx: Math.min(w - 40, Math.max(40, (start + end) / 2)),
      x0: start,
      x1: end,
    })
    x += gap
  })

  return { bars, zones }
}

/* ---- (e)/(f) rank–frequency, one curve per tier ---- */
/**
 * One series per tier, each ranked within its own counts. Ranking every tier on
 * the total's order would draw a sawtooth: the tier mix of an entry depends on
 * which tier introduces it, so it does not fall with the total. Ranking within
 * the tier is what makes each line a distribution.
 */
function seriesOf(rows: { tiers: Record<TierId, number> }[]) {
  return TIER_IDS.map((id) => ({
    id,
    colour: TIER_FILL[id],
    dash: TIER_DASH[id],
    values: rows
      .map((r) => r.tiers[id])
      .filter((v) => v > 0)
      .sort((a, b) => b - a),
  }))
}
const verbSeries = computed(() => seriesOf(VERBS))
const objectSeries = computed(() => seriesOf(OBJECTS))
/** The columns under each curve: the same lexicons, ranked by the same counts. */
const TOP_N = 20
const verbBars = computed(() =>
  [...VERBS]
    .sort((a, b) => b.total - a.total)
    .map((v) => ({ label: t(v.name), total: v.total, tiers: v.tiers })),
)
const objectBars = computed(() =>
  [...OBJECTS]
    .sort((a, b) => b.total - a.total)
    .map((o) => ({ label: isZh.value ? o.zh : o.name, total: o.total, tiers: o.tiers })),
)
const verbTop10 = Math.round((VERB_TOTALS.top10 / VERB_TOTALS.entries) * 100)
const objectTop20 = Math.round((OBJECT_TOTALS.top20 / OBJECT_TOTALS.instances) * 100)
const verbTail = [...VERBS].sort((a, b) => b.total - a.total).at(-1)?.total ?? 0
const objectTail = OBJECTS[OBJECTS.length - 1]?.total ?? 0
/** tails run to a fraction of one annotation, so keep one decimal below ten */
const tiny = (n: number) =>
  Number.isInteger(n) ? String(n) : n >= 10 ? String(Math.round(n)) : n.toFixed(1)
/* the axes are logarithmic, so the top is the next power of ten above the head */
const axisTop = (series: { values: number[] }[]) =>
  Math.pow(10, Math.ceil(Math.log10(Math.max(2, ...series.flatMap((s) => s.values)))))
const verbTop = computed(() => axisTop(verbSeries.value))
const objectTop = computed(() => axisTop(objectSeries.value))

const A11Y = {
  a: {
    en: 'Hours per tier, split into open and controlled collection.',
    zh: '各层级时长，分为开放与受控采集。',
  },
  b: {
    en: 'Episode length per tier over ten-second bins to 300 s.',
    zh: '各层级片段长度，10 秒一档，到 300 秒。',
  },
  c: {
    en: 'Of the thirty-eight scene classes, how many each tier records. Derived from panel d.',
    zh: '38 个场景类别中，每一层实际记录了多少个；由面板 d 数得。',
  },
  d: {
    en: 'Thirty-eight scene classes in zone order, each bar stacked by the tier that records it.',
    zh: '38 个场景类别按区域排列，条形按记录它的层级堆叠。',
  },
  e: {
    en: 'Rank within each tier against that tier’s count for the verb, on log axes.',
    zh: '各层内部排序与该层动词计数的关系，双对数轴。',
  },
  f: {
    en: 'Rank within each tier against that tier’s instance count for the object entry, on log axes.',
    zh: '各层内部排序与该层物体实例数的关系，双对数轴。',
  },
}

const NOTE = {
  en: 'Every count is read from the report’s Fig. 2 tables — scenes, actions, objects, episode profiles — not modelled; the L2 columns are the report’s estimate. (c) is counted from (d).',
  zh: '所有计数取自报告 Fig. 2 的四张表——场景、动作、物体、片段分布——未经拟合；其中 L2 一列为报告的估计值。(c) 由 (d) 数得。',
}
</script>

<template>
  <div ref="rootEl" class="stats" :data-on="on ? 'true' : 'false'">
    <div class="plate">
      <!-- (a) hours per tier -->
      <figure class="cell cell--a">
        <figcaption class="cell__head">
          <div class="cell__top">
            <p class="cell__t"><span class="cell__n">(a)</span> {{ t({ en: 'Recorded hours', zh: '录制时长' }) }}</p>
            <ul class="cell__okey">
              <li><i class="sw sw--flat" />{{ t({ en: 'open', zh: '开放' }) }}</li>
              <li><i class="sw sw--hatch" />{{ t({ en: 'controlled', zh: '受控' }) }}</li>
            </ul>
          </div>
          <p class="cell__s">
            {{ t({ en: '10,000 · 2,000 · 500 h', zh: '10,000 · 2,000 · 500 小时' }) }}
          </p>
        </figcaption>
        <PlotBox :h="H1" v-slot="{ w }">
          <svg
            class="plot"
            :width="w"
            :height="H1"
            :viewBox="`0 0 ${w} ${H1}`"
            role="img"
            :aria-label="t(A11Y.a)"
          >
            <defs>
              <!-- 45° hairlines: the controlled share is texture, not a second hue -->
              <pattern
                id="hc-hatch"
                width="4"
                height="4"
                patternUnits="userSpaceOnUse"
                patternTransform="rotate(45)"
              >
                <line
                  x1="0"
                  y1="0"
                  x2="0"
                  y2="4"
                  stroke="#fff"
                  stroke-width="1"
                  stroke-opacity="0.9"
                />
              </pattern>
            </defs>
            <line
              v-for="g in [25, 50, 75]"
              :key="g"
              class="grid"
              :x1="aX(w, (g / 100) * HOURS_MAX)"
              :x2="aX(w, (g / 100) * HOURS_MAX)"
              :y1="ROW_Y[0] - 3"
              :y2="ROW_Y[2] + ROW_H + 3"
            />
            <g v-for="(row, i) in hourRows" :key="row.id">
              <path
                :d="glyphPath(TIER_SHAPE[row.id], 4, ROW_Y[i] + 11)"
                :fill="TIER_FILL[row.id]"
              />
              <text class="t-id" x="10.5" :y="ROW_Y[i] + 15">{{ row.id }}</text>
              <g class="grow" :style="{ '--i': i }">
                <rect
                  :x="LABEL_W"
                  :y="ROW_Y[i]"
                  :width="Math.max(1.5, aX(w, row.open) - LABEL_W - (row.ctrl > 0 ? 1 : 0))"
                  :height="ROW_H"
                  :fill="TIER_FILL[row.id]"
                />
                <template v-if="row.ctrl > 0">
                  <rect
                    :x="aX(w, row.open)"
                    :y="ROW_Y[i]"
                    :width="Math.max(1.5, aX(w, row.hours) - aX(w, row.open))"
                    :height="ROW_H"
                    :fill="TIER_FILL[row.id]"
                  />
                  <rect
                    :x="aX(w, row.open)"
                    :y="ROW_Y[i]"
                    :width="Math.max(1.5, aX(w, row.hours) - aX(w, row.open))"
                    :height="ROW_H"
                    fill="url(#hc-hatch)"
                  />
                </template>
              </g>
              <text class="t-val" :x="w" :y="ROW_Y[i] + 15" text-anchor="end">
                {{ fmt(row.hours) }} h
              </text>
            </g>
            <line
              class="base"
              :x1="LABEL_W"
              :x2="w - 62"
              :y1="ROW_Y[2] + ROW_H + 4"
              :y2="ROW_Y[2] + ROW_H + 4"
            />
            <text class="t-tick" :x="LABEL_W" :y="H1 - 2">0</text>
            <text class="t-tick" :x="w - 62" :y="H1 - 2" text-anchor="end">10,000 h</text>
          </svg>
        </PlotBox>
      </figure>

      <!-- (b) episode length -->
      <figure class="cell cell--b">
        <figcaption class="cell__head">
          <p class="cell__t"><span class="cell__n">(b)</span> {{ t({ en: 'Episode length', zh: '片段长度' }) }}</p>
          <p class="cell__s">
            {{ t({ en: 'median bin', zh: '中位数区间' }) }}
            {{ DURATION_MEDIANS.L1 }} / {{ DURATION_MEDIANS.L2 }} / {{ DURATION_MEDIANS.L3 }}
          </p>
        </figcaption>
        <PlotBox :h="H1" v-slot="{ w }">
          <svg
            class="plot"
            :width="w"
            :height="H1"
            :viewBox="`0 0 ${w} ${H1}`"
            role="img"
            :aria-label="t(A11Y.b)"
          >
            <g v-for="(row, i) in durRows" :key="row.id">
              <path
                :d="glyphPath(TIER_SHAPE[row.id], 4, ROW_Y[i] + 11)"
                :fill="TIER_FILL[row.id]"
              />
              <text class="t-id" x="10.5" :y="ROW_Y[i] + 15">{{ row.id }}</text>
              <path
                class="spark"
                :d="durSpark(w, i, row.shares).area"
                :style="{ fill: TIER_FILL[row.id], '--i': i }"
              />
              <path
                class="spark-line"
                :class="{ 'is-dash': !!TIER_DASH[row.id] }"
                :pathLength="1"
                :d="durSpark(w, i, row.shares).line"
                :style="{ stroke: TIER_FILL[row.id], strokeDasharray: TIER_DASH[row.id] || undefined, '--i': i }"
              />
              <line
                class="base"
                :x1="LABEL_W"
                :x2="w - 4"
                :y1="ROW_Y[i] + ROW_H + 0.5"
                :y2="ROW_Y[i] + ROW_H + 0.5"
              />
            </g>
            <text class="t-tick" :x="LABEL_W" :y="H1 - 2">0</text>
            <text class="t-tick" :x="(LABEL_W + w) / 2" :y="H1 - 2" text-anchor="middle">150</text>
            <text class="t-tick" :x="w - 4" :y="H1 - 2" text-anchor="end">300+ s</text>
          </svg>
        </PlotBox>
      </figure>

      <!-- (c) breadth per tier -->
      <figure class="cell cell--c">
        <figcaption class="cell__head">
          <p class="cell__t"><span class="cell__n">(c)</span> {{ t({ en: 'Classes reached', zh: '覆盖类别' }) }}</p>
          <p class="cell__s">
            {{ t({ en: 'derived from (d) ·', zh: '由 (d) 数得 ·' }) }}
            {{ sceneCount }} {{ t({ en: 'classes', zh: '类' }) }}
          </p>
        </figcaption>
        <PlotBox :h="H1" v-slot="{ w }">
          <svg
            class="plot"
            :width="w"
            :height="H1"
            :viewBox="`0 0 ${w} ${H1}`"
            role="img"
            :aria-label="t(A11Y.c)"
          >
            <g v-for="(row, i) in breadth" :key="row.id">
              <path
                :d="glyphPath(TIER_SHAPE[row.id], 4, ROW_Y[i] + 11)"
                :fill="TIER_FILL[row.id]"
              />
              <text class="t-id" x="10.5" :y="ROW_Y[i] + 15">{{ row.id }}</text>
              <g class="grow" :style="{ '--i': i }">
                <rect
                  v-for="(on, k) in row.cells"
                  :key="k"
                  class="cellmark"
                  :class="{ 'is-off': !on }"
                  :x="LABEL_W + C_PAD + k * cPitch(w)"
                  :y="ROW_Y[i] + 7"
                  :width="Math.max(1, cPitch(w) - 1.6)"
                  :height="8"
                  :style="{ '--c': TIER_FILL[row.id] }"
                />
              </g>
              <text class="t-val" :x="w" :y="ROW_Y[i] + 15" text-anchor="end">
                {{ row.reached }}/{{ row.cells.length }}
              </text>
            </g>
          </svg>
        </PlotBox>
      </figure>

      <!-- (d) the scene vocabulary -->
      <figure class="cell cell--d">
        <figcaption class="cell__head">
          <p class="cell__t"><span class="cell__n">(d)</span> {{ t({ en: 'Scene vocabulary', zh: '场景词表' }) }}</p>
          <p class="cell__s">
            {{ sceneCount }}
            {{ t({ en: 'classes · five zones + residual', zh: '个类别 · 五个区域加残余类' }) }}
          </p>
        </figcaption>
        <PlotBox :h="H2" v-slot="{ w }">
          <svg
            class="plot"
            :width="w"
            :height="H2"
            :viewBox="`0 0 ${w} ${H2}`"
            role="img"
            :aria-label="t(A11Y.d)"
          >
            <template v-for="L in [dLayout(w)]" :key="0">
              <g v-for="(bar, bi) in L.bars" :key="bar.key">
                <title>{{ bar.name }} · {{ fmt(bar.total) }} h</title>
                <g class="grow" :style="{ '--i': bi }">
                  <rect
                    v-for="seg in bar.segs"
                    :key="seg.id"
                    :x="bar.x"
                    :y="seg.y"
                    :width="bar.w"
                    :height="Math.max(0.4, seg.h - 1)"
                    :fill="seg.fill"
                  />
                </g>
                <text
                  class="t-dv"
                  :x="bar.x + bar.w / 2 + 3.6"
                  :y="bar.top - 4"
                  :transform="`rotate(-90 ${bar.x + bar.w / 2 + 3.6} ${bar.top - 4})`"
                  text-anchor="start"
                >{{ hours1(bar.total) }}</text>
                <text
                  class="t-lab"
                  :x="bar.x + bar.w / 2"
                  :y="D_LAB"
                  :transform="`rotate(-90 ${bar.x + bar.w / 2} ${D_LAB})`"
                  text-anchor="end"
                >{{ bar.name }}</text>
              </g>
              <text
                v-for="zone in L.zones"
                :key="`z${zone.id}`"
                class="t-zone"
                :x="zone.cx"
                :y="D_ZONE_Y"
                text-anchor="middle"
              >{{ zone.name }}</text>
              <line
                v-for="zone in L.zones"
                :key="`r${zone.id}`"
                class="group-rule"
                :x1="zone.x0"
                :x2="zone.x1 + 2"
                :y1="D_GROUP_RULE"
                :y2="D_GROUP_RULE"
              />
            </template>
            <line class="base" x1="1" :x2="w - 1" :y1="D_BASE + 0.5" :y2="D_BASE + 0.5" />
          </svg>
        </PlotBox>
      </figure>

      <!-- (e) verbs -->
      <figure id="data-tasks" class="cell cell--e">
        <figcaption class="cell__head">
          <div class="cell__top">
            <p class="cell__t"><span class="cell__n">(e)</span> {{ t({ en: 'Action vocabulary', zh: '动作词表' }) }}</p>
            <p class="cell__q mono">{{ t({ en: `Top ${TOP_N} of ${VERB_TOTALS.types}`, zh: `${VERB_TOTALS.types} 中的前 ${TOP_N}` }) }}</p>
          </div>
          <p class="cell__s">
            {{ VERB_TOTALS.types }} {{ t({ en: 'types ·', zh: '种 ·' }) }}
            {{ fmt(VERB_TOTALS.entries) }} {{ t({ en: 'occurrences', zh: '次' }) }}
          </p>
        </figcaption>
        <ul class="cell__legend">
          <li v-for="tier in TIERS" :key="tier.id">
            <TierGlyph :id="tier.id" :w="24" :h="9" />{{ tier.id }}
          </li>
        </ul>
        <RankCurve :series="verbSeries" :y-max="verbTop" :h="H3" :aria="A11Y.e" :on="on" />
        <TopBars
          class="cell__top20"
          :kicker="{ en: 'Actions · verbs', zh: '动作 · 动词' }"
          :total="VERB_TOTALS.types"
          :rows="verbBars"
          :n="TOP_N"
          bare
        />
        <p class="cell__foot">
          {{ t({ en: 'top 10 =', zh: '前 10 个 =' }) }} {{ verbTop10 }}%
          {{ t({ en: `of occurrences · rank ${VERB_TOTALS.types} = ${tiny(verbTail)}`, zh: `的次数 · 第 ${VERB_TOTALS.types} 位 = ${tiny(verbTail)}` }) }}
        </p>
      </figure>

      <!-- (f) objects -->
      <figure id="data-objects" class="cell cell--f">
        <figcaption class="cell__head">
          <div class="cell__top">
            <p class="cell__t"><span class="cell__n">(f)</span> {{ t({ en: 'Object vocabulary', zh: '物体词表' }) }}</p>
            <p class="cell__q mono">{{ t({ en: `Top ${TOP_N} of ${OBJECTS.length}`, zh: `${OBJECTS.length} 条中的前 ${TOP_N}` }) }}</p>
          </div>
          <p class="cell__s">
            {{ OBJECTS.length }} {{ t({ en: 'entries ·', zh: '条 ·' }) }}
            {{ fmt(OBJECT_TOTALS.instances) }} {{ t({ en: 'annotation occurrences', zh: '次标注' }) }}
          </p>
        </figcaption>
        <ul class="cell__legend">
          <li v-for="tier in TIERS" :key="tier.id">
            <TierGlyph :id="tier.id" :w="24" :h="9" />{{ tier.id }}
          </li>
        </ul>
        <RankCurve :series="objectSeries" :y-max="objectTop" :h="H3" :aria="A11Y.f" :on="on" />
        <TopBars
          class="cell__top20"
          :kicker="{ en: 'Objects · entries', zh: '物体 · 条目' }"
          :total="OBJECTS.length"
          :rows="objectBars"
          :n="TOP_N"
          bare
        />
        <p class="cell__foot">
          {{ t({ en: 'top 20 =', zh: '前 20 条 =' }) }} {{ objectTop20 }}%
          {{ t({ en: `of annotations · rank ${OBJECT_TOTALS.entries} = ${tiny(objectTail)}`, zh: `的标注 · 第 ${OBJECT_TOTALS.entries} 条 = ${tiny(objectTail)}` }) }}
        </p>
      </figure>
    </div>

    <p class="stats__note">{{ t(NOTE) }}</p>
  </div>
</template>

<style scoped>
.stats { min-width: 0; }

.plate {
  display: grid;
  grid-template-columns: repeat(12, minmax(0, 1fr));
  gap: 1px;
  border: 1px solid var(--line);
  border-radius: 3px;
  background: var(--line);
  overflow: hidden;
}

.cell {
  grid-column: span 4;
  display: flex;
  flex-direction: column;
  min-width: 0;
  margin: 0;
  padding: 12px 16px 10px;
  background: var(--paper);
}
.cell--d { grid-column: span 12; }
.cell--e,
.cell--f { grid-column: span 6; }

.cell__head { margin: 0 0 6px; }
.cell__top {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 0.15rem 0.6rem;
}
/* the open/controlled key belongs to (a), where the split is drawn */
.cell__okey {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-wrap: wrap;
  gap: 0.1rem 0.7rem;
  font-family: var(--ff-mono);
  font-size: var(--fs-tick);
  line-height: 1.2;
  color: var(--ink-mute);
}
.cell__okey li {
  display: inline-flex;
  align-items: center;
  gap: 0.3rem;
}
.sw {
  width: 9px;
  height: 9px;
  display: inline-block;
  flex: none;
  background-color: var(--c-blue);
}
.sw--hatch {
  background-image: repeating-linear-gradient(
    45deg,
    rgba(255, 255, 255, 0.92) 0 1px,
    transparent 1px 3.2px
  );
}
.cell__t {
  margin: 0;
  font-size: var(--fs-micro);
  line-height: 1.3;
  color: var(--ink);
  letter-spacing: -0.008em;
}
.cell__t .cell__n {
  font-family: var(--ff-mono);
  font-size: var(--fs-tick);
  font-weight: 400;
  letter-spacing: 0.02em;
  color: var(--ink);
  margin-right: 0.4em;
}
.cell__s {
  margin: 2px 0 0;
  font-family: var(--ff-mono);
  font-size: var(--fs-tick);
  line-height: 1.3;
  color: var(--ink-mute);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
/* the top-20 qualifier sits at the right of the panel's title row */
.cell__q {
  margin: 0;
  font-family: var(--ff-mono);
  font-size: var(--fs-tick);
  line-height: 1.3;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: var(--ink-mute);
  white-space: nowrap;
}
/* the columns sit under the curves, in the same panel */
.cell__top20 {
  margin-top: 0.6rem;
  padding-top: 0.55rem;
  border-top: 1px solid var(--line);
}
.cell__foot {
  margin: 7px 0 0;
  font-family: var(--ff-mono);
  font-size: var(--fs-tick);
  line-height: 1.3;
  color: var(--ink-mute);
}
.cell__legend {
  list-style: none;
  margin: -2px 0 5px;
  padding: 0;
  display: flex;
  flex-wrap: wrap;
  gap: 0.1rem 0.9rem;
  font-family: var(--ff-mono);
  font-size: var(--fs-tick);
  line-height: 1.3;
  color: var(--ink-mute);
}
.cell__legend li {
  display: inline-flex;
  align-items: center;
  gap: 0.32rem;
}

.plot { display: block; }

/* ---- marks: hairlines, one accent, nothing boxed ---- */
.t-id {
  font-family: var(--ff-mono);
  font-size: 11px;
  fill: var(--ink-soft);
  letter-spacing: 0.02em;
}
.t-val {
  font-family: var(--ff-mono);
  font-size: 11px;
  fill: var(--ink-soft);
  font-variant-numeric: tabular-nums;
}
.t-tick {
  font-family: var(--ff-mono);
  font-size: 11px;
  fill: var(--ink-mute);
  font-variant-numeric: tabular-nums;
}
.t-lab {
  font-family: var(--ff-sans);
  font-size: 11px;
  fill: var(--ink-soft);
}
/* the hours stand on the column, above the bar, rotated with the class name */
.t-lab__v {
  font-family: var(--ff-mono);
  font-size: 11px;
  fill: var(--ink-mute);
  font-variant-numeric: tabular-nums;
}
.t-dv {
  font-family: var(--ff-mono);
  font-size: 11px;
  fill: var(--ink-mute);
  font-variant-numeric: tabular-nums;
}
.t-zone {
  font-family: var(--ff-mono);
  font-size: 11px;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  fill: var(--ink-mute);
}

.cellmark { fill: var(--c); }
.cellmark.is-off { fill: var(--line); }
.grid { stroke: var(--line); stroke-width: 1; stroke-dasharray: 2 4; }
.base { stroke: var(--line); stroke-width: 1; }
.group-rule { stroke: var(--line-strong); stroke-width: 1; opacity: 0.5; }

.spark { fill-opacity: 0.1; }
.spark-line { fill: none; stroke-width: 1.3; stroke-linejoin: round; stroke-linecap: round; }

/* ---- entrance: bars rise, curves are drawn, nothing moves after ---- */
.grow {
  transform-box: fill-box;
  transform-origin: bottom;
  transform: none;
  transition: transform 480ms var(--ease-out);
  transition-delay: calc(var(--i, 0) * 20ms);
}
.stats[data-on='false'] .grow { transform: scaleY(0); }

.spark {
  opacity: 1;
  transition: opacity 320ms linear 220ms;
}
.stats[data-on='false'] .spark { opacity: 0; }

/* solid curves are drawn along their length; pathLength=1 makes 1 unit the path */
.spark-line:not(.is-dash) {
  stroke-dasharray: 1;
  stroke-dashoffset: 0;
  transition: stroke-dashoffset 700ms var(--ease-out) calc(var(--i, 0) * 80ms);
}
.stats[data-on='false'] .spark-line:not(.is-dash) { stroke-dashoffset: 1; }

/* a dashed curve keeps its pattern — drawing it would eat the dash — so it fades */
.spark-line.is-dash {
  opacity: 1;
  transition: opacity 620ms var(--ease-out) calc(var(--i, 0) * 80ms + 120ms);
}
.stats[data-on='false'] .spark-line.is-dash { opacity: 0; }

@media (prefers-reduced-motion: reduce) {
  .grow,
  .spark,
  .spark-line { transition: none; }
}

.stats__note {
  margin: 10px 0 0;
  padding: 10px 0 0;
  border-top: 1px solid var(--line);
  font-size: var(--fs-micro);
  line-height: 1.62;
  color: var(--ink-mute);
  max-width: none;
}

@media (max-width: 900px) {
  .cell,
  .cell--d,
  .cell--e,
  .cell--f { grid-column: span 12; }
  .cell { padding: 12px 14px 10px; }
}
</style>
