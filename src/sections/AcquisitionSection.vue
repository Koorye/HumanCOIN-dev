<script setup lang="ts">
/**
 * Acquisition architecture.
 *
 * One figure, because the pyramid and the body answer one question: which tier
 * is this, and what does it put on a person. The tier tabs, the pyramid levels,
 * the inventory list and the instrument badges all read a single `activeId`, so
 * selecting a level switches the hardware configuration in the same move —
 * there is no separate "body" panel to walk over to.
 *
 * Hover on either the inventory or a badge previews one instrument; the list
 * and the figure are numbered from the same array, so a row and its badge
 * cannot disagree.
 */
import { ref, computed } from 'vue'
import { ACQUISITION, TIERS, DEVICE_META, type DeviceId, type Tier } from '@/content'
import { useI18n } from '@/composables/useI18n'
import SectionHead from '@/components/SectionHead.vue'
import BodyMap from '@/components/BodyMap.vue'

const { t } = useI18n()
const activeId = ref<Tier['id']>('L3')
const active = computed(() => TIERS.find((x) => x.id === activeId.value) ?? TIERS[0])

/** Previewed instrument, shared by the inventory and the figure. */
const picked = ref<DeviceId | null>(null)

/** Pyramid geometry in a 560 × 380 viewBox. */
const levels = [
  { id: 'L1' as const, top: 250, bottom: 350, halfTop: 130, halfBottom: 250 },
  { id: 'L2' as const, top: 150, bottom: 240, halfTop: 62, halfBottom: 125 },
  { id: 'L3' as const, top: 60, bottom: 140, halfTop: 0, halfBottom: 57 },
]
const CX = 280

/**
 * Photographic backdrop per tier: a frame from a captured tabletop session at
 * the apex, representative environment stills for the wider tiers below.
 */
const BACKDROP: Record<Tier['id'], string> = {
  L3: 'real/thumb-01.jpg',
  L2: 'generated/kitchen.jpg',
  L1: 'generated/market.jpg',
}

function poly(l: (typeof levels)[number]) {
  return `${CX - l.halfTop},${l.top} ${CX + l.halfTop},${l.top} ${CX + l.halfBottom},${l.bottom} ${CX - l.halfBottom},${l.bottom}`
}
function tierOf(id: string) {
  return TIERS.find((x) => x.id === id)!
}
/** Tight bounding box of a level, so the clipped image fills its silhouette. */
function box(l: (typeof levels)[number]) {
  return { x: CX - l.halfBottom, y: l.top, w: l.halfBottom * 2, h: l.bottom - l.top }
}

