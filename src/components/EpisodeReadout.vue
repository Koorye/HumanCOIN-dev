<script setup lang="ts">
/**
 * One frame read out of a released episode, shown rather than tabulated.
 *
 * The figure above shows the query in principle. This runs it: it loads a
 * released `sample.json` and its four head-mounted video files, and drives both
 * from one frame index. The videos are seeked to that frame's own episode time,
 * and the traces are the episode's own EEG and surface-EMG samples, cut to a
 * slice around the same instant.
 *
 * What the read returns at that frame is drawn onto the traces: the shaded band
 * is one master frame wide — the window the query uses — and the hairlines
 * inside it are the samples that window actually contains. They are counted off
 * the stream's own timestamps, so the panel can show a window holding three
 * samples, four samples, or none at all at the clip's first frame, without any
 * rate × window arithmetic.
 */
import { computed, onBeforeUnmount, onMounted, ref, shallowRef, watch } from 'vue'
import { FORMAT } from '@/content'
import { useI18n } from '@/composables/useI18n'
import {
  loadRecordings,
  loadSample,
  asset,
  type RecordingSample,
  type ReleasedRecording,
} from '@/data/recordings'
import {
  readFrame,
  windowCounts,
  countHistogram,
  sliceAround,
  sliceStream,
  lowerIndex,
  VIEW_KEYS,
  VIEW_LABELS,
  WAVE_LABELS,
  type WaveName,
} from '@/data/readout'
import MultiChannelPlot from '@/components/MultiChannelPlot.vue'

const { t, isZh } = useI18n()

const recordings = shallowRef<ReleasedRecording[]>([])
const sample = shallowRef<RecordingSample | null>(null)
const activeId = ref('')
const active = computed(() => recordings.value.find((r) => r.id === activeId.value) ?? null)
const frame = ref(10)
const loading = ref(true)
const failed = ref('')
const playing = ref(false)

const frameCount = computed(() => sample.value?.frames.length ?? 0)
const duration = computed(() => sample.value?.duration ?? 0)
/** Episode time of the frame: the file's own timestamp, not an index divided by fps. */
const frameTime = computed(() => sample.value?.frames[frame.value]?.timestamp ?? 0)

const readout = computed(() => (sample.value ? readFrame(sample.value, frame.value) : null))

/** The slice the traces are cut to, and where the frame sits inside it. */
const slice = computed(() => (sample.value ? sliceAround(sample.value, frameTime.value) : null))

interface Panel {
  name: WaveName
  label: string
  color: string
  plot: NonNullable<ReturnType<typeof sliceStream>>
}

const WAVE_COLOR: Record<WaveName, string> = {
  eeg: 'var(--c-slate)',
  leftEmg: 'var(--c-blue)',
  rightEmg: 'var(--c-rose)',
}

const panels = computed<Panel[]>(() => {
  const s = sample.value
  const sl = slice.value
  if (!s || !sl) return []
  return (['eeg', 'leftEmg', 'rightEmg'] as const)
    .map((name) => {
      const plot = sliceStream(s, name, frameTime.value, sl)
      if (!plot) return null
      const wave = s.waveforms[name]
      return {
        name,
        label: `${t(WAVE_LABELS[name])} · ${wave.channels.length} ch · ${wave.sampleRate} Hz`,
        color: WAVE_COLOR[name],
        plot,
      }
    })
    .filter((p): p is Panel => p !== null)
})

/** Where the frame falls in the drawn span, as the plot's playhead. */
const playhead = computed(() => {
  const p = panels.value[0]?.plot
  if (!p) return 0
  return (frameTime.value - p.ta) / Math.max(1e-6, p.tb - p.ta)
})

/** The window's width as a fraction of the drawn span: exactly one master frame. */
const band = computed(() => {
  const p = panels.value[0]?.plot
  if (!p || !sample.value) return 0
  return 1 / sample.value.fps / Math.max(1e-6, p.tb - p.ta)
})

const rowsWord = computed(() => t(FORMAT.readoutRowsWord))

const bandTag = computed(() => {
  const n = panels.value[0]?.plot.rows ?? 0
  return n === 0 ? t(FORMAT.readoutEmpty) : `${n} ${rowsWord.value}`
})

/** One stream's window row count across the whole clip, drawn as a strip. */
const stripCounts = computed(() => (sample.value ? windowCounts(sample.value, 'eeg') : []))
const stripMax = computed(() => Math.max(1, ...stripCounts.value))
const stripSpread = computed(() => {
  const hist = countHistogram(stripCounts.value)
  return hist.map((h) => `${h.rows}×${h.frames}`).join(' · ')
})

