<script setup lang="ts">
/**
 * Fig. 2b — the report's scene distribution, with a live carousel beside it.
 *
 * The left side keeps Fig. 2b: eighteen scene classes, grouped into
 * residential / commercial / working, each as a horizontal bar stacked by
 * tier. The right side turns through one photograph per class automatically;
 * the chart row for the class on screen is highlighted, so the bars and the
 * photograph always describe the same scene.
 *
 * The carousel pauses while a row or the photograph is under the pointer, and
 * the play control stops it outright; arrows step by hand. The timer is only
 * armed while the figure is on screen, and it never starts for a reader who
 * has asked for reduced motion. The full eighteen-row table stays behind the
 * disclosure.
 */
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import type { Bi } from '@/content'
import { useI18n } from '@/composables/useI18n'
import { useChartPlay } from '@/composables/useChart'
import {
  TIERS,
  TIER_IDS,
  ZONE_GROUPS,
  tierOf,
  type SceneClass,
} from '@/data/fig2'

defineProps<{ note?: Bi }>()

const { t, isZh } = useI18n()
const { el, shown, playing, replay } = useChartPlay<HTMLDivElement>({ margin: '0px 0px -14% 0px' })

/* The chart order is the carousel order: zone groups, heaviest class first. */
const ORDER = ZONE_GROUPS.flatMap((group) => group.scenes)
const ROW_INDEX = new Map(ORDER.map((scene, i) => [scene.key, i]))

const activeIndex = ref(0)
const active = computed<SceneClass>(() => ORDER[activeIndex.value] ?? ORDER[0])
const activeZone = computed(() => ZONE_GROUPS.find((g) => g.zone.id === active.value.zone) ?? ZONE_GROUPS[0])

const rowIndex = (scene: SceneClass) => ROW_INDEX.get(scene.key) ?? 0
const fmt = (n: number) => Math.round(n).toLocaleString('en-US')
const one = (n: number) => (n >= 99.95 ? '100' : n.toFixed(1))
const pad = (n: number) => String(n).padStart(2, '0')

/* ------------------------------------------------------------- carousel */

const INTERVAL = 4800
const auto = ref(true)
const hold = ref(false)
const reduced = ref(
  typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches,
)
if (reduced.value) auto.value = false

const progressKey = ref(0)
let timer = 0

const running = computed(() => auto.value && !hold.value && shown.value && !reduced.value)

function clearTimer() {
  if (timer) {
    window.clearTimeout(timer)
    timer = 0
  }
}

function schedule() {
  clearTimer()
  if (!running.value || document.hidden) return
  timer = window.setTimeout(() => {
    timer = 0
    activeIndex.value = (activeIndex.value + 1) % ORDER.length
  }, INTERVAL)
}

function toggleAuto() {
  if (reduced.value) return
  auto.value = !auto.value
  progressKey.value++
  schedule()
}

function holdOn() {
  hold.value = true
}

function releaseHold() {
  hold.value = false
  progressKey.value++
  schedule()
}

function pickRow(i: number) {
  hold.value = true
  activeIndex.value = i
}

function selectRow(i: number) {
  auto.value = false
  hold.value = false
  activeIndex.value = i
  progressKey.value++
  schedule()
}

function manual(delta: number) {
  auto.value = false
  hold.value = false
  activeIndex.value = (activeIndex.value + delta + ORDER.length) % ORDER.length
  progressKey.value++
  schedule()
}

function onReplay() {
  activeIndex.value = 0
  hold.value = false
  auto.value = !reduced.value
  progressKey.value++
  replay()
  schedule()
}

function onVisibility() {
  if (document.hidden) clearTimer()
  else {
    progressKey.value++
    schedule()
  }
}

watch(activeIndex, () => {
  progressKey.value++
  schedule()
})

watch(running, (value) => {
  if (value) progressKey.value++
  schedule()
})

onMounted(() => {
  reduced.value = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  if (reduced.value) auto.value = false
  document.addEventListener('visibilitychange', onVisibility)
  schedule()
})

