<script setup lang="ts">
/**
 * The cover.
 *
 * Laid out as a journal cover rather than as a landing page: a masthead rule
 * naming the project and the release, then the paper title, then one figure
 * with its own numbered caption. Nothing else — a cover carries the title, and
 * the claim and the standfirst belong to the abstract, where there is room to
 * argue them.
 *
 * The figure is the release itself, shown as a carousel over a synchronised
 * moment. Three marquee rows carry the takes, one per acquisition tier, each row
 * built from that tier's own captures; pointing at a card opens the take in the
 * panel above — the views it ships, the non-visual channels its capture
 * actually records, and the annotation of the moment the playhead sits on. The
 * footage is the clock master, so the channels and the annotation mark the same
 * instant the views are showing. Click pins a take so it survives the cursor
 * moving on.
 *
 * The three tiers do not carry the same instruments: L3 records every channel,
 * L2 the wrist bands' EMG, and L1 the views alone. Each cell is stamped with
 * what its tier measures, and a channel the take does not ship is drawn as a
 * labelled gap. Nothing is presented as recorded that was not.
 *
 * Motion: the marquees drift continuously (so they read as a feed rather than a
 * slideshow) and the metric values count up once when the strip enters view.
 * Both are decorative; the numbers are correct at rest.
 */
import { computed, onMounted, ref, shallowRef, watch } from 'vue'
import { COVER, TIER_PROVENANCE, type TierProvenance } from '@/data/cover'
import {
  COVER_TAKES_BY_TIER,
  loadReel,
  takeById,
  type CoverReel,
  type CoverTake,
} from '@/data/coverReels'
import { useI18n } from '@/composables/useI18n'
import { useCountUp, useInView } from '@/composables/useReveal'
import CoverCarousel from '@/components/CoverCarousel.vue'
import CoverMoment from '@/components/CoverMoment.vue'

const { t } = useI18n()

/** The institute's wordmark, blurred into the cover's acrylic ground. */
const BAAI_MARK = 'logos/baai-acrylic.png'

/* ---------------- which take the moment is showing ---------------- */

/** The tier the open take was recorded at, which is the row it came from. */
const tier = shallowRef<TierProvenance>(TIER_PROVENANCE[0])
/** Take opened by hovering or focus. */
const hoveredId = ref('')
/** Take pinned by a click; wins over hover so a reader can wander the rows. */
const pinnedId = ref('')
/** Which take the panel actually shows. The cover opens on the first L3 take. */
const activeId = ref(COVER_TAKES_BY_TIER.L3[0]?.id ?? '')

const activeTake = computed<CoverTake | null>(() => takeById(activeId.value))

const reel = shallowRef<CoverReel | null>(null)
const loading = ref(false)
const failed = ref(false)
let token = 0

/**
 * Fetch the take's reduced signals. The previous take's series are cleared first,
 * because a row now shows its own tier: keeping the last drawing on screen while
 * an L1 take lands would show L3 channels beside L1 footage.
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
  // A pinned take stays open, and keeps the tier it was read at, until it is
  // clicked again — hovering another row must not relabel it.
  if (pinnedId.value) return
  tier.value = from
  hoveredId.value = id
  if (id !== activeId.value) void showTake(id)
}

function onLeave() {
  if (pinnedId.value) return
  hoveredId.value = ''
  // Back to the row's own first take, not to the L3 row: the three rows are
  // three different sets of captures now.
  const first = COVER_TAKES_BY_TIER[tier.value.id][0]?.id ?? ''
  if (first && first !== activeId.value) void showTake(first)
}

function onSelect(id: string, from: TierProvenance) {
  tier.value = from
  // A second click on the pinned take releases it.
  pinnedId.value = pinnedId.value === id ? '' : id
  if (pinnedId.value && id !== activeId.value) void showTake(id)
}

onMounted(() => {
  const first = COVER_TAKES_BY_TIER.L3[0]
  if (first) void showTake(first.id)
})

/* ---------------- metric strip ---------------- */

