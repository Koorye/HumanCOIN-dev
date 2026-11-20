/**
 * §02 — the data distribution, read straight from the report's Fig. 2 tables.
 *
 * The four CSVs beside this file are the report's own tables, copied verbatim
 * from the paper repository (`src/data/fig2/`), and nothing here is modelled or
 * fitted: every count below is parsed from them at module load.
 *
 *   scenes.csv            38 rows · category, name, hours per tier
 *   actions.csv          145 rows · 99 task-level verbs + 46 atomic primitives
 *   objects.csv          635 rows · object classes, annotation occurrences
 *   episode_profiles.csv 189 rows · duration and subtask-count profiles
 *
 * Two columns are named `L2_estimated` in the source: the middle tier's per-item
 * split is the report's estimate, not a measured count. They are read as L2 and
 * the figure says so.
 *
 * The only figures that do not come from these files are the tier names, the
 * open / controlled protocol split (stated in the report's text, not tabulated
 * per class) and the cup inset — they are carried over unchanged.
 */
import type { Bi } from '@/content'

import scenesCsv from './fig2/scenes.csv?raw'
import actionsCsv from './fig2/actions.csv?raw'
import objectsCsv from './fig2/objects.csv?raw'
import episodesCsv from './fig2/episode_profiles.csv?raw'

export type TierId = 'L1' | 'L2' | 'L3'
export type ZoneId = 'residential' | 'commercial' | 'professional' | 'industrial' | 'public' | 'other'
export type SettingId = 'controlled' | 'open'

const TIER_IDS = ['L1', 'L2', 'L3'] as const
export { TIER_IDS }

const num = (v: string | undefined): number => {
  const n = Number(v)
  return Number.isFinite(n) ? n : 0
}

type Row = Record<string, string>

/** A small RFC 4180 reader: quoted cells, doubled quotes, LF or CRLF. */
function parseCsv(text: string): Row[] {
  const rows: string[][] = []
  let cells: string[] = []
  let cell = ''
  let quoted = false

  for (let i = 0; i < text.length; i += 1) {
    const ch = text[i]
    if (quoted) {
      if (ch === '"') {
        if (text[i + 1] === '"') {
          cell += '"'
          i += 1
        } else quoted = false
      } else cell += ch
      continue
    }
    if (ch === '"') quoted = true
    else if (ch === ',') {
      cells.push(cell)
      cell = ''
    } else if (ch === '\n') {
      cells.push(cell)
      rows.push(cells)
      cells = []
      cell = ''
    } else if (ch !== '\r') cell += ch
  }
  if (cell || cells.length) {
    cells.push(cell)
    rows.push(cells)
  }

  const [head, ...body] = rows.filter((r) => r.some((c) => c.trim() !== ''))
  if (!head) return []
  return body.map((r) => {
    const row: Row = {}
    head.forEach((h, i) => {
      row[h.trim()] = (r[i] ?? '').trim()
    })
    return row
  })
}

/* ------------------------------------------------------------------ tiers */

export interface Tier {
  id: TierId
  name: Bi
  hours: number
  share: number
  color: string
  tint: string
  question: Bi
  adds: Bi
  /** Share of the tier's own hours, in per cent. From the report's protocol text. */
  setting: Record<SettingId, number>
}

