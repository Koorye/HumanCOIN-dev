/**
 * Planning statistics, kept as literals so the figures match the reference
 * charts exactly. All distributions are design simulations; the recording
 * volume itself is a plan, not a measurement.
 */

import type { Bi } from '@/content'

/* ---------------- planned hours ---------------- */

export interface TierHours {
  id: 'L1' | 'L2' | 'L3'
  hours: number
  color: string
}

export const TIER_HOURS: TierHours[] = [
  { id: 'L1', hours: 10000, color: 'var(--c-blue)' },
  { id: 'L2', hours: 2000, color: 'var(--c-teal)' },
  { id: 'L3', hours: 500, color: 'var(--c-violet)' },
]

export const TOTAL_HOURS = 12500

/* ---------------- scene allocation ---------------- */

export interface SceneSlice {
  key: string
  name: Bi
  share: number
}

export const SCENE_NAMES: Record<string, Bi> = {
  desk: { en: 'Desk', zh: '书桌' },
  dining: { en: 'Dining table', zh: '餐桌' },
  bench: { en: 'Workbench', zh: '工作台' },
  kitchen: { en: 'Kitchen', zh: '厨房' },
  bedroom: { en: 'Bedroom', zh: '卧室' },
  laundry: { en: 'Laundry room', zh: '洗衣间' },
  wardrobe: { en: 'Wardrobe', zh: '衣帽间' },
  storage: { en: 'Storage', zh: '储藏区' },
  bath: { en: 'Bathroom', zh: '卫浴' },
  market: { en: 'Supermarket', zh: '超市' },
  cleaning: { en: 'Cleaning', zh: '保洁' },
  home: { en: 'Housekeeping', zh: '家政' },
  medical: { en: 'Medical', zh: '医疗' },
  fitness: { en: 'Fitness', zh: '健身' },
  books: { en: 'Bookshop', zh: '书店' },
  coffee: { en: 'Café', zh: '咖啡厅' },
  farm: { en: 'Agriculture', zh: '农业' },
  assembly: { en: 'Assembly line', zh: '流水线' },
}

/** Representative photographic still per scene, relative to `public/`. */
export const SCENE_IMAGE: Record<string, string> = {
  desk: 'generated/desk.jpg',
  dining: 'real/thumb-01.jpg',
  bench: 'generated/workbench.jpg',
  kitchen: 'generated/kitchen.jpg',
  bedroom: 'generated/laundry.jpg',
  laundry: 'generated/laundry.jpg',
  wardrobe: 'generated/laundry.jpg',
  storage: 'generated/workbench.jpg',
  bath: 'generated/laundry.jpg',
  market: 'generated/market.jpg',
  cleaning: 'generated/laundry.jpg',
  home: 'generated/desk.jpg',
  medical: 'generated/workbench.jpg',
  fitness: 'generated/workbench.jpg',
  books: 'generated/desk.jpg',
  coffee: 'generated/coffee.jpg',
  farm: 'generated/market.jpg',
  assembly: 'generated/workbench.jpg',
}

export const SCENE_ALLOCATION: Record<'L1' | 'L2' | 'L3', SceneSlice[]> = {
  L3: [
    { key: 'bench', name: SCENE_NAMES.bench, share: 40 },
    { key: 'desk', name: SCENE_NAMES.desk, share: 35 },
    { key: 'dining', name: SCENE_NAMES.dining, share: 25 },
  ],
  L2: [
    { key: 'kitchen', name: SCENE_NAMES.kitchen, share: 22 },
    { key: 'desk', name: SCENE_NAMES.desk, share: 16 },
    { key: 'bench', name: SCENE_NAMES.bench, share: 16 },
    { key: 'dining', name: SCENE_NAMES.dining, share: 14 },
    { key: 'bedroom', name: SCENE_NAMES.bedroom, share: 8 },
    { key: 'laundry', name: SCENE_NAMES.laundry, share: 7 },
    { key: 'wardrobe', name: SCENE_NAMES.wardrobe, share: 6 },
    { key: 'storage', name: SCENE_NAMES.storage, share: 6 },
    { key: 'bath', name: SCENE_NAMES.bath, share: 5 },
  ],
  L1: [
    { key: 'market', name: SCENE_NAMES.market, share: 17 },
    { key: 'cleaning', name: SCENE_NAMES.cleaning, share: 13 },
    { key: 'home', name: SCENE_NAMES.home, share: 13 },
    { key: 'coffee', name: SCENE_NAMES.coffee, share: 12 },
    { key: 'fitness', name: SCENE_NAMES.fitness, share: 10 },
    { key: 'assembly', name: SCENE_NAMES.assembly, share: 10 },
    { key: 'farm', name: SCENE_NAMES.farm, share: 9 },
    { key: 'medical', name: SCENE_NAMES.medical, share: 8 },
    { key: 'books', name: SCENE_NAMES.books, share: 8 },
  ],
}

