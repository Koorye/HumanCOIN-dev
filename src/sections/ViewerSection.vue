<script setup lang="ts">
/**
 * The released-episode viewer.
 *
 * Everything on a single moment is read against one coordinate frame. The
 * reconstructed scene is the reference: the play control sits on it, and every
 * instrument window beside it is tied back to the site it measures by a leader
 * line, so a plot is always read as "this instrument, there" rather than
 * against a colour key.
 *
 * The windows are exactly the instruments: the head camera, eye gaze, the
 * glove, EEG at the scalp and EMG at the two wrists. Nothing is listed that is
 * not drawn, and nothing is drawn without saying which stream it is.
 */
import { ref, shallowRef, computed, onMounted, onBeforeUnmount, watch, nextTick } from 'vue'
import { ANNOTATION, actionLabel, type Bi } from '@/content'
import { useI18n } from '@/composables/useI18n'
import {
  loadRecordings,
  loadSample,
  loadSteps,
  loadObjects,
  asset,
  type ReleasedRecording,
  type RecordingSample,
  type EpisodeObjects,
} from '@/data/recordings'
import { createScene, type AnchorId, type SceneApi, type SceneLayers } from '@/data/scene3d'
import MultiChannelPlot from '@/components/MultiChannelPlot.vue'
import GlovePlot from '@/components/GlovePlot.vue'
import AnnotationReadout from '@/components/AnnotationReadout.vue'

const { t, lang, isZh } = useI18n()

const recordings = ref<ReleasedRecording[]>([])
const activeId = ref('')
const sample = shallowRef<RecordingSample | null>(null)
const steps = ref<string[]>([])
const stepSource = ref('')
const episode = shallowRef<EpisodeObjects | null>(null)
const loading = ref(true)
const loadError = ref('')
const sceneReady = ref(false)

const time = ref(0)
const playing = ref(false)
const show = ref<SceneLayers>({
  hands: true,
  gaze: true,
  trail: true,
  pose: true,
  signal: true,
  camera: true,
  cloud: true,
})

/** Layer toggles, in the order they are rendered. */
const layerKeys = ['hands', 'pose', 'trail', 'gaze', 'camera', 'signal', 'cloud'] as const
const layerLabels: Record<(typeof layerKeys)[number], Bi> = {
  hands: ANNOTATION.hands,
  pose: ANNOTATION.pose,
  trail: ANNOTATION.trail,
  gaze: ANNOTATION.gaze,
  camera: ANNOTATION.camera,
  signal: ANNOTATION.signal,
  cloud: ANNOTATION.cloud,
}

const canvas = ref<HTMLCanvasElement | null>(null)
const stage = ref<HTMLDivElement | null>(null)
const stageBox = ref<HTMLDivElement | null>(null)
const sceneApi = shallowRef<SceneApi | null>(null)
const webglOk = ref(true)
/**
 * Live `<video>` elements keyed by view name. A plain array indexed by position
 * is not safe here: Vue calls the inline ref callback with `null` when the node
 * is replaced, so a positional array can silently keep a detached element —
 * which then decodes nothing and blanks any layer fed from it.
 */
const videoEls = shallowRef<Record<string, HTMLVideoElement>>({})

const viewKeys = ['left', 'right', 'bleft', 'bright'] as const
const viewLabels: Record<(typeof viewKeys)[number], Bi> = {
  left: ANNOTATION.viewLeft,
  right: ANNOTATION.viewRight,
  bleft: ANNOTATION.viewBackLeft,
  bright: ANNOTATION.viewBackRight,
}

const active = computed(() => recordings.value.find((r) => r.id === activeId.value) ?? null)
const duration = computed(() => sample.value?.duration ?? active.value?.duration ?? 16)
const frameCount = computed(() => sample.value?.frames?.length ?? 0)
const nodeCount = computed(() => sample.value?.frames?.[0]?.skeleton?.positions?.length ?? 0)
const poseCount = computed(() => Object.keys(sample.value?.frames?.[0]?.poses ?? {}).length)
const playhead = computed(() => (duration.value ? time.value / duration.value : 0))
/** Frame the glove pose is read at — the playhead snapped onto the frame grid. */
const gloveIndex = computed(() =>
  Math.min(Math.max(0, frameCount.value - 1), Math.round(time.value * (sample.value?.fps ?? 30))),
)

/**
 * The annotation carries ordered steps but no per-step timing, so the clip is
 * divided evenly across them purely for scrubbing. Everything downstream —
 * the headline, the step list, the moment readout — reads that same window.
 */
const stepIndex = computed(() => {
  if (!steps.value.length) return -1
  return Math.min(steps.value.length - 1, Math.floor(playheadSafe() * steps.value.length))
})
const activeStep = computed(() => steps.value[stepIndex.value] ?? '')
const activeAnnotated = computed(() => episode.value?.steps?.[stepIndex.value] ?? null)
const stepWindow = computed(() => {
  const n = steps.value.length || 1
  const i = Math.max(0, stepIndex.value)
  return { start: (i / n) * duration.value, end: ((i + 1) / n) * duration.value }
})
const stepBands = computed(() =>
  steps.value.map((text, i) => ({
    text,
    i,
    start: (i / steps.value.length) * duration.value,
    end: ((i + 1) / steps.value.length) * duration.value,
  })),
)

