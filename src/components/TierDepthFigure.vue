<script setup lang="ts">
/**
 * Fig. 2a — the depth axis, and the two settings each tier is recorded in.
 *
 * The ring carries two readings at once: the inner band is the hours of each
 * tier, and the outer band splits the same hours between controlled and open
 * collection. Selecting a tier (by tab, arc, or legend) re-reads the two
 * setting plates beside the ring, so the number under a photograph is always
 * the number for the tier currently in focus.
 *
 * The ring is drawn with `pathLength="100"`, which lets every arc be expressed
 * in percentages of its own circumference: a tier's start and length are then
 * the published shares themselves rather than pixel arithmetic.
 */
import { computed, ref } from 'vue'
import { useI18n } from '@/composables/useI18n'
import { useChartPlay } from '@/composables/useChart'
import {
  SETTINGS,
  SETTING_TOTALS,
  TIERS,
  TOTAL_HOURS,
  settingHours,
  tierOf,
  type SettingId,
  type TierId,
} from '@/data/fig2'

const { t, isZh } = useI18n()
const { el, playing, replay } = useChartPlay<HTMLDivElement>()

type Pick = 'all' | TierId
const pinned = ref<Pick>('all')
const hovered = ref<TierId | null>(null)
const focus = computed<TierId | null>(() => hovered.value ?? (pinned.value === 'all' ? null : pinned.value))
const selected = computed<Pick>(() => pinned.value)

function pick(value: Pick) {
  pinned.value = pinned.value === value ? 'all' : value
}

/* ---- ring geometry ---- */
const CX = 240
const CY = 240
const INNER_R = 92
const INNER_W = 38
const OUTER_R = 146
const OUTER_W = 15
const GAP = 0.7

const fmt = (n: number) => n.toLocaleString('en-US')
const pct = (n: number) => (Number.isInteger(n) ? String(n) : n.toFixed(1))

/** The three tier arcs, in share order, with a hairline gap between them. */
const tierArcs = computed(() => {
  let start = 0
  return TIERS.map((tier, i) => {
    const len = Math.max(0, tier.share - GAP)
    const arc = {
      ...tier,
      start: start + GAP / 2,
      len,
      index: i,
      dim: focus.value !== null && focus.value !== tier.id,
    }
    start += tier.share
    return arc
  })
})

/** The outer band: within each tier, controlled then open. */
const settingArcs = computed(() => {
  let start = 0
  const out: {
    key: string
    setting: SettingId
    tier: TierId
    start: number
    len: number
    color: string
    index: number
  }[] = []
  for (const tier of TIERS) {
    const span = tier.share
    const pair: SettingId[] = ['controlled', 'open']
    let within = 0
    for (const setting of pair) {
      const share = tier.setting[setting]
      if (share <= 0) continue
      const len = (share / 100) * span
      out.push({
        key: `${tier.id}-${setting}`,
        setting,
        tier: tier.id,
        start: start + within + 0.35,
        len: Math.max(0, len - 0.7),
        color: tier.color,
        index: out.length,
      })
      within += len
    }
    start += span
  }
  return out
})

/* ---- selection drives the plates ---- */
const focusTier = computed(() => (selected.value === 'all' ? null : tierOf(selected.value)))

const plate = computed(() => {
  const tier = focusTier.value
  return SETTINGS.map((setting) => {
    const share = tier
      ? tier.setting[setting.id]
      : (SETTING_TOTALS[setting.id] / TOTAL_HOURS) * 100
    const hours = tier ? settingHours(tier.id, setting.id) : SETTING_TOTALS[setting.id]
    return { ...setting, share, hours }
  })
})

const centre = computed(() => {
  const tier = focusTier.value
  if (!tier) {
    return {
      value: fmt(TOTAL_HOURS),
      unit: t({ en: 'HOURS · THREE TIERS', zh: '小时 · 三层' }),
      note: t({ en: '12,500 in total', zh: '合计 12,500' }),
    }
  }
  return {
    value: fmt(tier.hours),
    unit: t({ en: 'HOURS', zh: '小时' }),
    note: `${tier.id} · ${t(tier.name)} · ${tier.share}%`,
  }
})

