<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from '@/composables/useI18n'
import { COMBOS, MODALITY_LABEL, bestSingle, type AblationMetric, type Modality } from '@/data/stats'

const props = defineProps<{ metric: AblationMetric }>()
const { t, isZh } = useI18n()

const W = 650
const H = 300
const PAD = { l: 130, r: 26, t: 34, b: 46 }
const plotW = W - PAD.l - PAD.r
const plotH = H - PAD.t - PAD.b

const comboName = (combo: Modality[]) => ['V', ...combo].join(' + ')
const comboLabel = (combo: Modality[]) =>
  ['V', ...combo].map((m) => t(MODALITY_LABEL[m as 'V' | Modality])).join(' + ')

/** Round the axis top up to a tidy multiple of ten. */
const max = computed(() => {
  const hi = Math.max(...props.metric.points.map((p) => p.mean + p.sd))
  return Math.max(10, Math.ceil(hi / 10) * 10)
})

const best = computed(() => bestSingle(props.metric))
const single = computed(() => props.metric.points[best.value].mean)

const rowH = plotH / COMBOS.length

const rows = computed(() =>
  COMBOS.map((combo, i) => {
    const p = props.metric.points[i]
    const value = p.mean
    const err = p.sd
    const top = PAD.t + i * rowH + rowH * 0.16
    const h = rowH * 0.68
    return {
      i,
      combo,
      name: comboName(combo),
      label: comboLabel(combo),
      value,
      err,
      top,
      h,
      w: (value / max.value) * plotW,
      errW: (err / max.value) * plotW,
      isBaseline: i === 0,
      isBest: i === COMBOS.length - 1,
    }
  }),
)

const gridX = computed(() =>
  Array.from({ length: 6 }, (_, i) => {
    const v = (max.value * i) / 5
    return { v, x: PAD.l + (v / max.value) * plotW }
  }),
)
</script>

<template>
  <figure class="abl">
    <svg
      :viewBox="`0 0 ${W} ${H}`"
      role="img"
      :aria-label="`${t(metric.label)} · ${isZh ? '模态消融' : 'modality ablation'}`"
    >
      <text class="title" :x="PAD.l - 116" y="18">
        {{ t(metric.label) }} / {{ t(metric.unit) }} {{ metric.direction === 'up' ? '↑' : '↓' }}
      </text>

      <!-- grid -->
      <g>
        <template v-for="g in gridX" :key="g.v">
          <line class="g" :x1="g.x" :x2="g.x" :y1="PAD.t - 6" :y2="PAD.t + plotH" />
          <text class="tick" :x="g.x" :y="PAD.t + plotH + 18" text-anchor="middle">
            {{ g.v.toFixed(0) }}
          </text>
        </template>
      </g>

      <!-- bars with error bars -->
      <g v-for="r in rows" :key="r.i">
        <text
          class="rowlabel"
          :class="{ 'rowlabel--base': r.isBaseline, 'rowlabel--best': r.isBest }"
          :x="PAD.l - 10"
          :y="r.top + r.h / 2 + 4"
          text-anchor="end"
        >
          {{ r.name }}
        </text>
        <rect
          :x="PAD.l"
          :y="r.top"
          :width="Math.max(1, r.w)"
          :height="r.h"
          :rx="2"
          :class="['bar', r.isBaseline ? 'bar--base' : r.isBest ? 'bar--best' : 'bar--mid']"
        >
          <title>{{ r.label }}: {{ r.value.toFixed(2) }} ± {{ r.err.toFixed(2) }} {{ t(metric.unit) }}</title>
        </rect>
        <!-- error bar: sample SD over five simulated runs -->
        <path
          class="err"
          :d="`M${PAD.l + r.w - r.errW} ${r.top + r.h / 2} H${PAD.l + r.w + r.errW} M${PAD.l + r.w - r.errW} ${r.top + r.h / 2 - 5} V${r.top + r.h / 2 + 5} M${PAD.l + r.w + r.errW} ${r.top + r.h / 2 - 5} V${r.top + r.h / 2 + 5}`"
        />
        <text
          class="value"
          :x="Math.min(PAD.l + r.w + r.errW + 8, W - PAD.r - 2)"
          :y="r.top + r.h / 2 + 4"
        >
          {{ r.value.toFixed(1) }}
        </text>
      </g>

      <!-- best single-modality marker on the winning row -->
      <g v-if="best > 0">
        <path
          class="marker"
          :d="`M${PAD.l + (single / max) * plotW} ${PAD.t + best * rowH + rowH * 0.16 - 6} l-4 6 h8 z`"
        />
      </g>
    </svg>
    <figcaption class="cap">
      {{ isZh
        ? '固定种子在预设趋势上加入均匀扰动，每组合 5 次运行；误差棒为运行间样本标准差（n=5）。'
        : 'A fixed seed adds uniform perturbation to preset trends, five runs per combination; error bars are the sample SD across runs (n=5).' }}
    </figcaption>
  </figure>
</template>

<style scoped>
.abl { margin: 0; }
.abl svg { width: 100%; height: auto; display: block; }
.g { stroke: var(--line); stroke-width: 1; }
.tick { font-family: var(--ff-mono); font-size: var(--fs-tick); fill: var(--ink-mute); }
.title { font-family: var(--ff-sans); font-size: var(--fs-small); font-weight: 550; fill: var(--ink); }
.rowlabel { font-family: var(--ff-sans); font-size: var(--fs-micro); fill: var(--ink-soft); }
.rowlabel--base { fill: var(--ink-mute); }
.rowlabel--best { fill: var(--ink); font-weight: 600; }
.bar { transition: width var(--dur) var(--ease); }
.bar--base { fill: var(--line-strong); }
.bar--mid { fill: var(--c-blue); opacity: 0.72; }
.bar--best { fill: var(--c-teal); }
.err { stroke: var(--ink); stroke-width: 1.2; fill: none; }
.value { font-family: var(--ff-mono); font-size: var(--fs-tick); fill: var(--ink); }
.marker { fill: var(--c-teal); }
.cap { margin-top: 0.6rem; font-size: var(--fs-micro); color: var(--ink-mute); line-height: 1.55; }
</style>
