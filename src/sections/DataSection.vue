<script setup lang="ts">
/**
 * Data composition.
 *
 * Ordered as a results section would be: the headline allocation first (how the
 * hours divide), then the tier coverage profile, then the two figures that
 * describe the distribution rather than its total (violin and ECDF, which are
 * checks on each other), then the raw bin shares, then the scene breakdown,
 * then the table underneath it, then the scenes themselves.
 *
 * Each figure is wrapped in the shared journal frame, so the reader always sees
 * a number, a title and a note stating what the figure does and does not claim.
 */
import { ref, computed } from 'vue'
import { DATA } from '@/content'
import { useI18n } from '@/composables/useI18n'
import SectionHead from '@/components/SectionHead.vue'
import FigFrame from '@/components/FigFrame.vue'
import DonutChart from '@/components/DonutChart.vue'
import DurationStack from '@/components/DurationStack.vue'
import SceneBars from '@/components/SceneBars.vue'
import TaskProfile from '@/components/TaskProfile.vue'
import { SCENE_ALLOCATION, TOTAL_HOURS } from '@/data/stats'
import { TASK_ROWS, TASK_TOTALS } from '@/data/tasks'

const { t, list, isZh } = useI18n()

/** Entries at one station, read off the protocol rows so the note cannot drift. */
const taskCount = (key: string) => TASK_ROWS.find((row) => row.key === key)?.tasks.length ?? 0

/** The splits the figure note quotes, derived rather than typed twice. */
const OFF_SITE = ['market', 'kitchen-ext', 'pharmacy', 'salon', 'cafe'].reduce(
  (n, key) => n + taskCount(key),
  0,
)
const ON_SITE = TASK_TOTALS.L2 - OFF_SITE
const STATIONS = TASK_ROWS.length

const tierColors: Record<string, string> = {
  L1: 'var(--c-blue)',
  L2: 'var(--c-teal)',
  L3: 'var(--c-violet)',
}

interface TierRow {
  id: 'L1' | 'L2' | 'L3'
  title: { en: string; zh: string }
  hours: number
  share: number
  scenes: { en: string; zh: string }[]
  entries: number
  color: string
}

const sceneCount: Record<TierRow['id'], number> = {
  L1: SCENE_ALLOCATION.L1.length,
  L2: SCENE_ALLOCATION.L2.length,
  L3: SCENE_ALLOCATION.L3.length,
}

const tiers: TierRow[] = [
  { id: 'L1', title: { en: 'Open scene', zh: '开放场景' }, hours: 10000, share: 80, entries: 0, scenes: [DATA.scenes[0], DATA.scenes[4], DATA.scenes[3]], color: tierColors.L1 },
  { id: 'L2', title: { en: 'Enhanced modality', zh: '增强模态' }, hours: 2000, share: 16, entries: TASK_TOTALS.L2, scenes: [DATA.scenes[1], DATA.scenes[5], DATA.scenes[2]], color: tierColors.L2 },
  { id: 'L3', title: { en: 'Perceptual construction', zh: '知觉建构' }, hours: 500, share: 4, entries: TASK_TOTALS.L3, scenes: [DATA.scenes[0], DATA.scenes[2], DATA.scenes[5]], color: tierColors.L3 },
]

const activeTier = ref<TierRow['id']>('L2')
const activeRow = computed(() => tiers.find((x) => x.id === activeTier.value) ?? tiers[0])
const sceneEntries = sceneCount.L1 + sceneCount.L2 + sceneCount.L3
</script>

