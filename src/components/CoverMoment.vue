<script setup lang="ts">
/**
 * One take, read as a moment.
 *
 * Two bands, one clock. The top band is the footage: the views the tier ships,
 * on one transport, so they cannot drift apart. The band below is the non-visual
 * channels — gaze, pose, fingers, EMG, EEG — drawn from the same take's own
 * reduced samples and animated at the playhead the footage is at.
 *
 * The annotation band is held back from the cover for now; the reduced payloads
 * still carry each capture's steps, so it can return without re-encoding.
 *
 * The video is the clock master. `elapsed` is read off the left view on every
 * frame, so the channels mark the same instant the footage is showing rather
 * than a second clock that happens to run alongside it.
 *
 * Every band has a fixed height and every cell in a row is the same size, so
 * moving between takes — or between tiers, where a channel may drop out
 * entirely — never reflows the page. Static geometry is computed once per take
 * and only the moving marks are recomputed per frame, so the animation is not
 * rebuilding the whole path strings sixty times a second.
 *
 * Which channels a tier actually carries is not assumed: each cell is stamped
 * with the tier's own provenance, and a channel the tier does not record is
 * drawn as a labelled gap rather than as a curve the tier never measured.
 */
import { computed, onBeforeUnmount, onMounted, ref, shallowRef, watch } from 'vue'
import { COVER_MOMENT as M, type StreamState, type TierProvenance } from '@/data/cover'
import { useI18n } from '@/composables/useI18n'
import type { CoverReel, CoverTake } from '@/data/coverReels'

const props = defineProps<{
  take: CoverTake | null
  reel: CoverReel | null
  tier: TierProvenance
  loading: boolean
  failed: boolean
  /** Take pinned by a click; the stage stays on it when nothing is hovered. */
  pinned: boolean
}>()

const { t, isZh } = useI18n()

const HEADBAND_KEYS = ['left', 'right', 'bleft', 'bright'] as const
const WRIST_KEYS = ['wleft', 'wright'] as const
type ViewKey = (typeof HEADBAND_KEYS)[number] | (typeof WRIST_KEYS)[number]

/** Every view any tier carries, in draw order, so the row keeps its shape. */
const ALL_VIEW_KEYS: ViewKey[] = [...HEADBAND_KEYS, ...WRIST_KEYS]

/**
 * The views this take actually ships. L2 and L3 record both near-hand cameras;
 * L1 is head-mounted only, and a take that ships no wrist file hides its cell
 * rather than showing a view the capture never made.
 */
const viewKeys = computed<ViewKey[]>(() => {
  const allowed: ViewKey[] = props.tier.wrist ? ALL_VIEW_KEYS : [...HEADBAND_KEYS]
  const views = props.take?.views ?? {}
  return allowed.filter((k) => !props.take || !!views[k])
})

const playing = ref(true)
const elapsed = ref(0)
const videoEls = shallowRef<Record<string, HTMLVideoElement | null>>({})

/* ---------------- the clock ---------------- */

let raf = 0

function loop() {
  const master = videoEls.value.left
  if (master && !playing.value && master.readyState >= 2) elapsed.value = master.currentTime
  else if (master && master.readyState >= 2) elapsed.value = master.currentTime
  raf = requestAnimationFrame(loop)
}

function setPlaying(v: boolean) {
  playing.value = v
  for (const el of Object.values(videoEls.value)) {
    if (!el) continue
    if (v) void el.play().catch(() => {})
    else el.pause()
  }
}

function seek(seconds: number) {
  const total = props.take?.seconds ?? 16
  const s = Math.min(total, Math.max(0, seconds))
  elapsed.value = s
  for (const el of Object.values(videoEls.value)) if (el) el.currentTime = s
}

function onScrub(e: Event) {
  seek(Number((e.target as HTMLInputElement).value))
}

/**
 * Videos are re-bound when the take changes, so each element is started once as
 * soon as it can play. A plain assignment into a keyed record keeps the decode
 * listeners from accumulating across takes.
 */
function bindVideo(el: Element | { $el?: Element } | null, key: string) {
  const node = el ? ((('$el' in el ? el.$el : el) as HTMLVideoElement) ?? null) : null
  videoEls.value[key] = node
  if (!node) return
  node.addEventListener('canplay', () => {
    if (playing.value) void node.play().catch(() => {})
  })
  if (playing.value) void node.play().catch(() => {})
}

onMounted(() => { raf = requestAnimationFrame(loop) })
onBeforeUnmount(() => cancelAnimationFrame(raf))

/* A new take restarts both clocks together. */
watch(
  () => props.take?.id,
  () => {
    elapsed.value = 0
    videoEls.value = {}
  },
)

