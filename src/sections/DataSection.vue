<script setup lang="ts">
/**
 * §02 — data distribution.
 *
 * One figure, three registers, all cut from the same 12,500 hours:
 *
 *   1. the plate — six panels, (a) to (f), on one 1px grid, with the scene
 *      frames as a row of that grid between (d) and (e);
 *   2. the vocabulary — two high-frequency clouds, verbs and objects.
 *
 * The section previously carried four separate figures with their own chrome,
 * three of which repeated the same argument at a larger size; they are gone,
 * together with every "read the data" disclosure. What is left is one plate
 * that runs the full article measure: no inner max-width, no centred row.
 *
 * The four numbers that open the section state what a reader should carry into
 * the plate; the plate itself is FigureStats.
 */
import { DATA } from '@/content'
import { useI18n } from '@/composables/useI18n'
import SectionHead from '@/components/SectionHead.vue'
import RichText from '@/components/RichText.vue'
import FigCaption from '@/components/FigCaption.vue'
import FigureStats from '@/components/FigureStats.vue'
import SceneStrip from '@/components/SceneStrip.vue'
import TierGlyph from '@/components/TierGlyph.vue'
import { SCENES, TIERS, TOTAL_HOURS } from '@/data/fig2'

const { t, list } = useI18n()
const fmt = (n: number) => n.toLocaleString('en-US')
</script>

<template>
  <section id="data" class="section section--tinted">
    <div class="shell">
      <SectionHead :num="DATA.num" :kicker="DATA.kicker" :title="DATA.title" aside-wide>
        <template #aside>
          <div class="data-lead">
            <p v-for="(p, i) in list(DATA.body)" :key="i"><RichText :text="p" /></p>
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
          <p class="dstats__v">99</p>
          <p class="dstats__l">{{ t({ en: 'Task verbs', zh: '任务动词' }) }}</p>
        </li>
        <li>
          <p class="dstats__v">635</p>
          <p class="dstats__l">{{ t({ en: 'Object classes', zh: '物体类别' }) }}</p>
        </li>
      </ul>

      <figure class="dfig" v-reveal>
        <FigCaption n="03" :title="DATA.statsTitle" :aside="DATA.statsAside" />

        <!-- one accent, three weights, three marks: the plate's tier code -->
        <ul class="dfig__key">
          <li v-for="tier in TIERS" :key="tier.id">
            <TierGlyph :id="tier.id" :w="24" :h="9" />
            <span class="dfig__id mono">{{ tier.id }}</span>
            <span>{{ t(tier.name) }}</span>
            <span class="dfig__v mono">{{ fmt(tier.hours) }} h</span>
          </li>
        </ul>

        <FigureStats id="data-stats" />
      </figure>

      <!-- the sampling band: stills, outside the plate, full column width -->
      <div class="dfig__band-strip">
        <SceneStrip id="data-scenes" />
      </div>
    </div>
  </section>
</template>

<style scoped>
.mono { font-family: var(--ff-mono); }

/* The chapter is a single dense plate: tighten its own rhythm rather than the
   page's global section spacing. */
#data { padding-block: clamp(2rem, 1.6rem + 1.2vw, 2.7rem); }
#data :deep(.section__head) { margin-bottom: clamp(0.9rem, 0.75rem + 0.4vw, 1.15rem); }

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

/* ---- the figure ---- */
.dfig {
  margin: 0;
  border-top: 1px solid var(--line);
  padding-top: 0.7rem;
  min-width: 0;
}

.dfig__key {
  list-style: none;
  margin: 0;
  padding: 0.45rem 0 0.7rem;
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  gap: 0.25rem 1.2rem;
  font-size: var(--fs-tick);
  line-height: 1.4;
  color: var(--ink-soft);
}
.dfig__key li {
  display: inline-flex;
  align-items: baseline;
  gap: 0.32rem;
  white-space: nowrap;
}
.dfig__id { color: var(--ink); font-weight: 600; letter-spacing: 0.03em; }
.dfig__v { color: var(--ink-mute); font-variant-numeric: tabular-nums; }

/* the stills sit below the plate, at its width, a breath away from it */
.dfig__band-strip { margin-top: clamp(1.2rem, 1.05rem + 0.4vw, 1.6rem); }
</style>
