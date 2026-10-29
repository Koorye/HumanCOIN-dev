/**
 * Deriving one moment's annotation from real data.
 *
 * The release carries two things at this level: the capture's own step
 * sentences (explicitly untimed) and the wrist-tracker tracks. Nothing labels a
 * hand, so the hand in use is *measured*: within a step's window we take how far
 * each wrist travels, which separates a working hand from a resting one without
 * needing a labelled example.
 *
 * Position units are the tracker's own and undocumented, but the comparison is
 * between the two wrist tracks inside the same window, so it is unit-free.
 */

import type {
  SampleFrame,
  SceneObject,
  AnnotatedStep,
  RecordingSample,
} from './recordings'

export type HandId = 'left' | 'right' | 'both' | 'none'

/** Diagonal of a wrist track's bounding box over a window. */
function extent(points: [number, number, number][]): number {
  if (points.length < 2) return 0
  let minX = Infinity, minY = Infinity, minZ = Infinity
  let maxX = -Infinity, maxY = -Infinity, maxZ = -Infinity
  for (const [x, y, z] of points) {
    if (x < minX) minX = x
    if (y < minY) minY = y
    if (z < minZ) minZ = z
    if (x > maxX) maxX = x
    if (y > maxY) maxY = y
    if (z > maxZ) maxZ = z
  }
  return Math.hypot(maxX - minX, maxY - minY, maxZ - minZ)
}

/* Thresholds fixed from the release itself. It is a two-decision rule: first
   whether either wrist moved at all, then whether one clearly out-travelled the
   other. Both boundaries sit in the gap between the still windows and the
   working ones rather than inside either cluster. */
const STILL = 0.012
const DOMINANT = 0.62

export interface HandReading {
  hand: HandId
  left: number
  right: number
}

/** Hand in use over `[start, end)` seconds, read from wrist travel. */
export function readHand(
  frames: SampleFrame[],
  start: number,
  end: number,
  fps: number,
): HandReading {
  const a = Math.max(0, Math.floor(start * fps))
  const b = Math.min(frames.length, Math.ceil(end * fps))
  const slice = frames.slice(a, b)
  const left = extent(slice.map((f) => f.poses.left?.position).filter(Boolean) as [number, number, number][])
  const right = extent(slice.map((f) => f.poses.right?.position).filter(Boolean) as [number, number, number][])
  const total = left + right
  let hand: HandId
  if (Math.max(left, right) < STILL) hand = 'none'
  else if (total <= 0) hand = 'none'
  else {
    const share = right / total
    hand = share >= DOMINANT ? 'right' : share <= 1 - DOMINANT ? 'left' : 'both'
  }
  return { hand, left, right }
}

export interface MomentObjects {
  /** Objects the step sentence names outright. */
  mentioned: SceneObject[]
  /** Objects reached only through a group noun, e.g. 饮品 → the 13 drinks placed. */
  grouped: { word: string; members: SceneObject[] }[]
}

/** Resolve a step's name references against the episode's own object table. */
export function resolveObjects(step: AnnotatedStep | null, objects: SceneObject[]): MomentObjects {
  if (!step) return { mentioned: [], grouped: [] }
  const byName = new Map(objects.map((o) => [o.name, o]))
  const pick = (names: string[]) => names.map((n) => byName.get(n)).filter(Boolean) as SceneObject[]
  return {
    mentioned: pick(step.mentions),
    grouped: step.groups
      .map((g) => ({ word: g.word, members: pick(g.members) }))
      .filter((g) => g.members.length > 0),
  }
}

/**
 * One stream's contribution to a moment.
 *
 * `rate` is the rate the release delivers this stream at, and `count` is what
 * falls inside the window, so the two always agree. `native` carries the
 * capture's own declared rate where metadata states one that differs — the pose,
 * gaze and glove tracks are captured at several hundred hertz and released on
 * the episode's frame grid, and quoting either number alone misleads.
 */
export interface StreamCoverage {
  id: 'rgb' | 'gaze' | 'pose' | 'glove' | 'emg' | 'eeg'
  /** Delivered rate: what this window's count is consistent with. */
  rate: number
  rateUnit: 'Hz' | 'fps'
  /** Capture-declared rate, when it differs from the delivered one. */
  native: number | null
  /** Samples inside the window, per channel. */
  count: number
  countUnit: 'frames' | 'samples'
  /** Channels, rigs or glove nodes carried, where the stream has them. */
  units: number | null
}

function countIn(times: number[], start: number, end: number): number {
  let n = 0
  for (const t of times) if (t >= start && t < end) n++
  return n
}

/** The six streams over `[start, end)`, with their rates and in-window counts. */
export function readStreams(
  sample: RecordingSample,
  start: number,
  end: number,
): StreamCoverage[] {
  const md = sample.metadata
  const frames = sample.frames
  const from = Math.max(0, start)
  const to = end > start ? end : start + 1 / Math.max(1, sample.fps)
  const times = frames.map((f) => f.timestamp)
  const windowFrames = countIn(times, from, to)
  const { eeg, leftEmg, rightEmg } = sample.waveforms

  /** A declared capture rate, only where it differs from what is delivered. */
  const declared = (key: string): number | null => {
    const n = md?.sources?.[key]?.nativeRateHz
    return n != null && Math.abs(n - sample.fps) > 0.05 ? n : null
  }

  return [
    {
      id: 'rgb',
      rate: sample.fps,
      rateUnit: 'fps',
      native: null,
      count: windowFrames,
      countUnit: 'frames',
      units: 4,
    },
    {
      id: 'gaze',
      rate: sample.fps,
      rateUnit: 'fps',
      native: declared('gaze'),
      count: windowFrames,
      countUnit: 'samples',
      units: null,
    },
    {
      id: 'pose',
      rate: sample.fps,
      rateUnit: 'fps',
      native: declared('head'),
      count: windowFrames,
      countUnit: 'samples',
      units: frames[0] ? Object.keys(frames[0].poses).length : null,
    },
    {
      id: 'glove',
      rate: sample.fps,
      rateUnit: 'fps',
      native: declared('skeleton'),
      count: windowFrames,
      countUnit: 'samples',
      units: frames[0]?.skeleton?.positions?.length ?? null,
    },
    {
      id: 'emg',
      rate: leftEmg.sampleRate,
      rateUnit: 'Hz',
      native: null,
      // Per channel, as on the plots: one window's worth of samples, not two.
      count: countIn(leftEmg.timestamps, from, to),
      countUnit: 'samples',
      units: leftEmg.channels.length + rightEmg.channels.length,
    },
    {
      id: 'eeg',
      rate: eeg.sampleRate,
      rateUnit: 'Hz',
      native: null,
      count: countIn(eeg.timestamps, from, to),
      countUnit: 'samples',
      units: eeg.channels.length,
    },
  ]
}