/** The header line: the step, prefixed by its action when one is readable. */
const headline = computed(() => {
  const step = activeAnnotated.value
  if (!step) return activeStep.value || (isZh.value ? active.value?.title : active.value?.titleEn) || '—'
  const verb = actionLabel(step.text, lang.value)
  return verb ? `${verb} · ${step.text}` : step.text
})

function playheadSafe() {
  return Math.min(0.999, Math.max(0, playhead.value))
}

function seekStep(start: number) {
  seek(start + 0.05)
}

/** EEG as one lane per channel, at the stream's own 100 Hz. */
const eegPlot = computed(() => {
  const wf = sample.value?.waveforms.eeg
  if (!wf) return null
  const channels = wf.channels.map((_, c) => wf.values.map((row) => row[c]))
  return {
    channels,
    labels: wf.channels,
    color: 'var(--c-slate)',
    label: t(ANNOTATION.windowEeg),
    meta: `${wf.channels.length} ch · ${wf.sampleRate} Hz`,
  }
})

/**
 * Both arms in one plot. The two amplifiers share a sampling grid, so their
 * lanes can sit on one axis; keeping them in a single window is what lets one
 * leader line pair reach both wrists.
 */
const emgPlot = computed(() => {
  const l = sample.value?.waveforms.leftEmg
  const r = sample.value?.waveforms.rightEmg
  if (!l || !r) return null
  const channels = [...l.channels, ...r.channels].map((_, i) => {
    const wf = i < l.channels.length ? l : r
    const c = i < l.channels.length ? i : i - l.channels.length
    return wf.values.map((row) => row[c])
  })
  return {
    channels,
    labels: [...l.channels, ...r.channels],
    color: 'var(--c-rose)',
    label: t(ANNOTATION.windowEmg),
    meta: `${l.channels.length + r.channels.length} ch · ${l.sampleRate} Hz`,
  }
})

const syncRows = computed(() => {
  const f = sample.value?.frames?.[0]
  if (!f?.sync) return []
  return Object.entries(f.sync).map(([k, v]) => ({
    name: k,
    ms: (v.deltaSeconds * 1000).toFixed(2),
  }))
})

/**
 * Gaze as a cursor and a short trail over the clip's own gaze extent. The
 * native coordinates are eye-camera pixels, so they are normalised by the
 * clip's own bounds: the point then sits where the eye camera put it relative
 * to the rest of the clip, rather than against a screen it was never
 * calibrated to.
 */
const gazeNorm = computed(() => {
  const s = sample.value
  if (!s) return null
  const xs: number[] = []
  const ys: number[] = []
  const pts: [number, number][] = []
  for (const f of s.frames) {
    const xy = f.gaze?.xy
    if (!xy || !Number.isFinite(xy[0]) || !Number.isFinite(xy[1])) {
      pts.push([NaN, NaN])
      continue
    }
    xs.push(xy[0])
    ys.push(xy[1])
    pts.push([xy[0], xy[1]])
  }
  if (!xs.length) return null
  const x0 = Math.min(...xs)
  const x1 = Math.max(...xs)
  const y0 = Math.min(...ys)
  const y1 = Math.max(...ys)
  const sx = x1 - x0 || 1
  const sy = y1 - y0 || 1
  /* A dropped sample becomes a move in the path rather than a straight jump
     across the gap, so a capture gap is not drawn as a gaze movement. */
  let trail = ''
  let open = false
  const norm: [number, number][] = pts.map(([x, y]) => {
    if (!Number.isFinite(x)) {
      open = false
      return [NaN, NaN]
    }
    const p: [number, number] = [((x - x0) / sx) * 100, ((y - y0) / sy) * 100]
    trail += `${open ? 'L' : 'M'}${p[0].toFixed(2)},${p[1].toFixed(2)}`
    open = true
    return p
  })
  return { pts: norm, trail }
})

const gazeNow = computed(() => {
  const s = sample.value
  const g = gazeNorm.value
  if (!s || !g) return null
  const i = Math.min(s.frames.length - 1, Math.max(0, Math.round(time.value * s.fps)))
  const p = g.pts[i]
  if (!p || !Number.isFinite(p[0])) return null
  return { x: p[0] * 100, y: p[1] * 100 }
})

/* ---------------- playback ---------------- */

let raf = 0
let last = 0

function tick(ts: number) {
  if (!playing.value) return
  if (!last) last = ts
  const dt = (ts - last) / 1000
  last = ts
  let next = time.value + dt
  if (next >= duration.value) next = 0
  time.value = next
  renderFrame()
  raf = requestAnimationFrame(tick)
}

function setPlaying(v: boolean) {
  playing.value = v
  last = 0
  cancelAnimationFrame(raf)
  if (v) raf = requestAnimationFrame(tick)
  for (const el of Object.values(videoEls.value)) {
    if (!el) continue
    if (v) void el.play().catch(() => { /* blocked by autoplay policy */ })
    else el.pause()
  }
}