/* ---------------- the moment ---------------- */

const duration = computed(() => props.take?.seconds ?? 16)

const fraction = computed(() => Math.min(0.9999, Math.max(0, elapsed.value / duration.value)))
const pct = computed(() => fraction.value * 100)

/** Fractional key on the gaze/pose animation grid, and on the coarser glove grid. */
const keyAt = computed(() => {
  const n = props.reel?.keys ?? 0
  return n > 1 ? fraction.value * (n - 1) : 0
})
const gloveAt = computed(() => {
  const n = props.reel?.gloveKeys ?? 0
  return n > 1 ? fraction.value * (n - 1) : 0
})

function lerp(a: number, b: number, x: number) {
  return a + (b - a) * x
}

function lerpPair(a: readonly number[], b: readonly number[], x: number): [number, number] {
  return [lerp(a[0], b[0], x), lerp(a[1], b[1], x)]
}

function samplePairAt(arr: readonly (readonly number[])[], at: number): [number, number] {
  const i = Math.min(arr.length - 1, Math.max(0, Math.floor(at)))
  const j = Math.min(arr.length - 1, i + 1)
  return lerpPair(arr[i], arr[j] ?? arr[i], at - i)
}

const fmt = (pts: readonly (readonly number[])[], d = 2) =>
  pts.map((p, i) => `${i ? 'L' : 'M'}${p[0].toFixed(d)},${p[1].toFixed(d)}`).join('')

/* ---- gaze: the whole path, and where the eye is now ---- */

const GAZE_BOX = 100

/**
 * The path normalised into a 100 × 100 box. Computed once per take, because the
 * whole clip's path does not move with the playhead.
 */
const gazeGeom = computed(() => {
  const r = props.reel
  if (!r?.gaze) return null
  const { x, y } = r.gaze.extent
  const sx = x[1] - x[0] || 1
  const sy = y[1] - y[0] || 1
  const norm = (p: readonly number[]): [number, number] => [
    ((p[0] - x[0]) / sx) * GAZE_BOX,
    ((p[1] - y[0]) / sy) * GAZE_BOX,
  ]
  return { norm, pts: r.gaze.path.map(norm), d: fmt(r.gaze.path.map(norm)) }
})

/** The eye at the playhead, plus the last stretch of its own trail. */
const gazeNow = computed(() => {
  const g = gazeGeom.value
  if (!g || !props.reel?.gaze) return null
  const at = keyAt.value
  const i = Math.min(g.pts.length - 1, Math.max(0, Math.floor(at)))
  const j = Math.min(g.pts.length - 1, i + 1)
  return {
    now: lerpPair(g.pts[i], g.pts[j] ?? g.pts[i], at - i),
    trail: fmt(g.pts.slice(Math.max(0, i - 12), i + 1)),
  }
})

/* ---- pose: all three rigs in one plane, at one scale ---- */

const POSE_W = 100
const POSE_H = 44

const RIG_COLOR: Record<'head' | 'left' | 'right', string> = {
  head: 'var(--c-blue)',
  left: 'var(--c-teal)',
  right: 'var(--c-violet)',
}

/** One projection for all three rigs, and their whole tracks, once per take. */
const poseGeom = computed(() => {
  const pose = props.reel?.pose
  if (!pose) return null
  const { x, z } = pose.extent
  const w = Math.max(1e-9, x[1] - x[0])
  const h = Math.max(1e-9, z[1] - z[0])
  const box = Math.max(w, h * (POSE_W / POSE_H)) * 1.12
  const cx = (x[0] + x[1]) / 2
  const cz = (z[0] + z[1]) / 2
  const scale = POSE_W / box
  const project = (px: number, pz: number): [number, number] => [
    POSE_W / 2 + (px - cx) * scale,
    POSE_H / 2 - (pz - cz) * scale,
  ]
  return (['head', 'left', 'right'] as const).map((id) => {
    const track = pose.tracks[id]
    return {
      id,
      color: RIG_COLOR[id],
      track,
      project,
      d: fmt(track.map((p) => project(p[0], p[1]))),
    }
  })
})

/** Where each rig is now. */
const poseNow = computed(() => {
  const g = poseGeom.value
  if (!g) return []
  return g.map((r) => ({
    id: r.id,
    color: r.color,
    now: r.project(...samplePairAt(r.track, keyAt.value)),
  }))
})

/* ---- fingers: the two hands side by side, each fingertip with its own trail ---- */

const FINGER_CHAINS = [
  [0, 1, 2, 3, 4], [5, 6, 7, 8, 9], [10, 11, 12, 13, 14], [15, 16, 17, 18, 19], [20, 21, 22, 23, 24],
]
const PALM = [0, 5, 10, 15, 20]
const TIPS = [4, 9, 14, 19, 24]
const BLOCKS = [0, 25] as const