const TIER_META: Omit<Tier, 'hours' | 'share'>[] = [
  {
    id: 'L1',
    name: { en: 'Visual intention', zh: '视觉意图' },
    color: 'var(--c-blue)',
    tint: 'var(--t-blue)',
    question: { en: 'What was seen', zh: '看到了什么' },
    adds: { en: 'Four-lens headband', zh: '四目头带' },
    setting: { open: 100, controlled: 0 },
  },
  {
    id: 'L2',
    name: { en: 'Motor intention', zh: '动作意图' },
    color: 'var(--c-teal)',
    tint: 'var(--t-teal)',
    question: { en: 'How the body executed', zh: '身体如何执行' },
    adds: { en: 'Wrist cameras · surface EMG', zh: '腕部相机 · 表面肌电' },
    setting: { open: 60, controlled: 40 },
  },
  {
    id: 'L3',
    name: { en: 'Cognitive intention', zh: '认知意图' },
    color: 'var(--c-violet)',
    tint: 'var(--t-violet)',
    question: { en: 'What the brain decided', zh: '大脑决定了什么' },
    adds: { en: 'EEG · eye tracker · gloves', zh: '脑电 · 眼动 · 手套' },
    setting: { open: 30, controlled: 70 },
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

const ZONE_META: { id: ZoneId; name: Bi }[] = [
  { id: 'residential', name: { en: 'Residential', zh: '居住' } },
  { id: 'commercial', name: { en: 'Commercial', zh: '商业' } },
  { id: 'professional', name: { en: 'Professional', zh: '专业' } },
  { id: 'industrial', name: { en: 'Industrial', zh: '工业' } },
  { id: 'public', name: { en: 'Public', zh: '公共' } },
  { id: 'other', name: { en: 'Residual', zh: '残余类' } },
]

/**
 * The report's scene table carries no Chinese names, so these are the section's
 * own translations of the 38 classes; the English names come from the CSV.
 */
const SCENE_ZH: Record<string, string> = {
  kitchen: '厨房',
  living_room: '客厅',
  dining_room: '餐厅',
  storage_room: '储藏室',
  bathroom: '浴室',
  bedroom: '卧室',
  study_room: '书房',
  laundry_area: '洗衣区',
  balcony: '阳台',
  retail_store: '零售店',
  logistics_facility: '物流中心',
  entertainment_venue: '娱乐场所',
  restaurant: '餐馆',
  beverage_shop: '饮品店',
  pet_shop: '宠物店',
  hotel: '酒店',
  performance_venue: '演出场所',
  hair_salon: '理发店',
  beauty_salon: '美容院',
  office: '办公室',
  classroom: '教室',
  laboratory: '实验室',
  healthcare_facility: '医疗机构',
  conference_center: '会议中心',
  factory_workshop: '车间',
  workroom: '工作间',
  industrial_warehouse: '工业仓库',
  construction_site: '施工现场',
  equipment_room: '设备间',
  testing_lab: '检测实验室',
  park_garden: '公园与花园',
  public_facility: '公共设施',
  street: '街道',
  farm: '农场',
  indoor_sports_venue: '室内运动馆',
  sports_area: '运动场地',
  transportation: '交通空间',
  other: '其他',
}

const prettyName = (raw: string): string =>
  raw
    .split('_')
    .map((w) => (w ? w[0].toUpperCase() + w.slice(1) : w))
    .join(' ')

const SCENE_ROWS = parseCsv(scenesCsv)

/** Per-class hours, in the CSV's own units (hours). */
export const SCENES: SceneClass[] = SCENE_ROWS.map((row) => {
  const key = row.name.replace(/_/g, '-')
  const hours: Record<TierId, number> = {
    L1: num(row.L1),
    L2: num(row.L2_estimated),
    L3: num(row.L3),
  }
  const total = hours.L1 + hours.L2 + hours.L3
  return {
    key,
    name: { en: prettyName(row.name), zh: SCENE_ZH[row.name] ?? prettyName(row.name) },
    zone: (row.category || 'other') as ZoneId,
    image: `scenes/${row.name}.jpg`,
    hours,
    total,
    share: 0,
    tiers: { L1: 0, L2: 0, L3: 0 },
    blurb: {
      en: 'Recorded across the corpus; tier coverage follows the report’s table.',
      zh: '全库记录；层级覆盖依照报告表格。',
    },
  }
})

const SCENE_HOURS = SCENES.reduce((n, s) => n + s.total, 0)

/* every share is taken against the table's own total, not a published round number */
export const TOTAL_HOURS = Math.round(SCENE_HOURS * 1000) / 1000

for (const s of SCENES) {
  s.share = (s.total / TOTAL_HOURS) * 100
  s.tiers = {
    L1: s.total ? (s.hours.L1 / s.total) * 100 : 0,
    L2: s.total ? (s.hours.L2 / s.total) * 100 : 0,
    L3: s.total ? (s.hours.L3 / s.total) * 100 : 0,
  }
}

const literal = (n: number) => Math.round(n * 1000) / 1000

export const TIERS: Tier[] = TIER_META.map((meta) => {
  const hours = literal(SCENES.reduce((n, s) => n + s.hours[meta.id], 0))
  return { ...meta, hours, share: (hours / TOTAL_HOURS) * 100 }
})

export function tierOf(id: TierId): Tier {
  return TIERS.find((t) => t.id === id)!
}

/** Hours of one tier recorded in one setting — the protocol split, from the report's text. */
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

export const ZONES: Zone[] = ZONE_META.map((meta) => {
  const rows = SCENES.filter((s) => s.zone === meta.id)
  const hours = rows.reduce((n, s) => n + s.total, 0)
  return {
    ...meta,
    note: {
      en: `${rows.length} classes, ${Math.round(hours).toLocaleString('en-US')} h`,
      zh: `${rows.length} 个类别，${Math.round(hours).toLocaleString('en-US')} 小时`,
    },
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
      L1: total ? (hours.L1 / total) * 100 : 0,
      L2: total ? (hours.L2 / total) * 100 : 0,
      L3: total ? (hours.L3 / total) * 100 : 0,
    },
  }
})

/** The table's own per-tier totals, for checking the sums. */
export const SCENE_TIER_TOTALS: Record<TierId, number> = {
  L1: literal(SCENES.reduce((n, s) => n + s.hours.L1, 0)),
  L2: literal(SCENES.reduce((n, s) => n + s.hours.L2, 0)),
  L3: literal(SCENES.reduce((n, s) => n + s.hours.L3, 0)),
}

/* ------------------------------------------------------------------ verbs */

export type VerbOrigin = TierId

export interface VerbEntry {
  verb: string
  name: Bi
  total: number
  tiers: Record<TierId, number>
  /** The tier that holds most of this verb's occurrences. */
  origin: VerbOrigin
}

const ACTION_ROWS = parseCsv(actionsCsv)

/**
 * The task-level vocabulary. The table lists 145 rows in two layers: 99
 * `subtask` verbs — which is the count the report and the page quote — and 46
 * `atomic` primitives below them. Only the subtask layer is the task ontology,
 * so that is what VERBS carries.
 */
export const VERBS: VerbEntry[] = ACTION_ROWS.filter((r) => r.layer === 'subtask').map((row) => {
  const tiers: Record<TierId, number> = {
    L1: num(row.L1),
    L2: num(row.L2_estimated),
    L3: num(row.L3),
  }
  const total = tiers.L1 + tiers.L2 + tiers.L3
  const origin = TIER_IDS.reduce((a, b) => (tiers[b] > tiers[a] ? b : a), 'L1' as TierId)
  return {
    verb: row.name,
    name: { en: row.name, zh: row.zh || row.name },
    total,
    tiers,
    origin,
  }
})

const VERB_SORTED = [...VERBS].sort((a, b) => b.total - a.total)

export const VERB_TOTALS = {
  entries: VERBS.reduce((n, v) => n + v.total, 0),
  top10: VERB_SORTED.slice(0, 10).reduce((n, v) => n + v.total, 0),
  types: VERBS.length,
}

/** The atomic primitives, kept so the two layers cannot be conflated again. */
export const ATOMIC_ACTIONS: { name: string; zh: string; total: number }[] = ACTION_ROWS.filter(
  (r) => r.layer !== 'subtask',
).map((row) => ({
  name: row.name,
  zh: row.zh,
  total: num(row.L1) + num(row.L2_estimated) + num(row.L3),
}))

/* ---------------------------------------------------------------- objects */

export interface ObjectEntry {
  rank: number
  name: string
  zh: string
  total: number
  tiers: Record<TierId, number>
}

const OBJECT_ROWS = parseCsv(objectsCsv)

export const OBJECTS: ObjectEntry[] = OBJECT_ROWS.map((row) => {
  const tiers: Record<TierId, number> = {
    L1: num(row.L1),
    L2: num(row.L2_estimated),
    L3: num(row.L3),
  }
  return {
    rank: 0,
    name: row.name,
    zh: row.zh || row.name,
    total: tiers.L1 + tiers.L2 + tiers.L3,
    tiers,
  }
})
  .sort((a, b) => b.total - a.total)
  .map((o, i) => ({ ...o, rank: i + 1 }))

export const OBJECT_TOTALS = {
  entries: OBJECTS.length,
  instances: OBJECTS.reduce((n, o) => n + o.total, 0),
  top20: OBJECTS.slice(0, 20).reduce((n, o) => n + o.total, 0),
}

/* ------------------------------------------------------- episode profiles */

export interface ProfileBin {
  /** The table's own bin label. */
  label: string
  L1: number
  L2: number
  L3: number
}

const EPISODE_ROWS = parseCsv(episodesCsv)

function profileOf(panel: string): ProfileBin[] {
  const bins: string[] = []
  for (const row of EPISODE_ROWS) {
    if (row.panel === panel && !bins.includes(row.bin)) bins.push(row.bin)
  }
  return bins.map((bin) => {
    const pick = (level: TierId) =>
      num(EPISODE_ROWS.find((r) => r.panel === panel && r.bin === bin && r.level === level)?.percentage)
    return { label: bin, L1: pick('L1'), L2: pick('L2'), L3: pick('L3') }
  })
}

/** Episode length in ten-second bins, as a percentage of each tier's episodes. */
export const DURATION_PROFILE: ProfileBin[] = profileOf('duration')

/** Subtasks per episode, as a percentage of each tier's episodes. */
export const SUBTASK_PROFILE: ProfileBin[] = profileOf('subtask')

/** The bin a tier's median falls in, read at the table's own resolution. */
function medianBin(rows: ProfileBin[], id: TierId): string {
  let acc = 0
  for (const r of rows) {
    acc += r[id]
    if (acc >= 50) return r.label
  }
  return rows[rows.length - 1]?.label ?? ''
}

export const DURATION_MEDIANS: Record<TierId, string> = {
  L1: medianBin(DURATION_PROFILE, 'L1'),
  L2: medianBin(DURATION_PROFILE, 'L2'),
  L3: medianBin(DURATION_PROFILE, 'L3'),
}

/* -------------------------------------------------------------- the inset */

/** One object, recorded at two depths — the report's worked example, not tabulated. */
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