onBeforeUnmount(() => {
  clearTimer()
  document.removeEventListener('visibilitychange', onVisibility)
})

const readout = computed(() => {
  const s = active.value
  const z = t(activeZone.value.zone.name)
  return isZh.value
    ? `${t(s.name)} · ${z} · ${fmt(s.total)} 小时 · 占全库 ${s.share.toFixed(1)}% · L1 ${one(s.tiers.L1)}% / L2 ${one(s.tiers.L2)}% / L3 ${one(s.tiers.L3)}%。`
    : `${t(s.name)} · ${z} · ${fmt(s.total)} h · ${s.share.toFixed(1)}% of the corpus · L1 ${one(s.tiers.L1)}% / L2 ${one(s.tiers.L2)}% / L3 ${one(s.tiers.L3)}%.`
})

const zoneNameOf = (s: SceneClass) => {
  const g = ZONE_GROUPS.find((item) => item.zone.id === s.zone)
  return g ? t(g.zone.name) : ''
}

const rowLabel = (s: SceneClass) =>
  isZh.value
    ? `${t(s.name)}，${zoneNameOf(s)}，${fmt(s.total)} 小时，占全库 ${s.share.toFixed(1)}%；L1 ${one(s.tiers.L1)}%，L2 ${one(s.tiers.L2)}%，L3 ${one(s.tiers.L3)}%`
    : `${t(s.name)}, ${zoneNameOf(s)}, ${fmt(s.total)} hours, ${s.share.toFixed(1)} percent of the corpus; L1 ${one(s.tiers.L1)}%, L2 ${one(s.tiers.L2)}%, L3 ${one(s.tiers.L3)}%`
</script>

