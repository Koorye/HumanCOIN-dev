<script setup lang="ts">
/**
 * Task distribution: the long tail as a bar chart, one task at a time beside it.
 *
 * The bars answer "how much": every station in the protocol, sorted by its
 * entry count, coloured by tier, scaled to the heaviest station — a few heavy
 * stations and a long tail of one- and two-entry ones, which is the shape of
 * the protocol rather than a total.
 *
 * The panel beside them answers "what": it walks the same stations in the same
 * order, one task at a time, pairing the plan's task name and its cognitive-load
 * point with the closest of the released concept illustrations. Because the
 * illustrations are a fixed set of six, a station with no picture of its own
 * borrows the nearest scene and the caption says which — and each task gets a
 * different crop of it, so consecutive slides do not read as the same image
 * twice. Nothing here is a photograph of that task.
 *
 * The carousel advances on a timer, stops while the pointer or the keyboard is
 * on it, and honours reduced-motion by starting stopped; a reader who never
 * touches it still sees the first task with its name and load point.
 */
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useI18n } from '@/composables/useI18n'
import { TASK_MAX, TASK_ROWS, TASK_TOTALS, entriesOf, type TaskItem, type TaskRow } from '@/data/tasks'

const { t, isZh } = useI18n()

const TIER_COLOR: Record<TaskRow['tier'], string> = {
  L3: 'var(--c-violet)',
  L2: 'var(--c-teal)',
}

/** Stations heaviest first — the long tail is the point, so nothing is grouped. */
const bars = computed(() =>
  [...TASK_ROWS]
    .map((row) => ({
      row,
      n: entriesOf(row),
      width: (entriesOf(row) / TASK_MAX) * 100,
      color: TIER_COLOR[row.tier],
    }))
    .sort((a, b) => b.n - a.n || a.row.key.localeCompare(b.row.key)),
)

interface Slide {
  key: string
  station: TaskRow
  stationLabel: string
  scene: string
  tier: TaskRow['tier']
  color: string
  task: TaskItem
  source: string
  /** Crop of the concept illustration, so two slides never show the same square. */
  crop: string
}