function seek(v: number) {
  time.value = Math.min(duration.value, Math.max(0, v))
  for (const el of Object.values(videoEls.value)) if (el) el.currentTime = time.value
  renderFrame()
}

function onScrub(e: Event) {
  seek(Number((e.target as HTMLInputElement).value))
}

function renderFrame() {
  // The RGB cloud is back-projected from the left headband camera, which is the
  // stream the recorded intrinsics belong to.
  sceneApi.value?.update(sample.value, time.value, show.value, videoEls.value.left ?? null)
  updateLeads()
}

/**
 * Videos are re-bound when the recording changes, so the decode listeners are
 * attached once per element. Seeking is asynchronous: a paused video only
 * reaches `readyState >= 2` once the decoder has produced the target frame, and
 * the render triggered by the scrub itself therefore runs too early. These
 * events re-render afterwards, which is what makes the RGB cloud appear at a
 * standstill.
 */
const boundVideo = new WeakSet<HTMLVideoElement>()

function bindVideo(el: Element | { $el?: Element } | null, key: string) {
  const node = el ? (('$el' in el ? el.$el : el) as HTMLVideoElement) : null
  if (!node) {
    delete videoEls.value[key]
    return
  }
  videoEls.value[key] = node
  if (boundVideo.has(node)) return
  boundVideo.add(node)
  for (const ev of ['seeked', 'loadeddata', 'canplay'] as const) {
    node.addEventListener(ev, () => renderFrame())
  }
}

/* ---------------- instrument callouts ----------------
   Each window is tied to the site it measures by a line drawn in an overlay
   above the stage. The endpoints are measured, not authored: the scene reports
   where each instrument projects to, and the window reports its own box, so a
   line cannot point anywhere the scene is not currently drawing. */

interface Lead {
  id: string
  x1: number
  y1: number
  x2: number
  y2: number
  color: string
}

const leads = shallowRef<Lead[]>([])
const winEls: Record<string, HTMLElement | null> = {}
const winRefs: Record<string, (el: Element | { $el?: Element } | null) => void> = {}

/**
 * One stable callback per window. A fresh arrow per render would make Vue call
 * the old ref with `null` and the new one with the element on every patch, so
 * a box would drop out of the map mid-scroll.
 */
const winRef = (id: string) => {
  winRefs[id] =
    winRefs[id] ??
    ((el: Element | { $el?: Element } | null) => {
      winEls[id] = el ? ((('$el' in el ? el.$el : el) as HTMLElement) ?? null) : null
    })
  return winRefs[id]
}

const LEAD_COLOR: Record<AnchorId, string> = {
  camera: 'var(--c-teal)',
  gaze: 'var(--c-amber)',
  eeg: 'var(--c-slate)',
  emgL: 'var(--c-blue)',
  emgR: 'var(--c-rose)',
  glove: 'var(--c-violet)',
}

/** Window id → the sites that window's stream is measured at. */
const LEAD_MAP: { win: string; anchors: AnchorId[] }[] = [
  { win: 'views', anchors: ['camera'] },
  { win: 'gaze', anchors: ['gaze'] },
  { win: 'glove', anchors: ['glove'] },
  { win: 'eeg', anchors: ['eeg'] },
  { win: 'emg', anchors: ['emgL', 'emgR'] },
]

function updateLeads() {
  const api = sceneApi.value
  const box = stageBox.value
  const cv = canvas.value
  if (!api || !box || !cv) return
  const boxRect = box.getBoundingClientRect()
  const cvRect = cv.getBoundingClientRect()
  const anchors = new Map(api.anchors().map((a) => [a.id, a]))
  const out: Lead[] = []
  for (const { win, anchors: ids } of LEAD_MAP) {
    const w = winEls[win]
    if (!w) continue
    const r = w.getBoundingClientRect()
    const y1 = r.top - boxRect.top + r.height / 2
    for (const id of ids) {
      const a = anchors.get(id)
      if (!a || !a.onScreen) continue
      out.push({
        id: `${win}-${id}`,
        x1: r.left - boxRect.left,
        y1,
        x2: a.x + (cvRect.left - boxRect.left),
        y2: a.y + (cvRect.top - boxRect.top),
        color: LEAD_COLOR[id],
      })
    }
  }
  leads.value = out
}

/* ---------------- loading ---------------- */

/* The canvas only exists once a recording is active, so the scene has to be
   created after the first sample resolves rather than in `onMounted`. */
function ensureScene() {
  if (sceneApi.value) return
  const cv = canvas.value
  if (!cv) return
  try {
    const probe = document.createElement('canvas')
    webglOk.value = !!(probe.getContext('webgl2') || probe.getContext('webgl'))
    if (!webglOk.value) return
    sceneApi.value = createScene(cv, { onReady: () => (sceneReady.value = true) })
    // A camera move repaints the scene even with playback stopped, and drags
    // the callouts with it.
    sceneApi.value.onCamera(updateLeads)
  } catch {
    webglOk.value = false
  }
}