function rowNo(id: DeviceId) {
  const i = active.value.devices.findIndex((d) => d.id === id)
  return i < 0 ? '' : String(i + 1).padStart(2, '0')
}
function metaOf(id: DeviceId) {
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

      <div class="arch" :style="{ '--accent': `var(--c-${active.accent})` }">
        <!-- Tier selector: the one control the whole figure reads. -->
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
            <span class="tab__id mono">{{ tier.id }}</span>
            <span class="tab__name">{{ t(tier.name) }}</span>
            <span class="tab__hours mono">{{ tier.hours }} h</span>
          </button>
        </div>

        <div class="arch__grid">
          <!-- Pyramid -->
          <div class="pyramid">
            <svg viewBox="0 0 560 380" role="img" :aria-label="t(ACQUISITION.tiersTitle)">
              <defs>
                <clipPath v-for="l in levels" :id="`clip-${l.id}`" :key="`clip-${l.id}`">
                  <polygon :points="poly(l)" />
                </clipPath>
              </defs>

              <g class="pyramid__levels">
                <g
                  v-for="l in levels"
                  :key="l.id"
                  class="level"
                  :class="[`level--${tierOf(l.id).accent}`, { 'level--active': l.id === activeId }]"
                  tabindex="0"
                  role="button"
                  :aria-pressed="l.id === activeId"
                  :aria-label="`${l.id} ${t(tierOf(l.id).name)}`"
                  @click="activeId = l.id"
                  @keydown.enter.prevent="activeId = l.id"
                  @keydown.space.prevent="activeId = l.id"
                >
                  <polygon :points="poly(l)" class="level__base" />
                  <image
                    :href="BACKDROP[l.id]"
                    :x="box(l).x"
                    :y="box(l).y"
                    :width="box(l).w"
                    :height="box(l).h"
                    :clip-path="`url(#clip-${l.id})`"
                    preserveAspectRatio="xMidYMid slice"
                    class="level__image"
                  />
                  <polygon :points="poly(l)" class="level__tint" />
                  <polygon :points="poly(l)" class="level__frame" />
                  <text
                    class="level__id"
                    :x="CX"
                    :y="(l.top + l.bottom) / 2 - 2"
                    text-anchor="middle"
                  >
                    {{ l.id }}
                  </text>
                  <text
                    class="level__hours"
                    :x="CX"
                    :y="(l.top + l.bottom) / 2 + 16"
                    text-anchor="middle"
                  >
                    {{ tierOf(l.id).hours }} h
                  </text>
                </g>
              </g>

              <!-- Density arrow (upwards) -->
              <g class="pyramid__axis">
                <line x1="34" y1="352" x2="34" y2="52" />
                <path d="M34 46 l-4 8 h8 z" />
                <text :x="20" :y="205" transform="rotate(-90 20 205)" text-anchor="middle">
                  {{ t(ACQUISITION.tierAxis) }}
                </text>
              </g>
              <g class="pyramid__axis">
                <line x1="60" y1="368" x2="520" y2="368" />
                <path d="M526 368 l-8 -4 v8 z" />
                <text x="290" y="380" text-anchor="middle">{{ t(ACQUISITION.scaleAxis) }}</text>
              </g>
            </svg>

            <dl class="brief">
              <div class="brief__row">
                <dt class="mono">{{ active.id }}</dt>
                <dd class="brief__name">{{ t(active.name) }}</dd>
              </div>
              <div class="brief__row">
                <dt class="mono">{{ active.hours }} h</dt>
                <dd>{{ t(active.hoursLabel) }}</dd>
              </div>
              <div class="brief__row">
                <dt class="mono">{{ t(ACQUISITION.hardwareTitle) }}</dt>
                <dd class="brief__count mono">{{ active.devices.length }}</dd>
              </div>
            </dl>
            <p class="brief__seats mono">{{ t(active.seats) }}</p>
            <p class="brief__summary">{{ t(active.summary) }}</p>
          </div>

          <!-- Body: same tier, same array, so the two panels cannot drift. -->
          <BodyMap :tier="active" :active="picked" @select="picked = $event" />
        </div>

        <!-- Inventory: numbered to match the badges on the figure. -->
        <div class="inv">
          <h4 class="inv__label">{{ t(ACQUISITION.hardwareTitle) }}</h4>
          <ul class="devices">
            <li
              v-for="d in active.devices"
              :key="d.id"
              :class="{ 'is-active': picked === d.id }"
              tabindex="0"
              @mouseenter="picked = d.id"
              @mouseleave="picked = null"
              @focusin="picked = d.id"
              @focusout="picked = null"
            >
              <span class="devices__n mono">{{ rowNo(d.id) }}</span>
              <span class="devices__text">
                <span class="devices__name">{{ t(d.name) }}</span>
                <span class="devices__detail">{{ t(d.detail) }}</span>
              </span>
              <span class="devices__loc mono">{{ t(metaOf(d.id).location) }}</span>
            </li>
          </ul>
        </div>
      </div>
    </div>
  </section>
</template>

<style scoped>
.mono { font-family: var(--ff-mono); }

/* ---- the fused figure card ---- */
.arch {
  border: 1px solid var(--line);
  border-radius: var(--r-md);
  background: var(--surface);
  padding: clamp(0.85rem, 0.6rem + 1.2vw, 1.4rem);
  position: relative;
  overflow: hidden;
}
/* A tier-coloured edge, so the card announces which configuration is loaded
   even before the tab row is read. */
.arch::before {
  content: '';
  position: absolute;
  inset: 0 auto 0 0;
  width: 3px;
  background: var(--accent);
  transition: background var(--dur) var(--ease);
}

/* ---- tier tabs ---- */
.tabs {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 0.5rem;
  margin-bottom: clamp(1rem, 0.8rem + 1vw, 1.5rem);
}
@media (max-width: 560px) { .tabs { grid-template-columns: minmax(0, 1fr); } }
.tabs button {
  display: grid;
  gap: 0.1rem;
  padding: 0.7rem 0.85rem;
  border: 1px solid var(--line);
  border-radius: var(--r-sm);
  background: var(--paper);
  text-align: left;
  cursor: pointer;
  transition: border-color var(--dur) var(--ease), background var(--dur) var(--ease);
}
.tabs button:hover { border-color: var(--line-strong); }
.tab__id { font-size: var(--fs-micro); color: var(--ink-mute); }
.tab__name { font-size: var(--fs-small); font-weight: 600; color: var(--ink); }
.tab__hours { font-size: var(--fs-micro); color: var(--ink-soft); }
.tabs .active { border-width: 2px; }
.tab--blue.active { border-color: var(--c-blue); background: var(--t-blue); }
.tab--teal.active { border-color: var(--c-teal); background: var(--t-teal); }
.tab--violet.active { border-color: var(--c-violet); background: var(--t-violet); }

.arch__grid {
  display: grid;
  grid-template-columns: minmax(0, 1.05fr) minmax(0, 0.95fr);
  gap: clamp(1rem, 0.7rem + 1.6vw, 1.75rem);
  align-items: start;
}
@media (max-width: 880px) { .arch__grid { grid-template-columns: minmax(0, 1fr); } }

/* ---- pyramid ---- */
.pyramid { display: grid; gap: 0.85rem; align-content: start; }
.pyramid svg { width: 100%; height: auto; overflow: visible; }
.level { cursor: pointer; }

.level__base { fill: var(--surface-2); }
.level__image {
  filter: saturate(0.8) contrast(1.02);
  opacity: 0.92;
  transition: opacity var(--dur) var(--ease), filter var(--dur) var(--ease);
}
/* Accent veil so the tier colour stays legible over photographic detail. */
.level__tint {
  fill: var(--c-slate);
  opacity: 0.46;
  transition: opacity var(--dur) var(--ease), fill var(--dur) var(--ease);
}
.level__frame {
  fill: none;
  stroke: var(--line-strong);
  stroke-width: 1;
  transition: stroke var(--dur) var(--ease), stroke-width var(--dur) var(--ease);
}

.level:hover .level__image { opacity: 1; }
.level:hover .level__tint { opacity: 0.26; }

.level--active .level__image { opacity: 1; filter: saturate(1) contrast(1.04); }
.level--blue.level--active .level__tint { fill: var(--c-blue); opacity: 0.52; }
.level--teal.level--active .level__tint { fill: var(--c-teal); opacity: 0.52; }
.level--violet.level--active .level__tint { fill: var(--c-violet); opacity: 0.52; }
.level--active .level__frame { stroke-width: 2; }
.level--blue.level--active .level__frame { stroke: var(--c-blue); }
.level--teal.level--active .level__frame { stroke: var(--c-teal); }
.level--violet.level--active .level__frame { stroke: var(--c-violet); }

.level:focus-visible { outline: none; }
.level:focus-visible .level__frame { stroke: var(--c-blue); stroke-width: 2.5; }

.level__id,
.level__hours {
  paint-order: stroke;
  stroke: rgba(8, 20, 28, 0.55);
  stroke-linejoin: round;
}
.level__id { font-size: 25px; font-weight: 660; fill: #fff; font-family: var(--ff-sans); stroke-width: 3px; }
.level__hours { font-size: var(--fs-tick); fill: #eff4f7; font-family: var(--ff-mono); stroke-width: 2.5px; }

.pyramid__axis line, .pyramid__axis path { stroke: var(--line-strong); fill: var(--line-strong); stroke-width: 1; }
.pyramid__axis text {
  font-family: var(--ff-mono);
  font-size: var(--fs-tick);
  fill: var(--ink-mute);
  letter-spacing: 0.06em;
  text-transform: uppercase;
}

/* ---- tier brief ---- */
.brief {
  margin: 0;
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 0.6rem;
  padding-top: 0.85rem;
  border-top: 1px solid var(--line);
}
@media (max-width: 460px) { .brief { grid-template-columns: minmax(0, 1fr); } }
.brief__row { display: grid; gap: 0.15rem; min-width: 0; }
.brief__row dt { font-size: var(--fs-tick); letter-spacing: 0.06em; color: var(--accent); }
.brief__row dd { margin: 0; font-size: var(--fs-small); color: var(--ink-soft); line-height: 1.5; }
.brief__name { font-weight: 560; color: var(--ink) !important; }
.brief__count { font-size: var(--fs-h4) !important; color: var(--ink) !important; line-height: 1; }
.brief__seats { margin: 0; font-size: var(--fs-micro); color: var(--ink-mute); line-height: 1.6; }
.brief__summary { margin: 0; font-size: var(--fs-small); color: var(--ink-body); line-height: 1.68; }

/* ---- inventory ---- */
.inv {
  margin-top: clamp(1rem, 0.8rem + 1vw, 1.5rem);
  padding-top: 0.9rem;
  border-top: 1px solid var(--line);
}
.inv__label {
  font-family: var(--ff-mono);
  font-size: var(--fs-micro);
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: var(--ink-mute);
  margin: 0 0 0.7rem;
}

.devices {
  list-style: none;
  margin: 0;
  padding: 0;
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 0 1.5rem;
}
@media (max-width: 720px) { .devices { grid-template-columns: minmax(0, 1fr); } }
.devices li {
  display: grid;
  grid-template-columns: 1.6rem minmax(0, 1fr) auto;
  gap: 0.7rem;
  align-items: baseline;
  padding: 0.5rem 0.35rem;
  border-bottom: 1px solid var(--line);
  border-radius: var(--r-xs);
  transition: background var(--dur-1) var(--ease), box-shadow var(--dur-1) var(--ease);
}
.devices li.is-active {
  background: var(--paper);
  box-shadow: inset 2px 0 0 var(--accent);
}
.devices li:focus-visible { outline: var(--focus); outline-offset: var(--focus-offset); }
.devices__n { font-size: var(--fs-tick); color: var(--accent); }
.devices__text { display: grid; gap: 0.1rem; min-width: 0; }
.devices__name { font-size: var(--fs-small); font-weight: 550; color: var(--ink); }
.devices__detail { font-size: var(--fs-micro); color: var(--ink-soft); line-height: 1.55; }
.devices__loc { font-size: var(--fs-tick); color: var(--ink-mute); white-space: nowrap; }
@media (max-width: 520px) {
  .devices__loc { grid-column: 2; }
}
</style>