/**
 * One view box per hand, both at the same scale.
 *
 * The two 25-node blocks are two hands, and drawing them in one box overlaps
 * them at the wrist and at the fingertips. Each hand gets its own centre, and a
 * single side length taken from the larger of the two, so the pair reads as two
 * hands at one scale rather than as one tangle.
 */
const handViews = computed(() => {
  const g = props.reel?.glove
  if (!g?.keys.length) return null
  const boxes = BLOCKS.map((base) => {
    let x0 = Infinity, x1 = -Infinity, y0 = Infinity, y1 = -Infinity
    for (const key of g.keys) {
      for (let k = base; k < base + 25; k++) {
        const p = key[k]
        if (!p) continue
        if (p[0] < x0) x0 = p[0]
        if (p[0] > x1) x1 = p[0]
        if (p[1] < y0) y0 = p[1]
        if (p[1] > y1) y1 = p[1]
      }
    }
    return { cx: (x0 + x1) / 2, cy: (y0 + y1) / 2, w: x1 - x0, h: y1 - y0 }
  })
  const side = Math.max(1e-6, ...boxes.map((b) => Math.max(b.w, b.h))) * 1.16
  return boxes.map((b) => ({
    cx: b.cx,
    cy: b.cy,
    view: `${(b.cx - side / 2).toFixed(4)} ${(b.cy - side / 2).toFixed(4)} ${side.toFixed(4)} ${side.toFixed(4)}`,
  }))
})

/**
 * Both hands at the playhead, with each fingertip's last stretch behind it,
 * each carrying its own view box. Every stroke is non-scaling: the box is a few
 * tenths of a metre across, so a user-unit stroke would be wider than the hand.
 */
const fingersNow = computed(() => {
  const g = props.reel?.glove
  const views = handViews.value
  if (!g || !views) return null
  const keys = g.keys
  const at = gloveAt.value
  const i = Math.min(keys.length - 1, Math.max(0, Math.floor(at)))
  const j = Math.min(keys.length - 1, i + 1)
  const x = at - i
  const nodes = keys[i].map((p, k) => lerpPair(p, keys[j][k] ?? p, x))
  const back = Math.max(0, i - 8)
  return BLOCKS.map((base, b) => ({
    base,
    view: views[b].view,
    bones: FINGER_CHAINS.map((chain) => fmt(chain.map((k) => nodes[base + k]).filter(Boolean), 4)),
    palm: `${fmt(PALM.map((k) => nodes[base + k]).filter(Boolean), 4)}Z`,
    trails: TIPS.map((tip) =>
      fmt(keys.slice(back, i + 1).map((key) => key[base + tip]).filter(Boolean), 4),
    ),
  }))
})

/* ---- EMG / EEG: every channel, one lane each ---- */

const LANE_H = 11

const peak = (series: number[]) => series.reduce((m, v) => Math.max(m, Math.abs(v)), 0)

/** Median of a trace, used to put each lane on its own zero before drawing. */
function median(series: number[]): number {
  if (!series.length) return 0
  const sorted = [...series].sort((a, b) => a - b)
  const mid = sorted.length >> 1
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2
}

/**
 * One polyline per channel in a 100-wide box, all lanes on one shared scale.
 *
 * Each lane is drawn around its own median: the amplifier offset is not signal,
 * and without removing it a channel with a large offset spends its whole lane
 * on a flat line. What remains is the fluctuation, and the lanes still share
 * one scale, so the spread between the loudest and quietest channel is read as
 * height rather than only stated.
 */
function stack(series: number[][]) {
  const centred = series.map((s) => {
    const m = median(s)
    return s.map((v) => v - m)
  })
  const hi = Math.max(1e-6, ...centred.map(peak))
  const amp = (LANE_H / 2) * 0.86
  const lanes = centred.map((s, lane) => {
    const mid = lane * LANE_H + LANE_H / 2
    const n = s.length
    return s
      .map((v, k) => {
        const x = (k / (n - 1)) * 100
        const y = mid - (v / hi) * amp
        return `${k ? 'L' : 'M'}${x.toFixed(2)},${y.toFixed(2)}`
      })
      .join('')
  })
  return { h: series.length * LANE_H, lanes }
}

const emg = computed(() => (props.reel?.emg ? stack(props.reel.emg.series) : null))
const eeg = computed(() => (props.reel?.eeg ? stack(props.reel.eeg.series) : null))

/* ---------------- the stream cells ---------------- */

const channelKeys = ['gaze', 'pose', 'glove', 'emg', 'eeg'] as const
type ChannelKey = (typeof channelKeys)[number]