const { el: stripEl, shown: stripIn } = useInView<HTMLDivElement>({ margin: '0px 0px -8% 0px' })
const counters = COVER.metrics.map((m) =>
  useCountUp(m.value, { decimals: m.decimals, duration: 1200 }),
)

/* The strip is above the fold, so the observer resolves on its first callback —
   after mount. Watching the flag covers both cases: immediate entry, and the
   reader arriving at the strip by scrolling. */
watch(stripIn, (on) => {
  if (on) counters.forEach((c) => c.run())
})

onMounted(() => {
  if (stripIn.value) counters.forEach((c) => c.run())
})
</script>

<template>
  <section id="top" class="cover">
    <!-- The institute's wordmark, blurred into the acrylic: a watermark, not a
         logo lockup. Decorative, so it carries no alt text and no link. -->
    <img class="cover__mark" :src="BAAI_MARK" alt="" aria-hidden="true" />

    <div class="shell cover__inner">
      <!-- masthead -->
      <header class="masthead">
        <span class="masthead__name">{{ t(COVER.masthead) }}</span>
        <span class="masthead__disc">{{ t(COVER.discipline) }}</span>
        <span class="masthead__issue mono">{{ t(COVER.issue) }}</span>
      </header>

      <h1 class="cover__title">{{ t(COVER.title) }}</h1>

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
    </div>

    <!-- metric strip -->
    <div ref="stripEl" class="strip">
      <div class="shell strip__inner">
        <div v-for="(m, i) in COVER.metrics" :key="m.label.en" class="metric">
          <p class="metric__value">
            <span v-if="i === 0" class="metric__eq">≈</span>{{ counters[i].text.value
            }}<span class="metric__suffix">{{ t(m.suffix) }}</span>
          </p>
          <p class="metric__label">{{ t(m.label) }}</p>
          <p class="metric__sub">{{ t(m.sub) }}</p>
        </div>
      </div>
    </div>

    <!-- the cover's actions: the dataset, the report, the code -->
    <div class="shell">
      <ul class="actions">
        <li v-for="a in COVER.actions" :key="a.id">
          <a
            class="cta"
            :class="{ 'cta--primary': a.primary }"
            :href="a.href"
            :target="a.href.startsWith('#') ? undefined : '_blank'"
            :rel="a.href.startsWith('#') ? undefined : 'noopener noreferrer'"
          >
            <!-- One 16 px glyph per destination, drawn inline so the buttons
                 stay self-contained and the stroke follows the label colour. -->
            <svg
              v-if="a.id === 'seek'"
              class="cta__icon"
              viewBox="0 0 16 16"
              width="16"
              height="16"
              aria-hidden="true"
            >
              <ellipse cx="8" cy="3.5" rx="5.5" ry="2.2" />
              <path d="M2.5 3.5v4c0 1.2 2.5 2.2 5.5 2.2s5.5-1 5.5-2.2v-4" />
              <path d="M8 10v4.2M5.5 11.8 8 14l2.5-2.2" />
            </svg>
            <svg
              v-else-if="a.id === 'report'"
              class="cta__icon"
              viewBox="0 0 16 16"
              width="16"
              height="16"
              aria-hidden="true"
            >
              <path d="M4 1.8h5.2L13 5.4v8.8H4z" />
              <path d="M9 1.8v3.8h4M6 8.5h4.5M6 11h4.5" />
            </svg>
            <svg v-else class="cta__icon" viewBox="0 0 16 16" width="16" height="16" aria-hidden="true">
              <path d="m5.5 4.5-3.5 3.5 3.5 3.5M10.5 4.5 14 8l-3.5 3.5" />
            </svg>
            {{ t(a.label) }}</a>
        </li>
      </ul>
    </div>

    <p class="cover__scroll mono">{{ t(COVER.scroll) }} ↓</p>
  </section>