<template>
  <div class="scene-fig">
    <div class="chart-toolbar">
      <ul class="chart-legend">
        <li v-for="tier in TIERS" :key="tier.id">
          <i :style="{ background: tier.color }" />{{ tier.id }} · {{ t(tier.name) }}
        </li>
      </ul>
      <button class="chart-replay" type="button" @click="onReplay">
        <svg viewBox="0 0 16 16" aria-hidden="true">
          <path d="M13.5 8a5.5 5.5 0 1 1-1.6-3.9M13.5 2v3.2H10.3" />
        </svg>
        {{ t({ en: 'Replay', zh: '重播' }) }}
      </button>
    </div>

    <div ref="el" class="scene-board chart-stage" :class="{ 'is-play': playing }">
      <div class="chart-side">
        <div class="zones">
          <section
            v-for="group in ZONE_GROUPS"
            :key="group.zone.id"
            class="zone"
            :class="{ 'is-live': group.zone.id === activeZone.zone.id }"
          >
            <header class="zone-head">
              <p class="zone-head__name">{{ t(group.zone.name) }}</p>
              <p class="zone-head__meta mono">
                {{ group.scenes.length }} {{ t({ en: 'classes', zh: '类' }) }} ·
                {{ fmt(group.hours) }} h · {{ group.share.toFixed(1) }}%
              </p>
            </header>

            <div class="zone-rows">
              <button
                v-for="scene in group.scenes"
                :key="scene.key"
                type="button"
                class="row"
                :class="{ 'is-active': scene.key === active.key }"
                :style="{ '--i': rowIndex(scene) }"
                :aria-pressed="scene.key === active.key"
                :aria-label="rowLabel(scene)"
                @pointerenter="pickRow(rowIndex(scene))"
                @pointerleave="releaseHold"
                @focus="pickRow(rowIndex(scene))"
                @blur="releaseHold"
                @click="selectRow(rowIndex(scene))"
              >
                <span class="row__name">{{ t(scene.name) }}</span>
                <span class="row__track" aria-hidden="true">
                  <span
                    v-for="tid in TIER_IDS"
                    :key="tid"
                    class="row__seg"
                    :style="{ width: `${scene.tiers[tid]}%`, background: tierOf(tid).color }"
                  />
                  <span class="row__grid" />
                </span>
                <span class="row__share mono">{{ scene.share.toFixed(1) }}<i>%</i></span>
              </button>
            </div>
          </section>
        </div>

        <div class="axis" aria-hidden="true">
          <span class="axis__pad" />
          <span class="axis__ticks">
            <i>0</i><i>25</i><i>50</i><i>75</i><i>100</i>
          </span>
          <span class="axis__pad" />
        </div>
        <p class="axis__title">{{ t({ en: 'share of hours (%)', zh: '小时占比（%）' }) }}</p>
      </div>

      <aside class="carousel-side">
        <div class="carousel-media" @pointerenter="holdOn" @pointerleave="releaseHold">
          <Transition name="scene" mode="out-in">
            <img
              :key="active.key"
              :src="active.image"
              :alt="isZh ? `${t(active.name)}——示意照片` : `${t(active.name)} — illustrative photograph`"
              decoding="async"
            />
          </Transition>

          <button
            class="stage__arrow stage__arrow--prev"
            type="button"
            :aria-label="t({ en: 'Previous class', zh: '上一个场景' })"
            @click.stop="manual(-1)"
          >
            <svg viewBox="0 0 16 16" aria-hidden="true"><path d="M10 3 5 8l5 5" /></svg>
          </button>
          <button
            class="stage__arrow stage__arrow--next"
            type="button"
            :aria-label="t({ en: 'Next class', zh: '下一个场景' })"
            @click.stop="manual(1)"
          >
            <svg viewBox="0 0 16 16" aria-hidden="true"><path d="M6 3l5 5-5 5" /></svg>
          </button>

          <span class="stage__counter mono">{{ pad(activeIndex + 1) }} / {{ pad(ORDER.length) }}</span>
          <span
            class="progress"
            :class="{ 'is-off': !auto, 'is-paused': !running }"
            aria-hidden="true"
          >
            <span :key="`${activeIndex}-${progressKey}`" class="progress__fill" />
          </span>
        </div>

        <div class="carousel-meta">
          <div class="carousel-head">
            <p class="carousel-eyebrow mono">
              {{ t(activeZone.zone.name) }} · {{ fmt(activeZone.hours) }} h ·
              {{ activeZone.share.toFixed(1) }}%
            </p>
            <button
              v-if="!reduced"
              class="auto-btn"
              type="button"
              :aria-label="
                auto
                  ? t({ en: 'Pause the automatic carousel', zh: '暂停自动轮播' })
                  : t({ en: 'Play the automatic carousel', zh: '继续自动轮播' })
              "
              @click.stop="toggleAuto"
            >
              <svg v-if="auto" viewBox="0 0 16 16" aria-hidden="true">
                <path d="M5.5 3v10M10.5 3v10" />
              </svg>
              <svg v-else viewBox="0 0 16 16" aria-hidden="true">
                <path d="M5.5 3l7 5-7 5z" fill="currentColor" stroke="none" />
              </svg>
              {{ auto ? t({ en: 'Pause', zh: '暂停' }) : t({ en: 'Play', zh: '播放' }) }}
            </button>
          </div>

          <h3 class="carousel-name">{{ t(active.name) }}</h3>
          <p class="carousel-blurb">{{ t(active.blurb) }}</p>
          <p class="carousel-stats">
            <b>{{ fmt(active.total) }} h</b>
            <span>{{ active.share.toFixed(1) }}% {{ t({ en: 'of the corpus', zh: '全库占比' }) }}</span>
          </p>

          <span class="carousel-bar" aria-hidden="true">
            <span
              v-for="tid in TIER_IDS"
              :key="tid"
              :style="{ width: `${active.tiers[tid]}%`, background: tierOf(tid).color }"
            />
          </span>

          <dl class="carousel-tiers">
            <div v-for="tid in TIER_IDS" :key="tid">
              <dt>
                <i :style="{ background: tierOf(tid).color }" />
                {{ tid }}
              </dt>
              <dd>{{ one(active.tiers[tid]) }}%</dd>
              <dd>{{ fmt(active.hours[tid]) }} h</dd>
            </div>
          </dl>

          <p class="carousel-zone mono">
            {{ t({ en: 'Zone split', zh: '区域构成' }) }} ·
            <span v-for="tid in TIER_IDS" :key="tid">{{ tid }} {{ one(activeZone.tierShare[tid]) }}%</span>
          </p>
        </div>
      </aside>
    </div>

    <p class="chart-readout" :aria-live="auto && running ? 'off' : 'polite'">{{ readout }}</p>

    <p v-if="note" class="fig__note">{{ t(note) }}</p>

    <details class="chart-data">
      <summary>{{ t({ en: 'Read the data', zh: '查看数据' }) }}</summary>
      <div class="chart-data__scroll">
      <table class="data-table data-table--scene">
        <thead>
          <tr>
            <th>{{ t({ en: 'Scene class', zh: '场景类别' }) }}</th>
            <th>{{ t({ en: 'Zone', zh: '区域' }) }}</th>
            <th>{{ t({ en: 'L1 h', zh: 'L1 小时' }) }}</th>
            <th>{{ t({ en: 'L2 h', zh: 'L2 小时' }) }}</th>
            <th>{{ t({ en: 'L3 h', zh: 'L3 小时' }) }}</th>
            <th>{{ t({ en: 'Share', zh: '占比' }) }}</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="z in ZONE_GROUPS" :key="z.zone.id" class="data-table__zone">
            <td colspan="6">{{ t(z.zone.name) }} · {{ fmt(z.hours) }} h · {{ z.share.toFixed(1) }}%</td>
          </tr>
          <template v-for="z in ZONE_GROUPS" :key="`rows-${z.zone.id}`">
            <tr v-for="scene in z.scenes" :key="scene.key">
              <td>{{ t(scene.name) }}</td>
              <td>{{ t(z.zone.name) }}</td>
              <td class="num">{{ fmt(scene.hours.L1) }}</td>
              <td class="num">{{ fmt(scene.hours.L2) }}</td>
              <td class="num">{{ fmt(scene.hours.L3) }}</td>
              <td class="num">{{ scene.share.toFixed(1) }}%</td>
            </tr>
          </template>
        </tbody>
      </table>
      </div>
    </details>
  </div>