const readout = computed(() => {
  const tier = focusTier.value
  if (!tier) {
    return t({
      en: 'Ten thousand hours record what was seen; two thousand add the muscle that executed it; five hundred add the cortex that decided. The deeper the tier, the larger the share recorded under a controlled protocol.',
      zh: '一万小时记录“看见”，两千小时加入执行动作的肌肉，五百小时加入做出决定的皮层。层级越深，受控协议所占的比例越大。',
    })
  }
  const open = tier.setting.open
  const controlled = tier.setting.controlled
  return isZh.value
    ? `${tier.id} · ${t(tier.name)} · ${fmt(tier.hours)} 小时（占 ${tier.share}%）· 开放 ${open}%，受控 ${controlled}% · ${t(tier.adds)}。`
    : `${tier.id} · ${t(tier.name)} · ${fmt(tier.hours)} h (${tier.share}% of the corpus) · ${open}% open, ${controlled}% controlled · ${t(tier.adds)}.`
})

function onArcEnter(id: TierId) {
  hovered.value = id
}
function onArcLeave() {
  hovered.value = null
}
</script>

<template>
  <div class="depth">
    <div ref="el" class="depth__ring chart-stage" :class="{ 'is-play': playing }">
      <svg viewBox="70 70 340 340" role="img" :aria-label="t({
        en: 'Three tiers of 10,000, 2,000 and 500 hours, split between open and controlled collection',
        zh: '三层分别为 10,000、2,000、500 小时，并区分开放与受控采集',
      })">
        <!-- inner ring: tier hours -->
        <g transform="rotate(-90 240 240)">
          <circle
            v-for="arc in tierArcs"
            :key="arc.id"
            class="arc arc--tier"
            :class="{ 'is-focus': focus === arc.id, 'is-dim': arc.dim }"
            :cx="CX"
            :cy="CY"
            :r="INNER_R"
            pathLength="100"
            fill="none"
            :stroke="arc.color"
            :stroke-width="INNER_W"
            :stroke-dasharray="playing ? `${arc.len} ${100 - arc.len}` : `0 100`"
            :stroke-dashoffset="-arc.start"
            :style="{ transitionDelay: `${arc.index * 120}ms` }"
            role="button"
            tabindex="0"
            :aria-label="`${arc.id} ${t(arc.name)} · ${fmt(arc.hours)} h`"
            @pointerenter="onArcEnter(arc.id)"
            @pointerleave="onArcLeave"
            @focus="onArcEnter(arc.id)"
            @blur="onArcLeave"
            @click="pick(arc.id)"
            @keydown.enter.prevent="pick(arc.id)"
            @keydown.space.prevent="pick(arc.id)"
          />
        </g>

        <!-- outer ring: the same hours, split by setting -->
        <g transform="rotate(-90 240 240)">
          <circle
            v-for="arc in settingArcs"
            :key="arc.key"
            class="arc arc--setting"
            :class="{
              'is-focus': focus === arc.tier,
              'is-dim': focus !== null && focus !== arc.tier,
            }"
            :cx="CX"
            :cy="CY"
            :r="OUTER_R"
            pathLength="100"
            fill="none"
            :stroke="arc.setting === 'controlled' ? 'var(--ink)' : 'var(--line-strong)'"
            :stroke-width="OUTER_W"
            :stroke-dasharray="playing ? `${arc.len} ${100 - arc.len}` : `0 100`"
            :stroke-dashoffset="-arc.start"
            :style="{ transitionDelay: `${420 + arc.index * 55}ms` }"
          />
        </g>

        <!-- centre: what the selection is -->
        <g class="centre">
          <Transition name="swap" mode="out-in">
            <g :key="selected">
              <text class="centre__value" :x="CX" :y="CY - 2" text-anchor="middle">{{ centre.value }}</text>
              <text class="centre__unit" :x="CX" :y="CY + 22" text-anchor="middle">{{ centre.unit }}</text>
              <text class="centre__note" :x="CX" :y="CY + 40" text-anchor="middle">{{ centre.note }}</text>
            </g>
          </Transition>
        </g>
      </svg>

    </div>

    <div class="depth__side">
      <div class="chart-toolbar">
        <div class="chart-tabs" role="group" :aria-label="t({ en: 'Tier', zh: '层级' })">
          <button
            type="button"
            :aria-pressed="pinned === 'all'"
            @click="pinned = 'all'"
          >
            {{ t({ en: 'All tiers', zh: '全部层级' }) }}
          </button>
          <button
            v-for="tier in TIERS"
            :key="tier.id"
            type="button"
            :aria-pressed="pinned === tier.id"
            @click="pinned = tier.id"
          >
            {{ tier.id }}
          </button>
        </div>
        <button class="chart-replay" type="button" @click="replay">
          <svg viewBox="0 0 16 16" aria-hidden="true">
            <path d="M13.5 8a5.5 5.5 0 1 1-1.6-3.9M13.5 2v3.2H10.3" />
          </svg>
          {{ t({ en: 'Replay', zh: '重播' }) }}
        </button>
      </div>

      <div class="settings" :class="{ 'is-play': playing }">
        <figure v-for="(item, i) in plate" :key="item.id" class="setting">
          <div class="setting__img" :style="{ '--i': i }">
            <img :src="item.image" :alt="t(item.caption)" loading="lazy" />
          </div>
          <figcaption>
            <p class="setting__name">
              {{ t(item.name) }}
              <span class="setting__gloss">{{ t(item.gloss) }}</span>
            </p>
            <p class="setting__figure">
              <Transition name="swap" mode="out-in">
                <span :key="`${selected}-${item.id}`" class="setting__pct">{{ pct(item.share) }}<span>%</span></span>
              </Transition>
              <span class="setting__hours">{{ fmt(Math.round(item.hours)) }} h</span>
            </p>
          </figcaption>
        </figure>
      </div>

      <p class="chart-readout" aria-live="polite">{{ readout }}</p>

      <!-- the ring key, at the foot of the panel rather than under the ring -->
      <div class="ring-legend">
        <button
          v-for="tier in TIERS"
          :key="tier.id"
          type="button"
          class="ring-key"
          :class="{ 'is-on': selected === tier.id, 'is-dim': focus !== null && focus !== tier.id }"
          :aria-pressed="selected === tier.id"
          @click="pick(tier.id)"
          @pointerenter="onArcEnter(tier.id)"
          @pointerleave="onArcLeave"
          @focus="onArcEnter(tier.id)"
          @blur="onArcLeave"
        >
          <span class="ring-key__top">
            <span class="ring-key__sw" :style="{ background: tier.color }" />
            <span class="ring-key__id mono">{{ tier.id }}</span>
            <span class="ring-key__h mono">{{ fmt(tier.hours) }} h</span>
          </span>
          <span class="ring-key__name">{{ t(tier.name) }}</span>
        </button>
      </div>

      <p class="ring-note">
        <span class="ring-note__sw ring-note__sw--pale" />
        <span>{{ t({ en: 'open', zh: '开放' }) }}</span>
        <span class="ring-note__sw ring-note__sw--solid" />
        <span>{{ t({ en: 'controlled · outer band', zh: '受控 · 外环' }) }}</span>
      </p>
    </div>
  </div>
