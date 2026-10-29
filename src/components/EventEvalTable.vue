<script setup lang="ts">
/**
 * RQ 02 — event-centred evaluation, as a table of controls.
 *
 * The demo above shows *how* an event is read; this table shows *whether* the
 * reading is distinguishable from adding a channel that carries nothing. Four
 * quantities are reported — did an event happen (AUROC), did the response
 * recover (F1), how far off was the hand afterwards (ADE, FDE) — against three
 * controls and a vision-only baseline.
 *
 * The two ablation controls are the load-bearing rows: they have an EEG tensor
 * of the same shape as the proposed condition but with its time structure
 * destroyed, so a gain in the proposed row that does not appear here is coming
 * from timing and not from capacity. Rows and cells are derived in
 * `eventEval.ts`; this file only decides how they are read.
 */
import { computed } from 'vue'
import { useI18n } from '@/composables/useI18n'
import { RESEARCH } from '@/content'
import {
  EVENT_CONTROLS,
  EVENT_TARGETS,
  adeReduction,
  changeVsVision,
  eventResults,
} from '@/data/eventEval'

const { t, isZh } = useI18n()

const cells = computed(() => eventResults())
const unit = (i: number) => (isZh.value ? EVENT_TARGETS[i].unit.zh : EVENT_TARGETS[i].unit.en)
const window = (i: number) => {
  const w = EVENT_TARGETS[i].window
  return w ? (isZh.value ? w.zh : w.en) : ''
}
const label = (i: number) => (isZh.value ? EVENT_TARGETS[i].label.zh : EVENT_TARGETS[i].label.en)
const controlName = (i: number) => t(EVENT_CONTROLS[i].label)

const fmt = (v: number, digits: number) => v.toFixed(digits)

/** Largest ADE reduction, used to scale the comparison bars in the last column. */
const adeMax = computed(() =>
  Math.max(...EVENT_CONTROLS.map((_, i) => Math.abs(adeReduction(i) ?? 0)), 1),
)

const signed = (n: number) => `${n >= 0 ? '+' : '−'}${Math.abs(n).toFixed(1)}`
</script>

<template>
  <figure class="evt">
    <div class="evt__scroll" tabindex="0" role="region"
      :aria-label="isZh ? '事件为中心的评估表，可横向滚动' : 'Event-centred evaluation table, horizontally scrollable'">
      <table class="tbl evt__table">
        <caption class="evt__cap">
          {{ t(RESEARCH.evalValueNote) }}
        </caption>
        <thead>
          <tr>
            <th scope="col">{{ t(RESEARCH.evalColInput) }}</th>
            <th v-for="(m, j) in EVENT_TARGETS" :key="m.id" scope="col" class="evt__mhead">
              {{ label(j) }}
              <small class="mono">{{ [window(j), unit(j), m.direction === 'up' ? '↑' : '↓'].filter(Boolean).join(' · ') }}</small>
            </th>
            <th scope="col" class="evt__mhead evt__mhead--ade">
              {{ t(RESEARCH.evalColAde) }}
              <small class="mono">%</small>
            </th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="(c, i) in EVENT_CONTROLS"
            :key="c.id"
            :class="{
              'evt__row--proposed': c.proposedRow,
              'evt__row--control': c.ablationControl,
              'evt__row--base': i === 0,
            }"
          >
            <th scope="row" class="evt__rowhead">
              {{ controlName(i) }}
              <small v-if="c.proposedRow">{{ t(RESEARCH.evalProposed) }}</small>
              <small v-else-if="c.ablationControl">{{ t(RESEARCH.evalControl) }}</small>
              <small v-else-if="i === 0">{{ isZh ? '基线' : 'baseline' }}</small>
            </th>

            <td
              v-for="(m, j) in EVENT_TARGETS"
              :key="m.id"
              class="evt__cell mono"
              :class="{ 'evt__cell--proposed': c.proposedRow, 'evt__cell--best': c.proposedRow }"
              :title="`${controlName(i)} · ${label(j)}: ${cells[i][j].mean.toFixed(m.digits)} ± ${cells[i][j].sd.toFixed(m.digits)} ${unit(j)}; ${isZh ? '相对基线' : 'vs baseline'} ${signed(changeVsVision(i, j))}%`"
            >
              <b v-if="c.proposedRow">{{ fmt(cells[i][j].mean, m.digits) }}</b>
              <span v-else>{{ fmt(cells[i][j].mean, m.digits) }}</span>
              <small>±{{ fmt(cells[i][j].sd, m.digits) }}</small>
            </td>

            <td class="evt__ade">
              <template v-if="adeReduction(i) !== null">
                <span class="evt__ade-n mono" :class="{ 'is-neg': (adeReduction(i) ?? 0) < 0 }">
                  {{ (adeReduction(i) ?? 0) >= 0 ? '' : '−' }}{{ Math.abs(adeReduction(i) ?? 0).toFixed(1) }}%
                </span>
                <span
                  class="evt__ade-bar"
                  :class="{ 'is-neg': (adeReduction(i) ?? 0) < 0 }"
                  :style="{ '--w': `${(Math.abs(adeReduction(i) ?? 0) / adeMax) * 100}%` }"
                  aria-hidden="true"
                />
              </template>
              <span v-else class="evt__ade-dash">—</span>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <figcaption class="cap">
      {{ t(RESEARCH.evalTableNote) }}
    </figcaption>
  </figure>