</template>

<style scoped>
.mono { font-family: var(--ff-mono); }

.chart-legend { list-style: none; margin: 0; padding: 0; }
.chart-legend li { display: inline-flex; align-items: center; gap: 0.35rem; }
.chart-legend i { width: 0.5rem; height: 0.5rem; display: inline-block; }
.data-table__zone td { background: var(--surface-2); color: var(--ink); font-weight: 550; }

/* ------------------------------------------------------------- the chart */

.scene-board {
  display: grid;
  grid-template-columns: minmax(0, 1.16fr) minmax(0, 0.84fr);
  gap: clamp(0.9rem, 0.7rem + 0.9vw, 1.4rem);
  align-items: start;
}
@media (max-width: 1000px) {
  .scene-board { grid-template-columns: minmax(0, 1fr); }
  .carousel-side { order: -1; }
}

.chart-side { min-width: 0; }
.zones { display: grid; }

.zone-head {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 0.6rem;
  padding: 0.35rem 0.15rem 0.2rem 0.35rem;
  border-top: 1px solid var(--line);
}
.zone:first-child .zone-head { border-top: 0; padding-top: 0; }
.zone-head__name {
  margin: 0;
  font-family: var(--ff-mono);
  font-size: var(--fs-tick);
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--ink-mute);
  transition: color var(--dur) var(--ease);
}
.zone.is-live .zone-head__name { color: var(--c-blue); }
.zone-head__meta { margin: 0; font-size: var(--fs-tick); color: var(--ink-mute); white-space: nowrap; }

.zone-rows { display: grid; }