</template>

<style scoped>
.mono { font-family: var(--ff-mono); }

.depth {
  display: grid;
  grid-template-columns: minmax(0, 0.92fr) minmax(0, 1.08fr);
  gap: clamp(1rem, 0.75rem + 0.9vw, 1.5rem);
  align-items: start;
}
@media (max-width: 860px) {
  .depth { grid-template-columns: minmax(0, 1fr); }
}

.depth__ring { display: grid; justify-items: stretch; max-width: 26rem; justify-self: center; width: 100%; }
.depth__ring svg { width: 100%; height: auto; overflow: visible; }

.arc {
  transition: stroke-dasharray 900ms var(--ease-out), opacity 260ms var(--ease);
  cursor: pointer;
}
.arc--tier:hover { opacity: 0.86; }
.arc--tier.is-focus { opacity: 1; }
.arc--tier.is-dim { opacity: 0.24; }
.arc--setting { transition: stroke-dasharray 900ms var(--ease-out), opacity 260ms var(--ease); }
.arc--setting.is-dim { opacity: 0.22; }

.centre__value {
  font-family: var(--ff-display);
  font-size: 30px;
  font-weight: 500;
  letter-spacing: -0.03em;
  fill: var(--ink);
}
.centre__unit {
  font-family: var(--ff-mono);
  font-size: 8.5px;
  letter-spacing: 0.1em;
  fill: var(--ink-mute);
}
.centre__note {
  font-family: var(--ff-mono);
  font-size: 8.5px;
  letter-spacing: 0.02em;
  fill: var(--ink-soft);
}

