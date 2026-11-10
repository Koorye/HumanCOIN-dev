<script setup lang="ts">
/**
 * The cover's carousel: three marquee rows of takes, one per acquisition tier.
 *
 * Motion is one continuous translation of a doubled track, so the row never
 * restarts and there is no per-card step to follow — the strip reads as a feed
 * rather than as a slideshow. L3 and L1 travel left and L2 travels right, so two
 * adjacent rows never merge into one long band and a reader can tell at a glance
 * which row a card came from.
 *
 * Pointing at a card stops its row (so the card stays under the cursor) and
 * opens that take in the moment beside it; clicking pins it so it survives the
 * cursor leaving. Nothing is fetched until a card is pointed at: the cards
 * themselves are the release's own 12 s previews, which are small and shared
 * across rows, and the take's signal payload is fetched by the stage.
 *
 * Each row is its own tier's captures, reduced by the same script: eight takes
 * per row, all real, so the three rows no longer repeat one strip. The badge on
 * a card is the tier the take was recorded at, not a label for a stand-in.
 */
import { computed } from 'vue'
import { COVER_CAROUSEL as C, TIER_PROVENANCE, type TierProvenance } from '@/data/cover'
import { COVER_TAKES_BY_TIER, type CoverTake } from '@/data/coverReels'
import { useI18n } from '@/composables/useI18n'

defineProps<{
  activeId: string
  pinnedId: string
}>()

const emit = defineEmits<{
  (e: 'hover', takeId: string, tier: TierProvenance): void
  (e: 'leave'): void
  (e: 'select', takeId: string, tier: TierProvenance): void
}>()

const { t, isZh } = useI18n()

/** One row per tier, top to bottom, each carrying its own tier's captures. */
const rows = computed(() =>
  TIER_PROVENANCE.map((tier) => {
    const takes = COVER_TAKES_BY_TIER[tier.id]
    // L3 and L1 travel left; L2 travels right.
    const dir = tier.id === 'L2' ? 'right' : 'left'
    const unit = unitFor(takes)
    return { tier, unit, doubled: doubled(unit), dir, duration: durationFor(unit) }
  }),
)

/**
 * The card pitch, in px: the card plus the row gap. About ten cards fit across
 * a full-width row, which keeps each row to one shallow band of thumbnails.
 */
const CARD_W = 96
const GAP = 6
const CARD_PITCH = CARD_W + GAP
const SPEED = 42 // px per second

/**
 * One loop unit, in px. A doubled track slides by half its width, so the unit
 * has to be at least as wide as the widest viewport or a blank gap opens before
 * the wrap. Eight takes at this pitch are narrower than the shell, so the unit
 * repeats the row until it has the length and is then doubled.
 */
const UNIT_MIN = 1600

function unitFor(takes: CoverTake[]): CoverTake[] {
  const need = Math.max(1, Math.ceil(UNIT_MIN / (takes.length * CARD_PITCH)))
  return Array.from({ length: need }, () => takes).flat()
}

function durationFor(unit: CoverTake[]): string {
  return `${((unit.length * CARD_PITCH) / SPEED).toFixed(1)}s`
}

/** Two copies of the row, so a -50% translation loops without a seam. */
function doubled(takes: CoverTake[]): CoverTake[] {
  return [...takes, ...takes]
}

function titleOf(take: CoverTake): string {
  return isZh.value ? take.title.zh : take.title.en
}

function onEnter(take: CoverTake, tier: TierProvenance) {
  emit('hover', take.id, tier)
}

function onPick(take: CoverTake, tier: TierProvenance) {
  emit('select', take.id, tier)
}
</script>

<template>
  <section class="car" :aria-label="t(C.label)">
    <header class="car__head">
      <span class="car__label mono">{{ t(C.label) }}</span>
      <span class="car__hint">{{ t(C.hint) }}</span>
    </header>

    <div
      v-for="row in rows"
      :key="row.tier.id"
      class="row"
      :class="`row--${row.dir}`"
      @mouseleave="emit('leave')"
    >
      <div class="row__key">
        <span class="row__tier mono">{{ row.tier.id }}</span>
        <span class="row__name">{{ t(row.tier.name) }}</span>
        <span class="row__hours mono">{{ t(row.tier.hours) }}</span>
      </div>

      <div class="row__viewport">
        <ul class="row__track" :style="{ '--marquee-duration': row.duration }">
          <li v-for="(take, i) in row.doubled" :key="`${take.id}-${i}`" class="card__li">
            <button
              type="button"
              class="card"
              :class="{
                'card--on': take.id === activeId,
                'card--pin': take.id === pinnedId,
              }"
              :aria-pressed="take.id === pinnedId"
              :title="titleOf(take)"
              @mouseenter="onEnter(take, row.tier)"
              @focus="onEnter(take, row.tier)"
              @click="onPick(take, row.tier)"
            >
              <span class="card__frame">
                <video
                  :src="`real/${take.preview}`"
                  :poster="`real/${take.poster}`"
                  muted
                  loop
                  playsinline
                  preload="metadata"
                  autoplay
                />
                <span class="card__level mono">{{ row.tier.id }}</span>
              </span>
              <span class="card__title">{{ titleOf(take) }}</span>
            </button>
          </li>
        </ul>
      </div>
    </div>
  </section>
