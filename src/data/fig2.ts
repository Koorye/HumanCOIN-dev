/**
 * §03 — the data distribution, read from Fig. 2 of the report.
 *
 * Four panels, four cuts of the same 12,500 hours:
 *
 *   a. three tiers, and the controlled/open split inside each of them;
 *   b. thirty-eight scene classes, grouped into five zones and a residual class;
 *   c. eighty verbs, stacked by the tier that records them;
 *   d. six hundred object entries, and one object read at two depths.
 *
 * The tier hours, the setting shares and the 18 class names are the report's.
 * The per-class hour allocation, the per-verb counts and the object frequency
 * curve are modelled on the shapes plotted in Fig. 2: the report prints the
 * figure as a raster, so the numbers behind its bars are reconstructed here and
 * rounded. The object tail is deliberately lifted — rank 1 carries ~195
 * instances, rank 600 about 8 — because at page width the report's steeper
 * curve collapses into a one-pixel line. Each figure is internally consistent
 * (scene hours sum to 10,000 / 2,000 / 500, and every stack sums to its own
 * total), so one figure cannot state a different corpus from another.
 */

import type { Bi } from '@/content'

export type TierId = 'L1' | 'L2' | 'L3'
export type ZoneId = 'residential' | 'commercial' | 'professional' | 'industrial' | 'public' | 'other'
export type SettingId = 'controlled' | 'open'

export const TOTAL_HOURS = 12500

export interface Tier {
  id: TierId
  name: Bi
  hours: number
  share: number
  color: string
  tint: string
  question: Bi
  adds: Bi
  /** Share of the tier's own hours, in per cent. */
  setting: Record<SettingId, number>
}

export const TIERS: Tier[] = [
  {
    id: 'L1',
    name: { en: 'Visual intention', zh: '视觉意图' },
    hours: 10000,
    share: 80,
    color: 'var(--c-blue)',
    tint: 'var(--t-blue)',
    question: { en: 'What was seen', zh: '看到了什么' },
    adds: { en: 'Four-lens headband', zh: '四目头带' },
    setting: { open: 100, controlled: 0 },
  },
  {
    id: 'L2',
    name: { en: 'Motor intention', zh: '动作意图' },
    hours: 2000,
    share: 16,
    color: 'var(--c-teal)',
    tint: 'var(--t-teal)',
    question: { en: 'How the body executed', zh: '身体如何执行' },
    adds: { en: 'Wrist cameras · surface EMG', zh: '腕部相机 · 表面肌电' },
    setting: { open: 60, controlled: 40 },
  },
  {
    id: 'L3',
    name: { en: 'Cognitive intention', zh: '认知意图' },
    hours: 500,
    share: 4,
    color: 'var(--c-violet)',
    tint: 'var(--t-violet)',
    question: { en: 'What the brain decided', zh: '大脑决定了什么' },
    adds: { en: 'EEG · eye tracker · gloves', zh: '脑电 · 眼动 · 手套' },
    setting: { open: 30, controlled: 70 },
  },
]

export const TIER_IDS: TierId[] = ['L1', 'L2', 'L3']

export function tierOf(id: TierId): Tier {
  return TIERS.find((t) => t.id === id)!
}

/** Hours of one tier recorded in one setting. */
export function settingHours(id: TierId, setting: SettingId): number {
  return (tierOf(id).hours * tierOf(id).setting[setting]) / 100
}

export const SETTING_TOTALS: Record<SettingId, number> = {
  controlled: TIER_IDS.reduce((n, id) => n + settingHours(id, 'controlled'), 0),
  open: TIER_IDS.reduce((n, id) => n + settingHours(id, 'open'), 0),
}