</template>

<style scoped>
.mono { font-family: var(--ff-mono); }

.cover {
  position: relative;
  overflow: hidden;
  isolation: isolate;
  color: var(--ink-body);
  padding-top: clamp(1rem, 0.8rem + 0.9vw, 1.6rem);
  padding-bottom: clamp(1.1rem, 0.9rem + 1vw, 1.9rem);
  /* A pale blue acrylic sheet: cool washes, a white sheen at the top edge, and
     a soft caustic where the two blues meet. The body below stays white. */
  background:
    radial-gradient(900px 520px at 82% -10%, rgba(255, 255, 255, 0.94), transparent 60%),
    radial-gradient(760px 560px at 98% 10%, rgba(74, 150, 214, 0.40), transparent 66%),
    radial-gradient(680px 520px at 2% 0%, rgba(168, 212, 244, 0.52), transparent 68%),
    radial-gradient(900px 700px at 46% 112%, rgba(255, 255, 255, 0.78), transparent 70%),
    linear-gradient(165deg, #e9f4fd 0%, #d9ecfb 46%, #e9f5fe 100%);
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.92),
    inset 0 -36px 70px rgba(255, 255, 255, 0.38);
  border-bottom: 1px solid rgba(116, 160, 196, 0.24);
}

/* The blurred wordmark sits behind the figure, under the glass. */
.cover__mark {
  position: absolute;
  top: clamp(1rem, -1rem + 8vw, 7rem);
  right: clamp(-2.5rem, -4vw, 1.5rem);
  width: clamp(320px, 31vw, 500px);
  height: auto;
  opacity: 0.22;
  filter: blur(5px) saturate(0.85);
  mix-blend-mode: multiply;
  transform: rotate(-4deg);
  pointer-events: none;
  user-select: none;
  z-index: 0;
}

.cover__inner { position: relative; z-index: 1; }

/* ---- masthead ---- */
.masthead {
  display: flex;
  align-items: baseline;
  gap: 0.9rem;
  padding-bottom: 0.55rem;
  border-bottom: 1px solid rgba(255, 255, 255, 0.85);
  margin-bottom: clamp(0.85rem, 0.65rem + 0.7vw, 1.25rem);
}
.masthead__name {
  font-family: var(--ff-display);
  font-size: var(--fs-h4);
  font-weight: 500;
  letter-spacing: -0.02em;
  color: var(--ink);
}
.masthead__disc {
  font-size: var(--fs-micro);
  color: var(--ink-mute);
}
.masthead__issue {
  margin-left: auto;
  font-size: var(--fs-tick);
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: #3a6f96;
}

/* ---- the paper title ---- */
.cover__title {
  font-family: var(--ff-display);
  /* A title, not a claim: the type is large but it has to carry 15 words across
     two or three lines, so the scale is capped well under the old claim size. */
  font-size: var(--fs-cover);
  font-weight: 500;
  line-height: 1.14;
  letter-spacing: -0.025em;
  color: var(--ink);
  margin: 0;
  max-width: 54ch;
  text-wrap: balance;
}
.coverfig {
  margin: clamp(0.9rem, 0.7rem + 0.8vw, 1.35rem) 0 0;
  padding: clamp(0.55rem, 0.45rem + 0.5vw, 0.8rem);
  border: 1px solid rgba(255, 255, 255, 0.72);
  border-radius: 22px;
  background:
    linear-gradient(138deg, rgba(255, 255, 255, 0.78) 0%, rgba(236, 247, 255, 0.52) 46%, rgba(255, 255, 255, 0.62) 100%);
  box-shadow:
    0 24px 60px rgba(43, 92, 133, 0.12),
    inset 0 1px 0 rgba(255, 255, 255, 0.9);
}
.coverfig__car {
  margin-top: clamp(0.7rem, 0.55rem + 0.8vw, 1rem);
  padding-top: clamp(0.45rem, 0.35rem + 0.45vw, 0.65rem);
  border-top: 1px solid rgba(23, 42, 58, 0.12);
}

