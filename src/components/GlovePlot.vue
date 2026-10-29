<script setup lang="ts">
/**
 * Both glove blocks at the playhead, each drawn in its own frame.
 *
 * The release stores the glove as two 25-node blocks whose roots sit at the
 * origin, in coordinates the recording declares neither an origin nor an axis
 * convention for, and which it explicitly does not fuse to the VIVE world. So
 * this window does not try to place the hands in the scene — that is the 3D
 * view's job, and it has to assume a mount to do it. Here each block is drawn
 * in the glove's own coordinates, normalised over this clip's own extent, which
 * is the only reading the data supports on its own.
 *
 * Links follow node index order, because a hand needs lines to read as a hand.
 * The recording declares no topology, so the chains are a drawing convention
 * rather than a claim about which nodes are fingers — stated in the caption
 * rather than left for the reader to infer.
 *
 * The two blocks carry opposite handedness in their own axes (their palm
 * polygons wind opposite ways), so the across-finger axis of the second block
 * is mirrored and the two palms then read the same way up. That is a display
 * decision, not a handedness claim.
 *
 * The pale trace behind each fingertip is where that tip was over the last half
 * second; it is what carries the motion, since one frame of a glove is only a
 * pose.
 */
import { computed } from 'vue'
import { FINGER_CHAINS } from '@/data/handPose'
import type { SampleFrame } from '@/data/recordings'

const props = defineProps<{
  frames: SampleFrame[]
  /** Frame index the pose is read at. */
  index: number
  labelA: string
  labelB: string
}>()

/** Node offset of each 25-node block inside the frame's flat node list. */
const BLOCKS = [0, 25] as const
/** The five palm roots, in chain order, closing the palm outline. */
const PALM = [0, 5, 10, 15, 20]
/** Frames of fingertip history drawn behind the pose — about half a second. */
const TRAIL = 15

const mirror = (block: number) => (block === 0 ? 1 : -1)

/** Glove-local node → the plane the palm lies in, with +v drawn upwards. */
function xy(p: [number, number, number], block: number): [number, number] {
  return [p[0], -p[1] * mirror(block)]
}

function nodesAt(frame: SampleFrame | undefined, block: number) {
  const pos = frame?.skeleton?.positions
  if (!pos || pos.length < block + 25) return null
  return Array.from({ length: 25 }, (_, i) => xy(pos[block + i], block))
}

/**
 * One square box, in data units, that holds both blocks over the whole clip, so
 * the two hands share a scale and neither is quietly magnified to fill its
 * panel.
 */
const view = computed(() => {
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity
  for (const f of props.frames) {
    for (const b of BLOCKS) {
      const n = nodesAt(f, b)
      if (!n) continue
      for (const [u, v] of n) {
        if (u < x0) x0 = u
        if (u > x1) x1 = u
        if (v < y0) y0 = v
        if (v > y1) y1 = v
      }
    }
  }
  if (!Number.isFinite(x0)) return '0 0 1 1'
  const w = Math.max(1e-6, x1 - x0)
  const h = Math.max(1e-6, y1 - y0)
  const side = Math.max(w, h) * 1.24
  const cx = (x0 + x1) / 2
  const cy = (y0 + y1) / 2
  return `${cx - side / 2} ${cy - side / 2} ${side} ${side}`
})

interface Hand {
  block: number
  label: string
  bones: string[]
  palm: string
  joints: [number, number][]
  trail: string[]
  /** Fingertip reach from the palm root, relative to this clip's own maximum. */
  reach: number
}

function path(pts: [number, number][]): string {
  return pts.map(([x, y], i) => `${i ? 'L' : 'M'}${x.toFixed(4)},${y.toFixed(4)}`).join('')
}

/** Longest palm-root → fingertip distance anywhere in the clip, for one block. */
function reachMax(block: number): number {
  let m = 1e-9
  for (const f of props.frames) {
    const n = nodesAt(f, block)
    if (!n) continue
    for (const t of [4, 9, 14, 19, 24]) {
      const d = Math.hypot(n[t][0] - n[0][0], n[t][1] - n[0][1])
      if (d > m) m = d
    }
  }
  return m
}

