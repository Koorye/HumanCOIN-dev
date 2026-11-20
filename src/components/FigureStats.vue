<script setup lang="ts">
/**
 * The distribution, drawn the way the report's Fig. 2 draws it: one composite of
 * small multiples, each panel a different cut of the same 12,500 hours.
 *
 *   a. recorded hours per tier on a log axis, split open / controlled;
 *   b. episode length, per tier;
 *   d. the 38 scene classes, grouped by zone and stacked by tier;
 *   e. the verb vocabulary: ranked occurrences per tier, and the head of it;
 *   f. the object vocabulary, on the same two cuts.
 *
 * Every number comes from `fig2.ts`, which carries the report's own tables.
 */
import { computed } from 'vue'
import { useI18n } from '@/composables/useI18n'
import {
  SCENES,
  TIERS,
  TOTAL_HOURS,
  VERBS,
  OBJECTS,
  ZONE_GROUPS,
} from '@/data/fig2'
import { DURATION_BIN_EDGES, DURATION_SHARES } from '@/data/stats'

const { t } = useI18n()

const TIER_COLOR = { L1: '#2f8f86', L2: '#c8873f', L3: '#7b6bb0' }
const TIER_IDS = ['L1', 'L2', 'L3'] as const

/* ---- (a) hours, log axis ---- */
const LOG_MAX = 10000
const logX = (h: number) => Math.log10(Math.max(h, 1)) / Math.log10(LOG_MAX)

const hourRows = computed(() =>
  TIERS.map((tier) => {
    const ctrl = (tier.hours * (tier.setting.controlled ?? 0)) / 100
    const open = tier.hours - ctrl
    return {
      id: tier.id,
      hours: tier.hours,
      open,
      ctrl,
      x0: logX(1),
      w: logX(1) - 0,
      openW: logX(open),
      ctrlW: logX(open + ctrl) - logX(open),
    }
  }),
)

/* ---- (b) episode length ---- */
const BW = 240
const BH = 96
const durMax = Math.max(...Object.values(DURATION_SHARES).flat())
const durPath = (tier: 'L1' | 'L2' | 'L3') => {
  const v = DURATION_SHARES[tier]
  const n = v.length
  const pts = v.map((d, i) => {
    const x = (i / (n - 1)) * BW
    const y = BH - (d / durMax) * (BH - 6)
    return `${x.toFixed(1)},${y.toFixed(1)}`
  })
  return `M0,${BH} L${pts.join(' L')} L${BW},${BH} Z`
}

/* ---- (d) scenes by zone ---- */
const sceneMax = Math.max(...SCENES.map((s) => s.total))
const sceneBars = computed(() =>
  ZONE_GROUPS.filter((g) => g.scenes.length).flatMap((g) =>
    g.scenes.map((s) => ({
      key: s.key,
      label: t(s.name),
      zone: t(g.zone.name),
      h: s.total,
      height: (s.total / sceneMax) * 100,
      segs: TIER_IDS.map((id) => ({
        id,
        h: s.hours[id],
        pct: s.total ? (s.hours[id] / s.total) * 100 : 0,
      })).filter((x) => x.h > 0),
    })),
  ),
)

/* ---- (e)/(f) vocabulary tails ---- */
type Counted = { total: number }
const rankCurve = (items: Counted[], w = 240, h = 86) => {
  const sorted = [...items].sort((a, b) => b.total - a.total)
  const max = sorted[0]?.total ?? 1
  const pts = sorted.map((it, i) => {
    const x = (i / Math.max(sorted.length - 1, 1)) * w
    const y = h - (Math.log10(Math.max(it.total, 1)) / Math.log10(max || 1)) * (h - 4)
    return `${x.toFixed(1)},${y.toFixed(1)}`
  })
  return `M0,${h} L${pts.join(' L')} L${w},${h} Z`
}
const verbCurve = computed(() => rankCurve(VERBS))
const objectCurve = computed(() => rankCurve(OBJECTS))
const verbHead = computed(() => [...VERBS].sort((a, b) => b.total - a.total).slice(0, 30))
const objectHead = computed(() => [...OBJECTS].sort((a, b) => b.total - a.total).slice(0, 30))
const verbMax = computed(() => Math.max(...verbHead.value.map((v) => v.total)))
const objectMax = computed(() => Math.max(...objectHead.value.map((v) => v.total)))
</script>