/* ---- metric strip ---- */
.strip {
  position: relative;
  margin-top: clamp(1.75rem, 1.3rem + 2vw, 2.75rem);
  border-top: 1px solid rgba(255, 255, 255, 0.8);
  border-bottom: 1px solid rgba(255, 255, 255, 0.8);
  background: rgba(255, 255, 255, 0.28);
}
.strip__inner {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
}
@media (max-width: 820px) { .strip__inner { grid-template-columns: repeat(2, minmax(0, 1fr)); } }
.metric {
  padding: clamp(0.6rem, 0.5rem + 0.4vw, 0.85rem) clamp(0.6rem, 0.5rem + 0.4vw, 0.9rem);
  border-left: 1px solid rgba(255, 255, 255, 0.8);
  min-width: 0;
}
.metric:first-child { border-left: 0; }
@media (max-width: 820px) {
  .metric:nth-child(3), .metric:nth-child(4) { border-top: 1px solid rgba(255, 255, 255, 0.8); }
  .metric:nth-child(3) { border-left: 0; }
}
.metric__value {
  display: flex;
  align-items: baseline;
  gap: 0.12em;
  font-size: var(--fs-stat);
  font-weight: 560;
  line-height: 1;
  letter-spacing: -0.035em;
  color: var(--ink);
  margin: 0;
  font-variant-numeric: tabular-nums;
}
.metric__eq { font-size: 0.55em; color: var(--c-teal); margin-right: 0.1em; }
.metric__suffix { font-size: var(--fs-small); font-weight: 500; color: var(--ink-mute); margin-left: 0.15em; }
.metric__label {
  font-size: var(--fs-small);
  color: var(--ink-soft);
  margin: 0.4rem 0 0.1rem;
  line-height: 1.4;
}
.metric__sub {
  font-family: var(--ff-mono);
  font-size: var(--fs-tick);
  color: var(--ink-mute);
  margin: 0;
  line-height: 1.5;
}

/* ---- the cover's actions ----
   Below the metric strip, on the cover's dark ground: the row carries the
   dataset, the report and the code, and the first is filled so the set reads as
   one primary action rather than three equal ones. */
.actions {
  position: relative;
  list-style: none;
  margin: clamp(0.9rem, 0.7rem + 0.6vw, 1.25rem) 0 0;
  padding: 0;
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: clamp(1.2rem, 1rem + 1vw, 2rem);
}
.cta {
  display: inline-flex;
  align-items: baseline;
  gap: 0.45rem;
  padding: 0.15rem 0;
  border: 0;
  border-bottom: 1px solid transparent;
  background: transparent;
  color: var(--ink);
  font-size: var(--fs-small);
  font-weight: 550;
  text-decoration: none;
  transition: color var(--dur) var(--ease), border-color var(--dur) var(--ease);
}
.cta__icon {
  fill: none;
  stroke: currentColor;
  stroke-width: 1.4;
  stroke-linecap: round;
  stroke-linejoin: round;
  /* Optical, not geometric: sits on the text baseline-ish so the pair reads
     centered without nudging the pill. */
  margin-bottom: -0.06em;
}
.cta:hover { color: #14527d; border-bottom-color: #14527d; }
.cta--primary { color: #14527d; font-weight: 600; }
.cta--primary:hover { color: #14527d; border-bottom-color: #14527d; }
.cta:focus-visible { outline: var(--focus); outline-offset: 2px; }

.cover__scroll {
  position: relative;
  text-align: center;
  margin: clamp(0.6rem, 0.5rem + 0.4vw, 0.9rem) 0 0;
  font-size: var(--fs-tick);
  letter-spacing: 0.18em;
  text-transform: uppercase;
  color: #4a7595;
}


</style>
