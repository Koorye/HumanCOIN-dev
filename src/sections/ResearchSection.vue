<script setup lang="ts">
/**
 * Research questions.
 *
 * Each RQ is answered by a group of figures, not a single one, because each
 * question has a different shape: RQ 01 is a comparison against a baseline
 * (forest plot, with the full matrix kept underneath so the numbers stay
 * checkable), and its companion question of whether an extra signal buys an
 * extra unit is a trend (scatter plus OLS). RQ 02 is a mechanism question, so it
 * opens with the paired 3D event demo — and then, because a mechanism shown on
 * one authored pair is not yet an experiment, closes with the same question put
 * to a set of controls: a change-from-baseline plot over the table it is
 * computed from.
 *
 * The metric picker drives three figures at once — ablation bars, forest plot
 * and the heatmap's row highlight — so the selection reads as "which target am
 * I looking at" rather than as three independent controls.
 */
import { ref, computed } from 'vue'
import { RESEARCH } from '@/content'
import { useI18n } from '@/composables/useI18n'
import SectionHead from '@/components/SectionHead.vue'
import FigFrame from '@/components/FigFrame.vue'
import AblationChart from '@/components/AblationChart.vue'
import AblationMatrix from '@/components/AblationMatrix.vue'
import ForestPlot from '@/components/ForestPlot.vue'
import ScatterFit from '@/components/ScatterFit.vue'
import CorrelationHeatmap from '@/components/CorrelationHeatmap.vue'
import EventDemo from '@/components/EventDemo.vue'
import EventEvalChart from '@/components/EventEvalChart.vue'
import EventEvalTable from '@/components/EventEvalTable.vue'
import { ABLATION } from '@/data/stats'

const { t, isZh } = useI18n()

const metricId = ref<string>(ABLATION[0].id)
const metric = computed(() => ABLATION.find((m) => m.id === metricId.value) ?? ABLATION[0])
</script>