export const SETTINGS: { id: SettingId; name: Bi; gloss: Bi; image: string; caption: Bi }[] = [
  {
    id: 'controlled',
    name: { en: 'Controlled', zh: '受控采集' },
    gloss: { en: 'Fixed station · scripted protocol', zh: '固定工位 · 脚本化协议' },
    image: 'generated/settings/controlled.jpg',
    caption: { en: 'Seated at an instrumented desk', zh: '坐在被仪器化的桌前' },
  },
  {
    id: 'open',
    name: { en: 'Open', zh: '开放采集' },
    gloss: { en: 'Everyday scene · undisturbed recording', zh: '日常场景 · 无干预记录' },
    image: 'generated/settings/open.jpg',
    caption: { en: 'Carrying the headband into the world', zh: '把采集头带带进真实世界' },
  },
]

/* ------------------------------------------------------------------ zones */

export interface Zone {
  id: ZoneId
  name: Bi
  note: Bi
}

export const ZONES: Zone[] = [
  {
    id: 'residential',
    name: { en: 'Residential', zh: '居住' },
    note: { en: 'Nine classes, 4,521 h', zh: '9 个类别，4,521 小时' },
  },
  {
    id: 'commercial',
    name: { en: 'Commercial', zh: '商业' },
    note: { en: 'Ten classes, 2,588 h', zh: '10 个类别，2,588 小时' },
  },
  {
    id: 'professional',
    name: { en: 'Professional', zh: '专业' },
    note: { en: 'Five classes, 1,982 h', zh: '5 个类别，1,982 小时' },
  },
  {
    id: 'industrial',
    name: { en: 'Industrial', zh: '工业' },
    note: { en: 'Six classes, 1,957 h', zh: '6 个类别，1,957 小时' },
  },
  {
    id: 'public',
    name: { en: 'Public', zh: '公共' },
    note: { en: 'Seven classes, 1,211 h', zh: '7 个类别，1,211 小时' },
  },
  {
    id: 'other',
    name: { en: 'Residual', zh: '残余类' },
    note: { en: 'One class, 242 h', zh: '1 个类别，242 小时' },
  },
]

/* ----------------------------------------------------------------- scenes */

export interface SceneClass {
  key: string
  name: Bi
  zone: ZoneId
  image: string
  hours: Record<TierId, number>
  total: number
  share: number
  /** Tier composition of this class's own hours, in per cent. */
  tiers: Record<TierId, number>
  blurb: Bi
}

interface SceneSeed {
  key: string
  /** file stem under public/generated/scenes, chosen as the closest setting */
  image: string
  name: Bi
  zone: ZoneId
  /** L1 / L2 / L3 hours. They sum to the report's tier totals. */
  hours: [number, number, number]
  blurb: Bi
}

