<script setup lang="ts">
/**
 * Gain over the vision-only baseline, against how many extra modalities the
 * input carried — all 48 (combination × metric) pairs in one view.
 *
 * The question the RQ asks is whether an extra signal buys an extra unit of
 * understanding, which is a question about a trend, not about 48 separate
 * numbers. So the points are plotted, a least-squares line is fitted through
 * them, and the per-count mean ± SD is drawn behind as bars. Three readings of
 * one dataset: the cloud (spread), the bars (central tendency), the line
 * (trend). r² is printed because a trend line without it invites over-reading.
 *
 * Gains are signed so that up is always better, then normalised by each
 * metric's own baseline — the only way six metrics in three units can share
 * one axis.
 */
import { computed, ref } from 'vue'
import { useI18n } from '@/composables/useI18n'
import { useInView } from '@/composables/useReveal'
import { fitLine, gainByCount, scatterPoints } from '@/data/figures'

const { isZh } = useI18n()

const pts = scatterPoints()
const bars = gainByCount(pts)
const fit = fitLine(pts)

/* The cloud settles and the fitted line draws when the figure enters view. The
   dots scale from nothing, so the reader sees the spread build before the line
   is drawn through it — which is the order the figure should be read in. */
const { el: scEl, shown: scIn } = useInView<SVGSVGElement>({ margin: '0px 0px -8% 0px' })

const W = 620
const H = 330
const PAD = { l: 52, r: 118, t: 22, b: 54 }
const PLOT_W = W - PAD.l - PAD.r
const PLOT_H = H - PAD.t - PAD.b

const Y_MIN = 0
const Y_MAX = Math.ceil(Math.max(...pts.map((p) => p.y)) / 10) * 10 + 6

const x = (k: number) => PAD.l + ((k - 1) / 2) * PLOT_W
const y = (v: number) => PAD.t + PLOT_H - ((v - Y_MIN) / (Y_MAX - Y_MIN)) * PLOT_H

const xTicks = [1, 2, 3]
const yTicks = computed(() => {
  const step = 10
  const out: number[] = []
  for (let v = Y_MIN; v <= Y_MAX; v += step) out.push(v)
  return out
})

/** Slight horizontal jitter so coincident points are both visible. */
const jitter = (i: number) => ((i % 7) - 3) * 2.6

/** A short horizontal offset per metric, so overlapping dots stay legible. */
const spread = computed(() =>
  pts.map((p, i) => ({
    ...p,
    cx: x(p.x) + jitter(i),
    cy: y(p.y),
    i,
  })),
)

const line = computed(() => {
  const x1 = 1
  const x2 = 3
  return {
    x1: x(x1),
    y1: y(fit.slope * x1 + fit.intercept),
    x2: x(x2),
    y2: y(fit.slope * x2 + fit.intercept),
  }
})

const hovered = ref<number | null>(null)

const METRIC_NAMES: Record<string, { en: string; zh: string }> = {
  gesture: { en: 'Gesture accuracy', zh: '手势准确率' },
  position: { en: 'Hand position error', zh: '手部位置误差' },
  angle: { en: 'Joint angle error', zh: '关节角误差' },
  ade: { en: 'Trajectory ADE', zh: '轨迹 ADE' },
  fde: { en: 'Trajectory FDE', zh: '轨迹 FDE' },
  future: { en: 'Future gesture accuracy', zh: '未来手势准确率' },
}
</script>

