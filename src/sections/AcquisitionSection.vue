<script setup lang="ts">
/**
 * Acquisition architecture.
 *
 * A flat pyramid on the left and the selected tier on the right: three bands,
 * one control. The bands are geometry rather than photographs — the old mosaic
 * needed a caption to explain itself and still read as noise, while the shape
 * (10,000 / 2,000 / 500 hours) is the whole point.
 *
 * The inventory under the detail is the same array the tier tabs read, so the
 * selected level, its hours and its instruments cannot drift apart.
 */
import { ref, computed } from 'vue'
import { ACQUISITION, TIERS, DEVICE_META, type Tier } from '@/content'
import { useI18n } from '@/composables/useI18n'
import SectionHead from '@/components/SectionHead.vue'
import BodyMap from '@/components/BodyMap.vue'
import ModalityMatrix from '@/components/ModalityMatrix.vue'

const { t } = useI18n()
const activeId = ref<Tier['id']>('L3')
const active = computed(() => TIERS.find((x) => x.id === activeId.value) ?? TIERS[0])
/** Instrument previewed by the inventory, highlighted on the worn figure. */
const picked = ref<Tier['devices'][number]['id'] | null>(null)

/** Real product shots, keyed by the inventory's own device ids. */
const SHOTS: Partial<Record<Tier['devices'][number]['id'], string>> = {
  rgb: 'hardware/headband.png',
  eeg: 'hardware/eeg-cap.png',
  gaze: 'hardware/eye-tracker.png',
  gloves: 'hardware/gloves.png',
  emg: 'hardware/emg.png',
  vive: 'hardware/tracker.png',
  wrist: 'hardware/wrist-camera.png',
}

const TOTAL_HOURS = 12500
const hours = (tier: Tier) => Number(tier.hours.replace(/,/g, ''))
const share = (tier: Tier) => Math.round((hours(tier) / TOTAL_HOURS) * 100)

/** Pyramid geometry, in SVG units: cx, y-top, y-bottom, half-width top/bottom. */
const CX = 280
const BANDS = [
  { id: 'L1' as const, y0: 214, y1: 330, top: 132, bottom: 248 },
  { id: 'L2' as const, y0: 122, y1: 214, top: 60, bottom: 132 },
  { id: 'L3' as const, y0: 30, y1: 122, top: 22, bottom: 60 },
].map((band) => ({ ...band, tier: TIERS.find((x) => x.id === band.id)! }))

const points = (b: (typeof BANDS)[number]) =>
  `${CX - b.top},${b.y0} ${CX + b.top},${b.y0} ${CX + b.bottom},${b.y1} ${CX - b.bottom},${b.y1}`

