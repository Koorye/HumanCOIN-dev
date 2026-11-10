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
  L1: { en: 'Perception', zh: '感知' },
  L2: { en: 'Effort', zh: '发力' },
  L3: { en: 'Cognition', zh: '认知' },
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

/**
 * The bar segment can only show a crop of the scene, so hovering resolves it
 * into the whole frame. The panel is positioned against the segment's box in
 * the viewport rather than inside the row, because a popup nested in the bar
 * would be clipped by the bar's own `overflow: hidden`.
 *
 * `below` flips the panel under the segment when there is no room above it, so
 * the first row's preview does not run off the top of the window.
 */
interface Pop { x: number; y: number; below: boolean }
const pop = ref<Pop | null>(null)
const POP_H = 260

function open(slice: SceneSlice, tier: TierId, ev: Event) {
  active.value = slice
  activeTier.value = tier
  const el = ev.currentTarget as HTMLElement | null
  if (!el) return
  const r = el.getBoundingClientRect()
  const below = r.top < POP_H
  pop.value = { x: r.left + r.width / 2, y: below ? r.bottom + 10 : r.top - 10, below }
}

function close() {
  active.value = null
  pop.value = null
}

const axisTicks = [0, 20, 40, 60, 80, 100]

function detail(slice: SceneSlice, tier: TierId): string {
  const h = (hoursOf(tier) * slice.share) / 100
  return `${t(slice.name)} · ${slice.share}% · ${h.toLocaleString('en-US')} h`
}
</script>

<template>
  <figure class="alloc" :class="{ 'is-open': !!active }">
    <!-- Full-frame preview: the strip in the bar is a crop, so the hover panel
         shows the scene whole. It is fixed to the viewport so no ancestor's
         clip can cut it off, and it never takes the pointer, so moving onto it
         cannot fight the segment's own leave event. -->
    <Transition name="alloc-pop">
      <div
        v-if="active && pop"
        class="alloc__pop"
        :class="{ 'alloc__pop--below': pop.below }"
        :style="{ left: `${pop.x}px`, top: `${pop.y}px` }"
        aria-hidden="true"
      >
        <img :src="SCENE_IMAGE[active.key]" alt="" decoding="async" />
        <p class="alloc__pop-cap">
          <b class="mono">{{ activeTier }}</b>
          <span class="alloc__pop-name">{{ t(active.name) }}</span>
          <b class="mono">{{ active.share }}%</b>
        </p>
      </div>
    </Transition>

    <div class="alloc__rows">
      <div
        v-for="row in rows"
        :key="row.id"
        class="alloc__row"
        :class="{ 'is-open': activeTier === row.id && !!active }"
      >
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
            @mouseenter="open(s, row.id, $event)"
            @focus="open(s, row.id, $event)"
            @mouseleave="close"
            @blur="close"
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

    <p class="alloc__detail" role="status">
      <template v-if="active">
        <b class="mono">{{ activeTier }}</b> · {{ t(active.name) }} ·
        <b class="mono">{{ active.share }}%</b> ·
        <b class="mono">{{ ((hoursOf(activeTier) * active.share) / 100).toLocaleString('en-US') }} h</b>
      </template>
      <template v-else>{{ isZh ? '悬浮任一分段查看该场景的完整画面。' : 'Hover a segment to open the scene in full.' }}</template>
    </p>
  </figure>
</template>

<style scoped>
.mono { font-family: var(--ff-mono); }

.alloc { margin: 0; }
.alloc__rows { display: grid; gap: 0.6rem; }
.alloc__row {
  display: grid;
  grid-template-columns: minmax(0, 9.5rem) minmax(0, 1fr);
  gap: 0.75rem;
  align-items: center;
  transition: opacity var(--dur) var(--ease);
}
/* While a segment is open the other rows recede, so the previewed crop reads
   as the one under the reader's attention. */
.alloc.is-open .alloc__row:not(.is-open) { opacity: 0.45; }
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

/* Tall enough that the per-scene photograph is legible rather than a strip of
   colour: the tallest rows hold nine segments, so at the shell width a segment
   lands close to square. */
.alloc__bar {
  display: flex;
  gap: 2px;
  height: 5.6rem;
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
  padding: 0.25rem 0.45rem 0.35rem;
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

/* ---- hover preview ----
   The panel grows out of the segment it belongs to: the anchor is the
   segment's centre, so only the vertical offset changes between the two
   placements, and the scale is carried by the `scale` property so the enter
   transition can animate it without rewriting the translate. */
.alloc__pop {
  position: fixed;
  z-index: 60;
  width: clamp(12rem, 22vw, 18rem);
  transform: translate(-50%, -100%);
  transform-origin: center bottom;
  background: var(--paper);
  border: 1px solid var(--line-strong);
  border-radius: var(--r-md);
  box-shadow: var(--e-3);
  padding: 0.4rem 0.4rem 0.5rem;
  pointer-events: none;
}
.alloc__pop--below { transform: translate(-50%, 0); transform-origin: center top; }
.alloc__pop img {
  display: block;
  width: 100%;
  aspect-ratio: 1 / 1;
  object-fit: contain;
  background: var(--surface-2);
  border-radius: var(--r-sm);
}
.alloc__pop-cap {
  display: flex;
  align-items: baseline;
  gap: 0.4rem;
  margin: 0.45rem 0 0;
  padding: 0 0.15rem;
  font-size: var(--fs-tick);
  color: var(--ink-soft);
}
.alloc__pop-name { min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.alloc__pop-cap b { font-weight: 620; color: var(--ink); }
.alloc__pop-cap b:last-child { margin-left: auto; }

.alloc-pop-enter-active,
.alloc-pop-leave-active {
  transition: opacity var(--dur-2) var(--ease), transform var(--dur-2) var(--ease),
    scale var(--dur-2) var(--ease);
}
.alloc-pop-enter-from,
.alloc-pop-leave-to { opacity: 0; scale: 0.94; }

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