async function selectRecording(id: string) {
  const rec = recordings.value.find((r) => r.id === id)
  if (!rec) return
  activeId.value = id
  loadError.value = ''
  setPlaying(false)
  time.value = 0
  try {
    const [s, a, o] = await Promise.all([
      loadSample(rec),
      loadSteps(rec).catch(() => ({ steps: [] as string[], source: '' })),
      loadObjects(rec).catch(() => null),
    ])
    sample.value = s
    steps.value = a.steps ?? []
    stepSource.value = a.source ?? ''
    episode.value = o
    await nextTick()
    ensureScene()
    if (stage.value) resizeObserver.observe(stage.value)
    for (const el of Object.values(videoEls.value)) {
      if (!el) continue
      el.load()
      try { el.currentTime = 0 } catch { /* not seekable yet */ }
    }
    renderFrame()
  } catch (e) {
    console.error('[viewer] selectRecording failed', e)
    loadError.value = String(e)
  }
}

const resizeObserver = new ResizeObserver(() => {
  sceneApi.value?.resize()
  updateLeads()
})
const boxObserver = new ResizeObserver(() => updateLeads())

onMounted(async () => {
  try {
    recordings.value = await loadRecordings()
  } catch (e) {
    loadError.value = String(e)
  }
  loading.value = false

  if (recordings.value.length) await selectRecording(recordings.value[0].id)
  if (stageBox.value) boxObserver.observe(stageBox.value)
  window.addEventListener('resize', updateLeads)
})

onBeforeUnmount(() => {
  setPlaying(false)
  resizeObserver.disconnect()
  boxObserver.disconnect()
  window.removeEventListener('resize', updateLeads)
  sceneApi.value?.dispose()
})

watch(show, () => renderFrame(), { deep: true })
</script>