<template>
  <div class="stats">
    <figure class="panel panel--a">
      <figcaption class="panel__cap"><b>(a)</b> recorded hours · {{ TOTAL_HOURS.toLocaleString('en-US') }} h</figcaption>
      <ul class="hours">
        <li v-for="row in hourRows" :key="row.id">
          <span class="hours__id">{{ row.id }}</span>
          <span class="hours__track">
            <span class="hours__open" :style="{ width: `${row.openW * 100}%` }" />
            <span class="hours__ctrl" :style="{ left: `${row.openW * 100}%`, width: `${row.ctrlW * 100}%` }" />
          </span>
          <span class="hours__v mono">{{ row.hours.toLocaleString('en-US') }} h</span>
        </li>
      </ul>
      <p class="panel__key mono"><i class="k-open" /> open <i class="k-ctrl" /> controlled</p>
    </figure>

    <figure class="panel panel--b">
      <figcaption class="panel__cap"><b>(b)</b> episode length</figcaption>
      <svg :viewBox="`0 0 ${BW} ${BH}`" class="plot" preserveAspectRatio="none">
        <path v-for="id in TIER_IDS" :key="id" :d="durPath(id)" fill="none" :stroke="TIER_COLOR[id]" stroke-width="1.4" />
      </svg>
      <p class="panel__axis mono">{{ DURATION_BIN_EDGES[0] }}–{{ DURATION_BIN_EDGES.at(-1) }} s</p>
    </figure>

    <figure class="panel panel--d">
      <figcaption class="panel__cap"><b>(d)</b> scene vocabulary · {{ SCENES.length }} scene classes</figcaption>
      <div class="bars">
        <span v-for="b in sceneBars" :key="b.key" class="bar" :title="`${b.label} · ${b.h.toFixed(1)} h`">
          <span class="bar__stack" :style="{ height: `${b.height}%` }">
            <span v-for="s in b.segs" :key="s.id" class="bar__seg" :style="{ height: `${s.pct}%`, background: TIER_COLOR[s.id] }" />
          </span>
        </span>
      </div>
    </figure>

    <figure class="panel panel--e">
      <figcaption class="panel__cap"><b>(e)</b> action vocabulary · 99 task verbs</figcaption>
      <svg :viewBox="`0 0 240 86`" class="plot" preserveAspectRatio="none">
        <path :d="verbCurve" fill="#2f8f86" opacity="0.35" />
      </svg>
      <div class="head">
        <span v-for="v in verbHead" :key="v.verb" class="head__bar" :style="{ height: `${(v.total / verbMax) * 100}%` }" />
      </div>
    </figure>

    <figure class="panel panel--f">
      <figcaption class="panel__cap"><b>(f)</b> object vocabulary · 635 object classes</figcaption>
      <svg :viewBox="`0 0 240 86`" class="plot" preserveAspectRatio="none">
        <path :d="objectCurve" fill="#7b6bb0" opacity="0.35" />
      </svg>
      <div class="head">
        <span v-for="o in objectHead" :key="o.rank" class="head__bar" :style="{ height: `${(o.total / objectMax) * 100}%` }" />
      </div>
    </figure>
  </div>
</template>

<style scoped>
.stats {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 1.4rem 1.6rem;
}
.panel { margin: 0; min-width: 0; }
.panel--d { grid-column: 1 / -1; }
.panel__cap {
  margin: 0 0 0.45rem;
  font-size: var(--fs-tick);
  color: var(--ink-soft);
}
.panel__cap b { color: var(--ink); font-weight: 600; margin-right: 0.25em; }
.panel__key, .panel__axis { margin: 0.4rem 0 0; font-size: 10px; color: var(--ink-mute); }
.panel__key i { display: inline-block; width: 8px; height: 8px; margin: 0 0.2rem 0 0.6rem; }
.k-open { background: #cfe0e6; }
.k-ctrl { background: #4a6f9e; }

.hours { list-style: none; margin: 0; padding: 0; display: grid; gap: 0.3rem; }
.hours li { display: grid; grid-template-columns: 1.6rem minmax(0, 1fr) 4.6rem; align-items: center; gap: 0.4rem; }
.hours__id { font-size: 11px; color: var(--ink-soft); }
.hours__track { position: relative; height: 10px; background: #eef1f3; border-radius: 2px; overflow: hidden; }
.hours__open, .hours__ctrl { position: absolute; top: 0; height: 100%; }
.hours__open { left: 0; background: #2f8f86; opacity: 0.75; }
.hours__ctrl { background: #4a6f9e; }
.hours__v { font-size: 10px; color: var(--ink-mute); text-align: right; }

.plot { width: 100%; height: 86px; display: block; }
.head { display: flex; align-items: flex-end; gap: 1px; height: 46px; margin-top: 0.35rem; }
.head__bar { flex: 1; background: #4f6272; opacity: 0.7; }
.bars { display: flex; align-items: flex-end; gap: 3px; height: 140px; }
.bar { flex: 1; height: 100%; display: flex; align-items: flex-end; }
.bar__stack { width: 100%; display: flex; flex-direction: column; justify-content: flex-end; }
.bar__seg { display: block; width: 100%; }

@media (max-width: 900px) {
  .stats { grid-template-columns: minmax(0, 1fr); }
}
</style>