.ring-legend {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 0 1.1rem;
  margin-top: 0.4rem;
  border-top: 1px solid var(--line);
}
.ring-key {
  display: grid;
  gap: 0.12rem;
  padding: 0.35rem 0 0.3rem;
  border: 0;
  border-bottom: 1px solid var(--line);
  background: transparent;
  font: inherit;
  color: var(--ink-soft);
  text-align: left;
  cursor: pointer;
  transition: color var(--dur) var(--ease), opacity var(--dur) var(--ease);
}
.ring-key:hover, .ring-key.is-on { color: var(--ink); }
.ring-key.is-dim { opacity: 0.45; }
.ring-key__top { display: flex; align-items: center; gap: 0.35rem; }
.ring-key__sw { width: 0.5rem; height: 0.5rem; display: block; flex: none; }
.ring-key__id { font-size: var(--fs-tick); color: var(--ink-mute); }
.ring-key.is-on .ring-key__id { color: var(--c-blue); }
.ring-key__h { font-size: var(--fs-tick); color: var(--ink-mute); margin-left: auto; }
.ring-key__name { font-size: var(--fs-micro); font-weight: 540; }

.ring-note {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 0.3rem 0.4rem;
  margin: 0.35rem 0 0;
  font-size: var(--fs-tick);
  letter-spacing: 0.02em;
  color: var(--ink-mute);
}
.ring-note__sw { width: 0.65rem; height: 0.3rem; display: inline-block; margin-left: 0.35rem; }
.ring-note__sw:first-child { margin-left: 0; }
.ring-note__sw--pale { background: var(--line-strong); }
.ring-note__sw--solid { background: var(--ink); }

.depth__side { min-width: 0; }

.settings {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 0.75rem;
}
@media (max-width: 460px) { .settings { grid-template-columns: minmax(0, 1fr); } }

.setting { margin: 0; }
.setting__img {
  position: relative;
  aspect-ratio: 16 / 9;
  overflow: hidden;
  border: 1px solid var(--line);
  background: var(--surface-2);
}
.setting__img img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  filter: saturate(0.92) contrast(1.02);
}
.is-play .setting__img img { animation: ch-wipe 1100ms var(--ease-out) both; }
.is-play .setting:nth-child(2) .setting__img img { animation-delay: 120ms; }

.setting figcaption { padding-top: 0.35rem; }
.setting__name {
  margin: 0;
  font-size: var(--fs-small);
  font-weight: 560;
  color: var(--ink);
  line-height: 1.3;
}
.setting__gloss {
  display: block;
  margin-top: 0.12rem;
  font-size: var(--fs-tick);
  font-weight: 400;
  color: var(--ink-mute);
  line-height: 1.4;
}
.setting__figure {
  display: flex;
  align-items: baseline;
  gap: 0.5rem;
  margin: 0.28rem 0 0;
}
.setting__pct {
  display: inline-block;
  font-family: var(--ff-display);
  font-size: clamp(1.25rem, 1.08rem + 0.45vw, 1.5rem);
  font-weight: 500;
  letter-spacing: -0.03em;
  color: var(--ink);
  line-height: 1;
  font-variant-numeric: tabular-nums;
}
.setting__pct span { font-size: 0.5em; color: var(--ink-mute); margin-left: 0.06em; }
.setting__hours { font-family: var(--ff-mono); font-size: var(--fs-tick); color: var(--ink-mute); }

.swap-enter-active, .swap-leave-active { transition: opacity 180ms var(--ease), transform 180ms var(--ease); }
.swap-enter-from { opacity: 0; transform: translateY(4px); }
.swap-leave-to { opacity: 0; transform: translateY(-4px); }

@media (prefers-reduced-motion: reduce) {
  .arc { transition: none; }
}
</style>
