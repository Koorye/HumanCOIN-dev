/**
 * Fig. 8 — the real-scene frames, and the tier code the plate draws with.
 *
 * Every one of the 38 scene classes has a photograph in `public/scenes/`, named
 * after the class in the report's own table; the frame's name, zone, hours and
 * share come from `fig2.ts`, so nothing here is a new measurement — it is a
 * one-to-one join over all 38 rows.
 */
import { SCENES, type SceneClass } from '@/data/fig2'

export interface SceneFrame {
  key: string
  file: string
  scene: SceneClass
}

/** All 38 classes, in the table's zone order. */
export const SCENE_FRAMES: SceneFrame[] = SCENES.map((scene) => ({
  key: scene.key,
  file: scene.image,
  scene,
}))

export interface CloudWord {
  label: string
  count: number
}

/** The objects cloud carries the heaviest entries; the panel prints how many. */
export const OBJECT_WORD_LIMIT = 50

/**
 * The plate's only data colour: the page's blue, in three lightnesses.
 *
 * The reference the section was redrawn against carries every series in one
 * muted accent and separates them by weight, not by hue. Light = L1 (the broad,
 * shallow tier), deep = L3, so depth reads as ink. Nothing else in the plate is
 * coloured except ink and hairlines.
 */
export const ACCENT = '#1f5f96'

export const TIER_RAMP = {
  L1: '#9dbdd9',
  L2: '#5b8cba',
  L3: '#1f5f96',
} as const

/**
 * The second half of the tier code: a dash rhythm for the curves and a marker
 * shape for the bar and matrix panels, where a dash has nothing to sit on.
 * Lightness alone could not separate three nested blue series at this size.
 */
export const TIER_DASH: Record<keyof typeof TIER_RAMP, string> = {
  L1: '',
  L2: '5 3',
  L3: '1.4 2.8',
}

export type TierShape = 'circle' | 'square' | 'diamond'

export const TIER_SHAPE: Record<keyof typeof TIER_RAMP, TierShape> = {
  L1: 'circle',
  L2: 'square',
  L3: 'diamond',
}

/** A marker of the tier's shape, centred on (cx, cy), as a path. */
export function glyphPath(shape: TierShape, cx: number, cy: number): string {
  if (shape === 'circle') {
    const r = 2.4
    return `M${cx - r},${cy}a${r},${r} 0 1,0 ${2 * r},0a${r},${r} 0 1,0 ${-2 * r},0Z`
  }
  if (shape === 'square') {
    const s = 2.1
    return `M${cx - s},${cy - s}h${2 * s}v${2 * s}h${-2 * s}Z`
  }
  const s = 2.9
  return `M${cx},${cy - s}L${cx + s},${cy}L${cx},${cy + s}L${cx - s},${cy}Z`
}