/** Cheap deterministic hash → a crop window, so slides differ without randomness. */
function cropOf(key: string) {
  let h = 2166136261
  for (let i = 0; i < key.length; i++) {
    h ^= key.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  const u = (h >>> 0) / 4294967295
  const x = 10 + Math.round(((u * 7) % 1) * 60)
  const y = 10 + Math.round((u * 13) % 1 * 60)
  return `${x}% ${y}%`
}

const slides = computed<Slide[]>(() =>
  bars.value.flatMap(({ row, color }) =>
    row.tasks.map((task) => ({
      key: `${row.key}-${task.name.en}`,
      station: row,
      stationLabel: t(row.label),
      scene: t(row.scene),
      tier: row.tier,
      color,
      task,
      source: row.source,
      crop: cropOf(`${row.key}-${task.name.en}`),
    })),
  ),
)

const at = ref(0)
const slide = computed(() => slides.value[at.value] ?? slides.value[0])
const paused = ref(false)
const held = ref(false)
const reduced =
  typeof window !== 'undefined' && !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches

let timer = 0
const STEP_MS = 4200

function stop() {
  if (timer) {
    clearTimeout(timer)
    timer = 0
  }
}
function go(delta: number) {
  const n = slides.value.length
  if (!n) return
  at.value = (at.value + delta + n) % n
}
function tick() {
  stop()
  if (paused.value || held.value || reduced) return
  timer = window.setTimeout(() => {
    go(1)
    tick()
  }, STEP_MS)
}

function jump(i: number) {
  at.value = i
  tick()
}

/** Hold while the reader is on the panel, so a hover never steals the slide. */
function hold(v: boolean) {
  held.value = v
  tick()
}

/** The station the bar chart should light up for the current slide. */
const activeKey = computed(() => slide.value?.station.key ?? '')

onMounted(tick)
onBeforeUnmount(stop)
watch(slides, tick)
</script>

<template>
  <div class="tf">
    <!-- ---- the long tail ---- -->
    <section class="tf__tail">
      <header class="tf__thead">
        <h5 class="tf__ttitle">
          {{ isZh ? '每工位任务条目数' : 'Task entries per station' }}
        </h5>
        <span class="tf__tsub mono">
          {{ TASK_TOTALS.total }} {{ isZh ? '条目 / 20 工位' : 'entries / 20 stations' }}
        </span>
      </header>

      <ul class="tf__bars">
        <li
          v-for="(b, i) in bars"
          :key="b.row.key"
          class="tf__bar"
          :class="{ 'is-on': b.row.key === activeKey }"
          :style="{ '--i': i, '--c': b.color }"
        >
          <span class="tf__blabel">{{ t(b.row.label) }}</span>
          <span class="tf__btrack" aria-hidden="true">
            <i :style="{ width: `${b.width}%` }" />
          </span>
          <span class="tf__bn mono">{{ b.n }}</span>
        </li>
      </ul>

      <p class="tf__legend">
        <span class="tf__lg" style="--c: var(--c-violet)">
          <i />{{ isZh ? 'L3 · 知觉建构' : 'L3 · perceptual construction' }}
        </span>
        <span class="tf__lg" style="--c: var(--c-teal)">
          <i />{{ isZh ? 'L2 · 增强模态' : 'L2 · enhanced modality' }}
        </span>
        <span class="tf__lg tf__lg--none">
          {{ isZh ? 'L1 不枚举条目，故不在图中' : 'L1 enumerates no entries, so it is absent here' }}
        </span>
      </p>
    </section>

    <!-- ---- one task at a time ---- -->
    <section
      class="tf__show"
      tabindex="0"
      role="group"
      :aria-label="isZh ? '任务样例轮播' : 'Task examples, one at a time'"
      @pointerenter="hold(true)"
      @pointerleave="hold(false)"
      @focusin="hold(true)"
      @focusout="hold(false)"
      @keydown.left.prevent="go(-1)"
      @keydown.right.prevent="go(1)"
    >
      <div class="tf__frame">
        <img
          v-if="slide"
          :src="slide.station.image"
          alt=""
          :style="{ objectPosition: slide.crop }"
          loading="lazy"
          decoding="async"
        />
        <span class="tf__tier mono" :style="{ color: slide?.color, borderColor: slide?.color }">
          {{ slide?.tier }}
        </span>
        <span class="tf__count mono">
          {{ String(at + 1).padStart(2, '0') }} / {{ String(slides.length).padStart(2, '0') }}
        </span>
      </div>

      <div class="tf__meta">
        <span class="tf__where mono">{{ slide?.stationLabel }} · {{ slide?.source }}</span>
        <p class="tf__task">{{ isZh ? slide?.task.name.zh : slide?.task.name.en }}</p>
        <p class="tf__load">{{ isZh ? slide?.task.detail.zh : slide?.task.detail.en }}</p>
        <p class="tf__img">
          {{ isZh
            ? `概念示意图（AI 生成）·「${slide?.scene}」场景裁切，非该任务实拍`
            : `Concept illustration (AI) · crop of the “${slide?.scene}” scene, not a photo of this task` }}
        </p>
      </div>

      <div class="tf__ctl">
        <button type="button" class="tf__btn" :aria-label="isZh ? '上一个任务' : 'Previous task'" @click="go(-1)">←</button>
        <button
          type="button"
          class="tf__btn tf__btn--wide"
          :aria-pressed="paused"
          @click="paused = !paused; tick()"
        >
          {{ paused ? (isZh ? '继续轮播' : 'Resume') : isZh ? '暂停轮播' : 'Pause' }}
        </button>
        <button type="button" class="tf__btn" :aria-label="isZh ? '下一个任务' : 'Next task'" @click="go(1)">→</button>
        <span class="tf__dots" aria-hidden="true">
          <button
            v-for="(s, i) in slides"
            :key="s.key"
            type="button"
            class="tf__dot"
            :class="{ 'is-on': i === at }"
            tabindex="-1"
            :style="{ '--c': s.color }"
            @click="jump(i)"
          />
        </span>
      </div>
    </section>
  </div>
</template>

<style scoped>
.mono { font-family: var(--ff-mono); }

.tf {
  display: grid;
  grid-template-columns: minmax(0, 1.25fr) minmax(0, 0.75fr);
  gap: clamp(1.25rem, 1rem + 1.4vw, 2.25rem);
  align-items: start;
}
@media (max-width: 900px) { .tf { grid-template-columns: minmax(0, 1fr); } }

/* ---- bar chart of the long tail ---- */
.tf__thead {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 1rem;
  padding-bottom: 0.4rem;
  border-bottom: 1px solid var(--line-strong);
  margin-bottom: 0.6rem;
}
.tf__ttitle { font-size: var(--fs-small); font-weight: 620; color: var(--ink); }
.tf__tsub { font-size: var(--fs-tick); color: var(--ink-mute); }

.tf__bars { list-style: none; margin: 0; padding: 0; display: grid; gap: 0.2rem; }

.tf__bar {
  display: grid;
  grid-template-columns: minmax(0, 10.5rem) minmax(0, 1fr) 1.6rem;
  align-items: center;
  gap: 0.6rem;
  min-height: 1.35rem;
  padding: 0 0.3rem;
  border-radius: var(--r-xs);
  transition: background var(--dur) var(--ease);
}
@media (max-width: 720px) {
  .tf__bar { grid-template-columns: minmax(0, 7rem) minmax(0, 1fr) 1.4rem; }
}
.tf__bar.is-on { background: var(--surface-2); }

.tf__blabel {
  font-size: var(--fs-tick);
  line-height: 1.3;
  color: var(--ink-soft);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.tf__bar.is-on .tf__blabel { color: var(--ink); font-weight: 570; }

.tf__btrack {
  display: block;
  height: 0.62rem;
  border-radius: var(--r-pill);
  background: var(--surface-2);
  overflow: hidden;
}
.tf__btrack i {
  display: block;
  height: 100%;
  border-radius: var(--r-pill);
  background: var(--c);
  opacity: 0.82;
  transform-origin: 0 50%;
}
@media (prefers-reduced-motion: no-preference) {
  .tf__btrack i {
    transform: scaleX(0);
    animation: tf-grow var(--dur-3) var(--ease-out) forwards;
    animation-delay: calc(var(--i) * 26ms);
  }
}
@keyframes tf-grow { to { transform: scaleX(1); } }

.tf__bn {
  font-size: var(--fs-tick);
  color: var(--ink);
  text-align: right;
  font-variant-numeric: tabular-nums;
}

.tf__legend {
  display: flex;
  flex-wrap: wrap;
  gap: 0.35rem 1rem;
  margin: 0.7rem 0 0;
  padding-top: 0.55rem;
  border-top: 1px solid var(--line);
  font-size: var(--fs-tick);
  color: var(--ink-mute);
}
.tf__lg { display: inline-flex; align-items: center; gap: 0.35rem; }
.tf__lg i {
  width: 0.62rem;
  height: 0.62rem;
  border-radius: var(--r-xs);
  background: var(--c);
}
.tf__lg--none { font-style: italic; }

/* ---- the carousel ---- */
.tf__show {
  display: grid;
  gap: 0.7rem;
  outline: none;
  border: 1px solid var(--line);
  border-radius: var(--r-sm);
  background: linear-gradient(180deg, var(--paper) 0%, var(--surface) 100%);
  padding: 0.7rem;
  position: sticky;
  top: 1rem;
}
.tf__show:focus-visible { border-color: var(--c-blue); }

.tf__frame {
  position: relative;
  border-radius: var(--r-xs);
  overflow: hidden;
  background: var(--surface-2);
  aspect-ratio: 4 / 3;
}
.tf__frame img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}
.tf__tier,
.tf__count {
  position: absolute;
  top: 0.4rem;
  font-size: var(--fs-tick);
  font-weight: 650;
  letter-spacing: 0.04em;
  padding: 0.05rem 0.35rem;
  border-radius: var(--r-xs);
  background: rgba(255, 255, 255, 0.9);
}
.tf__tier { left: 0.4rem; border: 1px solid; }
.tf__count { right: 0.4rem; color: var(--ink-soft); }

.tf__meta { display: grid; gap: 0.3rem; }
.tf__where {
  font-size: var(--fs-tick);
  letter-spacing: 0.04em;
  color: var(--ink-mute);
  text-transform: uppercase;
}
.tf__task {
  margin: 0;
  font-size: var(--fs-small);
  font-weight: 620;
  line-height: 1.4;
  color: var(--ink);
}
.tf__load {
  margin: 0;
  font-size: var(--fs-micro);
  line-height: 1.5;
  color: var(--ink-soft);
}
.tf__img {
  margin: 0.15rem 0 0;
  font-size: var(--fs-tick);
  line-height: 1.5;
  color: var(--ink-mute);
}

.tf__ctl { display: flex; align-items: center; gap: 0.4rem; }
.tf__btn {
  font: inherit;
  font-size: var(--fs-tick);
  font-family: var(--ff-mono);
  color: var(--ink-soft);
  background: var(--paper);
  border: 1px solid var(--line-strong);
  border-radius: var(--r-xs);
  padding: 0.2rem 0.5rem;
  cursor: pointer;
}
.tf__btn--wide { letter-spacing: 0.04em; }
.tf__btn:hover { color: var(--ink); border-color: var(--ink-soft); }
.tf__btn:focus-visible { outline: 2px solid var(--c-blue); outline-offset: 1px; }

.tf__dots { display: flex; flex-wrap: wrap; gap: 0.16rem; margin-left: auto; }
.tf__dot {
  width: 0.5rem;
  height: 0.5rem;
  padding: 0;
  border: none;
  border-radius: 50%;
  background: var(--line-strong);
  opacity: 0.5;
  cursor: pointer;
  transition: opacity var(--dur) var(--ease), transform var(--dur) var(--ease);
}
.tf__dot.is-on { background: var(--c); opacity: 1; transform: scale(1.25); }

@media (prefers-reduced-motion: reduce) {
  .tf__bar, .tf__dot { transition: none; }
}
</style>