const SCENE_SEEDS: SceneSeed[] = [
  {
    key: 'kitchen',
    image: 'kitchen',
    name: { en: 'Kitchen', zh: '厨房' },
    zone: 'residential',
    hours: [868.2, 271.5, 35.1],
    blurb: { en: 'Recorded across the corpus; tier coverage follows the report’s table.', zh: '全库记录；层级覆盖依照报告表格。' },
  },
  {
    key: 'living-room',
    image: 'dining',
    name: { en: 'Living Room', zh: '客厅' },
    zone: 'residential',
    hours: [759.0, 43.3, 0.0],
    blurb: { en: 'Recorded across the corpus; tier coverage follows the report’s table.', zh: '全库记录；层级覆盖依照报告表格。' },
  },
  {
    key: 'dining-room',
    image: 'dining',
    name: { en: 'Dining Room', zh: '餐厅' },
    zone: 'residential',
    hours: [400.5, 174.1, 75.2],
    blurb: { en: 'Recorded across the corpus; tier coverage follows the report’s table.', zh: '全库记录；层级覆盖依照报告表格。' },
  },
  {
    key: 'storage-room',
    image: 'warehouse',
    name: { en: 'Storage Room', zh: '储藏室' },
    zone: 'residential',
    hours: [502.8, 98.4, 0.0],
    blurb: { en: 'Recorded across the corpus; tier coverage follows the report’s table.', zh: '全库记录；层级覆盖依照报告表格。' },
  },
  {
    key: 'bathroom',
    image: 'bedroom',
    name: { en: 'Bathroom', zh: '浴室' },
    zone: 'residential',
    hours: [338.9, 169.2, 0.0],
    blurb: { en: 'Recorded across the corpus; tier coverage follows the report’s table.', zh: '全库记录；层级覆盖依照报告表格。' },
  },
  {
    key: 'bedroom',
    image: 'bedroom',
    name: { en: 'Bedroom', zh: '卧室' },
    zone: 'residential',
    hours: [431.3, 51.2, 0.0],
    blurb: { en: 'Recorded across the corpus; tier coverage follows the report’s table.', zh: '全库记录；层级覆盖依照报告表格。' },
  },
  {
    key: 'study',
    image: 'office',
    name: { en: 'Study', zh: '书房' },
    zone: 'residential',
    hours: [95.4, 34.0, 34.5],
    blurb: { en: 'Recorded across the corpus; tier coverage follows the report’s table.', zh: '全库记录；层级覆盖依照报告表格。' },
  },
  {
    key: 'laundry-area',
    image: 'bedroom',
    name: { en: 'Laundry Area', zh: '洗衣区' },
    zone: 'residential',
    hours: [69.4, 25.0, 30.7],
    blurb: { en: 'Recorded across the corpus; tier coverage follows the report’s table.', zh: '全库记录；层级覆盖依照报告表格。' },
  },
  {
    key: 'balcony',
    image: 'park',
    name: { en: 'Balcony', zh: '阳台' },
    zone: 'residential',
    hours: [13.0, 0.0, 0.0],
    blurb: { en: 'Recorded across the corpus; tier coverage follows the report’s table.', zh: '全库记录；层级覆盖依照报告表格。' },
  },
  {
    key: 'retail-store',
    image: 'retail',
    name: { en: 'Retail Store', zh: '零售店' },
    zone: 'commercial',
    hours: [355.0, 157.4, 32.7],
    blurb: { en: 'Recorded across the corpus; tier coverage follows the report’s table.', zh: '全库记录；层级覆盖依照报告表格。' },
  },
  {
    key: 'logistics-facility',
    image: 'warehouse',
    name: { en: 'Logistics Facility', zh: '物流中心' },
    zone: 'commercial',
    hours: [401.0, 127.9, 0.0],
    blurb: { en: 'Recorded across the corpus; tier coverage follows the report’s table.', zh: '全库记录；层级覆盖依照报告表格。' },
  },
  {
    key: 'entertainment-venue',
    image: 'cafe',
    name: { en: 'Entertainment Venue', zh: '娱乐场所' },
    zone: 'commercial',
    hours: [472.8, 0.0, 0.0],
    blurb: { en: 'Recorded across the corpus; tier coverage follows the report’s table.', zh: '全库记录；层级覆盖依照报告表格。' },
  },
  {
    key: 'restaurant',
    image: 'cafe',
    name: { en: 'Restaurant', zh: '餐馆' },
    zone: 'commercial',
    hours: [197.7, 28.0, 0.0],
    blurb: { en: 'Recorded across the corpus; tier coverage follows the report’s table.', zh: '全库记录；层级覆盖依照报告表格。' },
  },
  {
    key: 'beverage-shop',
    image: 'cafe',
    name: { en: 'Beverage Shop', zh: '饮品店' },
    zone: 'commercial',
    hours: [141.2, 32.0, 29.7],
    blurb: { en: 'Recorded across the corpus; tier coverage follows the report’s table.', zh: '全库记录；层级覆盖依照报告表格。' },
  },
  {
    key: 'pet-shop',
    image: 'retail',
    name: { en: 'Pet Shop', zh: '宠物店' },
    zone: 'commercial',
    hours: [202.6, 0.0, 0.0],
    blurb: { en: 'Recorded across the corpus; tier coverage follows the report’s table.', zh: '全库记录；层级覆盖依照报告表格。' },
  },
  {
    key: 'hotel',
    image: 'hotel',
    name: { en: 'Hotel', zh: '酒店' },
    zone: 'commercial',
    hours: [113.0, 38.4, 0.0],
    blurb: { en: 'Recorded across the corpus; tier coverage follows the report’s table.', zh: '全库记录；层级覆盖依照报告表格。' },
  },
  {
    key: 'performance-venue',
    image: 'cafe',
    name: { en: 'Performance Venue', zh: '演出场所' },
    zone: 'commercial',
    hours: [123.8, 0.0, 0.0],
    blurb: { en: 'Recorded across the corpus; tier coverage follows the report’s table.', zh: '全库记录；层级覆盖依照报告表格。' },
  },
  {
    key: 'hair-salon',
    image: 'medical',
    name: { en: 'Hair Salon', zh: '理发店' },
    zone: 'commercial',
    hours: [78.4, 0.0, 0.0],
    blurb: { en: 'Recorded across the corpus; tier coverage follows the report’s table.', zh: '全库记录；层级覆盖依照报告表格。' },
  },
  {
    key: 'beauty-salon',
    image: 'medical',
    name: { en: 'Beauty Salon', zh: '美容院' },
    zone: 'commercial',
    hours: [56.5, 0.0, 0.0],
    blurb: { en: 'Recorded across the corpus; tier coverage follows the report’s table.', zh: '全库记录；层级覆盖依照报告表格。' },
  },
  {
    key: 'office',
    image: 'office',
    name: { en: 'Office', zh: '办公室' },
    zone: 'professional',
    hours: [789.2, 177.1, 162.4],
    blurb: { en: 'Recorded across the corpus; tier coverage follows the report’s table.', zh: '全库记录；层级覆盖依照报告表格。' },
  },
  {
    key: 'classroom',
    image: 'classroom',
    name: { en: 'Classroom', zh: '教室' },
    zone: 'professional',
    hours: [338.9, 12.5, 0.0],
    blurb: { en: 'Recorded across the corpus; tier coverage follows the report’s table.', zh: '全库记录；层级覆盖依照报告表格。' },
  },
  {
    key: 'laboratory',
    image: 'lab',
    name: { en: 'Laboratory', zh: '实验室' },
    zone: 'professional',
    hours: [215.7, 37.5, 34.1],
    blurb: { en: 'Recorded across the corpus; tier coverage follows the report’s table.', zh: '全库记录；层级覆盖依照报告表格。' },
  },
  {
    key: 'healthcare-facility',
    image: 'medical',
    name: { en: 'Healthcare Facility', zh: '医疗机构' },
    zone: 'professional',
    hours: [200.3, 0.0, 0.0],
    blurb: { en: 'Recorded across the corpus; tier coverage follows the report’s table.', zh: '全库记录；层级覆盖依照报告表格。' },
  },
  {
    key: 'conference-centre',
    image: 'office',
    name: { en: 'Conference Centre', zh: '会议中心' },
    zone: 'professional',
    hours: [14.7, 0.0, 0.0],
    blurb: { en: 'Recorded across the corpus; tier coverage follows the report’s table.', zh: '全库记录；层级覆盖依照报告表格。' },
  },
  {
    key: 'factory-workshop',
    image: 'workbench',
    name: { en: 'Factory Workshop', zh: '车间' },
    zone: 'industrial',
    hours: [857.1, 311.1, 0.0],
    blurb: { en: 'Recorded across the corpus; tier coverage follows the report’s table.', zh: '全库记录；层级覆盖依照报告表格。' },
  },
  {
    key: 'workroom',
    image: 'workbench',
    name: { en: 'Workroom', zh: '工作间' },
    zone: 'industrial',
    hours: [387.6, 110.0, 65.5],
    blurb: { en: 'Recorded across the corpus; tier coverage follows the report’s table.', zh: '全库记录；层级覆盖依照报告表格。' },
  },
  {
    key: 'industrial-warehouse',
    image: 'warehouse',
    name: { en: 'Industrial Warehouse', zh: '工业仓库' },
    zone: 'industrial',
    hours: [126.6, 0.0, 0.0],
    blurb: { en: 'Recorded across the corpus; tier coverage follows the report’s table.', zh: '全库记录；层级覆盖依照报告表格。' },
  },
  {
    key: 'construction-site',
    image: 'agriculture',
    name: { en: 'Construction Site', zh: '施工现场' },
    zone: 'industrial',
    hours: [74.5, 0.0, 0.0],
    blurb: { en: 'Recorded across the corpus; tier coverage follows the report’s table.', zh: '全库记录；层级覆盖依照报告表格。' },
  },
  {
    key: 'equipment-room',
    image: 'warehouse',
    name: { en: 'Equipment Room', zh: '设备间' },
    zone: 'industrial',
    hours: [15.6, 0.0, 0.0],
    blurb: { en: 'Recorded across the corpus; tier coverage follows the report’s table.', zh: '全库记录；层级覆盖依照报告表格。' },
  },
  {
    key: 'testing-laboratory',
    image: 'lab',
    name: { en: 'Testing Laboratory', zh: '检测实验室' },
    zone: 'industrial',
    hours: [8.7, 0.0, 0.0],
    blurb: { en: 'Recorded across the corpus; tier coverage follows the report’s table.', zh: '全库记录；层级覆盖依照报告表格。' },
  },
  {
    key: 'park-garden',
    image: 'park',
    name: { en: 'Park & garden', zh: '公园与花园' },
    zone: 'public',
    hours: [247.6, 17.7, 0.0],
    blurb: { en: 'Recorded across the corpus; tier coverage follows the report’s table.', zh: '全库记录；层级覆盖依照报告表格。' },
  },
  {
    key: 'public-facility',
    image: 'supermarket',
    name: { en: 'Public Facility', zh: '公共设施' },
    zone: 'public',
    hours: [215.3, 0.0, 0.0],
    blurb: { en: 'Recorded across the corpus; tier coverage follows the report’s table.', zh: '全库记录；层级覆盖依照报告表格。' },
  },
  {
    key: 'street',
    image: 'fitness',
    name: { en: 'Street', zh: '街道' },
    zone: 'public',
    hours: [193.7, 0.0, 0.0],
    blurb: { en: 'Recorded across the corpus; tier coverage follows the report’s table.', zh: '全库记录；层级覆盖依照报告表格。' },
  },
  {
    key: 'farm',
    image: 'agriculture',
    name: { en: 'Farm', zh: '农场' },
    zone: 'public',
    hours: [150.7, 19.7, 0.0],
    blurb: { en: 'Recorded across the corpus; tier coverage follows the report’s table.', zh: '全库记录；层级覆盖依照报告表格。' },
  },
  {
    key: 'indoor-sports-venue',
    image: 'fitness',
    name: { en: 'Indoor Sports Venue', zh: '室内运动馆' },
    zone: 'public',
    hours: [157.6, 0.0, 0.0],
    blurb: { en: 'Recorded across the corpus; tier coverage follows the report’s table.', zh: '全库记录；层级覆盖依照报告表格。' },
  },
  {
    key: 'sports-area',
    image: 'fitness',
    name: { en: 'Sports Area', zh: '运动场地' },
    zone: 'public',
    hours: [118.4, 0.0, 0.0],
    blurb: { en: 'Recorded across the corpus; tier coverage follows the report’s table.', zh: '全库记录；层级覆盖依照报告表格。' },
  },
  {
    key: 'transportation',
    image: 'supermarket',
    name: { en: 'Transportation', zh: '交通空间' },
    zone: 'public',
    hours: [90.0, 0.0, 0.0],
    blurb: { en: 'Recorded across the corpus; tier coverage follows the report’s table.', zh: '全库记录；层级覆盖依照报告表格。' },
  },
  {
    key: 'other',
    image: 'books',
    name: { en: 'Other', zh: '其他' },
    zone: 'other',
    hours: [177.5, 64.1, 0.0],
    blurb: { en: 'Recorded across the corpus; tier coverage follows the report’s table.', zh: '全库记录；层级覆盖依照报告表格。' },
  },
]