<template>
  <section id="research" class="section">
    <div class="shell">
      <SectionHead :num="RESEARCH.num" :kicker="RESEARCH.kicker" :title="RESEARCH.title" />

      <!-- RQ 01 -->
      <article class="rq">
        <header class="rq__head">
          <span class="rq__num mono">{{ t(RESEARCH.rq1) }}</span>
          <h3 class="rq__title">{{ t(RESEARCH.rq1Title) }}</h3>
        </header>
        <p class="rq__body">{{ t(RESEARCH.rq1Body) }}</p>

        <div class="rq__picker">
          <label class="rq__picklabel" for="metric-select">{{ t(RESEARCH.metric) }}</label>
          <select id="metric-select" v-model="metricId" class="select">
            <option v-for="m in ABLATION" :key="m.id" :value="m.id">
              {{ isZh ? m.label.zh : m.label.en }} {{ m.direction === 'up' ? '↑' : '↓' }}
            </option>
          </select>
          <span class="rq__pickmeta mono">
            {{ isZh ? '单位' : 'unit' }}: {{ isZh ? metric.unit.zh : metric.unit.en }} ·
            {{ isZh ? '视觉基线' : 'vision baseline' }} {{ metric.points[0].mean.toFixed(1) }}
          </span>
        </div>

        <div class="figures">
          <FigFrame
            n="7"
            :title="RESEARCH.ablationChart"
            :aside="{ en: `${metric.points.length} combos`, zh: `${metric.points.length} 组合` }"
          >
            <AblationChart :metric="metric" />
            <template #note>
              {{ isZh
                ? '视觉始终保留，G / M / E 分别为注视、肌电、脑电，共 2³ = 8 种组合。柱高为均值，误差线为 5 次运行的 ±1 SD。'
                : 'Vision is always present; G / M / E are gaze, EMG and EEG, giving 2³ = 8 combinations. Bar height is the mean, the error bar is ±1 SD across the five runs.' }}
            </template>
          </FigFrame>

          <FigFrame
            n="8"
            :title="{ en: 'Change vs vision-only', zh: '相对仅视觉的变化' }"
            :aside="{ en: '95% interval', zh: '95% 区间' }"
          >
            <ForestPlot :key="metricId" :metric="metric" />
            <template #note>
              {{ isZh
                ? '森林图而非柱状图：这里的量是"差值"，带有不确定度。每行为相对仅视觉基线的变化，横线为差值的 95% 区间（±t·SE，t = 2.776，df = 4），虚线为零即"无变化"。区间越过零线者以实心圆与 ★ 标出，即该补充模态与不补充无法区分。区间由已发布的逐组合 SD（n = 5）推导，是同一随机种子扰动协议下的均值差区间，不是被试间区间。'
                : 'A forest plot rather than a bar chart, because the quantity is a difference with uncertainty. Each row is the change from the vision-only baseline, the bar is the 95% interval on that change (±t·SE, t = 2.776, df = 4), and the dashed rule is the null. Rows whose interval clears zero are marked with a filled marker and ★. The interval is derived from the published per-combination SD (n = 5) under the same seeded-perturbation protocol; it is an interval on the mean difference, not a between-participant interval.' }}
            </template>
          </FigFrame>
        </div>

        <div class="figures">
          <FigFrame
            n="9"
            :title="RESEARCH.gainChart"
            :aside="{ en: 'n = 48 pairs', zh: 'n = 48 对' }"
          >
            <ScatterFit />
            <template #note>
              {{ isZh
                ? '全部 48 个（组合 × 指标）配对。每个点在自身指标的单位下按仅视觉基线归一，故六种不同量纲可共用一条纵轴；纵轴为相对基线的增益百分比，正值恒为更好。横向抖动仅为让重合点可见，不代表额外模态数不整。背景竖线为该数量下的均值 ± SD，斜线为最小二乘拟合，并印出 r²——没有 r² 的趋势线会诱导过度解读。'
                : 'All 48 (combination × metric) pairs. Each point is normalised by its own metric’s vision-only baseline, which is what lets six quantities in three different units share one axis; the y-axis is gain over baseline in per cent, positive always better. Horizontal jitter only separates coincident points and does not mean a fractional modality count. The vertical bars behind are the mean ± SD at that count; the line is a least-squares fit, printed with r², because a trend line without r² invites over-reading.' }}
            </template>
          </FigFrame>

          <FigFrame
            n="10"
            :title="{ en: 'Correlation between targets', zh: '各指标之间的相关性' }"
            :aside="{ en: 'Spearman ρ', zh: 'Spearman ρ' }"
          >
            <CorrelationHeatmap :highlight="metricId" />
            <template #note>
              {{ isZh
                ? '由消融表本身算出，而非另行撰写：只有读者能在下方表格中复算，这张矩阵所支持的主张——各指标同向变化、因此不能只看其中一项——才有意义。先对符号归一，故正格恒表示"同向更好"。用秩相关而非积矩相关：六个指标量纲不同，其中 FDE 重尾，积矩相关会被跨度最大的那一列主导。'
                : 'Computed from the ablation table itself rather than authored, because the claim it supports — that the metrics move together, so no single one can stand for “better” — is only meaningful if a reader can recompute it from the table below. Signs are normalised first, so a positive cell always means “better together”. Rank rather than product-moment correlation: the six metrics are on four different scales and FDE is heavy-tailed, so a raw correlation would be dominated by the widest-ranging column.' }}
            </template>
          </FigFrame>
        </div>

        <FigFrame
          n="11"
          class="fig--full"
          :title="{ en: 'Full ablation matrix', zh: '完整消融矩阵' }"
          :aside="{ en: 'all six targets', zh: '全部六个指标' }"
        >
          <AblationMatrix />
          <template #note>
            {{ isZh
              ? '上列各图所依据的原始表。每格为对应组合在该指标上的均值，加粗为该列最优，箭头表示该指标的方向（↑ 越高越好，↓ 越低越好）。'
              : 'The underlying table for the figures above. Each cell is the mean for that combination on that target; bold marks the best in the column, and the arrow gives the metric’s direction (↑ higher better, ↓ lower better).' }}
          </template>
        </FigFrame>
      </article>

      <!-- RQ 02 -->
      <article class="rq">
        <header class="rq__head">
          <span class="rq__num mono">{{ t(RESEARCH.rq2) }}</span>
          <h3 class="rq__title">{{ t(RESEARCH.rq2Title) }}</h3>
        </header>
        <p class="rq__body">{{ t(RESEARCH.rq2Body) }}</p>

        <EventDemo />

        <!-- The demo establishes the mechanism; the pair below turns it into an
             experiment by adding the controls a mechanism claim needs. -->
        <p class="rq__eval-lead">{{ t(RESEARCH.evalLead) }}</p>

        <FigFrame
          n="12"
          class="fig--full"
          :title="RESEARCH.evalTitle"
          :aside="{ en: 'change vs vision-only', zh: '相对仅视觉的变化' }"
        >
          <EventEvalChart />
          <template #note>
            {{ isZh
              ? '每行一个量：事件是否发生、恢复动作是否正确、事件后手部误差。每个标记为该条件相对仅视觉基线的变化百分比，按该指标方向取向，故正值恒为更好，四个不同量纲可共用一条横轴。横线为差值的 95% 区间（±t·SE，t = 2.776，df = 4），由已发布的逐次运行 SD（n = 5）推导；虚线为零。拟议条件在四行上都越过零线，两个消融对照都跨过零线——这一对比，而非拟议行自身的高度，才是它成为实验的原因。'
              : 'One row per quantity: whether an event occurred, whether the recovery action was right, and how far off the hand was afterwards. Each marker is that condition’s change from the vision-only baseline in per cent, oriented by the metric’s own direction, so positive is always better and four quantities in three units share one axis. The bar is the 95% interval on the change (±t·SE, t = 2.776, df = 4), derived from the published per-run SD (n = 5); the dashed rule is zero. The proposed condition clears zero on all four rows and both ablation controls cross it on all four — that contrast, not the proposed row’s height on its own, is what makes this an experiment.' }}
          </template>
        </FigFrame>

        <FigFrame
          n="13"
          class="fig--full"
          :title="{ en: 'Event-centred evaluation table', zh: '事件为中心的评估表' }"
          :aside="{ en: 'n = 5 runs · seed 73', zh: 'n = 5 次 · 种子 73' }"
        >
          <p class="rq__eval-protocol">{{ t(RESEARCH.evalProtocol) }}</p>
          <p class="rq__eval-badge mono">{{ t(RESEARCH.evalBadge) }}</p>
          <EventEvalTable />
        </FigFrame>
      </article>
    </div>
  </section>