/* ---------------- episode duration distribution ---------------- */

/** 9 bins of 30 s, covering 30–300 s. Shares are percentages of each tier. */
export const DURATION_BIN_EDGES = [30, 60, 90, 120, 150, 180, 210, 240, 270]

export const DURATION_SHARES: Record<'L1' | 'L2' | 'L3', number[]> = {
  L1: [9.2, 10.9, 11.5, 11.7, 11.4, 11.2, 12.1, 11.1, 10.9],
  L2: [24.7, 11.7, 11.9, 9.1, 10.2, 9.2, 7.5, 7.8, 7.9],
  L3: [31.6, 14.2, 10.2, 8.8, 7.9, 7.3, 6.7, 7.4, 5.9],
}

/** Per-tier median episode length, in seconds. Marked on the duration figure. */
export const DURATION_MEDIANS: Record<'L1' | 'L2' | 'L3', number> = {
  L1: 167,
  L2: 125,
  L3: 101,
}

export interface DurationStackBin {
  lo: number
  hi: number
  /** Share of all planned hours in this bin, per tier. */
  L1: number
  L2: number
  L3: number
}

/**
 * Duration composition of the whole corpus, as one stacked profile.
 *
 * Every planned hour carries a tier and an episode length, so the 12,500 h the
 * hours ring shows can be re-cut by length: a tier's within-bin share (a
 * percentage of that tier) is weighted by the bin's own length and renormalised,
 * then scaled by the share of the corpus that tier contributes. Bins therefore
 * sum to 100% of planned hours, and each tier's column of bins sums to its own
 * share of the corpus (80 / 16 / 4).
 *
 * The published bins are 30 s wide. `div` subdivides each into equal sub-bins,
 * which refines the drawing resolution only — the values inside one 30 s bin
 * move smoothly because the profile is read at more points, not because new
 * measurement exists. Nothing is splined across a bin edge.
 */
export function durationStack(div = 3): DurationStackBin[] {
  const out: DurationStackBin[] = []
  const width = 30 / div
  DURATION_BIN_EDGES.forEach((edge, b) => {
    for (let k = 0; k < div; k++) {
      const lo = edge + k * width
      const mid = lo + width / 2
      out.push({
        lo,
        hi: lo + width,
        L1: (DURATION_SHARES.L1[b] / div / 100) * mid,
        L2: (DURATION_SHARES.L2[b] / div / 100) * mid,
        L3: (DURATION_SHARES.L3[b] / div / 100) * mid,
      })
    }
  })

  /* Renormalise each tier to the share of planned hours it actually holds, so a
     reader can multiply any tier's column back to its published hours. */
  const hoursShare: Record<'L1' | 'L2' | 'L3', number> = {
    L1: (TIER_HOURS[0].hours / TOTAL_HOURS) * 100,
    L2: (TIER_HOURS[1].hours / TOTAL_HOURS) * 100,
    L3: (TIER_HOURS[2].hours / TOTAL_HOURS) * 100,
  }
  for (const id of ['L1', 'L2', 'L3'] as const) {
    const column = out.reduce((sum, bin) => sum + bin[id], 0)
    for (const bin of out) bin[id] = (bin[id] / column) * hoursShare[id]
  }
  return out
}

/* ---------------- modality ablation ---------------- */

export interface AblationMetric {
  id: string
  label: Bi
  unit: Bi
  /** `up` means larger is better. */
  direction: 'up' | 'down'
  /** Mean and sample SD per combination, in the order of `COMBOS`. */
  points: { mean: number; sd: number }[]
}

export type Modality = 'G' | 'M' | 'E'

/** Vision is always present; G = gaze, M = EMG, E = EEG. */
export const COMBOS: Modality[][] = [
  [],
  ['G'],
  ['M'],
  ['E'],
  ['G', 'M'],
  ['G', 'E'],
  ['M', 'E'],
  ['G', 'M', 'E'],
]