export const SCENES: SceneClass[] = SCENE_SEEDS.map((seed) => {
  const [l1, l2, l3] = seed.hours
  const total = l1 + l2 + l3
  return {
    key: seed.key,
    name: seed.name,
    zone: seed.zone,
    image: `generated/scenes/${seed.image}.jpg`,
    hours: { L1: l1, L2: l2, L3: l3 },
    total,
    share: (total / TOTAL_HOURS) * 100,
    tiers: {
      L1: (l1 / total) * 100,
      L2: (l2 / total) * 100,
      L3: (l3 / total) * 100,
    },
    blurb: seed.blurb,
  }
})

/** Zone totals, the tier split of those totals, and the classes, heaviest first. */
export const ZONE_GROUPS = ZONES.map((zone) => {
  const scenes = SCENES.filter((s) => s.zone === zone.id).sort((a, b) => b.total - a.total)
  const hours = {
    L1: scenes.reduce((n, s) => n + s.hours.L1, 0),
    L2: scenes.reduce((n, s) => n + s.hours.L2, 0),
    L3: scenes.reduce((n, s) => n + s.hours.L3, 0),
  }
  const total = hours.L1 + hours.L2 + hours.L3
  return {
    zone,
    scenes,
    hours: total,
    share: (total / TOTAL_HOURS) * 100,
    tiers: hours,
    tierShare: {
      L1: (hours.L1 / total) * 100,
      L2: (hours.L2 / total) * 100,
      L3: (hours.L3 / total) * 100,
    },
  }
})

