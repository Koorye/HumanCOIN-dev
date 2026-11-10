<script setup lang="ts">
/**
 * §03 — data distribution.
 *
 * The section follows Fig. 2 of the report, panel for panel: the three tiers
 * and their two settings, the eighteen scene classes, the eighty-verb tail and
 * the six hundred object entries. Each figure is a live plate rather than a
 * screenshot: the pointer reads values, a replay re-runs the entrance, and the
 * data behind every bar sits behind a disclosure.
 *
 * The strip above the figures states the four numbers a reader should carry
 * into them; the argument sits beside the title, where it can be read before
 * the first chart starts to draw.
 */
import { DATA } from '@/content'
import { useI18n } from '@/composables/useI18n'
import SectionHead from '@/components/SectionHead.vue'
import FigFrame from '@/components/FigFrame.vue'
import TierDepthFigure from '@/components/TierDepthFigure.vue'
import SceneCarousel from '@/components/SceneCarousel.vue'
import VerbTail from '@/components/VerbTail.vue'
import ObjectTail from '@/components/ObjectTail.vue'
import { OBJECT_TOTALS, SCENES, TOTAL_HOURS } from '@/data/fig2'

const { t, list } = useI18n()
const fmt = (n: number) => n.toLocaleString('en-US')
</script>

<template>
  <section id="data" class="section section--tinted">
    <div class="shell">
      <SectionHead :num="DATA.num" :kicker="DATA.kicker" :title="DATA.title" aside-wide>
        <template #aside>
          <div class="data-lead">
            <p v-for="(p, i) in list(DATA.body)" :key="i">{{ p }}</p>
          </div>
        </template>
      </SectionHead>

      <ul class="dstats">
        <li>
          <p class="dstats__v">{{ fmt(TOTAL_HOURS) }}<span>h</span></p>
          <p class="dstats__l">{{ t({ en: 'Recording volume', zh: '采集规模' }) }}</p>
        </li>
        <li>
          <p class="dstats__v">{{ SCENES.length }}</p>
          <p class="dstats__l">{{ t({ en: 'Scene classes', zh: '场景类别' }) }}</p>
        </li>
        <li>
          <p class="dstats__v">500<span>+</span></p>
          <p class="dstats__l">{{ t({ en: 'Task entries', zh: '任务条目' }) }}</p>
        </li>
        <li>
          <p class="dstats__v">{{ OBJECT_TOTALS.entries }}</p>
          <p class="dstats__l">{{ t({ en: 'Object entries', zh: '物体条目' }) }}</p>
        </li>
      </ul>

      <div class="figures">
        <FigFrame
          n="3"
          :title="DATA.depthTitle"
          :aside="DATA.depthAside"
          :note="DATA.depthNote"
        >
          <TierDepthFigure />
        </FigFrame>

        <FigFrame n="4" :title="DATA.sceneTitle" :aside="DATA.sceneAside">
          <SceneCarousel :note="DATA.sceneNote" />
        </FigFrame>

        <FigFrame n="5" :title="DATA.verbTitle" :aside="DATA.verbAside">
          <VerbTail :note="DATA.verbNote" />
        </FigFrame>

        <FigFrame n="6" :title="DATA.objectTitle" :aside="DATA.objectAside">
          <ObjectTail :note="DATA.objectNote" />
        </FigFrame>
      </div>
    </div>
  </section>
</template>

<style scoped>
/* The chapter is a plate of four dense figures: tighten its own rhythm rather
   than the page's global section spacing. */
#data { padding-block: clamp(2rem, 1.6rem + 1.2vw, 2.7rem); }
#data :deep(.section__head) { margin-bottom: clamp(0.9rem, 0.75rem + 0.4vw, 1.15rem); }
#data :deep(.fig) { padding-top: 0.6rem; padding-bottom: 0.65rem; }
#data :deep(.fig__head) { padding-bottom: 0.45rem; margin-bottom: 0.65rem; }
#data :deep(.fig__note) { margin-top: 0.6rem; padding-top: 0.5rem; max-width: 100%; }

.data-lead {
  font-size: var(--fs-micro);
  line-height: 1.5;
  color: var(--ink-soft);
}
.data-lead p { margin-bottom: 0.4em; }
.data-lead p:last-child { margin-bottom: 0; }
@media (max-width: 900px) { .data-lead { font-size: var(--fs-micro); } }

/* One strip of four numbers, ruled like a table rather than boxed like cards. */
.dstats {
  list-style: none;
  margin: 0 0 0.9rem;
  padding: 0;
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  border-top: 1px solid var(--line);
  border-bottom: 1px solid var(--line);
}
@media (max-width: 700px) {
  .dstats { grid-template-columns: repeat(2, minmax(0, 1fr)); }
}
.dstats li {
  padding: 0.55rem 0.9rem 0.5rem;
  border-left: 1px solid var(--line);
}
.dstats li:first-child { border-left: 0; padding-left: 0; }
@media (max-width: 700px) {
  .dstats li:nth-child(3) { border-left: 0; padding-left: 0; }
  .dstats li:nth-child(3), .dstats li:nth-child(4) { border-top: 1px solid var(--line); }
}
.dstats__v {
  margin: 0;
  font-family: var(--ff-display);
  font-size: clamp(1.4rem, 1.15rem + 0.9vw, 1.85rem);
  font-weight: 500;
  letter-spacing: -0.035em;
  color: var(--ink);
  line-height: 1;
  font-variant-numeric: tabular-nums;
}
.dstats__v span {
  font-family: var(--ff-mono);
  font-size: 0.42em;
  font-weight: 400;
  color: var(--ink-mute);
  margin-left: 0.18em;
  letter-spacing: 0;
}
.dstats__l {
  margin: 0.25rem 0 0;
  font-size: var(--fs-micro);
  color: var(--ink-soft);
}

/* The figures share the page's figure chrome; only the spacing between them is
   decided here, so the section reads as a sequence of plates. */
.figures {
  display: grid;
  gap: clamp(0.7rem, 0.55rem + 0.35vw, 1rem);
}
</style>
