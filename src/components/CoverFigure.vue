<script setup lang="ts">
/**
 * The release figure: one synchronised moment, and the takes that carry it.
 *
 * Lifted whole out of the cover and re-mounted just before *Start*, where it
 * now reads as the last look at the data before the reader is told how to get
 * it. The mechanics are unchanged: the panel above shows the take the carousel
 * has open (its views, the channels that capture actually records, and the
 * annotation of the moment the playhead sits on), while the three marquee rows
 * carry the takes, one row per acquisition tier.
 *
 * The three tiers do not carry the same instruments: L3 records every channel,
 * L2 the wrist bands' EMG, and L1 the views alone. Each cell is stamped with
 * what its tier measures, and a channel the take does not ship is drawn as a
 * labelled gap. Nothing is presented as recorded that was not.
 */
import { computed, onMounted, ref, shallowRef } from 'vue'
import { TIER_PROVENANCE, type TierProvenance } from '@/data/cover'
import {
  COVER_TAKES_BY_TIER,
  loadReel,
  takeById,
  type CoverReel,
  type CoverTake,
} from '@/data/coverReels'
import CoverCarousel from '@/components/CoverCarousel.vue'
import CoverMoment from '@/components/CoverMoment.vue'

/** The tier the open take was recorded at, which is the row it came from. */
const tier = shallowRef<TierProvenance>(TIER_PROVENANCE[0])
/** Take opened by hovering or focus. */
const hoveredId = ref('')
/** Take pinned by a click; wins over hover so a reader can wander the rows. */
const pinnedId = ref('')
/** Which take the panel actually shows. The figure opens on the first L3 take. */
const activeId = ref(COVER_TAKES_BY_TIER.L3[0]?.id ?? '')

const activeTake = computed<CoverTake | null>(() => takeById(activeId.value))

const reel = shallowRef<CoverReel | null>(null)
const loading = ref(false)
const failed = ref(false)
let token = 0

/**
 * Fetch the take's reduced signals. The previous take's series are cleared
 * first, because a row now shows its own tier: keeping the last drawing on
 * screen while an L1 take lands would show L3 channels beside L1 footage.
 */
async function showTake(id: string) {
  if (!id) return
  activeId.value = id
  const my = ++token
  reel.value = null
  loading.value = true
  failed.value = false
  try {
    const r = await loadReel(id)
    if (my === token) reel.value = r
  } catch {
    if (my === token) failed.value = true
  } finally {
    if (my === token) loading.value = false
  }
}

function onHover(id: string, from: TierProvenance) {
  if (pinnedId.value) return
  tier.value = from
  hoveredId.value = id
  if (id !== activeId.value) void showTake(id)
}

function onLeave() {
  if (pinnedId.value) return
  hoveredId.value = ''
  const first = COVER_TAKES_BY_TIER[tier.value.id][0]?.id ?? ''
  if (first && first !== activeId.value) void showTake(first)
}

function onSelect(id: string, from: TierProvenance) {
  tier.value = from
  pinnedId.value = pinnedId.value === id ? '' : id
  if (pinnedId.value && id !== activeId.value) void showTake(id)
}

onMounted(() => {
  const first = COVER_TAKES_BY_TIER.L3[0]
  if (first) void showTake(first.id)
})
</script>

<template>
  <figure class="coverfig">
    <!-- the moment: the take opened by the carousel, all three bands on one clock -->
    <CoverMoment
      :take="activeTake"
      :reel="reel"
      :tier="tier"
      :loading="loading"
      :failed="failed"
      :pinned="!!pinnedId"
    />

    <!-- the carousel: three tiers, one row each -->
    <CoverCarousel
      class="coverfig__car"
      :active-id="activeTake?.id ?? ''"
      :pinned-id="pinnedId"
      @hover="onHover"
      @leave="onLeave"
      @select="onSelect"
    />
  </figure>
</template>

<style scoped>
.coverfig {
  margin: 0;
  padding: clamp(0.55rem, 0.45rem + 0.5vw, 0.8rem);
  border: 1px solid rgba(23, 42, 58, 0.1);
  border-radius: 22px;
  background:
    linear-gradient(138deg, rgba(255, 255, 255, 0.92) 0%, rgba(240, 247, 253, 0.86) 46%, rgba(255, 255, 255, 0.9) 100%);
  box-shadow:
    0 24px 60px rgba(43, 92, 133, 0.1),
    inset 0 1px 0 rgba(255, 255, 255, 0.9);
}
.coverfig__car {
  margin-top: clamp(0.7rem, 0.55rem + 0.8vw, 1rem);
  padding-top: clamp(0.45rem, 0.35rem + 0.45vw, 0.65rem);
  border-top: 1px solid rgba(23, 42, 58, 0.12);
}
</style>