const stripHead = computed(() => (frameCount.value > 1 ? frame.value / (frameCount.value - 1) : 0))

/* ---------------- video ---------------- */

const videoEls = shallowRef<Record<string, HTMLVideoElement>>({})
const bound = new WeakSet<HTMLVideoElement>()

function setVideo(el: Element | { $el?: Element } | null, key: string) {
  const node = el ? (('$el' in el ? el.$el : el) as HTMLVideoElement) : null
  if (!node) {
    delete videoEls.value[key]
    return
  }
  videoEls.value[key] = node
  if (bound.has(node)) return
  bound.add(node)
  // A paused video reaches the target frame only once its decoder has produced it
  // and after the src has changed, so the seek is re-applied on both.
  for (const ev of ['loadeddata', 'seeked'] as const) {
    node.addEventListener(ev, () => applyTime())
  }
}

/**
 * Push the frame's own episode time into every view, so all four agree. The
 * elements are not seeked while they are playing: there they run on their own
 * clock and the frame index follows them instead, which is what keeps a
 * four-way seek off every animation frame.
 */
function applyTime() {
  if (playing.value) return
  for (const key of VIEW_KEYS) {
    const el = videoEls.value[key]
    if (!el) continue
    const want = frameTime.value
    if (Math.abs(el.currentTime - want) > 0.001) {
      try {
        el.currentTime = want
      } catch {
        /* the src has not parsed yet; `loadeddata` will re-apply */
      }
    }
  }
}

/** Nearest frame to an episode time, so playback cannot land between frames. */
function frameAt(t: number): number {
  const frames = sample.value?.frames
  if (!frames?.length) return 0
  const i = lowerIndex(
    frames.map((f) => f.timestamp),
    t,
  )
  if (i <= 0) return 0
  if (i >= frames.length) return frames.length - 1
  const before = frames[i - 1].timestamp
  return t - before <= frames[i].timestamp - t ? i - 1 : i
}

/* ---------------- playback ---------------- */

let raf = 0

function tick() {
  if (!playing.value) return
  const el = videoEls.value[VIEW_KEYS[0]]
  if (el) frame.value = frameAt(el.currentTime)
  else {
    // No element to follow yet: advance the index off the episode's own grid.
    const step = 1 / (sample.value?.fps ?? 30)
    frame.value = frameAt(frameTime.value + step)
  }
  if (el && el.ended) {
    setPlaying(false)
    return
  }
  raf = requestAnimationFrame(tick)
}

function setPlaying(v: boolean) {
  playing.value = v
  cancelAnimationFrame(raf)
  for (const key of VIEW_KEYS) {
    const el = videoEls.value[key]
    if (!el) continue
    if (v) {
      el.currentTime = frameTime.value
      void el.play().catch(() => {
        /* blocked by the autoplay policy; the frame still scrubs */
      })
    } else {
      el.pause()
    }
  }
  if (v) raf = requestAnimationFrame(tick)
  else applyTime()
}

/* ---------------- data ---------------- */

let seq = 0

async function select(id: string) {
  const rec = recordings.value.find((r) => r.id === id)
  if (!rec) return
  const mine = ++seq
  activeId.value = id
  loading.value = true
  failed.value = ''
  try {
    const s = await loadSample(rec)
    if (mine !== seq) return
    sample.value = s
    frame.value = Math.min(frame.value, s.frames.length - 1)
  } catch (e) {
    if (mine !== seq) return
    failed.value = String(e)
  } finally {
    if (mine === seq) loading.value = false
  }
}

onMounted(async () => {
  try {
    const list = await loadRecordings()
    recordings.value = list
    if (list.length) await select(list[0].id)
  } catch (e) {
    failed.value = String(e)
    loading.value = false
  }
})

watch([frame, frameTime, () => sample.value], () => applyTime())

onBeforeUnmount(() => {
  cancelAnimationFrame(raf)
  playing.value = false
})
</script>