const hands = computed<Hand[]>(() =>
  BLOCKS.map((block, k) => {
    const now = nodesAt(props.frames[props.index], block)
    const label = k === 0 ? props.labelA : props.labelB
    if (!now) return { block, label, bones: [], palm: '', joints: [], trail: [], reach: 0 }
    const max = reachMax(block)
    let reach = 0
    for (const t of [4, 9, 14, 19, 24]) {
      reach = Math.max(reach, Math.hypot(now[t][0] - now[0][0], now[t][1] - now[0][1]))
    }
    const tips = [4, 9, 14, 19, 24]
    const from = Math.max(0, props.index - TRAIL)
    return {
      block,
      label,
      bones: FINGER_CHAINS.map((chain) => path(chain.map((i) => now[i]))),
      palm: `${path(PALM.map((i) => now[i]))}Z`,
      joints: now.map(([x, y]) => [x, y] as [number, number]),
      trail: tips.map((t) => {
        const pts: [number, number][] = []
        for (let i = from; i <= props.index; i++) {
          const n = nodesAt(props.frames[i], block)
          if (n) pts.push(n[t])
        }
        return pts.length > 1 ? path(pts) : ''
      }),
      reach: max > 0 ? reach / max : 0,
    }
  }),
)
</script>

<template>
  <div class="gl">
    <figure v-for="h in hands" :key="h.block" class="gl__hand">
      <svg :viewBox="view" preserveAspectRatio="xMidYMid meet" aria-hidden="true">
        <!-- Where each fingertip has been over the last half second. -->
        <path v-for="(d, i) in h.trail" :key="`t-${i}`" v-show="d" class="gl__trail" :d="d" />
        <path class="gl__palm" :d="h.palm" />
        <path v-for="(d, i) in h.bones" :key="`b-${i}`" class="gl__bone" :d="d" />
        <circle
          v-for="([x, y], i) in h.joints"
          :key="`j-${i}`"
          class="gl__joint"
          :class="{ 'gl__joint--root': i === 0 }"
          :cx="x"
          :cy="y"
          r="0.004"
          vector-effect="non-scaling-stroke"
        />
      </svg>
      <figcaption class="gl__cap">
        <span class="gl__name mono">{{ h.label }}</span>
        <span class="gl__reach mono">{{ (h.reach * 100).toFixed(0) }}%</span>
      </figcaption>
    </figure>
  </div>
</template>

<style scoped>
.mono { font-family: var(--ff-mono); }

.gl { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 0.5rem; }

.gl__hand { margin: 0; display: grid; gap: 0.15rem; min-width: 0; }
.gl__hand svg {
  display: block;
  width: 100%;
  aspect-ratio: 4 / 3;
  background: var(--surface);
  border: 1px solid var(--line);
  border-radius: var(--r-xs);
}

.gl__trail {
  fill: none;
  stroke: var(--c-violet);
  stroke-width: 0.8;
  opacity: 0.28;
  vector-effect: non-scaling-stroke;
  stroke-linecap: round;
  stroke-linejoin: round;
}
.gl__palm { fill: var(--t-violet); stroke: var(--c-violet); stroke-width: 1; opacity: 0.55; }
.gl__bone {
  fill: none;
  stroke: var(--c-violet);
  stroke-width: 1.3;
  stroke-linecap: round;
  stroke-linejoin: round;
}
.gl__joint { fill: var(--paper); stroke: var(--c-violet); stroke-width: 0.9; }
.gl__joint--root { fill: var(--c-violet); }

.gl__cap { display: flex; align-items: baseline; justify-content: space-between; gap: 0.4rem; }
.gl__name {
  font-size: var(--fs-mark);
  letter-spacing: 0.04em;
  color: var(--ink-soft);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.gl__reach { font-size: var(--fs-mark); color: var(--ink-mute); font-variant-numeric: tabular-nums; }
</style>