function metaOf(id: Tier['devices'][number]['id']) {
  return DEVICE_META.find((m) => m.id === id)!
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

      <!-- One control for the whole section. -->
      <div class="tabs" role="tablist" :aria-label="t(ACQUISITION.tiersTitle)">
        <button
          v-for="tier in TIERS"
          :key="tier.id"
          role="tab"
          type="button"
          :aria-selected="tier.id === activeId"
          :class="[`tab--${tier.accent}`, { active: tier.id === activeId }]"
          @click="activeId = tier.id"
        >
          <span class="tab__row">
            <span class="tab__id mono">{{ tier.id }}</span>
            <span class="tab__name">{{ t(tier.name) }}</span>
            <span class="tab__hours mono">{{ tier.hours }} h</span>
            <span class="tab__share mono">{{ share(tier) }}%</span>
          </span>
        </button>
      </div>

      <div class="arch">
        <div class="arch__left">
        <!-- Flat pyramid: three bands, no photography. -->
        <figure class="pyramid">
          <svg viewBox="0 0 560 380" role="img" :aria-label="t(ACQUISITION.tiersTitle)">
            <g
              v-for="b in BANDS"
              :key="b.id"
              class="band"
              :class="[`band--${b.tier.accent}`, { 'band--active': b.id === activeId }]"
              tabindex="0"
              role="button"
              :aria-pressed="b.id === activeId"
              :aria-label="`${b.id} ${t(b.tier.name)} · ${b.tier.hours} h`"
              @click="activeId = b.id"
              @keydown.enter.prevent="activeId = b.id"
              @keydown.space.prevent="activeId = b.id"
            >
              <polygon class="band__face" :points="points(b)" />
              <line class="band__top" :x1="CX - b.top" :x2="CX + b.top" :y1="b.y0" :y2="b.y0" />
              <text class="band__id" :x="CX" :y="(b.y0 + b.y1) / 2 - 14" text-anchor="middle">
                {{ b.id }}
              </text>
              <text class="band__name" :x="CX" :y="(b.y0 + b.y1) / 2 + 4" text-anchor="middle">
                {{ t(b.tier.name) }}
              </text>
              <text class="band__hours mono" :x="CX" :y="(b.y0 + b.y1) / 2 + 22" text-anchor="middle">
                {{ b.tier.hours }} h · {{ share(b.tier) }}%
              </text>
            </g>

            <g class="axis">
              <line x1="26" y1="334" x2="26" y2="46" />
              <path d="M26 40 l-4 8 h8 z" />
              <text :x="16" :y="190" transform="rotate(-90 16 190)" text-anchor="middle">
                {{ t(ACQUISITION.tierAxis) }}
              </text>
            </g>
            <g class="axis">
              <line x1="52" y1="358" x2="520" y2="358" />
              <path d="M526 358 l-8 -4 v8 z" />
              <text x="286" y="376" text-anchor="middle">{{ t(ACQUISITION.scaleAxis) }}</text>
            </g>
          </svg>
          <figcaption class="pyramid__cap mono">
            {{ t({ en: 'Hours by tier · click a band', zh: '各层时长 · 点击切换' }) }}
          </figcaption>
        </figure>

        <div class="wear">
          <p class="wear__cap mono">
            {{ t({ en: 'New at this tier · hover a row to locate it', zh: '本层新增 · 悬停列表定位' }) }}
          </p>
          <BodyMap :tier="active" :active="picked" bare @select="picked = $event" />
        </div>
        </div>

        <div class="arch__right">
        <!-- Selected tier: the same array the tabs read. -->
        <div class="tier">
          <header class="tier__head">
            <p class="tier__kicker mono">
              {{ active.id }} · {{ active.hours }} h · {{ share(active) }}%
              {{ t({ en: 'of 12,500', zh: '/ 12,500' }) }}
            </p>
            <h3 class="tier__name">{{ t(active.name) }}</h3>
            <p class="tier__seats mono">{{ t(active.seats) }}</p>
          </header>

          <p class="tier__summary">{{ t(active.summary) }}</p>

          <div class="inv">
            <div class="inv__head">
              <h4>{{ t(ACQUISITION.hardwareTitle) }}</h4>
              <span class="mono">{{ active.devices.length }}</span>
            </div>
            <ul class="devices">
              <li
                v-for="(d, i) in active.devices"
                :key="d.id"
                :class="{ 'is-active': picked === d.id }"
                @mouseenter="picked = d.id"
                @mouseleave="picked = null"
                @focusin="picked = d.id"
                @focusout="picked = null"
              >
                <span class="devices__n mono">{{ String(i + 1).padStart(2, '0') }}</span>
                <span class="devices__shot">
                  <img v-if="SHOTS[d.id]" :src="SHOTS[d.id]" :alt="t(d.name)" loading="lazy" />
                </span>
                <span class="devices__body">
                  <span class="devices__name">{{ t(d.name) }}</span>
                  <span class="devices__detail">{{ t(d.detail) }}</span>
                  <span class="devices__loc mono">{{ t(metaOf(d.id).location) }}</span>
                </span>
              </li>
            </ul>

            <div v-if="active.inherits.length" class="inherit">
              <p class="inherit__head mono">{{ t(ACQUISITION.inheritTitle) }}</p>
              <ul>
                <li v-for="(row, ri) in active.inherits" :key="ri">
                  <span class="inherit__from mono">{{ row.from }}</span>
                  <span class="inherit__items">{{ row.ids.map((id) => t(metaOf(id).name)).join(' · ') }}</span>
                </li>
              </ul>
              <p class="inherit__note">{{ t(ACQUISITION.inheritNote) }}</p>
            </div>
          </div>
        </div>

        <!-- Fig. 5b: the matrix sits to the right of the worn figure, under the
             selected tier's own inventory. -->
        <ModalityMatrix />
        </div>
      </div>
    </div>
  </section>
</template>

<style scoped>
.mono { font-family: var(--ff-mono); }

/* ---- tier tabs ---- */
.tabs {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 1.5rem;
  border-bottom: 1px solid var(--line);
  margin-bottom: clamp(1rem, 0.7rem + 1vw, 1.6rem);
}
@media (max-width: 620px) { .tabs { grid-template-columns: minmax(0, 1fr); gap: 0.4rem; } }
.tabs button {
  padding: 0.55rem 0.05rem 0.6rem;
  border: 0;
  border-bottom: 2px solid transparent;
  margin-bottom: -1px;
  background: transparent;
  text-align: left;
  cursor: pointer;
  transition: border-color var(--dur) var(--ease);
}
.tabs button:hover { border-bottom-color: var(--line-strong); }
.tabs button.active { border-bottom-color: var(--c-blue); }
.tabs button.tab--teal.active { border-bottom-color: var(--c-teal); }
.tabs button.tab--violet.active { border-bottom-color: var(--c-violet); }
.tab__row { display: flex; align-items: baseline; gap: 0.45rem; }
.tab__id { font-size: var(--fs-micro); color: var(--ink-mute); }
.tab__name { font-size: var(--fs-small); font-weight: 600; color: var(--ink); }
.tab__hours { margin-left: auto; font-size: var(--fs-micro); color: var(--ink-soft); }
.tab__share { font-size: var(--fs-micro); color: var(--ink-mute); }

/* ---- two columns ---- */
.arch {
  display: grid;
  grid-template-columns: minmax(0, 0.9fr) minmax(0, 1.1fr);
  gap: clamp(1.2rem, 0.8rem + 2vw, 2.4rem);
  align-items: stretch;
  margin-bottom: clamp(1rem, 0.8rem + 1vw, 1.4rem);
}
@media (max-width: 940px) { .arch { grid-template-columns: minmax(0, 1fr); } }

.arch__left {
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: clamp(0.9rem, 0.6rem + 1.2vw, 1.5rem);
}
.arch__right { min-width: 0; display: flex; flex-direction: column; }
/* The matrix absorbs whatever height the worn figure has, so the two columns
   end on the same line instead of leaving a block of white under the table. */
.arch__right .mm { flex: 1; display: flex; flex-direction: column; }
.arch__right :deep(.mm__body) { flex: 1; }
.arch__right :deep(.mm__grid) { height: 100%; grid-auto-rows: 1fr; }

.wear { border-top: 1px solid var(--line); padding-top: 0.65rem; }
.wear__cap { margin: 0 0 0.2rem; font-size: var(--fs-tick); color: var(--ink-mute); }
.wear :deep(.body) { width: min(100%, 360px); margin: 0 auto; }
.wear :deep(.body__svg) { max-height: 32rem; }

/* ---- flat pyramid ---- */
.pyramid { margin: 0; display: grid; gap: 0.4rem; }
.pyramid svg { width: 100%; height: auto; overflow: visible; }

.band { cursor: pointer; }
.band__face {
  fill: var(--paper);
  stroke: var(--line-strong);
  stroke-width: 1;
  transition: fill var(--dur) var(--ease), stroke var(--dur) var(--ease);
}
.band__top {
  stroke: var(--line-strong);
  stroke-width: 1.4;
  transition: stroke var(--dur) var(--ease), stroke-width var(--dur) var(--ease);
}
.band:hover .band__face { fill: var(--surface-2); }
.band--active .band__face { fill: var(--t-blue); }
.band--teal.band--active .band__face { fill: var(--t-teal); }
.band--violet.band--active .band__face { fill: var(--t-violet); }
.band--active .band__top { stroke-width: 3; }
.band--blue .band__top { stroke: var(--c-blue); }
.band--teal .band__top { stroke: var(--c-teal); }
.band--violet .band__top { stroke: var(--c-violet); }
.band:focus-visible { outline: none; }
.band:focus-visible .band__face { stroke: var(--c-blue); stroke-width: 2; }

.band__id { font-family: var(--ff-sans); font-size: 22px; font-weight: 620; fill: var(--ink); }
.band__name { font-family: var(--ff-sans); font-size: 13px; font-weight: 560; fill: var(--ink-soft); }
.band__hours { font-size: 11px; fill: var(--ink-mute); }

.axis line, .axis path { stroke: var(--line-strong); fill: var(--line-strong); stroke-width: 1; }
.axis text {
  font-family: var(--ff-mono);
  font-size: 10px;
  fill: var(--ink-mute);
  letter-spacing: 0.06em;
  text-transform: uppercase;
}
.pyramid__cap { font-size: var(--fs-tick); color: var(--ink-mute); }

/* ---- selected tier ---- */
.tier { min-width: 0; }
.tier__head { padding-bottom: 0.45rem; border-bottom: 1px solid var(--line); }
.tier__kicker { margin: 0 0 0.25rem; font-size: var(--fs-tick); color: var(--ink-mute); }
.tier__name { font-family: var(--ff-display); font-weight: 500; font-size: clamp(1.45rem, 1.2rem + 0.9vw, 1.9rem); letter-spacing: -0.02em; margin: 0 0 0.35rem; }
.tier__seats { margin: 0; font-size: var(--fs-tick); color: var(--ink-soft); }
.tier__summary { margin: 0.35rem 0 0.5rem; color: var(--ink-soft); max-width: 56ch; }

.inv__head {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 0.6rem;
  padding-bottom: 0.4rem;
  border-bottom: 1px solid var(--line);
}
.inv__head h4 { margin: 0; font-size: var(--fs-small); font-weight: 620; }
.inv__head span { font-size: var(--fs-tick); color: var(--ink-mute); }

.devices {
  list-style: none;
  margin: 0;
  padding: 0;
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(14rem, 1fr));
  column-gap: 1.6rem;
}
@media (max-width: 1080px) { .devices { grid-template-columns: minmax(0, 1fr); } }
.devices li {
  transition: background var(--dur) var(--ease);
  display: grid;
  grid-template-columns: 1.45rem 3rem minmax(0, 1fr);
  gap: 0.45rem;
  padding: 0.22rem 0;
  border-bottom: 1px solid var(--line);
}
.devices li.is-active { background: var(--surface-2); }
.devices li:only-child { grid-column: 1 / -1; }
.devices__n { font-size: var(--fs-tick); color: var(--ink-mute); padding-top: 0.12rem; }
.devices__shot {
  display: grid;
  place-items: center;
  width: 3rem;
  height: 3rem;
  background: transparent;
}
.devices__shot img {
  width: 100%;
  height: 100%;
  object-fit: contain;
  mix-blend-mode: multiply;
}
.devices__body { display: grid; gap: 0.05rem; min-width: 0; }
.devices__name { font-size: var(--fs-tick); font-weight: 600; line-height: 1.28; }
.devices__detail { font-size: var(--fs-micro); line-height: 1.32; color: var(--ink-mute); }
.devices__loc {
  margin-top: 0.1rem;
  font-size: var(--fs-mark);
  line-height: 1.25;
  color: var(--ink-mute);
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.inherit {
  margin-top: 0.55rem;
  padding-top: 0.45rem;
  border-top: 1px solid var(--line);
}
.inherit__head {
  margin: 0 0 0.2rem;
  font-size: var(--fs-tick);
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--ink-mute);
}
.inherit ul {
  list-style: none;
  margin: 0;
  padding: 0;
  display: grid;
  gap: 0.1rem;
}
.inherit li {
  display: grid;
  grid-template-columns: 1.7rem minmax(0, 1fr);
  gap: 0.45rem;
  font-size: var(--fs-micro);
  color: var(--ink-soft);
}
.inherit__from {
  font-size: var(--fs-tick);
  color: var(--ink-mute);
}
.inherit__items { min-width: 0; }
.inherit__note {
  margin: 0.25rem 0 0;
  font-size: var(--fs-tick);
  line-height: 1.4;
  color: var(--ink-mute);
}
</style>
