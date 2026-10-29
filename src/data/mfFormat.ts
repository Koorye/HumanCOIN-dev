/**
 * Structure of the multi-frequency LeRobot format (mf_lerobot).
 *
 * The figure is built around three consecutive frames of the master clock at
 * 30 fps, so the query frame is 10 and its timestamp is exactly 0.333 s — the
 * same query the format's own README documents. Every count that gets printed
 * is derived from the sampling grids below, so what is drawn and what is
 * printed cannot disagree.
 */
import type { Bi } from '@/content'

/** Master-clock frame rate. Frame timestamps are `frame_index / FPS`. */
export const FPS = 30
/** Leftmost frame shown; the query frame is two frames later. */
export const FIRST_FRAME = 8
export const QUERY_FRAME = 10
/** Frames per episode, used for the per-file row counts (2 s at 30 fps). */
export const EPISODE_FRAMES = 60
/** Episode duration in seconds, for the same. */
export const EPISODE_SECONDS = EPISODE_FRAMES / FPS

/** Seconds — master-clock timestamp of the query frame. */
export const QUERY_SECONDS = QUERY_FRAME / FPS
/** Width of the drawn span, in milliseconds. */
export const SPAN_MS = ((QUERY_FRAME - FIRST_FRAME) / FPS) * 1000
/** Read window, in seconds: everything in `(t - 1/30, t]`. */
export const WINDOW: [number, number] = [-1 / FPS, 0]
/** Where the read window opens, as a fraction of the drawn span. */
export const WINDOW_FROM = (SPAN_MS + WINDOW[0] * 1000) / SPAN_MS

export type MfMode = 'nearest' | 'interpolate' | 'window' | 'video'

export interface MfLane {
  id: string
  /** Feature key as it appears in the returned item. */
  key: string
  label: Bi
  hz: number
  rateLabel: string
  color: string
  mode: MfMode
  /** `timestamp_start`, in ms: where this feature's own grid begins. */
  startMs: number
  /** Seconds between two of this feature's samples. */
  periodS: number
  dotRadius: number
  /** Dimensions of one reading; `null` for video. */
  dims: number | null
  note: Bi
}

const periodS = (hz: number) => 1 / hz

export const MF_LANES: MfLane[] = [
  {
    id: 'state',
    key: 'observation.state',
    label: { en: 'End-effector state', zh: '末端位姿' },
    hz: 30,
    rateLabel: '30 Hz',
    color: 'var(--c-slate)',
    mode: 'nearest',
    startMs: 0,
    periodS: periodS(30),
    dotRadius: 3.4,
    dims: 7,
    note: {
      en: 'No window: the frame takes the single closest reading.',
      zh: '无窗口：取离该帧最近的一条读数。',
    },
  },
  {
    id: 'imu',
    key: 'observation.imu',
    label: { en: 'IMU', zh: '惯性测量' },
    hz: 1000,
    rateLabel: '1000 Hz',
    color: 'var(--c-amber)',
    mode: 'window',
    startMs: 0,
    periodS: periodS(1000),
    dotRadius: 1.5,
    dims: 6,
    note: {
      en: 'window (−33 ms, 0]: every reading in the band, plus its own timestamps.',
      zh: 'window（−33 ms, 0]：区间内全部读数，并附各自时间戳。',
    },
  },
  {
    id: 'eeg',
    key: 'observation.eeg',
    label: { en: 'EEG', zh: '脑电' },
    hz: 256,
    rateLabel: '256 Hz',
    color: 'var(--c-violet)',
    mode: 'window',
    startMs: 1,
    periodS: periodS(256),
    dotRadius: 2.2,
    dims: 8,
    note: {
      en: 'Same window, but its own grid and its own timestamp_start, so it answers with a different row count.',
      zh: '同一窗口，但它有自己的栅格与 timestamp_start，因此返回的行数并不相同。',
    },
  },
  {
    id: 'rgb',
    key: 'observation.images.head_rgb',
    label: { en: 'Head camera', zh: '头部相机' },
    hz: 30,
    rateLabel: '30 fps',
    color: 'var(--c-blue)',
    mode: 'video',
    startMs: 0,
    periodS: periodS(30),
    dotRadius: 3.4,
    dims: null,
    note: {
      en: 'Only timestamps live in the parquet; the nearest one names the frame to decode.',
      zh: 'parquet 里只存时间戳；最近邻的那条给出要解码的帧。',
    },
  },
]

