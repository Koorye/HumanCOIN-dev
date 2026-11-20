<script setup lang="ts">
/**
 * The 38 scene classes, grouped the way the report groups them: five zones plus
 * a residual class. Each zone carries its share of the 12,500 hours,
 * stacked by tier, so a reader can see which zones the deep tiers actually
 * reach — L3 never leaves the desk, and the bars say so before the text does.
 */
import { computed } from 'vue'
import { useI18n } from '@/composables/useI18n'
import { ZONE_GROUPS } from '@/data/fig2'

const { t } = useI18n()

const TIERS = ['L1', 'L2', 'L3'] as const
const TIER_COLOR = { L1: 'var(--c-blue)', L2: 'var(--c-teal)', L3: 'var(--c-violet)' }

/* five functional zones plus the residual class, each stacked by the tier that
   records it — the split the report prints in its scene table */
const rows = computed(() =>
  ZONE_GROUPS.filter((g) => g.scenes.length).map((g) => ({
    zone: g.zone,
    total: g.share,
    hours: g.hours,
    slices: TIERS.map((tier) => ({
      tier,
      share: g.tiers[tier],
      pct: g.hours ? (g.tiers[tier] / g.hours) * 100 : 0,
    })),
    scenes: g.scenes.map((sc) => t(sc.name)),
  })),
)

const fmt = (v: number) => v.toFixed(1)
</script>

<template>
  <div class="zones">
    <ul class="zones__list">
      <li v-for="row in rows" :key="row.zone.id" class="zone">
        <div class="zone__head">
          <span class="zone__name">{{ t(row.zone.name) }}</span>
          <span class="zone__total mono">{{ fmt(row.total) }}<span class="zone__pct">% h</span></span>
        </div>
        <div class="zone__bar" role="img" :aria-label="`${t(row.zone.name)} · ${fmt(row.total)}%`">
          <span
            v-for="s in row.slices"
            :key="s.tier"
            class="zone__seg"
            :style="{ width: `${s.pct}%`, background: TIER_COLOR[s.tier] }"
            :title="`${s.tier} · ${fmt(s.share)}%`"
          />
        </div>
        <p class="zone__scenes">{{ row.scenes.join(' · ') }}</p>
      </li>
    </ul>

    <ul class="zones__legend">
      <li v-for="tier in TIERS" :key="tier">
        <span class="zones__sw" :style="{ background: TIER_COLOR[tier] }" />{{ tier }}
      </li>
    </ul>
  </div>
</template>

<style scoped>
.mono { font-family: var(--ff-mono); }

.zones { display: grid; gap: 0.5rem; }
.zones__list { list-style: none; margin: 0; padding: 0; display: grid; gap: 0.55rem; }
.zone { display: grid; gap: 0.2rem; }
.zone__head { display: flex; align-items: baseline; justify-content: space-between; gap: 0.75rem; }
.zone__name { font-size: var(--fs-small); font-weight: 550; color: var(--ink); }
.zone__total { font-size: var(--fs-small); color: var(--ink); }
.zone__pct { color: var(--ink-mute); margin-left: 0.15em; font-size: var(--fs-micro); }
.zone__bar {
  display: flex;
  height: 0.55rem;
  background: var(--surface-2);
  overflow: hidden;
}
.zone__seg { display: block; height: 100%; }
.zone__scenes { margin: 0; font-size: var(--fs-micro); color: var(--ink-mute); line-height: 1.45; }

.zones__legend {
  list-style: none;
  margin: 0.3rem 0 0;
  padding: 0;
  display: flex;
  flex-wrap: wrap;
  gap: 0.3rem 1rem;
  font-size: var(--fs-micro);
  color: var(--ink-mute);
}
.zones__legend li { display: inline-flex; align-items: center; gap: 0.35rem; }
.zones__sw { width: 0.55rem; height: 0.55rem; display: inline-block; }
</style>