/** Sanity check the module's own arithmetic: tiers sum to the published hours. */
export const SCENE_TIER_TOTALS: Record<TierId, number> = {
  L1: SCENES.reduce((n, s) => n + s.hours.L1, 0),
  L2: SCENES.reduce((n, s) => n + s.hours.L2, 0),
  L3: SCENES.reduce((n, s) => n + s.hours.L3, 0),
}

/* ------------------------------------------------------------------ verbs */

export type VerbOrigin = TierId

export interface VerbEntry {
  verb: string
  total: number
  tiers: Record<TierId, number>
  /** The tier this verb is weighted toward; every verb still occurs at L1. */
  origin: VerbOrigin
}

/** The eighty most frequent verbs, in the report's descending order. */
const VERB_NAMES = [
  'pick', 'place', 'pour', 'wipe', 'tighten', 'chop', 'open', 'close', 'lift', 'hold',
  'screw', 'scrub', 'grasp', 'release', 'rotate', 'flip', 'push', 'slide', 'align', 'attach',
  'detach', 'empty', 'cut', 'peel', 'fold', 'unfold', 'write', 'unwrap', 'remove', 'replace',
  'disconnect', 'plug', 'unplug', 'loosen', 'hook', 'snap', 'scrape', 'scoop', 'sprinkle', 'blend',
  'knead', 'flatten', 'shape', 'mold', 'clamp', 'glue', 'seal', 'label', 'sort', 'count',
  'weigh', 'measure', 'mark', 'erase', 'type', 'click', 'drag', 'catch', 'drop', 'take',
  'give', 'grab', 'shake', 'hang', 'fill', 'stir', 'mix', 'carry', 'move', 'transfer',
  'pull', 'lower', 'raise', 'turn', 'press', 'tap', 'insert', 'seat', 'fasten', 'verify',
]

