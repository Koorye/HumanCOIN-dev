/**
 * A live read of one released episode at one frame.
 *
 * The format figure beside this describes what a query *would* return; this
 * module computes what it actually does, from the released `sample.json`. Every
 * row count is counted off the episode's own timestamps, so the windowed
 * streams report the row counts this capture really produces — including the
 * frames where a window returns nothing at all.
 *
 * Nothing here is derived from a rate that was typed in: a stream's rate is the
 * one the capture declares in its own metadata, and its values are the values
 * the file holds, in the capture's own undeclared units.
 */
import { ANNOTATION, type Bi } from '@/content'
import type { RecordingSample, Waveform } from './recordings'

export type ReadMode = 'nearest' | 'window' | 'video'
export type WaveName = 'eeg' | 'leftEmg' | 'rightEmg'

export interface ReadRow {
  /** Feature key as the read-out labels it. */
  key: string
  label: Bi
  mode: ReadMode
  /** Declared rate for this stream, Hz. */
  hz: number
  /** Shape of what the query returns for this feature. */
  shape: string
  /** Rows the query returns at this frame. */
  rows: number
  /**
   * Every returned row's offset from the frame, in milliseconds. Only windowed
   * streams carry more than one, and only they can report a negative offset.
   */
  offsetsMs: number[]
  /** Platform name of the stream, for the plots that draw it. */
  wave?: WaveName
}

export interface Readout {
  /** Episode-relative timestamp of the frame, seconds. */
  timestamp: number
  /** Same instant on the capture clock, seconds. */
  sourceTimestamp: number
  frameIndex: number
  rows: ReadRow[]
}

export const POSE_LABELS: Record<string, Bi> = {
  head: { en: 'Head pose', zh: '头部位姿' },
  left: { en: 'Left wrist pose', zh: '左腕位姿' },
  right: { en: 'Right wrist pose', zh: '右腕位姿' },
}

export const WAVE_LABELS: Record<WaveName, Bi> = {
  eeg: { en: 'EEG', zh: '脑电' },
  leftEmg: { en: 'EMG · left wrist', zh: '肌电 · 左腕' },
  rightEmg: { en: 'EMG · right wrist', zh: '肌电 · 右腕' },
}

/** The four head-mounted views, in the order the viewer lists them. */
export const VIEW_KEYS = ['left', 'right', 'bleft', 'bright'] as const
export type ViewKey = (typeof VIEW_KEYS)[number]
export const VIEW_LABELS: Record<ViewKey, Bi> = {
  left: ANNOTATION.viewLeft,
  right: ANNOTATION.viewRight,
  bleft: ANNOTATION.viewBackLeft,
  bright: ANNOTATION.viewBackRight,
}

/** Indices of the samples a window of one master frame returns at time `t`. */
export function windowHits(wave: Waveform, t: number, fps: number): number[] {
  const lo = t - 1 / fps
  const out: number[] = []
  for (let i = 0; i < wave.timestamps.length; i++) {
    const ts = wave.timestamps[i]
    if (ts > lo + 1e-9 && ts <= t + 1e-9) out.push(i)
  }
  return out
}

/** Row count of every frame in the clip, for one stream. */
export function windowCounts(sample: RecordingSample, name: WaveName): number[] {
  const wave = sample.waveforms[name]
  if (!wave) return []
  return sample.frames.map((f) => windowHits(wave, f.timestamp, sample.fps).length)
}

/**
 * The slice to draw around frame time `t`: a second of context behind it and a
 * fifth of a second ahead, clamped to the clip. The lead is long enough that a
 * one-frame window is a legible band rather than a hairline, and the lag keeps
 * the frame off the right edge so the window does not read as the end of the
 * data.
 */
export interface Slice {
  /** Episode-relative time at the slice's left and right edge, seconds. */
  t0: number
  t1: number
}

export function sliceAround(sample: RecordingSample, t: number, lead = 1, lag = 0.2): Slice {
  return { t0: Math.max(0, t - lead), t1: Math.min(sample.duration, t + lag) }
}

/** First index whose timestamp is at or after `t`. */
export function lowerIndex(ts: number[], t: number): number {
  let lo = 0
  let hi = ts.length
  while (lo < hi) {
    const mid = (lo + hi) >> 1
    if (ts[mid] < t - 1e-9) lo = mid + 1
    else hi = mid
  }
  return lo
}

/** One stream cut to a slice, with the frame's own window indices inside it. */
export interface WaveSlice {
  /** One array per channel, cut from the stream's own samples. */
  channels: number[][]
  /** Timestamps of the first and last drawn sample, seconds. */
  ta: number
  tb: number
  /**
   * Positions of the samples the current frame's window returns, as a fraction
   * of the drawn span — counted off the file, not from `rate × window`.
   */
  marks: number[]
  /** How many samples the window returns at this frame. */
  rows: number
}