<template>
  <div class="viewer">
    <!-- The recordings come first, because choosing one is the only thing that
         has to happen before the rest of the panel means anything. -->
    <div class="picker">
      <div class="picker__head">
        <h4>{{ t(ANNOTATION.browseTitle) }}</h4>
        <p>{{ t(ANNOTATION.browseHint) }}</p>
      </div>
      <ul class="picker__list">
        <li v-for="r in recordings" :key="r.id">
          <button
            type="button"
            class="rec"
            :class="{ 'rec--active': r.id === activeId }"
            :aria-pressed="r.id === activeId"
            @click="selectRecording(r.id)"
          >
            <span class="rec__thumb">
              <img :src="asset(r.poster)" alt="" loading="lazy" decoding="async" />
            </span>
            <span class="rec__title">{{ isZh ? r.title : r.titleEn || r.title }}</span>
            <span class="rec__mods mono">{{ r.modalities.join(' · ') }}</span>
          </button>
        </li>
      </ul>
    </div>

    <div class="viewer__bar">
      <p class="viewer__task">{{ headline }}</p>
      <p class="viewer__id mono">
        {{ active?.id ?? '—' }}<span class="sep">·</span>{{
          isZh ? active?.scene : active?.sceneEn
        }}<span class="sep">·</span>{{ duration.toFixed(0) }}s<span class="sep">·</span>{{
          sample?.fps ?? 30
        }}fps<span v-if="frameCount"><span class="sep">·</span>{{ frameCount }}f</span
        ><span v-if="nodeCount"
          ><span class="sep">·</span>{{ nodeCount }}{{ isZh ? '节点' : 'nodes' }}</span
        ><span v-if="poseCount"
          ><span class="sep">·</span>{{ poseCount }}{{ isZh ? '骨架' : 'rigs' }}</span
        >
      </p>
      <span v-if="loading" class="viewer__load">{{ t(ANNOTATION.loadingData) }}</span>
    </div>

    <p v-if="loadError" class="viewer__err">{{ loadError }}</p>

    <template v-if="active">
      <div ref="stageBox" class="stage">
        <!-- The world owns the play control, since it is the reference every
             window is read against. -->
        <div ref="stage" class="world">
          <canvas ref="canvas" class="world__canvas" aria-label="Reconstructed 3D scene">
            {{ t(ANNOTATION.unsupported3d) }}
          </canvas>

          <div class="hud" aria-hidden="true">
            <span class="hud__corner hud__corner--tl" />
            <span class="hud__corner hud__corner--tr" />
            <span class="hud__corner hud__corner--bl" />
            <span class="hud__corner hud__corner--br" />
            <div class="hud__bar">
              <span class="hud__rec" />
              <span class="hud__label mono">{{ active?.id ?? '—' }}</span>
              <span class="hud__sep">|</span>
              <span class="hud__label mono">{{ time.toFixed(2) }}s</span>
              <span class="hud__sep">|</span>
              <span class="hud__label mono">
                {{ isZh ? '步骤' : 'STEP' }} {{ String(Math.max(0, stepIndex) + 1).padStart(2, '0') }}
              </span>
            </div>
          </div>

          <p v-if="!webglOk" class="world__fallback">{{ t(ANNOTATION.unsupported3d) }}</p>

          <div class="world__tools">
            <label v-for="k in layerKeys" :key="k" class="toggle">
              <input v-model="show[k]" type="checkbox" />
              <span>{{ t(layerLabels[k]) }}</span>
            </label>
            <button class="world__reset" type="button" @click="sceneApi?.resetView()">
              {{ t(ANNOTATION.reset) }}
            </button>
          </div>

          <div class="transport">
            <button
              class="transport__play"
              type="button"
              :aria-label="playing ? t(ANNOTATION.pause) : t(ANNOTATION.play)"
              @click="setPlaying(!playing)"
            >
              <span aria-hidden="true">{{ playing ? '❚❚' : '▶' }}</span>
            </button>
            <input
              class="transport__scrub"
              type="range"
              min="0"
              :max="duration"
              step="0.02"
              :value="time"
              :aria-label="t(ANNOTATION.timeline)"
              @input="onScrub"
            />
            <span class="transport__time mono">
              {{ time.toFixed(2) }}<span class="slash">/</span>{{ duration.toFixed(2) }}s
            </span>
          </div>
          <p class="world__hint">{{ t(ANNOTATION.hint) }}</p>
        </div>

        <!-- One window per instrument. Each is the stream itself, so there is
             nothing to look up in a key. -->
        <div class="wins">
          <figure :ref="winRef('views')" class="win win--wide">
            <figcaption class="win__head">
              <span class="win__name">{{ t(ANNOTATION.windowCamera) }}</span>
              <span class="win__meta mono">{{ t(ANNOTATION.viewsTitle) }}</span>
            </figcaption>
            <div class="cams">
              <div v-for="key in viewKeys" :key="key" class="cam">
                <div class="cam__frame">
                  <video
                    :ref="(el) => bindVideo(el as Element | null, key)"
                    :src="asset(active.views[key])"
                    :poster="asset(active.poster)"
                    muted
                    playsinline
                    preload="auto"
                  />
                </div>
                <span class="cam__label">{{ t(viewLabels[key]) }}</span>
              </div>
            </div>
          </figure>

          <figure :ref="winRef('gaze')" class="win">
            <figcaption class="win__head">
              <span class="win__name">{{ t(ANNOTATION.windowGaze) }}</span>
              <span class="win__meta mono">{{ t(ANNOTATION.gazeNow) }}</span>
            </figcaption>
            <div class="gaze">
              <svg viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
                <rect class="gaze__box" x="0.5" y="0.5" width="99" height="99" />
                <path v-if="gazeNorm" class="gaze__trail" :d="gazeNorm.trail" />
                <template v-if="gazeNow">
                  <line class="gaze__cross" :x1="gazeNow.x - 7" :x2="gazeNow.x + 7" :y1="gazeNow.y" :y2="gazeNow.y" />
                  <line class="gaze__cross" :x1="gazeNow.x" :x2="gazeNow.x" :y1="gazeNow.y - 7" :y2="gazeNow.y + 7" />
                  <circle class="gaze__dot" :cx="gazeNow.x" :cy="gazeNow.y" r="2.4" />
                </template>
              </svg>
            </div>
            <p class="win__note">{{ t(ANNOTATION.gazeNote) }}</p>
          </figure>

          <figure :ref="winRef('glove')" class="win">
            <figcaption class="win__head">
              <span class="win__name">{{ t(ANNOTATION.windowGlove) }}</span>
              <span class="win__meta mono">{{ nodeCount }} {{ isZh ? '节点' : 'nodes' }}</span>
            </figcaption>
            <GlovePlot
              :frames="sample?.frames ?? []"
              :index="gloveIndex"
              :label-a="t(ANNOTATION.gloveBlockA)"
              :label-b="t(ANNOTATION.gloveBlockB)"
            />
            <p class="win__note">{{ t(ANNOTATION.gloveNote) }}</p>
          </figure>

          <figure v-if="eegPlot" :ref="winRef('eeg')" class="win">
            <MultiChannelPlot
              :channels="eegPlot.channels"
              :labels="eegPlot.labels"
              :color="eegPlot.color"
              :label="eegPlot.label"
              :sublabel="eegPlot.meta"
              :playhead="playhead"
              :total-seconds="duration"
              :tick-seconds="Math.max(1, Math.round(duration / 4))"
              :lane-height="14"
            />
          </figure>

          <figure v-if="emgPlot" :ref="winRef('emg')" class="win">
            <MultiChannelPlot
              :channels="emgPlot.channels"
              :labels="emgPlot.labels"
              :color="emgPlot.color"
              :label="emgPlot.label"
              :sublabel="emgPlot.meta"
              :playhead="playhead"
              :total-seconds="duration"
              :tick-seconds="Math.max(1, Math.round(duration / 4))"
              :lane-height="14"
            />
          </figure>

          <details v-if="syncRows.length" class="sync">
            <summary>{{ t(ANNOTATION.syncNote) }}</summary>
            <table class="tbl sync__table">
              <thead>
                <tr><th>{{ t(ANNOTATION.streamCol) }}</th><th>{{ t(ANNOTATION.deltaCol) }}</th></tr>
              </thead>
              <tbody>
                <tr v-for="r in syncRows" :key="r.name">
                  <td class="mono">{{ r.name }}</td>
                  <td class="mono">{{ r.ms }}</td>
                </tr>
              </tbody>
            </table>
          </details>
        </div>

        <!-- Drawn above both columns: one line per instrument, from the window
             that shows it to the site it was measured at. -->
        <svg class="leads" aria-hidden="true">
          <g v-for="l in leads" :key="l.id">
            <path
              class="leads__line"
              :d="`M${l.x1.toFixed(1)},${l.y1.toFixed(1)}L${l.x2.toFixed(1)},${l.y2.toFixed(1)}`"
              :stroke="l.color"
            />
            <circle class="leads__end" :cx="l.x1" :cy="l.y1" r="2.5" :fill="l.color" />
            <circle class="leads__dot" :cx="l.x2" :cy="l.y2" r="3.5" :stroke="l.color" />
          </g>
        </svg>
      </div>

      <section v-if="stepBands.length" class="steps">
        <header class="steps__head">
          <h4>{{ t(ANNOTATION.stepsTitle) }}</h4>
          <span class="steps__src mono">{{ t(ANNOTATION.stepSource) }}: {{ stepSource }}</span>
        </header>
        <ol class="steps__list">
          <li v-for="b in stepBands" :key="b.i" :class="{ 'steps__item--on': b.i === stepIndex }">
            <button type="button" class="steps__btn" :aria-pressed="b.i === stepIndex" @click="seekStep(b.start)">
              <span class="steps__n mono">{{ String(b.i + 1).padStart(2, '0') }}</span>
              <span class="steps__text">{{ b.text }}</span>
              <span class="steps__time mono">{{ b.start.toFixed(1) }}–{{ b.end.toFixed(1) }}s</span>
            </button>
          </li>
        </ol>
      </section>

      <AnnotationReadout
        v-if="episode"
        :step="activeAnnotated"
        :step-index="Math.max(0, stepIndex)"
        :step-count="steps.length"
        :start="stepWindow.start"
        :end="stepWindow.end"
        :objects="episode.objects"
        :frames="sample?.frames ?? []"
        :fps="sample?.fps ?? 30"
        :sample="sample"
      />
    </template>
  </div>