<template>
  <figure class="ro">
    <p v-if="failed" class="ro__err">{{ failed }}</p>
    <p v-else-if="loading && !sample" class="ro__loading mono">
      {{ isZh ? '正在读取片段…' : 'Reading episode…' }}
    </p>

    <template v-if="sample && readout">
      <!-- controls: which episode, which frame -->
      <div class="ro__controls">
        <label class="ro__field">
          <span class="ro__field-k mono">{{ t(FORMAT.readoutEpisode) }}</span>
          <select
            class="ro__select"
            :value="activeId"
            @change="select(($event.target as HTMLSelectElement).value)"
          >
            <option v-for="r in recordings" :key="r.id" :value="r.id">
              {{ isZh ? r.title : r.titleEn }}
            </option>
          </select>
        </label>

        <label class="ro__field ro__field--scrub">
          <span class="ro__field-k mono">
            {{ t(FORMAT.readoutFrame) }} {{ readout.frameIndex }}
            <span class="ro__dim">/ {{ frameCount - 1 }}</span>
          </span>
          <input
            class="ro__scrub"
            type="range"
            min="0"
            :max="Math.max(0, frameCount - 1)"
            step="1"
            :value="frame"
            :aria-label="t(FORMAT.readoutFrame)"
            @input="frame = Number(($event.target as HTMLInputElement).value)"
          />
        </label>

        <button
          class="ro__play"
          type="button"
          :aria-pressed="playing"
          @click="setPlaying(!playing)"
        >
          {{ playing ? t(FORMAT.readoutPause) : t(FORMAT.readoutPlay) }}
        </button>

        <p class="ro__when mono">
          <span class="ro__when-key">{{ t(FORMAT.readoutAt) }}</span>
          {{ frameTime.toFixed(3) }} s
          <span class="ro__sep">·</span>
          {{ t(FORMAT.readoutSourceClock) }} {{ readout.sourceTimestamp.toFixed(3) }} s
          <span class="ro__sep">·</span>
          {{ t(FORMAT.readoutWindow) }}
          <span class="ro__sep">·</span>
          {{ duration.toFixed(0) }} s @ {{ sample.fps }} fps
        </p>
      </div>

      <!-- the four head-mounted views, decoded at this frame -->
      <div class="ro__cams">
        <p class="ro__k mono">{{ t(FORMAT.readoutCameras) }}</p>
        <div class="ro__camrow">
          <figure v-for="key in VIEW_KEYS" :key="key" class="cam">
            <div class="cam__frame">
              <video
                :ref="(el) => setVideo(el as Element | null, key)"
                :src="active ? asset(active.views[key]) : undefined"
                :poster="active ? asset(active.poster) : undefined"
                muted
                playsinline
                preload="metadata"
              />
            </div>
            <figcaption class="cam__cap">
              <span class="mono">headband_{{ key }}_rgb</span>
              <span class="cam__name">{{ t(VIEW_LABELS[key]) }}</span>
            </figcaption>
          </figure>
        </div>
      </div>

      <!-- the same frame, as traces: one slice, window drawn onto it -->
      <div class="ro__signals">
        <p class="ro__k mono">
          {{ t(FORMAT.readoutSignals) }}
          <span class="ro__k-note">{{ t(FORMAT.readoutReturned) }}: <b>{{ bandTag }}</b></span>
        </p>
        <div class="ro__stack">
          <figure v-for="p in panels" :key="p.name" class="ro__plot">
            <MultiChannelPlot
              :channels="p.plot.channels"
              :labels="sample.waveforms[p.name].channels"
              :color="p.color"
              :label="p.label"
              :playhead="playhead"
              :total-seconds="p.plot.tb - p.plot.ta"
              :tick-seconds="0.2"
              :tick-origin="p.plot.ta"
              :tick-decimals="1"
              :lane-height="11"
              :band="band"
              :band-label="bandTag"
              :marks="p.plot.marks"
            />
          </figure>
        </div>
      </div>

      <!-- the phase pattern those two rates produce, across the whole clip -->
      <div class="ro__strip">
        <p class="ro__k mono">
          {{ t(FORMAT.readoutClipStrip) }}
          <span class="ro__k-note mono">{{ stripSpread }}</span>
        </p>
        <svg class="ro__bars" viewBox="0 0 480 34" preserveAspectRatio="none" aria-hidden="true">
          <rect
            v-for="(n, i) in stripCounts"
            :key="i"
            class="ro__bar"
            :class="{ 'is-empty': n === 0 }"
            :x="i + 0.12"
            :width="0.76"
            :y="34 - (n / stripMax) * 30"
            :height="Math.max(0.8, (n / stripMax) * 30)"
          />
          <line class="ro__barhead" :x1="stripHead * 480" :x2="stripHead * 480" y1="0" y2="34" />
        </svg>
        <p class="ro__rule">{{ t(FORMAT.readoutClipNote) }}</p>
      </div>

      <div class="ro__foot">
        <p class="ro__rule">{{ t(FORMAT.readoutUnitNative) }}</p>
      </div>
    </template>
  </figure>