function stateOf(key: ChannelKey): StreamState {
  return props.tier.streams[key]
}

/** Whether the fetched take carries this stream. A tier that ships none draws gaps. */
function hasStream(key: ChannelKey): boolean {
  return props.reel?.streams?.includes(key) ?? false
}

function rateText(key: ChannelKey): string {
  const r = props.reel?.rates?.[key]
  if (!r) return ''
  if (key === 'emg' || key === 'eeg') return `${r.releasedFps} Hz`
  const rel = `${r.releasedFps} fps`
  return r.nativeHz && r.nativeHz !== r.releasedFps ? `${Math.round(r.nativeHz)} → ${rel}` : rel
}
</script>

<template>
  <div class="mo" :class="{ 'mo--idle': !take }">
    <!-- header: which take, at which tier, on which transport -->
    <header class="mo__head">
      <div class="mo__id">
        <span class="mo__tier mono">{{ tier.id }}</span>
        <span v-if="take" class="mo__scene mono">{{ t(take.scene) }}</span>
        <p class="mo__title" :title="take ? (isZh ? take.title.zh : take.title.en) : ''">
          {{ take ? (isZh ? take.title.zh : take.title.en) : t(M.selectPrompt) }}
        </p>
      </div>

      <div class="mo__transport">
        <button
          class="mo__play"
          type="button"
          :disabled="!take"
          :aria-label="playing ? t(M.pause) : t(M.play)"
          @click="setPlaying(!playing)"
        >
          <span aria-hidden="true">{{ playing ? '❚❚' : '▶' }}</span>
        </button>
        <input
          class="mo__scrub"
          type="range"
          min="0"
          :max="duration"
          step="0.02"
          :value="elapsed"
          :disabled="!take"
          :aria-label="t(M.timeline)"
          @input="onScrub"
        />
        <span class="mo__time mono">
          {{ elapsed.toFixed(2) }}<span class="mo__slash">/</span>{{ duration.toFixed(0) }}s
        </span>
        <span v-if="pinned" class="mo__pin mono">{{ t(M.pinned) }}</span>
      </div>
    </header>

    <!-- band 1 · the footage: the headband views and, where the tier carries
         them, the two near-hand wrist views — all on one clock. A take that is
         still loading overlays its chip here rather than inserting a bar above,
         so switching takes never reflows the bands below. -->
    <section class="band">
      <div class="band__gutter">
        <span class="band__name mono">{{ t(M.viewsBand) }}</span>
        <span class="band__sub mono">{{ viewKeys.length }}×</span>
      </div>
      <div class="band__body">
        <div class="views">
          <span
            v-if="loading || failed"
            class="mo__state views__state mono"
            :class="{ 'mo__state--err': failed }"
          >{{ failed ? t(M.loadError) : t(M.loading) }}</span>
          <figure v-for="k in ALL_VIEW_KEYS" :key="k" class="view">
            <div v-if="viewKeys.includes(k)" class="view__frame">
              <video
                :ref="(el) => bindVideo(el as Element | null, k)"
                :src="take ? `real/${take.views[k]}` : undefined"
                :poster="take ? `real/${take.poster}` : undefined"
                muted
                loop
                playsinline
                preload="metadata"
              />
            </div>
            <div v-else class="view__frame view__frame--gap mono">{{ t(M.state.absent) }}</div>
            <figcaption class="view__cap mono">{{ t(M.views[k]) }}</figcaption>
          </figure>
        </div>
      </div>
    </section>

    <!-- band 2 · the channels: five streams from the same samples -->
    <section class="band">
      <div class="band__gutter">
        <span class="band__name mono">{{ t(M.channelsBand) }}</span>
        <span class="band__sub mono">5×</span>
      </div>
      <div class="band__body">
        <div class="chans">
          <figure
            v-for="key in channelKeys"
            :key="key"
            class="cell"
            :class="`cell--${stateOf(key)}`"
          >
            <figcaption class="cell__head">
              <span class="cell__name mono">{{ t(M.streams[key]) }}</span>
              <span class="cell__rate mono">{{ rateText(key) }}</span>
            </figcaption>
            <span class="cell__chip mono" :class="`cell__chip--${stateOf(key)}`">
              {{ t(M.state[stateOf(key)]) }}
            </span>

            <!-- a channel the tier does not carry is said so, not drawn; a
                 channel that has not landed yet is a gap, not a blank plot -->
            <template v-if="stateOf(key) === 'absent'">
              <div class="cell__gap mono">{{ t(M.state.absent) }}</div>
            </template>
            <template v-else-if="stateOf(key) === 'estimated' && !hasStream(key)">
              <div class="cell__gap mono">{{ t(M.estimatedGap) }}</div>
            </template>
            <template v-else-if="!hasStream(key)">
              <div class="cell__gap mono">{{ loading ? t(M.loading) : t(M.notRecorded) }}</div>
            </template>

            <!-- gaze: the whole path faintly, the eye marked now -->
            <div v-else-if="key === 'gaze'" class="plot">
              <svg v-if="gazeGeom" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
                <rect class="az" x="0.4" y="0.4" width="99.2" height="99.2" />
                <path class="az-path" :d="gazeGeom.d" />
                <template v-if="gazeNow">
                  <path class="az-trail" :d="gazeNow.trail" />
                  <line
                    class="az-cross"
                    :x1="gazeNow.now[0] - 6" :x2="gazeNow.now[0] + 6"
                    :y1="gazeNow.now[1]" :y2="gazeNow.now[1]"
                  />
                  <line
                    class="az-cross"
                    :x1="gazeNow.now[0]" :x2="gazeNow.now[0]"
                    :y1="gazeNow.now[1] - 6" :y2="gazeNow.now[1] + 6"
                  />
                  <circle class="az-dot" :cx="gazeNow.now[0]" :cy="gazeNow.now[1]" r="2.2" />
                </template>
              </svg>
              <span class="plot__rule" :style="{ left: `${pct}%` }" />
            </div>

            <!-- pose: three rigs in one plane, one scale, moving dots -->
            <div v-else-if="key === 'pose'" class="plot">
              <svg viewBox="0 0 100 44" preserveAspectRatio="none" aria-hidden="true">
                <path v-for="p in poseGeom ?? []" :key="`t-${p.id}`" class="az-track" :d="p.d" :stroke="p.color" />
                <circle
                  v-for="p in poseNow" :key="`n-${p.id}`"
                  :cx="p.now[0]" :cy="p.now[1]" r="1.7" :fill="p.color"
                />
              </svg>
              <span class="plot__rule" :style="{ left: `${pct}%` }" />
              <ul class="legend mono">
                <li v-for="p in poseGeom ?? []" :key="p.id">
                  <span class="legend__sw" :style="{ background: p.color }" />{{ p.id }}
                </li>
              </ul>
            </div>

            <!-- fingers: the two hands at the mark, side by side, each with its trail -->
            <div v-else-if="key === 'glove'" class="plot plot--hands">
              <figure v-for="(hand, i) in fingersNow ?? []" :key="hand.base" class="hand">
                <svg :viewBox="hand.view" preserveAspectRatio="xMidYMid meet" aria-hidden="true">
                  <path v-for="(tr, n) in hand.trails" :key="`tr-${n}`" class="az-tip" :d="tr" />
                  <path class="az-palm" :d="hand.palm" />
                  <path v-for="(bone, n) in hand.bones" :key="`b-${n}`" class="az-bone" :d="bone" />
                </svg>
                <figcaption class="hand__cap mono">{{ i === 0 ? 'L' : 'R' }}</figcaption>
              </figure>
              <span class="plot__rule" :style="{ left: `${pct}%` }" />
            </div>

            <!-- EMG / EEG: every channel, one lane each, one shared scale -->
            <div v-else class="plot">
              <svg
                v-if="(key === 'emg' ? emg : eeg)"
                :viewBox="`0 0 100 ${(key === 'emg' ? emg : eeg)?.h}`"
                preserveAspectRatio="none"
                aria-hidden="true"
              >
                <line
                  v-if="key === 'emg' && reel?.emg"
                  class="az-split"
                  x1="0" x2="100"
                  :y1="reel.emg.leftChannels * LANE_H"
                  :y2="reel.emg.leftChannels * LANE_H"
                />
                <path
                  v-for="(l, i) in ((key === 'emg' ? emg : eeg)?.lanes ?? [])"
                  :key="i"
                  class="az-lane"
                  :d="l"
                  :stroke="key === 'emg' ? 'var(--c-rose)' : 'var(--c-violet)'"
                />
              </svg>
              <span class="plot__rule" :style="{ left: `${pct}%` }" />
            </div>
          </figure>
        </div>
      </div>
    </section>

  </div>