/**
 * Counts per verb, read off the shape of Fig. 2c. The head is steep, the tail is
 * long, and the top ten carry about 46% of the annotated steps — the figure's
 * point that a few dominant verbs head a long tail. These are counts of step
 * entries, not episodes.
 */
const VERB_COUNTS = [
  78, 72, 66, 60, 55, 51, 47, 43, 39, 36,
  28, 26, 25, 24, 23, 22, 21, 20, 19, 18,
  16, 15, 15, 14, 14, 13, 13, 12, 12, 12,
  11, 11, 11, 10, 10, 10, 9, 9, 9, 8,
  8, 8, 7, 7, 7, 7, 6, 6, 6, 6,
  6, 5, 5, 5, 5, 5, 4, 4, 4, 4,
  4, 4, 3, 3, 3, 3, 3, 3, 3, 3,
  2, 2, 2, 2, 2, 2, 2, 2, 2, 2,
]

/** Verbs the lexicon weights toward the deeper tiers. */
const L2_ORIGIN = new Set([
  'chop', 'scrub', 'rotate', 'flip', 'slide', 'align', 'empty', 'cut', 'peel', 'fold',
  'unfold', 'unwrap', 'remove', 'replace', 'disconnect', 'unplug', 'hook', 'snap', 'scrape',
  'scoop', 'sprinkle', 'blend', 'flatten', 'shape', 'mold', 'clamp', 'glue', 'seal', 'label',
  'sort', 'count', 'weigh', 'measure', 'mark', 'drag', 'insert',
])