</template>

<style scoped>
.mono { font-family: var(--ff-mono); }
.sep { margin-inline: 0.35em; color: var(--line-strong); }

/* ---- picker ---- */
.picker {
  display: grid;
  grid-template-columns: minmax(0, 14rem) minmax(0, 1fr);
  gap: 1rem;
  align-items: start;
  margin-bottom: 1.15rem;
  padding-bottom: 1.15rem;
  border-bottom: 1px solid var(--line);
}
@media (max-width: 860px) { .picker { grid-template-columns: minmax(0, 1fr); } }
.picker__head h4 { font-size: var(--fs-h4); margin-bottom: 0.15rem; }
.picker__head p { font-size: var(--fs-small); color: var(--ink-soft); margin: 0; }
.picker__list {
  list-style: none; margin: 0; padding: 0;
  display: grid; grid-template-columns: repeat(auto-fill, minmax(13rem, 1fr)); gap: 0.5rem;
}
.rec {
  width: 100%; display: grid; grid-template-columns: 3.4rem minmax(0, 1fr);
  grid-template-rows: auto auto; gap: 0 0.6rem; align-items: center; padding: 0.4rem 0.5rem;
  border: 1px solid var(--line); border-radius: var(--r-sm);
  background: var(--paper); text-align: left; cursor: pointer;
  transition: border-color var(--dur) var(--ease), background var(--dur) var(--ease);
}
.rec:hover { border-color: var(--line-strong); background: var(--surface); }
.rec--active { border-color: var(--c-blue); background: var(--t-blue); }
.rec__thumb { grid-row: span 2; aspect-ratio: 4 / 3; overflow: hidden; border-radius: var(--r-xs); background: var(--surface-2); }
.rec__thumb img { width: 100%; height: 100%; object-fit: cover; }
.rec__title {
  font-size: var(--fs-small); font-weight: 550; color: var(--ink);
  overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
}
.rec__mods {
  font-size: var(--fs-tick); color: var(--ink-mute);
  overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
}

.viewer__bar {
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  gap: 0.35rem 1rem;
  padding-bottom: 0.7rem;
  border-bottom: 1px solid var(--line);
  margin-bottom: 1rem;
}
.viewer__task { font-size: var(--fs-lead); font-weight: 600; color: var(--ink); margin: 0; }
.viewer__id { font-size: var(--fs-tick); color: var(--ink-mute); margin: 0; }
.viewer__load { font-size: var(--fs-micro); color: var(--ink-mute); }
.viewer__err { color: var(--c-rose); font-size: var(--fs-small); }

/* ---- stage: the world, and one window per instrument ---- */
.stage {
  position: relative;
  display: grid;
  grid-template-columns: minmax(0, 1.05fr) minmax(0, 1fr);
  gap: 1rem;
  /* Both columns take the row height, so the world and the instrument windows
     end on the same line and neither leaves a block of dead space beside it. */
  align-items: stretch;
}
@media (max-width: 1000px) { .stage { grid-template-columns: minmax(0, 1fr); } }

/* Two columns: the camera and the signal windows are wide, and pairing the
   scalp and muscle plots keeps the column from growing twice as tall as the
   scene it is read against. */