.row {
  display: grid;
  grid-template-columns: 5.5rem minmax(0, 1fr) 2.6rem;
  align-items: center;
  gap: 0.55rem;
  width: 100%;
  height: 23px;
  padding: 0 0.2rem 0 0.35rem;
  border: 0;
  border-left: 2px solid transparent;
  background: transparent;
  font: inherit;
  text-align: left;
  color: var(--ink-body);
  cursor: pointer;
  transition: background var(--dur) var(--ease), border-color var(--dur) var(--ease);
}
.row:hover { background: var(--surface-2); }
.row.is-active { background: var(--surface-2); border-left-color: var(--c-blue); }
.row:focus-visible { outline: 1px solid var(--c-blue); outline-offset: -1px; }

.row__name {
  font-size: 12.5px;
  line-height: 1.2;
  color: var(--ink-soft);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  transition: color var(--dur) var(--ease);
}
.row.is-active .row__name { color: var(--ink); font-weight: 550; }

.row__track {
  position: relative;
  display: flex;
  height: 0.5rem;
  background: var(--surface-2);
  overflow: hidden;
}
.row__seg { height: 100%; display: block; }
.row__grid {
  position: absolute;
  inset: 0;
  pointer-events: none;
  background-image: linear-gradient(to right, rgba(255, 255, 255, 0.55) 1px, transparent 1px);
  background-size: 25% 100%;
  border-right: 1px solid rgba(255, 255, 255, 0.7);
}
.row__share {
  font-size: var(--fs-tick);
  color: var(--ink-soft);
  text-align: right;
  font-variant-numeric: tabular-nums;
  white-space: nowrap;
}
.row__share i { font-style: normal; color: var(--ink-mute); margin-left: 0.05em; }

.is-play .row__track {
  transform-origin: left center;
  animation: ch-grow-x 760ms var(--ease-out) both;
  animation-delay: calc(var(--i, 0) * 22ms);
}

.axis {
  display: grid;
  grid-template-columns: 5.5rem minmax(0, 1fr) 2.6rem;
  gap: 0.55rem;
  padding: 0.25rem 0.2rem 0 0.35rem;
}
.axis__ticks { display: flex; justify-content: space-between; }
.axis__ticks i {
  font-style: normal;
  font-family: var(--ff-mono);
  font-size: 9px;
  color: var(--ink-mute);
}
.axis__title {
  margin: 0.1rem 2.8rem 0 0;
  font-family: var(--ff-mono);
  font-size: 9px;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: var(--ink-mute);
  text-align: center;
}

/* ---------------------------------------------------------- the carousel */

.carousel-side { min-width: 0; display: grid; gap: 0.5rem; align-content: start; }

.carousel-media {
  position: relative;
  aspect-ratio: 3 / 2;
  overflow: hidden;
  border: 1px solid var(--line);
  background: var(--surface-2);
}
.carousel-media img {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
  filter: saturate(0.92) contrast(1.02);
}
.scene-enter-active { transition: opacity 360ms var(--ease), transform 700ms var(--ease-out); }
.scene-leave-active { transition: opacity 180ms var(--ease); }
.scene-enter-from { opacity: 0; transform: scale(1.012); }
.scene-leave-to { opacity: 0; }

.stage__arrow {
  position: absolute;
  top: 50%;
  z-index: 2;
  display: grid;
  place-items: center;
  width: 1.9rem;
  height: 1.9rem;
  padding: 0;
  border: 1px solid var(--line-strong);
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.9);
  color: var(--ink);
  transform: translateY(-50%);
  cursor: pointer;
  transition: background var(--dur) var(--ease), border-color var(--dur) var(--ease);
}
.stage__arrow:hover { background: var(--paper); border-color: var(--ink-mute); }
.stage__arrow svg { width: 0.85rem; height: 0.85rem; fill: none; stroke: currentColor; stroke-width: 1.6; }
.stage__arrow--prev { left: 0.5rem; }
.stage__arrow--next { right: 0.5rem; }

.stage__counter {
  position: absolute;
  right: 0.5rem;
  bottom: 0.5rem;
  z-index: 2;
  padding: 0.1rem 0.35rem;
  background: rgba(255, 255, 255, 0.9);
  color: var(--ink-soft);
  font-size: var(--fs-tick);
  font-variant-numeric: tabular-nums;
}