/** Sample times for one feature, in ms from the left edge of the drawn span. */
export function laneSamples(lane: MfLane): number[] {
  const out: number[] = []
  for (let i = 0; ; i++) {
    const ms = lane.startMs + i * lane.periodS * 1000
    if (ms > SPAN_MS + 1e-6) break
    out.push(ms)
  }
  return out
}

/** Sample times inside the read window at the query frame. */
export function windowSamples(lane: MfLane): number[] {
  const lo = SPAN_MS + WINDOW[0] * 1000
  return laneSamples(lane).filter((ms) => ms > lo + 1e-6)
}

/** Readings the query returns for one feature. */
export function laneRows(lane: MfLane): number {
  if (lane.mode === 'window') return windowSamples(lane).length
  return 1
}

/** Shape of the tensor the query returns for one feature. */
export function laneShape(lane: MfLane): string {
  const rows = laneRows(lane)
  if (lane.mode === 'video') return '[3, 480, 640]'
  if (lane.mode === 'nearest') return `[${lane.dims}]`
  return `[${rows}, ${lane.dims}]`
}

/**
 * Rows this feature's parquet holds for a whole episode. Numeric features
 * store one row per sample (`fps × duration`); a video feature stores one
 * timestamp row per master frame. Used for the totals printed beside the
 * figure, which come straight from the rates rather than being typed in.
 */
export function laneFileRows(lane: MfLane): number {
  if (lane.mode === 'video') return EPISODE_FRAMES
  return Math.round(lane.hz * EPISODE_SECONDS)
}

/** Master-clock frame timestamps inside the drawn span, in ms. */
export const FRAME_MS = Array.from(
  { length: QUERY_FRAME - FIRST_FRAME + 1 },
  (_, i) => (i * 1000) / FPS,
)

/** Grid offset of the reading nearest the query, for nearest-mode lanes. */
export function nearestMs(lane: MfLane): number {
  const all = laneSamples(lane)
  let best = all[0]
  for (const ms of all) {
    if (Math.abs(ms - SPAN_MS) < Math.abs(best - SPAN_MS)) best = ms
  }
  return best
}

/** The three alignment modes, each with the shape it returns. */
export interface MfModeDef {
  id: MfMode
  shape: string
  example: Bi
}

export const MF_MODES: MfModeDef[] = [
  {
    id: 'nearest',
    shape: '[D]',
    example: { en: 'camera-rate state, action', zh: '相机速率的 state、action' },
  },
  {
    id: 'interpolate',
    shape: '[D]',
    example: { en: 'mid-rate finger pose', zh: '中速的手指姿态' },
  },
  {
    id: 'window',
    shape: '[T, D]',
    example: { en: 'high-rate IMU, EEG, EMG', zh: '高速的 IMU、脑电、肌电' },
  },
]

/** The write call shown beside the figure. One line per feature. */
export const WRITE_CALLS: string[] = [
  'ds.add_frame("observation.imu", imu_sample)      # 1000 Hz, own counter',
  'ds.add_frame("observation.eeg", eeg_sample)      # 256 Hz',
  'ds.add_frame("task", "reach_target")             # ← frame boundary',
  'ds.add_frame("observation.state", joint_state)   # 30 Hz',
  'ds.add_frame("observation.images.head_rgb", image)',
  'ds.save_episode()  # flush: one parquet per feature',
]

/** Drop-in usage: same import shape as LeRobot, same dict out. */
export const COMPAT_CODE: string[] = [
  'from mf_lerobot import MultiFrequencyLeRobotDataset',
  '',
  'dataset = MultiFrequencyLeRobotDataset(repo_id="HumanCOIN/egocentric")',
  'sample = next(iter(dataset))',
  'print(sample)',
]

/** What that print produces. */
export const COMPAT_RESULT: string[] = [
  '{',
  '  "timestamp":       tensor(0.3333),',
  '  "frame_index":     tensor(10),',
  '  "episode_index":   tensor(0),',
  '  "index":           tensor(10),',
  '  "task_index":      tensor(0),',
  '  "task":            "reach_target",',
  '  "observation.state":  tensor([7])             # nearest',
  '  "observation.imu":    tensor([33, 6])         # window (-0.033, 0]',
  '  "observation.imu_timestamps": tensor([33])',
  '  "observation.eeg":    tensor([8, 8])          # window (-0.033, 0]',
  '  "observation.images.head_rgb": tensor([3, 480, 640])',
  '}',
]