.wins {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 0.6rem;
  align-content: start;
  min-width: 0;
}
.win--wide { grid-column: 1 / -1; }
@media (max-width: 460px) { .wins { grid-template-columns: minmax(0, 1fr); } }
.win {
  margin: 0;
  border: 1px solid var(--line);
  border-radius: var(--r-sm);
  background: var(--paper);
  padding: 0.1rem 0.35rem 0.35rem;
  min-width: 0;
}
.win__head {
  display: flex; flex-wrap: wrap; align-items: baseline; gap: 0.5rem;
  padding-bottom: 0.2rem;
}
.win__name {
  font-family: var(--ff-mono); font-size: var(--fs-micro);
  letter-spacing: 0.06em; text-transform: uppercase; color: var(--ink);
}
.win__meta { font-size: var(--fs-tick); color: var(--ink-mute); }
.win__note { font-size: var(--fs-mark); color: var(--ink-mute); line-height: 1.45; margin: 0.25rem 0 0; }

/* The leader overlay: decoration over both columns, never interactive. */
.leads { position: absolute; inset: 0; width: 100%; height: 100%; pointer-events: none; overflow: visible; }
.leads__line { fill: none; stroke-width: 1; stroke-dasharray: 3 3; opacity: 0.7; }
.leads__end { opacity: 0.9; }
.leads__dot { fill: none; stroke-width: 1.4; }
@media (max-width: 1000px) { .leads { display: none; } }

/* ---- four head-mounted views, as one instrument ---- */
.cams { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 0.3rem; }
@media (max-width: 520px) { .cams { grid-template-columns: repeat(2, minmax(0, 1fr)); } }
.cam { margin: 0; min-width: 0; }
.cam__frame {
  aspect-ratio: 4 / 3;
  background: #0d1519;
  border: 1px solid var(--line);
  border-radius: var(--r-xs);
  overflow: hidden;
}
.cam__frame video { width: 100%; height: 100%; object-fit: cover; }
.cam__label {
  display: block; font-size: var(--fs-mark); color: var(--ink-mute);
  text-align: center; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
}

/* ---- gaze ---- */
.gaze {
  position: relative;
  aspect-ratio: 4 / 3;
  border: 1px solid var(--line);
  border-radius: var(--r-xs);
  background: var(--surface);
  overflow: hidden;
}
.gaze svg { width: 100%; height: 100%; display: block; }
.gaze__box { fill: none; stroke: var(--line); stroke-width: 1; vector-effect: non-scaling-stroke; }
.gaze__trail { fill: none; stroke: var(--c-amber); stroke-width: 0.8; opacity: 0.45; vector-effect: non-scaling-stroke; stroke-linejoin: round; }
.gaze__cross { stroke: var(--c-amber); stroke-width: 1; vector-effect: non-scaling-stroke; }
.gaze__dot { fill: var(--c-amber); }