<template>
  <section id="data" class="section section--tinted">
    <div class="shell">
      <SectionHead :num="DATA.num" :kicker="DATA.kicker" :title="DATA.title" />

      <div class="data-intro prose">
        <p v-for="(p, i) in list(DATA.body)" :key="i" :class="{ lead: i === 0 }">{{ p }}</p>
      </div>

      <!-- The two figures that cut one corpus two ways: by tier, and by length.
           They share a viewBox, so the row has one height and no panel is
           stretched to match the other. -->
      <div class="figures">
        <FigFrame n="3" :title="DATA.hoursChart" :aside="{ en: 'tier total', zh: '三层合计' }">
          <DonutChart />
          <template #note>
            {{ isZh
              ? `三层合计 ${TOTAL_HOURS.toLocaleString('en-US')} 规划小时：L1 / L2 / L3 = 10,000 / 2,000 / 500 小时，即 80% / 16% / 4%。环形按份额自正上方起连续绘制，段间留固定间隙以区分相邻层；中心数字为三层合计，右侧列出每层的份额与小时数。`
              : `Three tiers total ${TOTAL_HOURS.toLocaleString('en-US')} planned hours: L1 / L2 / L3 = 10,000 / 2,000 / 500 h, i.e. 80% / 16% / 4%. Arcs are drawn end to end from the top of the ring in share order, with a fixed gap separating adjacent shares. The centre carries the tier total; the right column gives each tier's share and hours.` }}
          </template>
        </FigFrame>

        <FigFrame
          n="4"
          :title="DATA.durationChart"
          :aside="{ en: '10 s bins · stacked', zh: '10 秒分箱 · 堆叠' }"
        >
          <DurationStack />
          <template #note>
            {{ isZh
              ? `把上面同一个 ${TOTAL_HOURS.toLocaleString('en-US')} 小时按时长重新切分：每根柱为一个 10 秒分箱，L1/L2/L3 自下而上堆在同一条内，柱高合计 100% 的规划小时，每层在各柱中的份额合计回该层的 80% / 16% / 4%。已发布的分箱宽度为 30 秒，10 秒分箱只是把同一组占比读得更密，并未新增测量；跨分箱不做任何平滑连接。轴下三个标记为该层中位时长落点。`
              : `The same ${TOTAL_HOURS.toLocaleString('en-US')} hours re-cut by length: each bar is a 10 s bin, with L1/L2/L3 stacked bottom to top, bar heights summing to 100% of planned hours, and each tier's column of shares summing back to its 80% / 16% / 4% of the corpus. The published bin width is 30 s, so 10 s bins read the same shares at higher drawing resolution and add no measurement; nothing is smoothed across a bin edge. The three ticks below the axis mark where each tier's median falls.` }}
          </template>
        </FigFrame>
      </div>

      <FigFrame
        n="5"
        class="fig--wide"
        :title="DATA.taskChart"
        :aside="{ en: `${TASK_TOTALS.total} entries · ${STATIONS} stations`, zh: `${TASK_TOTALS.total} 条目 · ${STATIONS} 个工位` }"
      >
        <TaskProfile />
        <template #note>
          {{ isZh
            ? `左：协议表中每个情境工位的任务条目数，按条目降序，一柱一工位——少数重工位加一条长尾（书桌 ${taskCount('desk-hc')} 条与货架 ${taskCount('shelving')} 条为最重，卧室、餐桌、床铺各 1–2 条）。L3 ${TASK_TOTALS.L3} 条全在固定工位；L2 ${TASK_TOTALS.L2} 条中院内 ${ON_SITE} 条、便携外采 ${OFF_SITE} 条。L1 以自然流被动采集，不枚举条目，故不在图中。右：按同一顺序逐条轮播任务，给出任务名与其认知负载点（高思维表）或任务说明（通用表）。配图为六张 AI 概念示意图中最近场景的裁切，非任务实拍。`
            : `Left: task entries per scenario station, taken row by row from the protocol tables and sorted descending — one bar per station, a few heavy ones and a long tail (desk ${taskCount('desk-hc')} and shelving ${taskCount('shelving')} are the heaviest; bedroom, dining table and bed carry one or two each). All ${TASK_TOTALS.L3} L3 entries sit at fixed workstations; of L2's ${TASK_TOTALS.L2}, ${ON_SITE} are on-site and ${OFF_SITE} portable off-site. L1 is recorded as a passive natural stream and enumerates no entries, so it is absent. Right: the same stations walked one task at a time, each with the plan's cognitive-load point (high-cognitive tables) or one-line description (general table). The picture is a crop of the nearest of six AI concept illustrations, not a photograph of that task.` }}
        </template>
      </FigFrame>

      <FigFrame
        n="6"
        class="fig--wide"
        :title="DATA.sceneChart"
        :aside="{ en: 'within-tier share', zh: '层内占比' }"
      >
        <SceneBars />
        <template #note>
          {{ isZh
            ? `每层独立归一至 100%；条带宽度为该层内的规划时长占比，悬浮或聚焦分段可查看场景名、份额与该层对应小时数。三层共 ${sceneEntries} 个场景条目。`
            : `Each tier normalises to 100% independently. Segment width is the within-tier share of planned hours; hover or focus a segment for its scene, share and tier hours. The three tiers hold ${sceneEntries} scene entries in total.` }}
        </template>
      </FigFrame>

      <div class="tier-table">
        <table class="tbl">
          <caption>{{ isZh ? '各层汇总' : 'Tier summary' }}</caption>
          <thead>
            <tr>
              <th scope="col">{{ t(DATA.tierCol) }}</th>
              <th scope="col">{{ t(DATA.hoursCol) }}</th>
              <th scope="col">{{ t(DATA.shareCol) }}</th>
              <th scope="col">{{ isZh ? '场景条目' : 'Scene entries' }}</th>
              <th scope="col">{{ isZh ? '任务条目' : 'Task entries' }}</th>
              <th scope="col">{{ t(DATA.scenesCol) }}</th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="row in tiers"
              :key="row.id"
              :class="{ 'row--active': row.id === activeTier }"
              @mouseenter="activeTier = row.id"
              @focusin="activeTier = row.id"
            >
              <th scope="row" class="tier-cell">
                <span class="tier-cell__id mono" :style="{ color: row.color }">{{ row.id }}</span>
                <span class="tier-cell__name">{{ isZh ? row.title.zh : row.title.en }}</span>
              </th>
              <td class="mono">{{ row.hours.toLocaleString('en-US') }} h</td>
              <td class="mono">{{ row.share }}%</td>
              <td class="mono">{{ sceneCount[row.id] }}</td>
              <td class="mono">{{ row.entries === 0 ? '—' : row.entries }}</td>
              <td class="scenes-cell">
                <span v-for="s in row.scenes" :key="s.en" class="scene-pill">{{ isZh ? s.zh : s.en }}</span>
              </td>
            </tr>
          </tbody>
        </table>
        <p class="caption">
          {{ isZh
            ? `小时为规划量，非已采集量。场景条目为该层展开的情境数；任务条目为协议表中该层工位对应的任务条数（L1 无枚举条目）。当前示例层级 ${activeRow.id}。`
            : `Hours are planned, not collected. Scene entries are the scenes expanded within each tier; task entries are the protocol rows assigned to that tier's stations (L1 enumerates none). Active tier shown: ${activeRow.id}.` }}
        </p>
      </div>

      <div class="scenes">
        <figure v-for="(s, i) in DATA.scenes" :key="s.en" class="scene">
          <img
            :src="`generated/${['kitchen', 'workbench', 'desk', 'laundry', 'market', 'coffee'][i]}.jpg`"
            :alt="isZh ? s.zh : s.en"
            loading="lazy"
            decoding="async"
          />
          <figcaption>{{ isZh ? s.zh : s.en }}</figcaption>
        </figure>
      </div>
    </div>
  </section>