</template>

<style scoped>
.mono { font-family: var(--ff-mono); }

.evt { margin: 0; }
.evt__scroll { overflow-x: auto; }
.evt__table { min-width: 46rem; }
.evt__table th, .evt__table td { white-space: nowrap; }

.evt__cap {
  text-align: left;
  font-size: var(--fs-micro);
  color: var(--ink-mute);
  padding: 0 0 0.6rem;
}
.evt__mhead { text-align: right; line-height: 1.3; }
/* Unit symbols are case-sensitive (s, cm), so they escape the header's uppercase. */
.evt__mhead small {
  display: block;
  font-size: var(--fs-tick);
  color: var(--ink-mute);
  font-weight: 400;
  text-transform: none;
}
.evt__mhead--ade { color: var(--ink-soft); }

.evt__rowhead { font-weight: 500; }
.evt__rowhead small {
  display: block;
  font-family: var(--ff-mono);
  font-size: var(--fs-tick);
  font-weight: 400;
  letter-spacing: 0.06em;
  color: var(--ink-mute);
}
.evt__row--base .evt__rowhead { color: var(--ink-mute); }

.evt__cell { text-align: right; font-variant-numeric: tabular-nums; }
.evt__cell small { color: var(--ink-mute); font-weight: 400; margin-left: 0.25em; }
.evt__cell--proposed { color: var(--c-teal); }
.evt__cell--proposed small { color: var(--ink-mute); }
.evt__cell--best { font-weight: 600; }

/* The proposed row is the claim; the controls are the check on it. */
.evt__row--proposed > * { background: color-mix(in srgb, var(--c-teal) 7%, transparent); }
.evt__row--control .evt__rowhead { font-style: italic; }

.evt__ade { text-align: right; }
.evt__ade-n { font-size: var(--fs-micro); font-variant-numeric: tabular-nums; }
.evt__ade-n.is-neg { color: var(--c-violet); }
.evt__ade-bar {
  display: inline-block;
  vertical-align: middle;
  width: 3.2rem;
  height: 0.34rem;
  margin-left: 0.5rem;
  border-radius: var(--r-pill);
  background: linear-gradient(to right, var(--c-teal) var(--w), var(--surface-2) var(--w));
}
.evt__ade-bar.is-neg {
  background: linear-gradient(to right, var(--c-violet) var(--w), var(--surface-2) var(--w));
}
.evt__ade-dash { color: var(--ink-mute); }

.cap { margin-top: 0.8rem; font-size: var(--fs-micro); color: var(--ink-mute); line-height: 1.6; }
</style>