</template>

<style scoped>
.mono { font-family: var(--ff-mono); }

.rq { border-top: 1px solid var(--line); padding-top: clamp(1.5rem, 1.2rem + 2vw, 2.5rem); }
.rq + .rq { margin-top: clamp(2rem, 1.5rem + 2.5vw, 3.5rem); }
.rq__head { display: flex; align-items: baseline; gap: 0.85rem; margin-bottom: 0.7rem; }
.rq__num {
  font-size: var(--fs-micro);
  color: var(--c-blue);
  letter-spacing: 0.08em;
  border: 1px solid var(--line-strong);
  border-radius: var(--r-pill);
  padding: 0.15rem 0.6rem;
  white-space: nowrap;
}
.rq__title { font-size: var(--fs-h3); max-width: 34ch; }
.rq__body { font-size: var(--fs-body); color: var(--ink-soft); max-width: 74ch; margin-bottom: 1.25rem; }

/* The picker is one control over three figures, so it is stated as such and
   sits on its own line rather than inside any one figure's header. */
.rq__picker {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.5rem 0.85rem;
  margin-bottom: var(--gap);
  padding: 0.7rem 0.9rem;
  border: 1px solid var(--line);
  border-radius: var(--r-md);
  background: var(--surface);
}
.rq__picklabel {
  font-family: var(--ff-mono);
  font-size: var(--fs-micro);
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--ink-mute);
}
.select {
  padding: 0.4rem 0.55rem;
  font: inherit;
  font-size: var(--fs-small);
  color: var(--ink);
  background: var(--paper);
  border: 1px solid var(--line-strong);
  border-radius: var(--r-sm);
}
.rq__pickmeta { font-size: var(--fs-micro); color: var(--ink-mute); }

.figures {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
  gap: var(--gap);
  margin-bottom: var(--gap);
}
@media (max-width: 980px) { .figures { grid-template-columns: minmax(0, 1fr); } }
.fig--full { margin-top: 0; }

/* The bridge from the authored demo to the controlled comparison. */
.rq__eval-lead {
  font-size: var(--fs-small);
  color: var(--ink-soft);
  max-width: 74ch;
  margin: calc(var(--gap) * 0.9) 0 var(--gap);
}
.rq__eval-protocol {
  font-size: var(--fs-micro);
  color: var(--ink-mute);
  line-height: 1.65;
  max-width: 82ch;
  margin-bottom: 0.7rem;
}
.rq__eval-badge {
  display: inline-block;
  font-size: var(--fs-tick);
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: var(--c-violet);
  border: 1px solid var(--line-strong);
  border-radius: var(--r-pill);
  padding: 0.12rem 0.55rem;
  margin-bottom: 0.7rem;
}
</style>