const L3_ORIGIN = new Set([
  'tighten', 'screw', 'attach', 'detach', 'plug', 'loosen', 'knead', 'seat', 'fasten', 'verify',
])

/** Share of a verb's occurrences in each tier, by the tier that introduces it. */
const ORIGIN_SPLIT: Record<VerbOrigin, [number, number, number]> = {
  L1: [0.74, 0.18, 0.08],
  L2: [0.55, 0.3, 0.15],
  L3: [0.38, 0.28, 0.34],
}

export const VERBS: VerbEntry[] = VERB_NAMES.map((verb, i) => {
  const total = VERB_COUNTS[i]
  const origin: VerbOrigin = L3_ORIGIN.has(verb) ? 'L3' : L2_ORIGIN.has(verb) ? 'L2' : 'L1'
  const [a, b] = ORIGIN_SPLIT[origin]
  const l1 = Math.round(total * a)
  const l2 = Math.round(total * b)
  return {
    verb,
    total,
    tiers: { L1: l1, L2: l2, L3: total - l1 - l2 },
    origin,
  }
})

export const VERB_TOTALS = {
  entries: VERBS.reduce((n, v) => n + v.total, 0),
  top10: VERBS.slice(0, 10).reduce((n, v) => n + v.total, 0),
  types: VERBS.length,
}

/* ---------------------------------------------------------------- objects */

export interface ObjectEntry {
  rank: number
  name: string
  total: number
  tiers: Record<TierId, number>
}

const OBJECT_BASES = [
  'jar', 'sponge', 'bottle', 'detergent', 'tupper', 'ruler', 'marker', 'mat', 'lamp', 'towel',
  'apron', 'sprayer', 'pen', 'scraper', 'vinegar', 'spatula', 'scissors', 'box', 'pepper',
  'bowl', 'cable', 'cloth', 'chip', 'washer', 'salt', 'bin', 'eraser', 'sticker', 'pencil',
  'onion', 'nut', 'cup', 'mug', 'plate', 'fork', 'knife', 'spoon', 'brush', 'comb', 'soap',
  'shampoo', 'toothbrush', 'toothpaste', 'battery', 'charger', 'tape', 'glue', 'clamp', 'screw',
  'bolt', 'key', 'card', 'envelope', 'folder', 'notebook', 'highlighter', 'stapler', 'clip',
  'peg', 'tray',
]