</template>

<style scoped>
.mono { font-family: var(--ff-mono); }

.data-intro { margin-bottom: clamp(1.75rem, 1.4rem + 2vw, 2.75rem); }
.data-intro p { max-width: 68ch; }

.figures {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
  gap: var(--gap);
  margin-bottom: var(--gap);
}
@media (max-width: 900px) { .figures { grid-template-columns: minmax(0, 1fr); } }

/* The frame carries the panel chrome; this only controls the rhythm between
   figures, so the section reads as a plate of figures rather than a stack. */
.fig--wide { margin-bottom: var(--gap); }
.figures .fig--wide { margin-bottom: 0; }

/* ---- tier table ---- */
.tier-table { overflow-x: auto; margin-bottom: clamp(1.75rem, 1.4rem + 2vw, 2.5rem); }
.tier-cell { display: flex; align-items: baseline; gap: 0.5rem; }
.tier-cell__id { font-size: var(--fs-micro); font-weight: 600; }
.tier-cell__name { font-size: var(--fs-small); color: var(--ink); font-weight: 550; }
.row--active { background: var(--surface); }
.scenes-cell { display: flex; flex-wrap: wrap; gap: 0.3rem; }
.scene-pill {
  font-size: var(--fs-micro);
  color: var(--ink-soft);
  background: var(--surface-2);
  border: 1px solid var(--line);
  border-radius: var(--r-pill);
  padding: 0.1rem 0.5rem;
}

/* ---- scene strip ---- */
.scenes {
  display: grid;
  grid-template-columns: repeat(6, minmax(0, 1fr));
  gap: 0.6rem;
}
@media (max-width: 760px) { .scenes { grid-template-columns: repeat(3, minmax(0, 1fr)); } }
.scene { margin: 0; }
.scene img {
  width: 100%;
  aspect-ratio: 4 / 3;
  object-fit: cover;
  border-radius: var(--r-sm);
  border: 1px solid var(--line);
  background: var(--surface-2);
}
.scene figcaption {
  margin-top: 0.35rem;
  font-size: var(--fs-micro);
  color: var(--ink-mute);
  text-align: center;
}
</style>