</template>

<style scoped>
.mono { font-family: var(--ff-mono); }

.car { display: grid; gap: 0.35rem; padding-bottom: 0.1rem; }
.car__head { display: flex; flex-wrap: wrap; align-items: baseline; justify-content: space-between; gap: 0.5rem; }
.car__label {
  font-size: var(--fs-tick); letter-spacing: 0.14em; text-transform: uppercase; color: var(--ink-mute);
}
.car__hint { font-size: var(--fs-tick); color: var(--ink-mute); }

/* ---- a row: key at the left, marquee to its right ---- */
.row {
  display: grid;
  grid-template-columns: 6.2rem minmax(0, 1fr);
  gap: 0.6rem;
  align-items: center;
}
@media (max-width: 640px) { .row { grid-template-columns: minmax(0, 1fr); gap: 0.25rem; } }

.row__key { display: grid; gap: 0.05rem; align-content: center; }
.row__tier {
  justify-self: start;
  padding: 0;
  font-size: var(--fs-tick);
  font-weight: 700;
  letter-spacing: 0.12em;
  background: transparent;
  color: var(--c-violet);
}
.row--tier-L3 .row__tier { color: var(--c-violet); }
.row--tier-L2 .row__tier { color: var(--c-teal); }
.row--tier-L1 .row__tier { color: var(--c-blue); }
.row__name {
  font-size: var(--fs-micro); font-weight: 560; color: var(--ink-body);
  white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
}
.row__hours { font-size: var(--fs-mark); color: var(--ink-mute); white-space: nowrap; }
.row__tag {
  font-size: var(--fs-mark); letter-spacing: 0.08em; text-transform: uppercase; color: var(--ink-mute);
  white-space: nowrap;
}

/* The viewport clips; the track is twice the unit and slides by half. */
.row__viewport { overflow: hidden; min-width: 0; mask-image: linear-gradient(90deg, transparent, #000 3%, #000 97%, transparent); }
.row__track {
  list-style: none;
  margin: 0;
  padding: 0.12rem 0;
  display: flex;
  gap: 8px;
  width: max-content;
  animation: hc-marquee-l var(--marquee-duration) linear infinite;
  will-change: transform;
}
.row--right .row__track { animation-name: hc-marquee-r; }
/* Pointing anywhere in the row stops it, so a card can be read in place. */
.row:hover .row__track,
.row:focus-within .row__track { animation-play-state: paused; }

@keyframes hc-marquee-l {
  from { transform: translate3d(0, 0, 0); }
  to { transform: translate3d(-50%, 0, 0); }
}
@keyframes hc-marquee-r {
  from { transform: translate3d(-50%, 0, 0); }
  to { transform: translate3d(0, 0, 0); }
}

.card__li { flex: none; width: 96px; }

.card {
  position: relative;
  display: block;
  width: 100%;
  padding: 0;
  border: 0;
  border-radius: 0;
  background: transparent;
  overflow: visible;
  text-align: left;
  cursor: pointer;
  font: inherit;
  transition: border-color var(--dur-1) var(--ease), transform var(--dur-2) var(--ease);
}
.card:hover { transform: translateY(-2px); }
.card--on .card__title { color: var(--c-blue); box-shadow: inset 0 -1px 0 var(--c-blue); }

.card__frame { position: relative; display: block; aspect-ratio: 4 / 3; overflow: hidden; border-radius: 8px; background: #101511; }
.card__frame video { display: block; width: 100%; height: 100%; object-fit: cover; }
.card__level {
  position: absolute; top: 0.15rem; left: 0.15rem;
  padding: 0 0.2rem; border-radius: var(--r-xs);
  background: rgba(255, 255, 255, 0.86); color: var(--ink-soft);
  font-size: var(--fs-mark); letter-spacing: 0.08em;
  backdrop-filter: blur(3px);
}
.card__title {
  display: block; padding: 0.14rem 0.24rem 0.16rem;
  font-size: var(--fs-mark); font-weight: 550; color: var(--ink-body);
  white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
}

@media (prefers-reduced-motion: reduce) {
  .row__track { animation: none; }
}
</style>
