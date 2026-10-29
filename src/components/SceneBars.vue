<script setup lang="ts">
import { computed, ref } from 'vue'
import { useI18n } from '@/composables/useI18n'
import {
  SCENE_ALLOCATION,
  SCENE_IMAGE,
  TIER_HOURS,
  type SceneSlice,
} from '@/data/stats'

const { t, isZh } = useI18n()

const TIER_ORDER = ['L1', 'L2', 'L3'] as const
type TierId = (typeof TIER_ORDER)[number]

const tierColor: Record<TierId, string> = {
  L1: 'var(--c-blue)',
  L2: 'var(--c-teal)',
  L3: 'var(--c-violet)',
}

const tierName: Record<TierId, { en: string; zh: string }> = {
  L1: { en: 'Open scene', zh: '开放场景' },
  L2: { en: 'Enhanced modality', zh: '增强模态' },
  L3: { en: 'Perceptual construction', zh: '知觉建构' },
}

const hoursOf = (id: TierId) => TIER_HOURS.find((x) => x.id === id)!.hours

const rows = computed(() =>
  TIER_ORDER.map((id) => ({
    id,
    color: tierColor[id],
    name: tierName[id],
    hours: hoursOf(id),
    slices: SCENE_ALLOCATION[id],
  })),
)

const active = ref<SceneSlice | null>(null)
const activeTier = ref<TierId>('L2')

const axisTicks = [0, 20, 40, 60, 80, 100]

function detail(slice: SceneSlice, tier: TierId): string {
  const h = (hoursOf(tier) * slice.share) / 100
  return `${t(slice.name)} · ${slice.share}% · ${h.toLocaleString('en-US')} h`
}
</script>

<template>
  <figure class="alloc">
    <div class="alloc__rows">
      <div v-for="row in rows" :key="row.id" class="alloc__row">
        <div class="alloc__meta">
          <span class="alloc__id mono" :style="{ color: row.color }">{{ row.id }}</span>
          <span class="alloc__name">{{ isZh ? row.name.zh : row.name.en }}</span>
          <span class="alloc__hours mono">{{ row.hours.toLocaleString('en-US') }} h</span>
        </div>
        <div
          class="alloc__bar"
          role="list"
          :aria-label="`${row.id} · ${isZh ? '场景规划份额，合计 100%' : 'planned scene shares, total 100%'}`"
        >
          <button
            v-for="s in row.slices"
            :key="s.key"
            type="button"
            role="listitem"
            class="segs"
            :class="{ 'segs--on': active?.key === s.key && activeTier === row.id }"
            :style="{ flexBasis: `${s.share}%`, '--tier': row.color }"
            :title="detail(s, row.id)"
            :aria-label="detail(s, row.id)"
            @mouseenter="((active = s), (activeTier = row.id))"
            @focus="((active = s), (activeTier = row.id))"
            @mouseleave="active = null"
            @blur="active = null"
          >
            <img :src="SCENE_IMAGE[s.key]" alt="" loading="lazy" decoding="async" />
            <span class="segs__veil" aria-hidden="true" />
            <span class="segs__text">
              <span class="segs__label">{{ t(s.name) }}</span>
              <b class="segs__share mono">{{ s.share }}%</b>
            </span>
          </button>
        </div>
      </div>
    </div>

    <div class="alloc__axis-row">
      <span class="alloc__axis-label mono">{{
        isZh ? '层内规划时长' : 'Within-level planned hours'
      }}</span>
      <div class="alloc__axis">
        <span v-for="p in axisTicks" :key="p" :style="{ left: `${p}%` }" class="mono">{{ p }}%</span>
      </div>
    </div>

    <p v-if="active" class="alloc__detail" role="status">
      <b class="mono">{{ activeTier }}</b> · {{ t(active.name) }} ·
      <b class="mono">{{ active.share }}%</b> ·
      <b class="mono">{{ ((hoursOf(activeTier) * active.share) / 100).toLocaleString('en-US') }} h</b>
    </p>
  </figure>
</template>

<style scoped>
.mono { font-family: var(--ff-mono); }

.alloc { margin: 0; }
.alloc__rows { display: grid; gap: 0.55rem; }
.alloc__row {
  display: grid;
  grid-template-columns: minmax(0, 9.5rem) minmax(0, 1fr);
  gap: 0.75rem;
  align-items: center;
}
@media (max-width: 640px) {
  .alloc__row { grid-template-columns: minmax(0, 1fr); gap: 0.25rem; }
}

.alloc__meta { display: flex; align-items: baseline; gap: 0.5rem; min-width: 0; }
.alloc__id { font-size: var(--fs-micro); font-weight: 620; }
.alloc__name {
  font-size: var(--fs-micro); color: var(--ink); font-weight: 550;
  overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
}
.alloc__hours { font-size: var(--fs-tick); color: var(--ink-mute); margin-left: auto; }

.alloc__bar {
  display: flex;
  gap: 2px;
  height: 3.1rem;
  border-radius: var(--r-sm);
  overflow: hidden;
  background: var(--surface-2);
}

.segs {
  position: relative;
  min-width: 0;
  padding: 0;
  border: 0;
  border-radius: 0;
  overflow: hidden;
  cursor: pointer;
  background: var(--surface-2);
  box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.35);
  transition: filter var(--dur) var(--ease), box-shadow var(--dur) var(--ease);
}
.segs img { width: 100%; height: 100%; object-fit: cover; display: block; }
.segs__veil {
  position: absolute;
  inset: 0;
  background: linear-gradient(180deg, rgba(12, 26, 36, 0.28) 0%, rgba(12, 26, 36, 0.7) 100%);
}
.segs__text {
  position: absolute;
  inset: auto 0 0 0;
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 0;
  padding: 0.2rem 0.4rem 0.3rem;
  text-align: left;
  color: #fff;
  line-height: 1.15;
}
.segs__label {
  font-size: var(--fs-tick);
  font-weight: 550;
  max-width: 100%;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.segs__share { font-size: var(--fs-tick); font-weight: 600; }
.segs--on { box-shadow: inset 0 0 0 2px var(--tier), inset 0 0 0 4px rgba(255, 255, 255, 0.9); }
.segs--on .segs__veil { background: linear-gradient(180deg, rgba(12, 26, 36, 0.18) 0%, rgba(12, 26, 36, 0.82) 100%); }
.segs:focus-visible { outline: var(--focus); outline-offset: 1px; }

.alloc__axis-row {
  display: grid;
  grid-template-columns: minmax(0, 9.5rem) minmax(0, 1fr);
  gap: 0.75rem;
  margin-top: 0.35rem;
}
@media (max-width: 640px) {
  .alloc__axis-row { grid-template-columns: minmax(0, 1fr); }
  .alloc__axis-label { display: none; }
}
.alloc__axis-label { font-size: var(--fs-tick); color: var(--ink-mute); }
.alloc__axis { position: relative; height: 1rem; font-size: var(--fs-tick); color: var(--ink-mute); }
.alloc__axis span { position: absolute; transform: translateX(-50%); }
.alloc__axis span:first-child { transform: none; }
.alloc__axis span:last-child { transform: translateX(-100%); }

.alloc__detail {
  margin: 0.7rem 0 0;
  font-size: var(--fs-small);
  color: var(--ink-soft);
  min-height: 1.3em;
}
</style>
