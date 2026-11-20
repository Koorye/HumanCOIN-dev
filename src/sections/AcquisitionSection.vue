<script setup lang="ts">
/**
 * Acquisition — intent proxies, after Figure 4 of the report.
 *
 * The section used to carry two readings of the same inventory: a flat pyramid
 * on the left and a selected-tier panel on the right, with a body map in
 * between. The pyramid encoded tier order as area, which forced the three tier
 * names into trapezoids and hid the instruments behind a tab. The figure below
 * makes the relation addition instead: three kits, left to right, each carrying
 * the one before it, with the new instruments at full strength and the carried
 * ones quieted. The reading block inside the figure carries rate and
 * measured/inferred detail on demand, for pointer and keyboard alike.
 */
import { ACQUISITION, TIERS } from '@/content'
import SectionHead from '@/components/SectionHead.vue'
import FigFrame from '@/components/FigFrame.vue'
import IntentRelay from '@/components/IntentRelay.vue'

/* The kit counts are read from the same array the figure draws, so the figure
   head cannot claim a progression the columns do not show. */
const kitCounts = TIERS.map(
  (tier) => tier.devices.length + tier.inherits.reduce((n, row) => n + row.ids.length, 0),
)
const kitAside = {
  en: `${kitCounts.join(' → ')} instruments`,
  zh: `${kitCounts.join(' → ')} 件仪器`,
}
</script>

<template>
  <section id="acquisition" class="section">
    <div class="shell">
      <SectionHead
        :num="ACQUISITION.num"
        :kicker="ACQUISITION.kicker"
        :title="ACQUISITION.title"
        :aside="ACQUISITION.aside"
      />

      <FigFrame
        id="acquisition-figure"
        n="05"
        :title="{ en: 'Instrumentation by tier', zh: '按层级配置的仪器' }"
        :aside="kitAside"
      >
        <IntentRelay />
      </FigFrame>
    </div>
  </section>
</template>

<style scoped>
/* The section is one plate: a short breath under the head, the figure, then
   nothing else. */
#acquisition :deep(.section__head) {
  margin-bottom: clamp(1.2rem, 1rem + 0.4vw, 1.45rem);
}
#acquisition :deep(.fig) {
  padding-top: 0.55rem;
  padding-bottom: 0.6rem;
}
</style>