export const MODALITY_LABEL: Record<'V' | Modality, Bi> = {
  V: { en: 'Vision', zh: '视觉' },
  G: { en: 'Gaze', zh: '注视' },
  M: { en: 'EMG', zh: '肌电' },
  E: { en: 'EEG', zh: '脑电' },
}

export const ABLATION: AblationMetric[] = [
  {
    id: 'gesture',
    label: { en: 'Gesture classification accuracy', zh: '手势分类准确率' },
    unit: { en: '%', zh: '%' },
    direction: 'up',
    points: [
      { mean: 71.61, sd: 0.37 }, { mean: 75.98, sd: 0.87 }, { mean: 77.38, sd: 0.32 },
      { mean: 75.2, sd: 0.88 }, { mean: 83.99, sd: 0.6 }, { mean: 81.93, sd: 0.72 },
      { mean: 83.17, sd: 0.68 }, { mean: 91.24, sd: 0.29 },
    ],
  },
  {
    id: 'position',
    label: { en: 'Current hand position error', zh: '当前手部位置误差' },
    unit: { en: 'cm', zh: 'cm' },
    direction: 'down',
    points: [
      { mean: 5.14, sd: 0.35 }, { mean: 4.84, sd: 0.28 }, { mean: 3.62, sd: 0.12 },
      { mean: 5.2, sd: 0.32 }, { mean: 2.87, sd: 0.36 }, { mean: 4.34, sd: 0.26 },
      { mean: 3.12, sd: 0.23 }, { mean: 2.06, sd: 0.24 },
    ],
  },
  {
    id: 'angle',
    label: { en: 'Current joint angle error', zh: '当前关节角误差' },
    unit: { en: '°', zh: '°' },
    direction: 'down',
    points: [
      { mean: 16.23, sd: 0.19 }, { mean: 14.99, sd: 0.36 }, { mean: 11.85, sd: 0.29 },
      { mean: 15.63, sd: 0.34 }, { mean: 9.25, sd: 0.32 }, { mean: 13.11, sd: 0.19 },
      { mean: 10.17, sd: 0.16 }, { mean: 7.09, sd: 0.19 },
    ],
  },
  {
    id: 'ade',
    label: { en: 'Future trajectory ADE', zh: '未来轨迹 ADE' },
    unit: { en: 'cm', zh: 'cm' },
    direction: 'down',
    points: [
      { mean: 12.19, sd: 0.34 }, { mean: 9.96, sd: 0.34 }, { mean: 11.09, sd: 0.2 },
      { mean: 9.39, sd: 0.25 }, { mean: 7.26, sd: 0.35 }, { mean: 5.87, sd: 0.19 },
      { mean: 6.87, sd: 0.32 }, { mean: 4.03, sd: 0.19 },
    ],
  },
  {
    id: 'fde',
    label: { en: 'Future trajectory FDE', zh: '未来轨迹 FDE' },
    unit: { en: 'cm', zh: 'cm' },
    direction: 'down',
    points: [
      { mean: 20.02, sd: 0.28 }, { mean: 16.98, sd: 0.37 }, { mean: 18.09, sd: 0.22 },
      { mean: 15.53, sd: 0.21 }, { mean: 11.88, sd: 0.26 }, { mean: 9.47, sd: 0.26 },
      { mean: 11.09, sd: 0.13 }, { mean: 5.92, sd: 0.1 },
    ],
  },
  {
    id: 'future',
    label: { en: 'Future gesture accuracy', zh: '未来手势准确率' },
    unit: { en: '%', zh: '%' },
    direction: 'up',
    points: [
      { mean: 62.19, sd: 0.45 }, { mean: 66.09, sd: 0.33 }, { mean: 67.39, sd: 0.51 },
      { mean: 68.18, sd: 0.56 }, { mean: 75.81, sd: 0.74 }, { mean: 79.15, sd: 0.57 },
      { mean: 79.91, sd: 0.67 }, { mean: 89.13, sd: 0.8 },
    ],
  },
]

/** Best single-modality addition to vision, per metric (index into `COMBOS`). */
export function bestSingle(metric: AblationMetric): number {
  let best = 1
  for (let i = 1; i <= 3; i++) {
    const better = metric.direction === 'up'
      ? metric.points[i].mean > metric.points[best].mean
      : metric.points[i].mean < metric.points[best].mean
    if (better) best = i
  }
  return best
}