.progress {
  position: absolute;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 2;
  display: block;
  height: 2px;
  background: rgba(255, 255, 255, 0.35);
  transition: opacity var(--dur) var(--ease);
}
.progress.is-off { opacity: 0; }
.progress__fill {
  display: block;
  height: 100%;
  background: var(--c-blue);
  transform-origin: left center;
  animation: scene-progress 4800ms linear forwards;
}
.progress.is-paused .progress__fill { animation-play-state: paused; }
@keyframes scene-progress {
  from { transform: scaleX(0); }
  to { transform: scaleX(1); }
}

.carousel-meta { min-width: 0; display: grid; gap: 0.2rem; }
.carousel-head { display: flex; align-items: center; justify-content: space-between; gap: 0.6rem; }
.carousel-eyebrow {
  margin: 0;
  font-size: var(--fs-tick);
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: var(--ink-mute);
}
.auto-btn {
  display: inline-flex;
  align-items: center;
  gap: 0.3rem;
  padding: 0.1rem 0;
  border: 0;
  background: transparent;
  font: inherit;
  font-size: var(--fs-tick);
  color: var(--ink-mute);
  cursor: pointer;
  transition: color var(--dur) var(--ease);
}
.auto-btn:hover { color: var(--ink); }
.auto-btn svg { width: 0.65rem; height: 0.65rem; fill: none; stroke: currentColor; stroke-width: 1.6; }

.carousel-name {
  margin: 0.1rem 0 0;
  font-family: var(--ff-display);
  font-size: clamp(1.3rem, 1.1rem + 0.6vw, 1.65rem);
  font-weight: 500;
  letter-spacing: -0.025em;
  line-height: 1.15;
  color: var(--ink);
}
.carousel-blurb {
  margin: 0.25rem 0 0;
  font-size: var(--fs-small);
  line-height: 1.45;
  color: var(--ink-soft);
  max-width: 38ch;
}
.carousel-stats { display: flex; align-items: baseline; gap: 0.45rem; margin: 0.4rem 0 0; }
.carousel-stats b {
  font-family: var(--ff-display);
  font-size: 1.1rem;
  font-weight: 500;
  letter-spacing: -0.02em;
  color: var(--ink);
}
.carousel-stats span { font-size: var(--fs-tick); color: var(--ink-mute); }

.carousel-bar {
  display: flex;
  height: 0.5rem;
  margin-top: 0.35rem;
  background: var(--surface-2);
  overflow: hidden;
}
.carousel-bar span { height: 100%; display: block; transition: width 380ms var(--ease-out); }

.carousel-tiers {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 0.15rem 0.6rem;
  margin: 0.4rem 0 0;
}
.carousel-tiers div {
  display: flex;
  align-items: baseline;
  gap: 0.25rem;
  font-size: var(--fs-tick);
  color: var(--ink-soft);
}
.carousel-tiers dt {
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
  color: var(--ink-mute);
}
.carousel-tiers dt i { width: 0.4rem; height: 0.4rem; display: inline-block; }
.carousel-tiers dd { margin: 0; font-variant-numeric: tabular-nums; }
.carousel-tiers dd:last-child { color: var(--ink-mute); }

.carousel-zone {
  display: flex;
  flex-wrap: wrap;
  gap: 0.15rem 0.55rem;
  margin: 0.3rem 0 0;
  padding-top: 0.3rem;
  border-top: 1px solid var(--line);
  font-size: 10px;
  color: var(--ink-mute);
}

@media (max-width: 560px) {
  .row { grid-template-columns: 5rem minmax(0, 1fr) 2.35rem; gap: 0.4rem; height: 22px; }
  .row__name { font-size: 12px; }
  .axis { grid-template-columns: 5rem minmax(0, 1fr) 2.35rem; gap: 0.4rem; }
  .axis__title { margin-right: 2.5rem; }
  .zone-head__meta { font-size: 10px; }
}

@media (prefers-reduced-motion: reduce) {
  .scene-enter-active, .scene-leave-active, .carousel-bar span { transition: none; }
  .progress__fill { animation: none; transform: scaleX(1); }
}
</style>