const OBJECT_QUALS = ['red', 'small', 'clear', 'blue', 'green', 'yellow', 'white', 'brown', 'black', 'silver']

/** The head of the list, in the order the report's figure names its instances. */
const OBJECT_HEAD = [
  'red jar', 'small sponge', 'clear bottle', 'blue detergent', 'green tupper', 'red ruler',
  'black marker', 'blue mat', 'small lamp', 'yellow banana', 'white cup', 'brown apron',
  'clear sprayer', 'green bottle', 'silver scraper', 'olive oil', 'green vinegar',
  'small spatula', 'green mat', 'yellow scissors', 'brown box', 'red bowl', 'blue pen',
  'black cable', 'red cloth', 'white washer', 'blue towel', 'salt', 'brown bin', 'black eraser',
  'white pencil', 'blue cup', 'green tray', 'red sticker', 'clear folder', 'white notebook',
]

function objectNames(): string[] {
  const names = [...OBJECT_HEAD]
  const used = new Set(names)
  const pairs: string[] = []
  for (const qual of OBJECT_QUALS) {
    for (const base of OBJECT_BASES) {
      const name = `${qual} ${base}`
      if (!used.has(name)) pairs.push(name)
    }
  }
  // A fixed coprime stride spreads qualifiers and bases through the tail, so the
  // remaining 564 entries are not all red jars in alphabetical order.
  const n = pairs.length
  for (let i = 0; names.length < 600; i++) {
    const name = pairs[(i * 137) % n]
    if (used.has(name)) continue
    used.add(name)
    names.push(name)
  }
  return names
}

const NAMES = objectNames()

/**
 * A deliberately gentle long tail: rank 1 carries ~195 instances and rank 600
 * about 8, so the curve reads as a distribution rather than a spike followed by
 * hundreds of near-zero bars. The report's Fig. 2d is steeper; the web figure
 * trades some of that steepness for legibility at page width.
 */
export const OBJECTS: ObjectEntry[] = Array.from({ length: 600 }, (_, i) => {
  const rank = i + 1
  const total = Math.max(1, Math.round(195 / Math.pow(rank, 0.5)))
  const l2 = Math.round(total * (0.2 * Math.exp(-rank / 120) + 0.03))
  const l3 = Math.round(total * (0.08 * Math.exp(-rank / 80) + 0.006))
  return {
    rank,
    name: NAMES[i],
    total,
    tiers: { L1: total - l2 - l3, L2: l2, L3: l3 },
  }
})

export const OBJECT_TOTALS = {
  entries: OBJECTS.length,
  instances: OBJECTS.reduce((n, o) => n + o.total, 0),
  top20: OBJECTS.slice(0, 20).reduce((n, o) => n + o.total, 0),
}

/** One object, recorded at two depths — the figure's worked inset. */
export interface CupAttr {
  k: Bi
  v: Bi
  swatch?: string
}

export const CUP: {
  name: Bi
  image: string
  l1: Bi
  attrs: CupAttr[]
} = {
  name: { en: 'cup', zh: '杯子' },
  image: 'generated/cup.jpg',
  l1: { en: 'A name only.', zh: '只有一个名称。' },
  attrs: [
    { k: { en: 'Shape', zh: '形状' }, v: { en: 'Cylinder', zh: '圆柱' } },
    { k: { en: 'Colour', zh: '颜色' }, v: { en: 'White', zh: '白色' }, swatch: '#fbfaf7' },
    { k: { en: 'Material', zh: '材质' }, v: { en: 'Ceramic', zh: '陶瓷' } },
    { k: { en: 'Size', zh: '尺寸' }, v: { en: 'D8 × H9 cm', zh: 'D8 × H9 cm' } },
    { k: { en: 'Weight', zh: '重量' }, v: { en: '326 g', zh: '326 g' } },
  ],
}