</template>

<style scoped>
.mono { font-family: var(--ff-mono); }

/**
 * One fixed plot height for every channel cell and for the absent gap, so a row
 * is the same height whether a channel is drawn or not — otherwise moving from
 * L3 to L1 would resize the whole figure.
 */
.mo { --plot-h: 4.1rem; display: grid; gap: 0.3rem; }
.mo--idle .band { opacity: 0.55; }

/* ---- header ---- */
.mo__head {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.35rem 0.8rem;
  padding-bottom: 0.4rem;
  border-bottom: 1px solid var(--line);
}
.mo__id { display: flex; align-items: baseline; gap: 0.45rem; min-width: 0; flex: 1 1 15rem; }
.mo__tier {
  flex: none;
  padding: 0;
  background: transparent;
  color: var(--c-violet);
  font-size: var(--fs-tick);
  font-weight: 700;
  letter-spacing: 0.12em;
}
.mo__scene {
  flex: none;
  font-size: var(--fs-mark);
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: var(--ink-mute);
}
.mo__title {
  margin: 0;
  font-size: var(--fs-small);
  font-weight: 600;
  color: var(--ink);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.mo__transport { display: flex; align-items: center; gap: 0.5rem; flex: 1 1 13rem; min-width: 9rem; }
.mo__play {
  flex: none; width: 1.6rem; height: 1.6rem; display: grid; place-items: center;
  border: 1px solid var(--line-strong); border-radius: 50%;
  background: transparent; color: var(--ink-soft);
  font-size: var(--fs-mark); line-height: 1; cursor: pointer;
  transition: background var(--dur-1) var(--ease), border-color var(--dur-1) var(--ease);
}
.mo__play:hover:not(:disabled) { background: var(--t-blue); border-color: var(--c-blue); color: var(--c-blue); }
.mo__play:disabled { opacity: 0.4; cursor: default; }
.mo__scrub {
  flex: 1 1 5rem; min-width: 0; appearance: none; height: 4px;
  border-radius: var(--r-pill); background: var(--line); cursor: pointer;
}
.mo__scrub::-webkit-slider-thumb {
  appearance: none; width: 12px; height: 12px; border-radius: 50%;
  background: var(--c-blue); border: 2px solid var(--surface);
}
.mo__scrub::-moz-range-thumb { width: 12px; height: 12px; border-radius: 50%; background: var(--ink-soft); border: 2px solid var(--ink); }
.mo__time { flex: none; font-size: var(--fs-tick); color: var(--ink-soft); font-variant-numeric: tabular-nums; white-space: nowrap; }
.mo__slash { color: rgba(220, 234, 243, 0.4); margin-inline: 0.2em; }
.mo__pin {
  flex: none;
  padding: 0.02rem 0.3rem;
  border-radius: var(--r-xs);
  background: rgba(95, 199, 187, 0.2);
  color: var(--c-teal);
  font-size: var(--fs-mark);
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

/* Loading lives inside the bands, never between them: the chip overlays the
   footage and the annotation's empty state names it, so nothing appears or
   disappears above the bands while a take is switching. */
.mo__state {
  margin: 0;
  font-size: var(--fs-micro);
  letter-spacing: 0.06em;
  color: var(--ink-mute);
}
.mo__state--err { color: var(--c-rose); }

/* ---- band: a label gutter, then the row ---- */
.band { display: grid; grid-template-columns: 5.4rem minmax(0, 1fr); gap: 0.5rem; align-items: start; }
/* Bands are separated by a rule, not by a box. */
.band + .band { border-top: 1px solid var(--line); padding-top: 0.75rem; margin-top: 0.35rem; }
@media (max-width: 640px) { .band { grid-template-columns: minmax(0, 1fr); gap: 0.25rem; } }
.band__gutter { display: grid; gap: 0.05rem; align-content: start; }
.band__name {
  font-size: var(--fs-tick); letter-spacing: 0.12em; text-transform: uppercase; color: var(--ink-soft);
  line-height: 1.3;
}
.band__sub { font-size: var(--fs-mark); color: var(--ink-mute); }
.band__body { min-width: 0; }

/* ---- band 1: six views — four headband, two near-hand ---- */
.views { position: relative; display: grid; grid-template-columns: repeat(6, minmax(0, 1fr)); gap: 0.3rem; }
/* Centred over the footage grid, on its own opaque ground like every other
   overlay label, so it reads over arbitrary frames. */
.views__state {
  position: absolute;
  left: 50%;
  top: 50%;
  transform: translate(-50%, -50%);
  z-index: 1;
  padding: 0.28rem 0.7rem;
  border-radius: var(--r-xs);
  background: rgba(4, 13, 20, 0.88);
  border: 1px solid rgba(27, 34, 29, 0.2);
}
@media (max-width: 1080px) { .views { grid-template-columns: repeat(3, minmax(0, 1fr)); } }
@media (max-width: 560px) { .views { grid-template-columns: repeat(2, minmax(0, 1fr)); } }
.view { margin: 0; min-width: 0; }
.view__frame {
  border-radius: 8px;
  overflow: hidden;
  aspect-ratio: 4 / 3;
  background: var(--night-2);
}
/* A tier without wrist cameras shows the slot as absent rather than dropping
   it, so the row keeps its width and the figure keeps its height. */
.view__frame--gap {
  display: grid; place-items: center;
  aspect-ratio: 4 / 3;
  font-size: var(--fs-mark); color: var(--ink-mute); text-align: center;
  background: transparent;
  border-top: 1px solid var(--line);
  background: rgba(27, 34, 29, 0.02);
}
.view__frame video { display: block; width: 100%; height: 100%; object-fit: cover; }
.view__cap {
  display: block; text-align: center; font-size: var(--fs-mark); color: var(--ink-mute);
  white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
}

/* ---- band 2: five channel cells, all one height ---- */
.chans { display: grid; grid-template-columns: repeat(5, minmax(0, 1fr)); gap: 0.35rem; }
@media (max-width: 1080px) { .chans { grid-template-columns: repeat(3, minmax(0, 1fr)); } }
@media (max-width: 640px) { .chans { grid-template-columns: repeat(2, minmax(0, 1fr)); } }
.cell {
  margin: 0; min-width: 0;
  display: grid;
  /* The plot row is a fixed height rather than `1fr`: a drawn cell and an
     absent gap then resolve to the same box, so a row does not change height
     as tiers change what they carry. */
  grid-template-rows: auto auto var(--plot-h);
  gap: 0.15rem;
  padding: 0.28rem 0.32rem 0.32rem;
  border: 1px solid var(--line); border-radius: var(--r-sm);
  background: rgba(27, 34, 29, 0.03);
}
.cell--absent { opacity: 0.9; }
.cell--estimated { border-color: var(--line-strong); }
.cell__head { display: flex; align-items: baseline; gap: 0.3rem; min-width: 0; }
.cell__name { font-size: var(--fs-mark); letter-spacing: 0.1em; text-transform: uppercase; color: var(--ink-soft); }
.cell__rate {
  margin-left: auto; font-size: var(--fs-mark); color: var(--ink-mute);
  white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
}
.cell__chip {
  justify-self: start;
  font-size: var(--fs-mark); letter-spacing: 0.06em; padding: 0 0.25rem;
  border-radius: var(--r-xs); text-transform: uppercase;
}
.cell__chip--measured { background: var(--t-blue); color: var(--c-blue); }
.cell__chip--estimated { background: var(--t-amber); color: var(--c-amber); }
.cell__chip--absent { background: var(--surface-2); color: var(--ink-mute); }
.cell__gap {
  display: grid; place-items: center;
  height: var(--plot-h);
  font-size: var(--fs-mark); color: var(--ink-mute); text-align: center;
  border-top: 1px solid var(--line);
}

.plot { position: relative; min-width: 0; height: var(--plot-h); }
.plot svg {
  display: block; width: 100%; height: 100%;
  background: transparent; border-radius: 6px;
}
/* The fingers cell carries two hands at one scale; each gets its own panel and
   its own view box, so the wrists and fingertips no longer overlap. */
.plot--hands { display: grid; grid-template-columns: 1fr 1fr; gap: 0.25rem; }
.plot--hands .hand { position: relative; margin: 0; min-width: 0; height: 100%; }
.hand__cap {
  position: absolute; right: 0.16rem; bottom: 0.02rem;
  font-size: var(--fs-mark); letter-spacing: 0.08em; color: var(--ink-mute);
  pointer-events: none;
}
.plot__rule {
  position: absolute; top: 0; height: 100%; width: 1px;
  background: linear-gradient(180deg, transparent, rgba(27, 34, 29, 0.42) 12%, rgba(27, 34, 29, 0.42) 88%, transparent);
  pointer-events: none;
}

/* Every stroke here is non-scaling: the glove's viewBox is a few tenths of a
   metre across, so a user-unit stroke would be wider than the hand. */
.az { fill: none; stroke: var(--line); stroke-width: 1; vector-effect: non-scaling-stroke; }
.az-path { fill: none; stroke: var(--c-teal); stroke-width: 0.7; opacity: 0.32; vector-effect: non-scaling-stroke; stroke-linejoin: round; }
.az-trail { fill: none; stroke: var(--c-teal); stroke-width: 1.4; opacity: 0.85; vector-effect: non-scaling-stroke; stroke-linejoin: round; }
.az-cross { stroke: var(--c-teal); stroke-width: 1; vector-effect: non-scaling-stroke; }
.az-dot { fill: var(--c-teal); }
.az-track { fill: none; stroke-width: 1.1; opacity: 0.6; vector-effect: non-scaling-stroke; stroke-linejoin: round; }
.az-tip { fill: none; stroke: var(--c-amber); stroke-width: 0.8; opacity: 0.34; vector-effect: non-scaling-stroke; stroke-linejoin: round; }
.az-palm { fill: rgba(138, 95, 69, 0.14); stroke: var(--c-amber); stroke-width: 1; vector-effect: non-scaling-stroke; }
.az-bone { fill: none; stroke: var(--c-amber); stroke-width: 1.2; vector-effect: non-scaling-stroke; stroke-linejoin: round; }
.az-split { stroke: rgba(27, 34, 29, 0.20); stroke-width: 1; vector-effect: non-scaling-stroke; }
.az-lane { fill: none; stroke-width: 0.8; vector-effect: non-scaling-stroke; stroke-linejoin: round; }

/* The rig key sits over the drawing rather than under it, so the pose cell is
   the same height as the other four. */
.legend {
  list-style: none; margin: 0; padding: 0;
  position: absolute; left: 0.28rem; bottom: 0.18rem;
  display: grid; grid-auto-flow: column; gap: 0.45rem;
  pointer-events: none;
}
.legend li { display: inline-flex; align-items: center; gap: 0.22rem; font-size: var(--fs-mark); color: var(--ink-soft); }
.legend__sw { width: 6px; height: 2px; border-radius: 1px; }

/* ---- band 3: the annotation — the live step, then its objects on one card
   each. No scrollbox: the band shows the moment the playhead sits on, so the
   height is fixed and nothing is hidden below a fold inside the panel. ---- */
.ann {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(0, 1.3fr);
  gap: 0.15rem 0.9rem;
  align-items: start;
  height: 8.4rem;
}
@media (max-width: 900px) { .ann { grid-template-columns: minmax(0, 1fr); height: auto; } }

.ann__mid { min-width: 0; }
.ann__step { display: flex; align-items: baseline; gap: 0.45rem; margin: 0 0 0.3rem; }
.ann__n {
  font-size: var(--fs-small); font-weight: 700; color: var(--c-teal);
  letter-spacing: 0.06em; font-variant-numeric: tabular-nums;
}
.ann__time { font-size: var(--fs-mark); color: var(--ink-mute); font-variant-numeric: tabular-nums; }
.ann__text { margin: 0 0 0.45rem; font-size: var(--fs-small); font-weight: 550; color: var(--ink); line-height: 1.4; }
.ann__hand { display: flex; flex-wrap: wrap; align-items: baseline; gap: 0.45rem; margin: 0; }
.ann__handlabel {
  font-size: var(--fs-mark); letter-spacing: 0.06em; text-transform: uppercase; color: var(--ink-mute);
}
.attrs__strong { font-size: var(--fs-small); font-weight: 600; color: var(--ink); }
.attrs__strong--left { color: var(--c-teal); }
.attrs__strong--right { color: var(--c-violet); }
.attrs__strong--both { color: var(--c-amber); }
.attrs__ev { font-size: var(--fs-mark); color: var(--ink-mute); font-variant-numeric: tabular-nums; }

.ann__objs { min-width: 0; }
.ann__label {
  display: flex; align-items: baseline; gap: 0.35rem;
  margin: 0 0 0.3rem;
  font-size: var(--fs-mark); letter-spacing: 0.1em; text-transform: uppercase; color: var(--ink-mute);
}
.ann__count { color: var(--ink-soft); }
.ann__empty { margin: 0; font-size: var(--fs-micro); color: var(--ink-mute); }
.ann__empty--err { color: var(--c-rose); }

/* One row per object: swatch, name, then the attributes as one line of text. */
.objs { list-style: none; margin: 0; padding: 0; display: grid; gap: 0.2rem; }
.obj {
  display: flex; flex-wrap: wrap; align-items: baseline; gap: 0.15rem 0.45rem;
  padding: 0.24rem 0.4rem;
  border: 1px solid var(--line); border-radius: var(--r-xs);
  background: rgba(255, 255, 255, 0.035);
}
.obj--group { border-style: dashed; background: rgba(27, 34, 29, 0.02); }
.obj__sw { flex: none; width: 0.62rem; height: 0.62rem; border-radius: var(--r-xs); border: 1px solid rgba(255, 255, 255, 0.3); }
.obj__sw--sm { width: 0.46rem; height: 0.46rem; }
.obj__sw--none {
  background-image: linear-gradient(45deg, rgba(255, 255, 255, 0.28) 25%, transparent 25% 75%, rgba(255, 255, 255, 0.28) 75%);
  background-size: 5px 5px;
}
.obj__name { font-size: var(--fs-micro); font-weight: 600; color: var(--ink); }
.obj__spec { font-size: var(--fs-mark); color: var(--ink-soft); }
.obj__spec--dim { color: var(--ink-mute); }

@media (prefers-reduced-motion: reduce) { .mo__play { transition: none; } }
</style>
