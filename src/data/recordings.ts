/**
 * Loaders for the released L3 recordings.
 * `public/data/recordings.json` is generated from the acquisition index and
 * keeps every episode's relative paths in one place.
 */

export interface ReleasedRecording {
  id: string
  title: string
  titleEn: string
  /** Directory prefix relative to `public/real/`, e.g. `recordings/<id>/`. */
  dir: string
  duration: number
  fps: number
  scene: string
  sceneEn: string
  task: string
  taskEn: string
  modalities: string[]
  poster: string
  sample: string
  annotations: string
  views: Record<'left' | 'right' | 'bleft' | 'bright', string>
}

export interface SampleFrame {
  timestamp: number
  sourceTimestamp: number
  poses: Record<
    string,
    { position: [number, number, number]; euler: [number, number, number] }
  >
  skeleton: { positions: [number, number, number][]; euler?: number[][] }
  gaze: { xy: [number, number]; sourceTimestamp: number; deltaSeconds: number }
  sync: Record<string, { sourceTimestamp: number; deltaSeconds: number }>
}

export interface Waveform {
  channels: string[]
  unit: string
  sampleRate: number
  timestamps: number[]
  values: number[][]
}

/** What the capture declares about its own channels. */
export interface SampleMetadata {
  timeUnit?: string
  positionUnit?: string
  eulerUnit?: string
  gazeUnit?: string
  /** The frame the glove coordinates live in, and what is not declared about it. */
  skeletonFrame?: string
  skeletonTopology?: string
  alignment?: string
  /** Per-stream provenance, including each stream's own native delivery rate. */
  sources?: Record<
    string,
    { source?: string; nativeRateHz?: number; columns?: string[] }
  >
}

export interface RecordingSample {
  recordingId: string
  taskTitle: string
  duration: number
  fps: number
  clipStart: number
  metadata?: SampleMetadata
  frames: SampleFrame[]
  waveforms: { eeg: Waveform; leftEmg: Waveform; rightEmg: Waveform }
}

export interface RecordingSteps {
  steps: string[]
  source?: string
  timing?: unknown
}

/** One object as the capture's own metadata records it. */
export interface SceneObject {
  name: string
  id: string | null
  /** Hex string, or `transparent` where the capture recorded no colour. */
  color: string | null
  shape: string | null
  material: string | null
  /** Centimetres, keyed by primitive dimension (`d`/`h` for cyl, `h`/`l`/`w` for box). */
  dims: Record<string, number>
  /** Grams. Null wherever the upstream design library could not be matched. */
  weightG: number | null
  table: { x: number | null; y: number | null; angle: number | null }
}

/** A step reduced to its own sentence plus the objects it refers to. */
export interface AnnotatedStep {
  index: number
  text: string
  /** Objects the sentence names outright. */
  mentions: string[]
  /** Objects reached only through a group noun such as 饮品 or 卡片. */
  groups: { word: string; members: string[] }[]
}

export interface EpisodeObjects {
  scene: string | null
  task: string | null
  objects: SceneObject[]
  steps: AnnotatedStep[]
}

const REAL = 'real/'
const cache = new Map<string, Promise<unknown>>()

async function getJson<T>(url: string): Promise<T> {
  const hit = cache.get(url)
  if (hit) return hit as Promise<T>
  const p = fetch(url).then((r) => {
    if (!r.ok) throw new Error(`${url} → ${r.status}`)
    return r.json() as Promise<T>
  })
  cache.set(url, p)
  return p as Promise<T>
}

export function asset(path: string): string {
  return `${REAL}${path}`
}

export function loadRecordings(): Promise<ReleasedRecording[]> {
  return getJson<ReleasedRecording[]>('data/recordings.json')
}

export function loadSample(rec: ReleasedRecording): Promise<RecordingSample> {
  return getJson<RecordingSample>(asset(rec.sample))
}

export function loadSteps(rec: ReleasedRecording): Promise<RecordingSteps> {
  return getJson<RecordingSteps>(asset(rec.annotations))
}

/**
 * Scene objects for one episode. The table is generated once for the whole
 * release and keyed by recording id, so it is fetched whole and indexed here.
 */
export async function loadObjects(rec: ReleasedRecording): Promise<EpisodeObjects | null> {
  const all = await getJson<Record<string, EpisodeObjects>>('data/objects.json')
  return all[rec.id] ?? null
}

/** Centre a multi-channel waveform and scale it into roughly [-1, 1]. */
export function normalize(values: number[][]): number[] {
  const flat = values.flat()
  if (!flat.length) return []
  let sum = 0
  for (const v of flat) sum += v
  const mean = sum / flat.length
  let maxAbs = 0
  for (const v of flat) {
    const d = Math.abs(v - mean)
    if (d > maxAbs) maxAbs = d
  }
  const scale = maxAbs || 1
  return flat.map((v) => (v - mean) / scale)
}

/** Downsample with peak preservation so spikes survive the rate reduction. */
export function resample(series: number[], n: number): number[] {
  if (series.length <= n) return series
  const out: number[] = []
  const step = series.length / n
  for (let i = 0; i < n; i++) {
    const a = Math.floor(i * step)
    const b = Math.min(series.length, Math.max(a + 1, Math.floor((i + 1) * step)))
    let min = Infinity
    let max = -Infinity
    for (let j = a; j < b; j++) {
      const v = series[j]
      if (v < min) min = v
      if (v > max) max = v
    }
    out.push(Math.abs(max) >= Math.abs(min) ? max : min)
  }
  return out
}

/** Channel-mean envelope, useful when a stream has many channels. */
export function meanChannel(values: number[][]): number[] {
  if (!values.length) return []
  const rows = values.length
  const cols = values[0]?.length ?? 0
  const out = new Array<number>(cols).fill(0)
  for (let r = 0; r < rows; r++) {
    const row = values[r]
    for (let c = 0; c < cols; c++) out[c] += row[c]
  }
  for (let c = 0; c < cols; c++) out[c] /= rows
  return out
}