/**
 * Cut one stream to `[t0, t1]` and place a mark on the samples the window
 * returns at frame time `t`. The marks are placed by sample index within the
 * drawn run, so a mark cannot land anywhere the trace is not drawn.
 */
export function sliceStream(
  sample: RecordingSample,
  name: WaveName,
  t: number,
  slice: Slice,
): WaveSlice | null {
  const wave = sample.waveforms[name]
  if (!wave) return null
  const start = lowerIndex(wave.timestamps, slice.t0)
  let end = start
  while (end < wave.timestamps.length && wave.timestamps[end] <= slice.t1 + 1e-9) end++
  const count = end - start
  if (count < 2) return null
  const channels = wave.channels.map((_, c) =>
    wave.values.slice(start, end).map((row) => row[c]),
  )
  const hits = windowHits(wave, t, sample.fps).filter((j) => j >= start && j < end)
  return {
    channels,
    ta: wave.timestamps[start],
    tb: wave.timestamps[end - 1],
    marks: hits.map((j) => (j - start) / (count - 1)),
    rows: hits.length,
  }
}

/**
 * Everything a read at `frameIndex` returns, feature by feature. The order is
 * the order the sections above introduce the streams: pose, hand, gaze, neural,
 * muscle, then the camera views.
 */
export function readFrame(sample: RecordingSample, frameIndex: number): Readout {
  const i = Math.min(Math.max(0, frameIndex), sample.frames.length - 1)
  const frame = sample.frames[i]
  const t = frame.timestamp
  const sources = sample.metadata?.sources ?? {}
  const rows: ReadRow[] = []

  const declaredRate = (key: string, fallback: number) => {
    const hz = sources[key]?.nativeRateHz
    return hz ? Math.round(hz * 10) / 10 : fallback
  }

  const ms = (seconds: number) => Number((seconds * 1000).toFixed(1))

  // ---- pose: one reading per rig, taken nearest the frame ----
  for (const rig of Object.keys(frame.poses)) {
    rows.push({
      key: sources[rig]?.source ?? `observation.${rig}_pose`,
      label: POSE_LABELS[rig] ?? { en: rig, zh: rig },
      mode: 'nearest',
      hz: declaredRate(rig, sample.fps),
      shape: '[6]',
      rows: 1,
      offsetsMs: [ms(frame.sync[rig]?.deltaSeconds ?? 0)],
    })
  }

  // ---- hand skeleton: one row per frame, all nodes in that row ----
  rows.push({
    key: sources.skeleton?.source ?? 'observation.hand_skeleton',
    label: { en: 'Hand skeleton', zh: '手部骨架' },
    mode: 'nearest',
    hz: declaredRate('skeleton', sample.fps),
    shape: `[${frame.skeleton.positions.length}, 3]`,
    rows: 1,
    offsetsMs: [ms(frame.sync.skeleton?.deltaSeconds ?? 0)],
  })

  // ---- gaze: one sample per frame, in the eye camera's own pixels ----
  rows.push({
    key: sources.gaze?.source ?? 'observation.eye_gaze',
    label: { en: 'Eye gaze', zh: '眼动注视' },
    mode: 'nearest',
    hz: declaredRate('gaze', sample.fps),
    shape: '[2]',
    rows: 1,
    offsetsMs: [ms(frame.gaze.deltaSeconds)],
  })

  // ---- neural and muscle: every reading inside (−1/fps, 0] ----
  for (const name of ['eeg', 'leftEmg', 'rightEmg'] as const) {
    const wave = sample.waveforms[name]
    if (!wave) continue
    const hits = windowHits(wave, t, sample.fps)
    rows.push({
      key: `waveforms.${name}`,
      label: WAVE_LABELS[name],
      mode: 'window',
      hz: wave.sampleRate,
      shape: `[${hits.length}, ${wave.channels.length}]`,
      rows: hits.length,
      offsetsMs: hits.map((j) => Number(((wave.timestamps[j] - t) * 1000).toFixed(1))),
      wave: name,
    })
  }

  // ---- the camera views: the parquet holds timestamps only ----
  for (const view of VIEW_KEYS) {
    rows.push({
      key: `observation.images.headband_${view}_rgb`,
      label: VIEW_LABELS[view],
      mode: 'video',
      hz: sample.fps,
      shape: '[3, H, W]',
      rows: 1,
      offsetsMs: [],
    })
  }

  return { timestamp: t, sourceTimestamp: frame.sourceTimestamp, frameIndex: i, rows }
}

/** How many frames fall in each window-row count, smallest count first. */
export function countHistogram(counts: number[]): { rows: number; frames: number }[] {
  const tally = new Map<number, number>()
  for (const n of counts) tally.set(n, (tally.get(n) ?? 0) + 1)
  return [...tally.entries()]
    .sort((a, b) => a[0] - b[0])
    .map(([rowsNum, frames]) => ({ rows: rowsNum, frames }))
}