</template>

<style scoped>
.mono { font-family: var(--ff-mono); }
.ro { margin: 0; }
.ro__err, .ro__loading { font-size: var(--fs-micro); color: var(--ink-mute); margin: 0.8rem 0 0; }

/* ---- controls ---- */
.ro__controls {
  display: flex;
  flex-wrap: wrap;
  align-items: flex-end;
  gap: 0.85rem 1.4rem;
  padding-bottom: 0.9rem;
  margin-bottom: 1rem;
  border-bottom: 1px solid var(--line);
}
.ro__field { display: grid; gap: 0.3rem; min-width: 0; }
.ro__field--scrub { flex: 1 1 15rem; }
.ro__field-k {
  font-size: var(--fs-tick);
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: var(--ink-mute);
}
.ro__dim { color: var(--ink-mute); opacity: 0.7; }
.ro__select {
  font: inherit;
  font-size: var(--fs-micro);
  color: var(--ink);
  background: var(--paper);
  border: 1px solid var(--line-strong);
  border-radius: var(--r-sm);
  padding: 0.3rem 0.5rem;
  max-width: 22rem;
}
.ro__scrub { width: 100%; accent-color: var(--c-blue); }
.ro__play {
  font: inherit;
  font-size: var(--fs-micro);
  color: var(--ink);
  background: var(--surface);
  border: 1px solid var(--line-strong);
  border-radius: var(--r-sm);
  padding: 0.32rem 0.7rem;
  cursor: pointer;
}
.ro__play:hover { background: var(--surface-2); }
.ro__when {
  margin: 0 0 0 auto;
  font-size: var(--fs-tick);
  color: var(--ink-soft);
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  gap: 0.35rem;
}
.ro__when-key { color: var(--ink-mute); text-transform: uppercase; letter-spacing: 0.06em; }
.ro__sep { color: var(--line-strong); }

/* ---- shared section label ---- */
.ro__k {
  margin: 0 0 0.5rem;
  font-size: var(--fs-tick);
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: var(--ink-mute);
  display: flex;
  align-items: baseline;
  gap: 0.6rem;
  flex-wrap: wrap;
}
.ro__k-note { color: var(--ink-soft); text-transform: none; letter-spacing: 0; }
.ro__k-note b { color: var(--c-rose); font-weight: 620; }

/* ---- four views ---- */
.ro__cams { margin-bottom: 1.15rem; }
.ro__camrow { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 0.35rem; }
@media (max-width: 720px) { .ro__camrow { grid-template-columns: repeat(2, minmax(0, 1fr)); } }
.cam { margin: 0; min-width: 0; }
.cam__frame {
  aspect-ratio: 16 / 10;
  background: #0d1519;
  border: 1px solid var(--line);
  border-radius: var(--r-xs);
  overflow: hidden;
}
.cam__frame video { width: 100%; height: 100%; object-fit: cover; }
.cam__cap {
  display: flex;
  justify-content: space-between;
  gap: 0.4rem;
  margin-top: 0.25rem;
  font-size: var(--fs-mark);
  color: var(--ink-mute);
  white-space: nowrap;
  overflow: hidden;
}
.cam__name { color: var(--ink-soft); }

/* ---- traces ---- */
.ro__signals { margin-bottom: 1.15rem; }
.ro__stack { display: grid; gap: 0.55rem; }
.ro__plot { margin: 0; min-width: 0; }

/* ---- clip-wide row counts ---- */
.ro__strip { padding-top: 0.2rem; }
.ro__bars {
  display: block;
  width: 100%;
  height: 34px;
  border-bottom: 1px solid var(--line-strong);
}
.ro__bar { fill: var(--c-violet); opacity: 0.72; }
.ro__bar.is-empty { fill: var(--c-amber); opacity: 1; }
.ro__barhead { stroke: var(--c-rose); stroke-width: 1; vector-effect: non-scaling-stroke; }
.ro__strip .ro__rule { margin-top: 0.5rem; }

.ro__foot { margin-top: 0.9rem; }
.ro__rule { margin: 0; font-size: var(--fs-micro); color: var(--ink-mute); line-height: 1.6; max-width: 84ch; }
</style>