/* ---- world ---- */
.world {
  position: relative;
  height: 100%;
  min-width: 0;
  min-height: 340px;
  border: 1px solid var(--line);
  border-radius: var(--r-md);
  background: radial-gradient(ellipse at 50% 18%, #17222c 0%, #0f171e 55%, #0a1016 100%);
  overflow: hidden;
  touch-action: none;
}
@media (max-width: 520px) { .world { min-height: 260px; } }
/* The renderer writes the canvas's intrinsic height from its client height, so
   the canvas must not contribute to layout height: left in flow it would feed
   its own measured height back into the row track and grow without bound. */
.world__canvas { position: absolute; inset: 0; width: 100%; height: 100%; display: block; cursor: grab; }
.world__canvas:active { cursor: grabbing; }
.world__fallback {
  position: absolute; inset: auto 1rem 4rem; font-size: var(--fs-small); color: var(--ink-soft); margin: 0;
}
.world__tools {
  position: absolute; top: 0.55rem; left: 0.55rem;
  display: flex; flex-wrap: wrap; align-items: center; gap: 0.4rem 0.7rem;
  padding: 0.3rem 0.55rem;
  background: rgba(255, 255, 255, 0.92);
  border: 1px solid var(--line);
  border-radius: var(--r-sm);
  backdrop-filter: blur(8px);
  max-width: calc(100% - 1.1rem);
}
.toggle { display: inline-flex; align-items: center; gap: 0.3rem; min-height: 22px; font-size: var(--fs-mark); color: var(--ink-soft); cursor: pointer; }
.toggle input { accent-color: var(--c-blue); width: 0.8rem; height: 0.8rem; margin: 0; }
.world__reset {
  border: 0; background: none; padding: 0; min-height: 22px;
  font: inherit; font-size: var(--fs-mark); color: var(--c-blue);
  cursor: pointer; text-decoration: underline; text-underline-offset: 0.15em;
}
.world__hint {
  position: absolute; top: 0.6rem; right: 0.65rem;
  font-size: var(--fs-mark); color: rgba(220, 234, 243, 0.6); margin: 0;
}
@media (max-width: 900px) { .world__hint { display: none; } }

/* ---- transport, on the world ---- */
.transport {
  position: absolute; bottom: 0.55rem; left: 0.55rem; right: 0.55rem;
  display: flex; align-items: center; gap: 0.7rem;
  padding: 0.35rem 0.6rem;
  border-radius: var(--r-pill);
  background: rgba(6, 18, 26, 0.62);
  border: 1px solid rgba(220, 234, 243, 0.18);
  backdrop-filter: blur(8px);
}
.transport__play {
  flex: none; width: 2.1rem; height: 2.1rem; display: grid; place-items: center;
  border: 1px solid rgba(220, 234, 243, 0.35); border-radius: 50%;
  background: rgba(220, 234, 243, 0.12); color: #e6f2fa;
  font-size: var(--fs-micro); line-height: 1; cursor: pointer;
  transition: background var(--dur) var(--ease), border-color var(--dur) var(--ease);
}
.transport__play:hover { background: rgba(220, 234, 243, 0.24); border-color: rgba(220, 234, 243, 0.6); }
.transport__scrub {
  flex: 1 1 6rem; min-width: 0; appearance: none; height: 4px;
  border-radius: var(--r-pill); background: rgba(220, 234, 243, 0.28); cursor: pointer;
}
.transport__scrub::-webkit-slider-thumb {
  appearance: none; width: 13px; height: 13px; border-radius: 50%;
  background: #e6f2fa; border: 2px solid #16333f;
}
.transport__scrub::-moz-range-thumb {
  width: 13px; height: 13px; border-radius: 50%; background: #e6f2fa; border: 2px solid #16333f;
}
.transport__time {
  flex: none; font-size: var(--fs-tick); color: #cfe2ee;
  font-variant-numeric: tabular-nums; white-space: nowrap;
}
.slash { color: rgba(220, 234, 243, 0.4); margin-inline: 0.2em; }

/* ---- inspector HUD ---- */
.hud { position: absolute; inset: 0; pointer-events: none; color: #dceaf3; }
.hud__corner { position: absolute; width: 16px; height: 16px; border: 1px solid rgba(220, 234, 243, 0.45); }
.hud__corner--tl { top: 7px; left: 7px; border-right: 0; border-bottom: 0; }
.hud__corner--tr { top: 7px; right: 7px; border-left: 0; border-bottom: 0; }
.hud__corner--bl { bottom: 7px; left: 7px; border-right: 0; border-top: 0; }
.hud__corner--br { bottom: 7px; right: 7px; border-left: 0; border-top: 0; }
.hud__bar {
  position: absolute; top: 0.55rem; left: 50%; transform: translateX(-50%);
  display: flex; align-items: center; gap: 0.4rem;
  padding: 0.2rem 0.55rem; border-radius: var(--r-pill);
  background: rgba(6, 18, 26, 0.6); border: 1px solid rgba(220, 234, 243, 0.18);
  backdrop-filter: blur(8px); white-space: nowrap;
}
.hud__rec { width: 6px; height: 6px; border-radius: 50%; background: var(--k-rose); animation: hud-rec 2.4s var(--ease-io) infinite; }
.hud__label { font-size: var(--fs-mark); letter-spacing: 0.08em; text-transform: uppercase; color: #b9d2e0; font-variant-numeric: tabular-nums; }
.hud__sep { color: rgba(220, 234, 243, 0.3); font-size: var(--fs-mark); }
@keyframes hud-rec { 0%, 45% { opacity: 1; } 55%, 100% { opacity: 0.25; } }
@media (prefers-reduced-motion: reduce) { .hud__rec { animation: none; } }

/* ---- task steps ---- */
.steps {
  margin-top: 1rem;
  padding: 0.75rem 0.85rem 0.85rem;
  border: 1px solid var(--line);
  border-radius: var(--r-md);
  background: var(--surface);
}
.steps__head { display: flex; flex-wrap: wrap; align-items: baseline; justify-content: space-between; gap: 0.6rem; margin-bottom: 0.55rem; }
.steps__head h4 { font-size: var(--fs-small); font-weight: 620; }
.steps__src { font-size: var(--fs-tick); color: var(--ink-mute); }
.steps__list { list-style: none; margin: 0; padding: 0; display: grid; gap: 0.25rem; grid-template-columns: repeat(auto-fit, minmax(13rem, 1fr)); }
.steps__item--on .steps__btn { border-color: var(--c-blue); background: var(--t-blue); }
.steps__btn {
  width: 100%; display: grid; grid-template-columns: 1.5rem minmax(0, 1fr); gap: 0 0.45rem;
  align-items: start; text-align: left; padding: 0.35rem 0.5rem;
  border: 1px solid var(--line); border-radius: var(--r-sm); background: var(--paper);
  font: inherit; cursor: pointer;
  transition: border-color var(--dur) var(--ease), background var(--dur) var(--ease);
}
.steps__btn:hover { border-color: var(--line-strong); }
.steps__n { font-size: var(--fs-tick); color: var(--ink-mute); }
.steps__text { font-size: var(--fs-micro); color: var(--ink); line-height: 1.45; }
.steps__time { grid-column: 2; font-size: var(--fs-mark); color: var(--ink-mute); }

.sync { font-size: var(--fs-micro); }
.sync summary { cursor: pointer; color: var(--ink-mute); padding: 0.2rem 0; }
.sync summary:hover { color: var(--ink); }
.sync__table { margin-top: 0.3rem; }
.sync__table th, .sync__table td { padding: 0.25rem 0.45rem; }
.sync__table td { font-size: var(--fs-micro); }
</style>
