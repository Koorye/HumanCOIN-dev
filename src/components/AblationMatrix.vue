<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from '@/composables/useI18n'
import { ABLATION, COMBOS, MODALITY_LABEL, type Modality } from '@/data/stats'

const { t, isZh } = useI18n()

const comboName = (combo: Modality[]) => ['V', ...combo].join(' + ')

/* Best mean per metric column, honouring each metric's direction. */
const bestIndex = computed(() =>
  ABLATION.map((m) => {
    let bi = 0
    for (let i = 1; i < COMBOS.length; i++) {
      const better = m.direction === 'up'
        ? m.points[i].mean > m.points[bi].mean
        : m.points[i].mean < m.points[bi].mean
      if (better) bi = i
    }
    return bi
  }),
)

/* Relative improvement over the vision-only row; errors use the inverse. */
function gain(metricIndex: number, comboIndex: number): number {
  const m = ABLATION[metricIndex]
  const base = m.points[0].mean
  const v = m.points[comboIndex].mean
  if (!base) return 0
  return ((m.direction === 'up' ? v - base : base - v) / base) * 100
}

function cellBg(metricIndex: number, comboIndex: number): string {
  if (comboIndex === 0) return 'transparent'
  const g = gain(metricIndex, comboIndex)
  if (g >= 0) return `rgba(15, 107, 99, ${Math.min(0.28, 0.03 + (Math.abs(g) / 100) * 0.85)})`
  return 'rgba(91, 69, 168, 0.12)'
}

const signed = (n: number) => `${n >= 0 ? '+' : '−'}${Math.abs(n).toFixed(1)}`
</script>

<template>
  <figure class="mx">
    <div class="mx__scroll" tabindex="0" role="region"
      :aria-label="isZh ? '模态消融矩阵，可横向滚动' : 'Modality ablation matrix, horizontally scrollable'">
      <table class="tbl mx__table">
        <caption>
          {{
            isZh
              ? '五次运行的均值 ± 样本标准差（ddof = 1）'
              : 'Mean ± sample standard deviation (ddof = 1) of five runs'
          }}
        </caption>
        <thead>
          <tr>
            <th scope="col" rowspan="2">{{ isZh ? '输入组合' : 'Input' }}</th>
            <th scope="colgroup" colspan="4">{{ isZh ? '输入模态' : 'Modalities' }}</th>
            <th v-for="m in ABLATION" :key="m.id" scope="col" rowspan="2" class="mx__mhead">
              {{ isZh ? m.label.zh : m.label.en }}
              <small class="mono">{{ isZh ? m.unit.zh : m.unit.en }} · {{ m.direction === 'up' ? '↑' : '↓' }}</small>
            </th>
          </tr>
          <tr>
            <th v-for="mod in (['V', 'G', 'M', 'E'] as const)" :key="mod" scope="col" class="mx__mod">
              {{ t(MODALITY_LABEL[mod]) }}
            </th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="(combo, i) in COMBOS" :key="i" :class="{ 'mx__base': i === 0 }">
            <th scope="row" class="mx__rowhead">
              <span class="mono">{{ comboName(combo) }}</span>
              <small v-if="i === 0">{{ isZh ? '视觉基线' : 'vision baseline' }}</small>
            </th>
            <td v-for="mod in (['V', 'G', 'M', 'E'] as const)" :key="mod" class="mx__check"
              :aria-label="`${mod} ${(mod === 'V' || combo.includes(mod)) ? (isZh ? '启用' : 'enabled') : (isZh ? '未启用' : 'disabled')}`">
              {{ mod === 'V' || combo.includes(mod as Modality) ? '✓' : '—' }}
            </td>
            <td
              v-for="(m, j) in ABLATION"
              :key="m.id"
              class="mx__cell mono"
              :class="{ 'mx__cell--best': bestIndex[j] === i }"
              :style="{ background: cellBg(j, i) }"
              :title="`${comboName(combo)} · ${isZh ? m.label.zh : m.label.en}: ${m.points[i].mean.toFixed(2)} ± ${m.points[i].sd.toFixed(2)} ${isZh ? m.unit.zh : m.unit.en}; ${isZh ? '相对基线' : 'vs baseline'} ${signed(gain(j, i))}%`"
            >
              <b v-if="bestIndex[j] === i">{{ m.points[i].mean.toFixed(2) }} <small>±{{ m.points[i].sd.toFixed(2) }}</small></b>
              <span v-else>{{ m.points[i].mean.toFixed(2) }} <small>±{{ m.points[i].sd.toFixed(2) }}</small></span>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
    <figcaption class="cap">
      {{
        isZh
          ? 'V = 视觉，G = 注视，M = 肌电，E = 脑电，视觉始终保留，2³ = 8 种组合。底色为相对基线的改善比例：准确率用 (组合 − 基线)/基线，误差用 (基线 − 组合)/基线。粗体为列内最佳均值。'
          : 'V = vision, G = gaze, M = EMG, E = EEG. Vision is always included, giving 2³ = 8 combinations. Cell shading is the relative improvement over baseline — (combination − baseline)/baseline for accuracy, (baseline − combination)/baseline for errors. Bold marks the best mean in each column.'
      }}
    </figcaption>
  </figure>
</template>

<style scoped>
.mono { font-family: var(--ff-mono); }

.mx { margin: 0; }
.mx__scroll { overflow-x: auto; }
.mx__table { min-width: 54rem; }
.mx__table th, .mx__table td { white-space: nowrap; }
.mx__table caption {
  text-align: left;
  font-size: var(--fs-micro);
  color: var(--ink-mute);
  padding: 0 0 0.6rem;
}
.mx__mhead { text-align: right; line-height: 1.3; }
/* Unit symbols are case-sensitive (cm, °), so annotations escape the header's uppercase. */
.mx__mhead small { display: block; font-size: var(--fs-tick); color: var(--ink-mute); font-weight: 400; text-transform: none; }
.mx__mod { text-align: center; font-family: var(--ff-mono); font-size: var(--fs-tick); }
.mx__rowhead { font-weight: 500; }
.mx__rowhead small { display: block; font-size: var(--fs-tick); color: var(--ink-mute); font-weight: 400; }
.mx__base .mx__rowhead { color: var(--ink-mute); }
.mx__check { text-align: center; color: var(--ink-soft); font-size: var(--fs-micro); }
.mx__cell { text-align: right; font-size: var(--fs-micro); color: var(--ink); font-variant-numeric: tabular-nums; }
.mx__cell small { color: var(--ink-mute); font-weight: 400; }
.mx__cell--best { font-weight: 600; }
.cap { margin-top: 0.8rem; font-size: var(--fs-micro); color: var(--ink-mute); line-height: 1.6; }
</style>
