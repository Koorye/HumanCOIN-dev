/**
 * The cover's takes, one row per acquisition tier, and where each one's reduced
 * animation payload lives.
 *
 * The take metadata is generated: ``scripts/build_cover_tiers.py`` reads the
 * captures under ``/home/baai/Projects/Paper-Drafts/素材``, cuts one 12 s window
 * from each, and writes ``coverTakes.ts`` with the clips it produced. Nothing in
 * the cover is fetched to paint a card: the metadata is bundled and the card's
 * poster is a single JPEG. Only the reduced series beside a take is fetched, and
 * only when that take is opened.
 *
 * A tier ships what it ships. L3 carries all five non-visual streams, L2 ships
 * the two wrist-band EMG streams, and L1 ships no physiological channel at all —
 * so every stream below is optional and the panel draws a labelled gap rather
 * than a curve the capture never measured.
 */
import {
  COVER_TAKES as GENERATED_TAKES,
  type CoverTakeEntry,
  type CoverTier,
} from './coverTakes'

export type { CoverTier }

export type CoverViewKey = 'left' | 'right' | 'bleft' | 'bright' | 'wleft' | 'wright'

export type CoverStreamKey = 'gaze' | 'pose' | 'glove' | 'emg' | 'eeg'

export interface CoverTakeRates {
  /** The sensor's own delivery rate where the capture declares one. */
  nativeHz: number | null
  /** The rate the stream is published on. */
  releasedFps: number
}

/** One card: the generated metadata plus the files this build wrote for it. */
export interface CoverTake extends Omit<CoverTakeEntry, 'views'> {
  views: Partial<Record<CoverViewKey, string>>
}

/** The reduced animation payload for one take, as `public/data/reels/<id>.json`. */
export interface CoverReel {
  id: string
  seconds: number
  fps: number
  frames: number
  /** Animation keys in `gaze`, `pose`; 0 where the tier carries neither. */
  keys: number
  /** Animation keys in `glove`; 0 where the tier carries no glove. */
  gloveKeys: number
  /** The streams this take actually ships; absent streams are not drawn. */
  streams: CoverStreamKey[]
  /** Eye-camera pixels: the whole path and the extent it was autoscaled from. */
  gaze?: { path: [number, number][]; extent: { x: [number, number]; y: [number, number] } }
  /** Each rig's horizontal track, and the extent of all three together. */
  pose?: {
    tracks: Record<'head' | 'left' | 'right', [number, number][]>
    extent: { x: [number, number]; z: [number, number] }
  }
  /** One entry per glove key: the 50 nodes of both 25-node blocks on the palm plane. */
  glove?: { keys: [number, number][][]; view: string }
  emg?: { channels: string[]; leftChannels: number; rate: number; unit: string; series: number[][] }
  eeg?: { channels: string[]; rate: number; unit: string; series: number[][] }
  rates: Partial<Record<CoverStreamKey, CoverTakeRates>>
  /**
   * The capture's own steps. The capture carries no per-step timing, so the
   * window is the step's even share of the clip and the hand is measured from
   * wrist travel inside that window — the same derivation the viewer uses.
   * Tiers whose capture carries no step notes ship an empty list.
   */
  steps: CoverStep[]
}

/** One step of one take, as the annotation panel reads it. */
export interface CoverStep {
  index: number
  text: string
  /** Window, in seconds, as the step's even share of the clip. */
  start: number
  end: number
  hand: 'left' | 'right' | 'both' | 'none'
  /** Wrist-tracker bounding-box diagonals in this window, native units. */
  travel: { left: number; right: number }
  /** Objects the sentence names outright. */
  mentions: CoverObject[]
  /** Objects reached only through a group noun such as 饮品 or 卡片. */
  groups: { word: string; members: CoverObject[] }[]
}

/** One scene object as the capture's own metadata records it. */
export interface CoverObject {
  name: string
  id: string | null
  /** Hex string, or `transparent` where the capture recorded no colour. */
  color: string | null
  shape: string | null
  material: string | null
  /** Centimetres, keyed by primitive dimension. */
  dims: Record<string, number>
  /** Grams, or null where the design library matched nothing. */
  weightG: number | null
}

/** Every take this build ships, in the generated order (L3, then L2, then L1). */
export const COVER_TAKES: CoverTake[] = GENERATED_TAKES.map((t) => ({ ...t }))

/** The rows of the carousel: each tier its own captures, in release order. */
export const COVER_TAKES_BY_TIER: Record<CoverTier, CoverTake[]> = {
  L3: COVER_TAKES.filter((t) => t.tier === 'L3'),
  L2: COVER_TAKES.filter((t) => t.tier === 'L2'),
  L1: COVER_TAKES.filter((t) => t.tier === 'L1'),
}

export function takeById(id: string): CoverTake | null {
  return COVER_TAKES.find((t) => t.id === id) ?? null
}

/**
 * Where one take's animation payload lives. Relative to the site root, so it
 * resolves under the same base the rest of `public/` does.
 */
export function reelUrl(id: string): string {
  return `data/reels/${id}.json`
}

const reels = new Map<string, Promise<CoverReel>>()

/**
 * The reduced animation payload for one take, fetched once and kept. The cover
 * fetches this only when a card is opened, so the carousel paints without it.
 */
export function loadReel(id: string): Promise<CoverReel> {
  const hit = reels.get(id)
  if (hit) return hit
  const p = fetch(reelUrl(id)).then((r) => {
    if (!r.ok) throw new Error(`${reelUrl(id)} → ${r.status}`)
    return r.json() as Promise<CoverReel>
  })
  reels.set(id, p)
  return p
}