<template>
  <svg
    ref="scEl"
    class="sc"
    :class="{ 'is-in': scIn }"
    :viewBox="`0 0 ${W} ${H}`"
    role="img"
    :aria-label="isZh ? '相对仅视觉基线的增益，按额外模态数' : 'Gain over vision-only by number of extra modalities'"
  >
    <!-- y grid -->
    <g>
      <line
        v-for="v in yTicks"
        :key="v"
        :class="v === 0 ? 'sc__axis' : 'sc__grid'"
        :x1="PAD.l"
        :x2="PAD.l + PLOT_W"
        :y1="y(v)"
        :y2="y(v)"
      />
      <text
        v-for="v in yTicks"
        :key="`yt${v}`"
        class="sc__tick"
        :x="PAD.l - 8"
        :y="y(v) + 3.5"
        text-anchor="end"
      >
        {{ v > 0 ? `+${v}` : v }}
      </text>
    </g>
    <text
      class="sc__axis-title"
      :x="16"
      :y="PAD.t + PLOT_H / 2"
      text-anchor="middle"
      :transform="`rotate(-90 16 ${PAD.t + PLOT_H / 2})`"
    >
      {{ isZh ? '相对基线的增益（%）' : 'gain vs baseline (%)' }}
    </text>

    <!-- per-count mean ± SD, behind the cloud -->
    <g>
      <template v-for="b in bars" :key="`bar-${b.k}`">
        <line
          class="sc__bar"
          :x1="x(b.k)"
          :x2="x(b.k)"
          :y1="y(b.mean - b.sd)"
          :y2="y(b.mean + b.sd)"
        />
        <line
          class="sc__bar-cap"
          :x1="x(b.k) - 16"
          :x2="x(b.k) + 16"
          :y1="y(b.mean - b.sd)"
          :y2="y(b.mean - b.sd)"
        />
        <line
          class="sc__bar-cap"
          :x1="x(b.k) - 16"
          :x2="x(b.k) + 16"
          :y1="y(b.mean + b.sd)"
          :y2="y(b.mean + b.sd)"
        />
        <circle class="sc__bar-mean" :cx="x(b.k)" :cy="y(b.mean)" r="4.2" />
      </template>
    </g>

    <!-- fitted trend -->
    <g class="sc__fit">
      <line class="sc__fit-line" :x1="line.x1" :y1="line.y1" :x2="line.x2" :y2="line.y2" />
    </g>

    <!-- the 48 pairs -->
    <circle
      v-for="p in spread"
      :key="p.id"
      class="sc__dot"
      :class="{ 'is-on': hovered === p.i }"
      :style="{ '--i': p.i % 16 }"
      :cx="p.cx"
      :cy="p.cy"
      r="4"
      :fill="p.color"
      @mouseenter="hovered = p.i"
      @mouseleave="hovered = null"
    >
      <title>
        {{ METRIC_NAMES[p.metric] ? (isZh ? METRIC_NAMES[p.metric].zh : METRIC_NAMES[p.metric].en) : p.metric }}
        · V{{ p.combo.length ? ' + ' + p.combo.join(' + ') : '' }} ·
        {{ p.y >= 0 ? '+' : '' }}{{ p.y.toFixed(1) }}%
      </title>
    </circle>

    <!-- x ticks -->
    <g>
      <text
        v-for="k in xTicks"
        :key="`x${k}`"
        class="sc__tick"
        :x="x(k)"
        :y="PAD.t + PLOT_H + 18"
        text-anchor="middle"
      >
        {{ k }}
      </text>
    </g>
    <text class="sc__axis-title" :x="PAD.l + PLOT_W / 2" :y="H - 8" text-anchor="middle">
      {{ isZh ? '叠加的额外模态数量' : 'extra modalities on top of vision' }}
    </text>

    <!-- read-outs -->
    <g>
      <text class="sc__readout" :x="W - PAD.r + 12" :y="PAD.t + 10">
        {{ isZh ? '线性拟合' : 'OLS fit' }}
      </text>
      <text class="sc__readout-val" :x="W - PAD.r + 12" :y="PAD.t + 28">
        +{{ fit.slope.toFixed(1) }}% / modality
      </text>
      <text class="sc__readout-val" :x="W - PAD.r + 12" :y="PAD.t + 44">
        r² = {{ fit.r2.toFixed(2) }}
      </text>
      <text class="sc__readout" :x="W - PAD.r + 12" :y="PAD.t + 70">
        {{ isZh ? '均值 ± SD' : 'mean ± SD' }}
      </text>
      <template v-for="(b, i) in bars" :key="`ro-${b.k}`">
        <text class="sc__readout-val" :x="W - PAD.r + 12" :y="PAD.t + 88 + i * 16">
          {{ b.k }} · +{{ b.mean.toFixed(1) }} ± {{ b.sd.toFixed(1) }}
        </text>
      </template>
      <text class="sc__readout" :x="W - PAD.r + 12" :y="PAD.t + 88 + bars.length * 16 + 10">
        {{ isZh ? 'n = ' : 'n = ' }}{{ pts.length }} {{ isZh ? '组合' : 'pairs' }}
      </text>
    </g>
  </svg>
</template>

<style scoped>
.sc { width: 100%; height: auto; display: block; }

.sc__grid { stroke: var(--line); stroke-width: 1; }
.sc__axis { stroke: var(--line-strong); stroke-width: 1; }
.sc__tick,
.sc__readout,
.sc__readout-val {
  font-family: var(--ff-mono);
  font-size: var(--fs-tick);
  fill: var(--ink-mute);
  font-variant-numeric: tabular-nums;
}
.sc__readout { fill: var(--ink-soft); letter-spacing: 0.06em; text-transform: uppercase; }
.sc__readout-val { fill: var(--ink); }
.sc__axis-title {
  font-family: var(--ff-mono);
  font-size: var(--fs-tick);
  letter-spacing: 0.07em;
  text-transform: uppercase;
  fill: var(--ink-mute);
}

/* The summary bars are deliberately quiet: they are a reference for the
   cloud, and the cloud is the data. */
.sc__bar { stroke: var(--ink-mute); stroke-width: 1.2; opacity: 0.5; }
.sc__bar-cap { stroke: var(--ink-mute); stroke-width: 1.2; opacity: 0.5; }
.sc__bar-mean { fill: var(--paper); stroke: var(--ink-soft); stroke-width: 1.6; }

.sc__fit-line {
  stroke: var(--ink);
  stroke-width: 2;
  stroke-dasharray: 900;
  stroke-dashoffset: 0;
}

.sc__dot {
  fill-opacity: 0.72;
  stroke: var(--paper);
  stroke-width: 0.8;
  transition: fill-opacity var(--dur-1) var(--ease), r var(--dur-2) var(--ease-spring);
}
.sc__dot.is-on { fill-opacity: 1; r: 6; }

@media (prefers-reduced-motion: no-preference) {
  /* The cloud settles first, then the line is drawn through it: the trend is
     stated after the spread it summarises, not before. */
  .sc.is-in .sc__dot {
    animation: sc-pop var(--dur-3) var(--ease-spring) backwards;
    animation-delay: calc(var(--i) * 22ms);
  }
  .sc.is-in .sc__fit-line {
    animation: sc-fit var(--dur-4) var(--ease-out) 420ms backwards;
  }
}

@keyframes sc-pop {
  from { transform: scale(0); transform-box: fill-box; transform-origin: 50% 50%; }
  to { transform: scale(1); transform-box: fill-box; transform-origin: 50% 50%; }
}
@keyframes sc-fit {
  from { stroke-dashoffset: 900; }
  to { stroke-dashoffset: 0; }
}
</style>
