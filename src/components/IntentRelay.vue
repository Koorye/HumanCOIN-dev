<script setup lang="ts">
/**
 * Instrumentation by tier — a web-native reading of report Figure 4.
 *
 * Three kits, left to right, each carrying the one before it: new instruments
 * at full strength, carried ones repeated quietly below, and a small wearing
 * photograph at the head of each column. The photograph is a map, not a
 * portrait: numbered hotspots sit over the instruments it can show, so hovering
 * a chip — or the marker itself — lights the same body-worn device and writes
 * its reading into the fixed block under the three columns.
 *
 * The skin follows figures 06 and 07: white cards on a hairline border, 11px
 * mono ticks, 12–13px sans, small radii, no fills or shadows that compete with
 * the labels. The reading block is a stacked grid, so its height is the tallest
 * instrument's and never moves when the selection changes.
 */
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { DEVICE_META, TIERS, type Bi, type DeviceId, type Tier } from '@/content'
import { useI18n } from '@/composables/useI18n'

const { t } = useI18n()

type TierId = Tier['id']

/** Real product shots, keyed by the inventory's own ids. */
const SHOTS: Partial<Record<DeviceId, string>> = {
  rgb: 'hardware/headband.png',
  eeg: 'hardware/eeg-cap.png',
  gaze: 'hardware/eye-tracker.png',
  gloves: 'hardware/gloves.png',
  emg: 'hardware/emg.png',
  vive: 'hardware/tracker.png',
  wrist: 'hardware/wrist-camera.png',
}

/**
 * Worn-kit photographs, read at runtime rather than imported: a literal
 * `/wear/...` src is a public asset, not a module for Vite to resolve.
 * These three are the clean plates (2040 × 1880, white field, no callouts),
 * saved at 1200 px wide; the figure shows each one whole, never cropped.
 */
const WEAR: Record<TierId, string> = {
  L1: 'wear/person-l1.png',
  L2: 'wear/person-l2.png',
  L3: 'wear/person-l3.png',
}

/** Device number shared by the photograph markers and the reading block. */
const DEVICE_NO: Record<DeviceId, number> = {
  rgb: 1,
  wrist: 2,
  eeg: 3,
  emg: 4,
  gaze: 5,
  gloves: 6,
  vive: 7,
}

/**
 * Hotspots over the wearing photographs, in percentages of the 2040 × 1880
 * plate.
 *
 * The plates are shown whole, so these percentages are the source percentages
 * and stay put at every size. Numbered markers sit on the device a tier
 * introduces; carried devices — the headband, wrist cameras and EMG bands
 * already worn at a lower tier — get a small hollow dot instead. Bilateral
 * devices carry one marker per side.
 */
interface Spot {
  id: DeviceId
  x: number
  y: number
  /** Present at a lower tier, so the plate marks it with a hollow dot. */
  carried?: boolean
}

const HOTSPOTS: Record<TierId, Spot[]> = {
  L1: [{ id: 'rgb', x: 50, y: 13 }],
  L2: [
    { id: 'wrist', x: 28.5, y: 83.5 },
    { id: 'wrist', x: 71.5, y: 83.5 },
    { id: 'emg', x: 23.5, y: 90 },
    { id: 'emg', x: 76.5, y: 90 },
    { id: 'rgb', x: 50, y: 16, carried: true },
  ],
  L3: [
    { id: 'eeg', x: 43, y: 8.5 },
    { id: 'gaze', x: 56.5, y: 23 },
    { id: 'gloves', x: 22, y: 42 },
    { id: 'gloves', x: 78, y: 42 },
    { id: 'vive', x: 29.6, y: 56.8 },
    { id: 'vive', x: 68, y: 56.8 },
    { id: 'rgb', x: 50, y: 19, carried: true },
    { id: 'wrist', x: 20, y: 65.5, carried: true },
    { id: 'wrist', x: 78, y: 66.5, carried: true },
    { id: 'emg', x: 21.5, y: 58.5, carried: true },
    { id: 'emg', x: 75, y: 58.5, carried: true },
  ],
}

/**
 * Protection shapes for the veil, in the same percentage units.
 *
 * The veil is white, not a cut-out: these ellipses and the hotspot circles are
 * painted solid black into its mask, so every device — headband, cap, glasses,
 * gloves, tracker brackets, wrist cameras and the straps they sit on — stays at
 * full original contrast. The mask is then blurred behind those solid cores,
 * which feathers the veil out over ~30–40 screen pixels around each device.
 */
interface ProtectShape {
  x: number
  y: number
  rx: number
  ry: number
}

const PROTECT: Record<TierId, ProtectShape[]> = {
  L1: [{ x: 50, y: 12.5, rx: 18, ry: 9 }],
  L2: [
    { x: 50, y: 13, rx: 18, ry: 9 },
    { x: 28.5, y: 83, rx: 9.5, ry: 10 },
    { x: 71.5, y: 83, rx: 9.5, ry: 10 },
  ],
  L3: [
    { x: 50.5, y: 15, rx: 16.5, ry: 12 },
    { x: 24, y: 47.5, rx: 13.5, ry: 23.5 },
    { x: 76.5, y: 47.5, rx: 13.5, ry: 23.5 },
  ],
}

const META = new Map(DEVICE_META.map((m) => [m.id, m] as const))
const metaOf = (id: DeviceId) => META.get(id)!

function carries(tier: Tier, id: DeviceId): boolean {
  return tier.devices.some((d) => d.id === id) || tier.inherits.some((r) => r.ids.includes(id))
}

/** Where a device enters and where the kit carries it last, e.g. `L2 → L3`.
 *  The source tier is read from `TIERS.devices`, not `inherits.from`: the
 *  latter groups wrist under L1 in L3 although L2 introduces it. */
const ROUTE = new Map<DeviceId, string>(
  DEVICE_META.map((m) => {
    const ids = TIERS.filter((tier) => carries(tier, m.id)).map((tier) => tier.id)
    return [m.id, ids.length > 1 ? `${ids[0]} → ${ids[ids.length - 1]}` : ids[0]] as const
  }),
)

interface Spec {
  /** What the instrument physically records. */
  records: Bi
  /** Native rate; mono, because it is a measurement rather than prose. */
  rate: string
  /** Measured, or a measured view with an inferred derived quantity. */
  status: Bi
  setting: 'both' | 'controlled'
}

const SPECS: Record<DeviceId, Spec> = {
  rgb: {
    records: {
      en: 'Four synchronised views of the scene the operator faces; gaze and hand pose are inferred from them.',
      zh: '操作者面前场景的四路同步视角；注视与手部位姿由这些画面推断。',
    },
    rate: '20–60 fps at L1 · 30 fps from L2',
    status: {
      en: 'Measured video · gaze predicted outside controlled L3',
      zh: '画面实测 · 受控 L3 之外注视由预测',
    },
    setting: 'both',
  },
  emg: {
    records: {
      en: 'Surface EMG over the flexor and extensor bellies, eight channels per forearm.',
      zh: '前臂屈肌与伸肌腹表面的肌电，每臂 8 通道。',
    },
    rate: '2,000 Hz · 8 ch/arm',
    status: { en: 'Measured', zh: '实测' },
    setting: 'both',
  },
  wrist: {
    records: {
      en: 'A near-hand view along each forearm, where the head-mounted views cannot see.',
      zh: '沿前臂的近手视角，头戴相机看不到的位置。',
    },
    rate: '30 fps · 640×480',
    status: {
      en: 'Measured video · hand pose predicted outside controlled L3',
      zh: '画面实测 · 受控 L3 之外手部位姿由预测',
    },
    setting: 'both',
  },
  eeg: {
    records: {
      en: 'Cortical field potentials over the scalp, with impedance logged per channel.',
      zh: '头皮上的皮层场电位，逐通道记录阻抗。',
    },
    rate: '250 Hz · 8/32 ch open · 1,000 Hz · 128 ch controlled',
    status: { en: 'Measured', zh: '实测' },
    setting: 'both',
  },
  gaze: {
    records: {
      en: 'Binocular gaze in the scene-camera image; elsewhere inferred from the headband views.',
      zh: '场景相机画面中的双目注视；其余场景由头环视角推断。',
    },
    rate: '200 Hz',
    status: {
      en: 'Measured in controlled L3 · predicted elsewhere',
      zh: '受控 L3 实测 · 其余场景预测',
    },
    setting: 'controlled',
  },
  gloves: {
    records: {
      en: 'Twenty joint angles per hand, released as a 25-node skeleton per hand.',
      zh: '每手 20 个关节角，发布为每手 25 节点骨架。',
    },
    rate: '≈800 Hz fused · 20 joints/hand',
    status: { en: 'Measured', zh: '实测' },
    setting: 'controlled',
  },
  vive: {
    records: {
      en: 'Head and both wrists in one shared frame, in millimetres and 6-DoF.',
      zh: '头与双腕在同一坐标框架下的 6-DoF 位姿，单位为毫米。',
    },
    rate: '≈800 Hz fused · 3 trackers',
    status: { en: 'Measured', zh: '实测' },
    setting: 'controlled',
  },
}

/* ---- copy ---- */

const PROXY: Record<TierId, Bi> = {
  L1: { en: 'Attention', zh: '注意' },
  L2: { en: 'Effort', zh: '用力' },
  L3: { en: 'Cognition', zh: '认知' },
}

/** The report's one-line tier summaries are no longer printed in the column
 *  head; the tag and the numbers carry the head, and the reading block below
 *  carries the prose. The tier name itself comes from `TIERS[].name` and is
 *  intentionally not rendered here. */

const NEW_LABEL: Bi = { en: 'New at this tier', zh: '本层新增' }
const CARRIED_LABEL: Bi = { en: 'Carried from below', zh: '继承自下层' }
const EMPTY_CARRIED: Bi = {
  en: 'None — this tier starts the kit.',
  zh: '无 —— 本层即起始配置。',
}
const INSTRUMENTS: Bi = { en: 'instruments', zh: '件仪器' }
const BOTH_SETTINGS: Bi = { en: 'Both settings', zh: '两种场景' }
const CONTROLLED_ONLY: Bi = { en: 'Controlled L3 only', zh: '仅受控 L3' }
const RATE_LABEL: Bi = { en: 'Rate', zh: '采样率' }
const STATUS_LABEL: Bi = { en: 'Status', zh: '状态' }
const SETTING_LABEL: Bi = { en: 'Setting', zh: '场景' }
const READOUT_LABEL: Bi = { en: 'Instrument', zh: '仪器' }
/* The only explanation of the chip's dashed ring that survives outside the
   figure's own UI: a dashed swatch beside its meaning. */
const LEGEND: Bi = { en: 'L3 controlled', zh: '受控 L3' }
const HINT: Bi = {
  en: 'Hover or tab to an instrument — or to its marker on the wearing photo — to read it here.',
  zh: '悬停或用 Tab 选中仪器（或其穿戴实拍上的标记），在此读取说明。',
}

const TOTAL_HOURS = 12500
const hoursOf = (tier: Tier) => Number(tier.hours.replace(/,/g, ''))
const shareOf = (tier: Tier) => Math.round((hoursOf(tier) / TOTAL_HOURS) * 100)
const pad2 = (n: number) => String(n).padStart(2, '0')

function settingText(id: DeviceId): Bi {
  return SPECS[id].setting === 'controlled' ? CONTROLLED_ONLY : BOTH_SETTINGS
}
function countLabel(n: number): Bi {
  return { en: `${n} added`, zh: `新增 ${n}` }
}
function jointAria(adds: number, from: TierId): Bi {
  return {
    en: `Adds ${adds} instruments to ${from}`,
    zh: `新增 ${adds} 件仪器至 ${from}`,
  }
}
function wearAlt(tier: Tier): string {
  return t({
    en: `${tier.id} kit worn by an operator`,
    zh: `${tier.id} 操作者佩戴实拍`,
  })
}

interface Inst {
  key: string
  id: DeviceId
  tier: TierId
}

const COLS = TIERS.map((tier) => {
  const fresh: Inst[] = tier.devices.map((d) => ({
    key: `${tier.id}-new-${d.id}`,
    id: d.id,
    tier: tier.id,
  }))
  const carried: Inst[] = tier.inherits.flatMap((row) =>
    row.ids.map((id) => ({
      key: `${tier.id}-carried-${id}`,
      id,
      tier: tier.id,
    })),
  )
  return { tier, fresh, carried, total: fresh.length + carried.length }
})

const JOINTS = [
  { from: TIERS[0], target: TIERS[1] },
  { from: TIERS[1], target: TIERS[2] },
]

const ALL = COLS.flatMap((col) => [...col.fresh, ...col.carried])
const ACCENT: Record<TierId, string> = {
  L1: 'var(--c-blue)',
  L2: 'var(--c-teal)',
  L3: 'var(--c-violet)',
}

/* ---- selection: a row or a photo marker, never a floating card ----
   The same instrument appears in up to three columns; lighting every
   occurrence traces the carry-forward, while the reading block and the
   photograph follow the occurrence that is actually selected. */
interface Pick {
  tier: TierId
  id: DeviceId
}

const hovered = ref<Pick | null>(null)
const focused = ref<Pick | null>(null)
const spotHover = ref<Pick | null>(null)

const active = computed<Pick | null>(() => spotHover.value ?? hovered.value ?? focused.value)
const isLinked = (id: DeviceId) => active.value?.id === id
const isSelected = (tier: TierId, id: DeviceId) =>
  active.value?.tier === tier && active.value?.id === id

const READOUT = computed(() =>
  ALL.map((inst) => {
    const meta = metaOf(inst.id)
    const spec = SPECS[inst.id]
    const col = COLS.find((c) => c.tier.id === inst.tier)!
    const fresh = col.fresh.some((f) => f.id === inst.id)
    return {
      inst,
      code: meta.code,
      name: t(meta.name),
      number: DEVICE_NO[inst.id],
      fresh,
      route: ROUTE.get(inst.id) ?? '',
      where: t(meta.location),
      records: t(spec.records),
      rate: spec.rate,
      status: t(spec.status),
      setting: t(settingText(inst.id)),
      accent: ACCENT[inst.tier],
    }
  }),
)

function selectRow(tier: TierId, id: DeviceId) {
  hovered.value = { tier, id }
}
function clearRowHover() {
  hovered.value = null
}
function focusRow(tier: TierId, id: DeviceId) {
  focused.value = { tier, id }
}
function clearFocus() {
  focused.value = null
}
function selectSpot(tier: TierId, id: DeviceId) {
  spotHover.value = { tier, id }
}
function clearSpot() {
  spotHover.value = null
}
function dismiss() {
  hovered.value = null
  focused.value = null
  spotHover.value = null
}

/* Esc must clear even a hover-only reading: a keydown aimed at the page never
   reaches a row that was never focused, so listen once at the window. */
function onKeydown(event: KeyboardEvent) {
  if (event.key !== 'Escape' || !active.value) return
  const el = event.target as HTMLElement | null
  const tag = el?.tagName
  if (tag === 'INPUT' || tag === 'TEXTAREA' || el?.isContentEditable) return
  dismiss()
}
onMounted(() => window.addEventListener('keydown', onKeydown))
onBeforeUnmount(() => window.removeEventListener('keydown', onKeydown))

const readoutId = 'ir-desc'
const tierLabel = (tier: Tier) => `${tier.id} · ${t(PROXY[tier.id])}`
const spotsOf = (tier: TierId) => HOTSPOTS[tier]
</script>

<template>
  <div class="ir">
    <div class="ir__relay">
      <template v-for="(col, ci) in COLS" :key="col.tier.id">
        <section
          class="ir-tier"
          :aria-label="`${col.tier.id} · ${t(PROXY[col.tier.id])}`"
          :style="{ '--accent': ACCENT[col.tier.id] }"
          @mouseleave="clearRowHover"
        >
          <header class="ir-tier__head">
            <div class="ir-tier__top">
              <span class="ir-tier__tag mono"><i aria-hidden="true" />{{ tierLabel(col.tier) }}</span>
              <span class="ir-tier__hours mono">{{ col.tier.hours }} h · {{ shareOf(col.tier) }}%</span>
            </div>

            <!-- One operator wearing the kit this column records, shown whole
                 (never cropped), centered, with a soft white veil that clears
                 only around the markers. The cyan numbered dots are the only
                 callouts; carried devices get a hollow dot instead. -->
            <figure class="ir-wear">
              <img
                :src="WEAR[col.tier.id]"
                :alt="wearAlt(col.tier)"
                loading="lazy"
                decoding="async"
              />
              <svg class="ir-wear__veil" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
                <defs>
                  <filter :id="`ir-soft-${col.tier.id}`" x="-30%" y="-30%" width="160%" height="160%" color-interpolation-filters="sRGB">
                    <feGaussianBlur stdDeviation="5" />
                  </filter>
                  <mask :id="`ir-veil-${col.tier.id}`" maskUnits="userSpaceOnUse" x="0" y="0" width="100" height="100">
                    <rect width="100" height="100" fill="#fff" />
                    <!-- soft outer feather -->
                    <g :filter="`url(#ir-soft-${col.tier.id})`" fill="#000">
                      <ellipse
                        v-for="(box, bi) in PROTECT[col.tier.id]"
                        :key="`soft-box-${bi}`"
                        :cx="box.x"
                        :cy="box.y"
                        :rx="box.rx"
                        :ry="box.ry"
                      />
                      <circle
                        v-for="(spot, si) in spotsOf(col.tier.id)"
                        :key="`soft-spot-${si}`"
                        :cx="spot.x"
                        :cy="spot.y"
                        :r="spot.carried ? 7 : 9"
                      />
                    </g>
                    <!-- solid cores: everything inside these stays at full contrast -->
                    <g fill="#000">
                      <ellipse
                        v-for="(box, bi) in PROTECT[col.tier.id]"
                        :key="`core-box-${bi}`"
                        :cx="box.x"
                        :cy="box.y"
                        :rx="box.rx"
                        :ry="box.ry"
                      />
                      <circle
                        v-for="(spot, si) in spotsOf(col.tier.id)"
                        :key="`core-spot-${si}`"
                        :cx="spot.x"
                        :cy="spot.y"
                        :r="spot.carried ? 7 : 9"
                      />
                    </g>
                  </mask>
                </defs>
                <rect
                  width="100"
                  height="100"
                  fill="#fff"
                  opacity="0.5"
                  :mask="`url(#ir-veil-${col.tier.id})`"
                />
              </svg>
              <span
                v-for="(spot, si) in spotsOf(col.tier.id)"
                :key="`${spot.id}-${si}`"
                class="ir-spot"
                :class="{
                  'ir-spot--carried': spot.carried,
                  'is-on': isSelected(col.tier.id, spot.id),
                }"
                :style="{ left: `${spot.x}%`, top: `${spot.y}%` }"
                aria-hidden="true"
                @mouseenter="selectSpot(col.tier.id, spot.id)"
                @mouseleave="clearSpot"
              >
                <template v-if="!spot.carried">{{ DEVICE_NO[spot.id] }}</template>
              </span>
            </figure>
            <p class="sr-only">{{ t(col.tier.seats) }}</p>
          </header>

          <div class="ir-kit">
            <div class="ir-block">
              <p class="ir-block__label mono">
                <span>{{ t(NEW_LABEL) }}</span>
                <span class="ir-block__n">{{ pad2(col.fresh.length) }}</span>
              </p>
              <ul class="ir-list ir-list--new">
                <li v-for="inst in col.fresh" :key="inst.key" class="ir-item">
                  <div
                    class="ir-dev ir-dev--new"
                    :class="{ 'is-linked': isLinked(inst.id), 'is-on': isSelected(col.tier.id, inst.id) }"
                    tabindex="0"
                    :aria-label="`${metaOf(inst.id).code} · ${t(metaOf(inst.id).name)}`"
                    :aria-describedby="readoutId"
                    @mouseenter="selectRow(col.tier.id, inst.id)"
                    @mouseleave="clearRowHover"
                    @focus="focusRow(col.tier.id, inst.id)"
                    @blur="clearFocus"
                    @keydown.escape="dismiss"
                  >
                    <span class="ir-dev__shot">
                      <img
                        v-if="SHOTS[inst.id]"
                        :src="SHOTS[inst.id]"
                        alt=""
                        loading="lazy"
                        decoding="async"
                      />
                      <span
                        v-if="SPECS[inst.id].setting === 'controlled'"
                        class="ir-dev__ring"
                        aria-hidden="true"
                      />
                    </span>
                    <span class="ir-dev__code mono">{{ metaOf(inst.id).code }}</span>
                  </div>
                </li>
              </ul>
            </div>

            <div class="ir-block ir-block--carried">
              <p class="ir-block__label mono">
                <span>{{ t(CARRIED_LABEL) }}</span>
                <span class="ir-block__n">{{ pad2(col.carried.length) }}</span>
              </p>
              <ul v-if="col.carried.length" class="ir-list ir-list--carried">
                <li v-for="inst in col.carried" :key="inst.key" class="ir-item">
                  <div
                    class="ir-dev ir-dev--carried"
                    :class="{ 'is-linked': isLinked(inst.id), 'is-on': isSelected(col.tier.id, inst.id) }"
                    tabindex="0"
                    :aria-label="`${metaOf(inst.id).code} · ${t(metaOf(inst.id).name)}`"
                    :aria-describedby="readoutId"
                    @mouseenter="selectRow(col.tier.id, inst.id)"
                    @mouseleave="clearRowHover"
                    @focus="focusRow(col.tier.id, inst.id)"
                    @blur="clearFocus"
                    @keydown.escape="dismiss"
                  >
                    <span class="ir-dev__shot">
                      <img
                        v-if="SHOTS[inst.id]"
                        :src="SHOTS[inst.id]"
                        alt=""
                        loading="lazy"
                        decoding="async"
                      />
                    </span>
                    <span class="ir-dev__code mono">{{ metaOf(inst.id).code }}</span>
                  </div>
                </li>
              </ul>
              <p v-else class="ir-empty">{{ t(EMPTY_CARRIED) }}</p>
            </div>
          </div>

          <footer class="ir-tier__foot">
            <p class="ir-tier__kit mono">
              <b>{{ pad2(col.total) }}</b> · {{ t(INSTRUMENTS) }}
            </p>
          </footer>
        </section>

        <div
          v-if="JOINTS[ci]"
          class="ir-joint"
          role="presentation"
          :style="{ '--accent': ACCENT[JOINTS[ci].target.id] }"
        >
          <span class="ir-joint__rule" aria-hidden="true" />
          <span class="ir-joint__plus" aria-hidden="true">+</span>
          <span class="ir-joint__n mono" aria-hidden="true">{{ t(countLabel(JOINTS[ci].target.devices.length)) }}</span>
          <span class="sr-only">{{ t(jointAria(JOINTS[ci].target.devices.length, JOINTS[ci].from.id)) }}</span>
        </div>
      </template>
    </div>

    <!-- The reading block: one fixed panel under all three columns. Every
         instrument's copy is stacked in the same grid cell, so the panel is
         already as tall as its longest entry and no selection can move it. -->
    <div :id="readoutId" class="ir-read" role="region" :aria-label="t(READOUT_LABEL)">
      <div class="ir-read__aside">
        <p class="ir-read__kicker mono">{{ t(READOUT_LABEL) }}</p>
        <p class="ir-read__legend mono"><i aria-hidden="true" />{{ t(LEGEND) }}</p>
      </div>
      <div class="ir-read__stack">
        <p class="ir-read__hint" :class="{ 'is-off': !!active }" :aria-hidden="active ? 'true' : undefined">
          {{ t(HINT) }}
        </p>
        <article
          v-for="r in READOUT"
          :key="r.inst.key"
          class="ir-ro"
          :class="{ 'is-on': isSelected(r.inst.tier, r.inst.id) }"
          :style="{ '--accent': r.accent }"
          :aria-hidden="isSelected(r.inst.tier, r.inst.id) ? undefined : 'true'"
        >
          <header class="ir-ro__head">
            <span
              class="ir-ro__no mono"
              :class="{ 'is-hollow': !r.fresh }"
              aria-hidden="true"
            >{{ r.fresh ? r.number : '' }}</span>
            <span class="ir-ro__code mono">{{ r.code }}</span>
            <span class="ir-ro__name">{{ r.name }}</span>
            <span class="ir-ro__route mono">{{ r.route }} · {{ r.where }}</span>
          </header>
          <p class="ir-ro__records">{{ r.records }}</p>
          <dl class="ir-ro__specs">
            <div>
              <dt class="mono">{{ t(RATE_LABEL) }}</dt>
              <dd class="mono">{{ r.rate }}</dd>
            </div>
            <div>
              <dt class="mono">{{ t(STATUS_LABEL) }}</dt>
              <dd>{{ r.status }}</dd>
            </div>
            <div>
              <dt class="mono">{{ t(SETTING_LABEL) }}</dt>
              <dd>{{ r.setting }}</dd>
            </div>
          </dl>
        </article>
      </div>
    </div>
  </div>
</template>

<style scoped>
.mono { font-family: var(--ff-mono); }

.ir {
  --pad: clamp(0.85rem, 0.78rem + 0.22vw, 1rem);
  --photo: clamp(200px, 14.2vw, 232px);
  --joint-y: calc(var(--pad) + 0.48rem);
  --r-card: 6px;
  --r-chip: 4px;
}

/* ---- three stations, equal height, joined in order ---- */
.ir__relay {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 3.25rem minmax(0, 1fr) 3.25rem minmax(0, 1fr);
  align-items: stretch;
}

.ir-tier {
  display: flex;
  flex-direction: column;
  min-width: 0;
  padding: var(--pad) var(--pad) calc(var(--pad) - 2px);
  background: #fff;
  border: 1px solid var(--line);
  border-radius: var(--r-card);
}

/* ---- tier head ---- */
.ir-tier__head {
  flex: none;
  padding-bottom: 0.55rem;
  border-bottom: 1px solid var(--line);
}
.ir-tier__top {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 0.45rem;
}
.ir-tier__tag {
  display: inline-flex;
  align-items: center;
  gap: 0.38rem;
  font-size: 11px;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--ink-soft);
  white-space: nowrap;
}
.ir-tier__tag i {
  width: 5px;
  height: 5px;
  flex: none;
  border-radius: 1px;
  background: var(--accent);
}
.ir-tier__hours {
  font-size: 11px;
  letter-spacing: 0.02em;
  color: var(--ink-mute);
  white-space: nowrap;
}

/* ---- the wearing photograph: shown whole, centered, larger ---- */
.ir-wear {
  position: relative;
  width: var(--photo);
  max-width: 100%;
  aspect-ratio: 2040 / 1880;
  margin: 0.65rem auto 0;
  overflow: hidden;
  border: 1px solid var(--line-strong);
  border-radius: var(--r-chip);
  background: #fff;
}
.ir-wear img {
  display: block;
  width: 100%;
  height: 100%;
  object-fit: contain;
}
/* A white veil lets the body step back while the device areas stay crisp; the
   holes are cut in the same percentage coordinates as the markers, so the two
   cannot drift apart. */
.ir-wear__veil {
  position: absolute;
  inset: 0;
  z-index: 1;
  width: 100%;
  height: 100%;
  pointer-events: none;
}

/* ---- callout markers: cyan numbered dots, hollow dots for carried devices ---- */
.ir-spot {
  position: absolute;
  z-index: 2;
  display: grid;
  place-items: center;
  width: 16px;
  height: 16px;
  transform: translate(-50%, -50%);
  border: 1.5px solid #fff;
  border-radius: 50%;
  background: var(--c-teal);
  color: #fff;
  font-family: var(--ff-mono);
  font-size: 9px;
  font-weight: 600;
  line-height: 1;
  cursor: default;
  box-shadow:
    0 0 0 1px rgba(15, 111, 104, 0.32),
    0 1px 3px rgba(20, 32, 43, 0.22);
  transition:
    transform var(--dur-2) var(--ease-spring),
    box-shadow var(--dur-2) var(--ease),
    background-color var(--dur-2) var(--ease);
}
.ir-spot::before {
  content: '';
  position: absolute;
  z-index: -1;
  inset: -60%;
  border-radius: 50%;
  background: radial-gradient(circle, rgba(57, 178, 170, 0.4), rgba(57, 178, 170, 0) 70%);
  opacity: 0;
  transform: scale(0.7);
  transition: opacity var(--dur-2) var(--ease), transform var(--dur-2) var(--ease);
}
.ir-spot.is-on {
  transform: translate(-50%, -50%) scale(1.24);
  box-shadow:
    0 0 0 1.5px #fff,
    0 0 0 3.5px rgba(15, 111, 104, 0.5),
    0 0 18px 6px rgba(57, 178, 170, 0.5);
}
.ir-spot.is-on::before {
  opacity: 1;
  transform: scale(1);
  animation: ir-glow 2.4s var(--ease-io) infinite;
}
.ir-spot--carried {
  width: 8px;
  height: 8px;
  border-width: 1.2px;
  border-color: var(--c-teal);
  background: #fff;
  color: transparent;
  box-shadow: 0 0 0 1.2px rgba(255, 255, 255, 0.85);
}
.ir-spot--carried.is-on {
  transform: translate(-50%, -50%) scale(1.55);
  box-shadow:
    0 0 0 1.5px var(--c-teal),
    0 0 0 4px rgba(255, 255, 255, 0.9),
    0 0 16px 5px rgba(57, 178, 170, 0.55);
}
@keyframes ir-glow {
  0%, 100% { opacity: 0.55; }
  50% { opacity: 1; }
}
@media (prefers-reduced-motion: reduce) {
  .ir-spot.is-on::before { animation: none; opacity: 0.9; }
  .ir-spot { transition: none; }
}

/* ---- kit: new instruments, then the carried tray that absorbs height ---- */
.ir-kit {
  display: flex;
  flex: 1;
  flex-direction: column;
  min-height: 0;
  padding-top: 0.6rem;
}
.ir-block--carried {
  display: flex;
  flex: 1;
  flex-direction: column;
  margin-top: 0.65rem;
  padding-top: 0.6rem;
  border-top: 1px solid var(--line);
}
.ir-block__label {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 0.5rem;
  margin: 0 0 0.32rem;
  font-size: 11px;
  letter-spacing: 0.09em;
  text-transform: uppercase;
  color: var(--ink-mute);
}
.ir-block__n { color: var(--ink-soft); }
.ir-block:first-child .ir-block__n { color: var(--accent); }

.ir-list {
  margin: 0;
  padding: 0;
  list-style: none;
}
.ir-list--new {
  display: flex;
  flex-wrap: wrap;
  gap: 0.3rem;
}
.ir-list--carried {
  display: flex;
  flex: 1;
  flex-wrap: wrap;
  align-content: flex-start;
  gap: 0.12rem 0.4rem;
}

.ir-item { min-width: 0; }

/* ---- compact instrument chip ---- */
.ir-dev {
  display: flex;
  align-items: center;
  gap: 0.32rem;
  min-height: 1.9rem;
  padding: 2px 5px;
  border: 1px solid transparent;
  border-radius: var(--r-chip);
  transition:
    background var(--dur-2) var(--ease),
    border-color var(--dur-2) var(--ease),
    box-shadow var(--dur-2) var(--ease);
}
.ir-dev--new {
  flex: 0 0 auto;
  border-color: var(--line);
  background: #fff;
}
.ir-dev:hover,
.ir-dev:focus-visible {
  background: #f7fafc;
  border-color: var(--line-strong);
}
.ir-dev:focus-visible { outline: var(--focus); outline-offset: 1px; }
.ir-dev.is-linked {
  background: #f7fafc;
  border-color: var(--line-strong);
}
.ir-dev.is-on {
  background: #f3f9fb;
  border-color: var(--line-strong);
  box-shadow: inset 2px 0 0 var(--accent);
}
.ir-dev.is-on .ir-dev__code { color: var(--ink); }

.ir-dev__shot {
  position: relative;
  display: grid;
  flex: none;
  place-items: center;
  width: 1.35rem;
  height: 1.35rem;
}
.ir-dev__shot img {
  width: 100%;
  height: 100%;
  object-fit: contain;
  mix-blend-mode: multiply;
  transition: filter var(--dur-2) var(--ease), opacity var(--dur-2) var(--ease);
}
.ir-dev__ring {
  position: absolute;
  top: -1px;
  right: -2px;
  width: 0.42rem;
  height: 0.42rem;
  border: 1px dashed var(--c-violet);
  border-radius: 50%;
  background: #fff;
}
.ir-dev__code {
  font-size: 11px;
  font-weight: 400;
  line-height: 1.3;
  color: var(--ink-soft);
  letter-spacing: 0.03em;
}
.ir-dev--new .ir-dev__code { color: var(--ink); font-weight: 500; }

/* the same instrument, already established, at a lower volume */
.ir-dev--carried {
  gap: 0.28rem;
  min-height: 1.45rem;
  padding: 1px 4px;
}
.ir-dev--carried .ir-dev__shot { width: 1.05rem; height: 1.05rem; }
.ir-dev--carried .ir-dev__shot img { filter: grayscale(1); opacity: 0.45; }
.ir-dev--carried:hover .ir-dev__shot img,
.ir-dev--carried.is-linked .ir-dev__shot img,
.ir-dev--carried.is-on .ir-dev__shot img { filter: none; opacity: 1; }
.ir-dev--carried .ir-dev__code { color: var(--ink-mute); }
.ir-dev--carried.is-on .ir-dev__code { color: var(--ink); }

.ir-empty {
  display: grid;
  flex: 1;
  place-items: center;
  margin: 0;
  padding: 0.35rem 0;
  font-size: 12px;
  line-height: 1.45;
  text-align: center;
  color: var(--ink-mute);
}

/* ---- tier foot: the columns' shared baseline ---- */
.ir-tier__foot {
  flex: none;
  margin-top: 0.55rem;
  padding-top: 0.45rem;
  border-top: 1px solid var(--line);
}
.ir-tier__kit {
  margin: 0;
  font-size: 11px;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--ink-mute);
}
.ir-tier__kit b { color: var(--accent); font-weight: 600; }

/* ---- the joint: a plus on a hairline rail ---- */
.ir-joint {
  position: relative;
  align-self: stretch;
  min-height: 1px;
}
.ir-joint__rule {
  position: absolute;
  left: 0;
  right: 0;
  top: var(--joint-y);
  height: 1px;
  background-image: repeating-linear-gradient(
    90deg,
    var(--line-strong) 0 4px,
    transparent 4px 8px
  );
}
.ir-joint__plus {
  position: absolute;
  z-index: 1;
  top: var(--joint-y);
  left: 50%;
  display: grid;
  place-items: center;
  width: 1.15rem;
  height: 1.15rem;
  transform: translate(-50%, -50%);
  border: 1px solid var(--line-strong);
  border-radius: 50%;
  background: #fff;
  color: var(--ink-soft);
  font-family: var(--ff-sans);
  font-size: 0.8rem;
  line-height: 1;
  padding-bottom: 1px;
}
.ir-joint__n {
  position: absolute;
  top: calc(var(--joint-y) + 0.82rem);
  left: 50%;
  transform: translateX(-50%);
  padding: 0 0.1rem;
  background: #fff;
  font-size: 11px;
  letter-spacing: 0.02em;
  color: var(--ink-mute);
  white-space: nowrap;
}

/* ---- the fixed reading block under all three columns ---- */
.ir-read {
  display: grid;
  grid-template-columns: 6.5rem minmax(0, 1fr);
  gap: 0 1rem;
  margin-top: 1rem;
  padding-top: 0.75rem;
  border-top: 1px solid var(--line-strong);
}
.ir-read__aside {
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
  min-width: 0;
}
.ir-read__kicker {
  margin: 0;
  padding-top: 0.1rem;
  font-size: 11px;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: var(--ink-mute);
}
.ir-read__legend {
  display: flex;
  align-items: center;
  gap: 0.35rem;
  margin: 0;
  font-size: 11px;
  line-height: 1.3;
  letter-spacing: 0.02em;
  color: var(--ink-mute);
  white-space: nowrap;
}
.ir-read__legend i {
  width: 8px;
  height: 8px;
  flex: none;
  border: 1px dashed var(--c-violet);
  border-radius: 50%;
}
.ir-read__stack {
  display: grid;
  min-width: 0;
}
.ir-read__hint,
.ir-ro {
  grid-area: 1 / 1;
  min-width: 0;
  transition: opacity var(--dur-2) var(--ease), visibility 0s linear var(--dur-2);
}
.ir-read__hint {
  margin: 0;
  padding-top: 0.1rem;
  font-size: 12.5px;
  line-height: 1.5;
  color: var(--ink-mute);
}
/* show the idle line as soon as the selection clears; only the hide is delayed
   so the outgoing reading can fade */

.ir-read__hint:not(.is-off) { transition-delay: 0s; }
.ir-read__hint.is-off,
.ir-ro {
  opacity: 0;
  visibility: hidden;
}
.ir-ro.is-on {
  opacity: 1;
  visibility: visible;
  transition-delay: 0s;
}

.ir-ro__head {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.1rem 0.5rem;
}
.ir-ro__no {
  display: inline-grid;
  place-items: center;
  flex: none;
  width: 15px;
  height: 15px;
  border: 1.2px solid #fff;
  border-radius: 50%;
  background: var(--c-teal);
  color: #fff;
  font-size: 9px;
  font-weight: 600;
  line-height: 1;
  box-shadow: 0 0 0 1px rgba(15, 111, 104, 0.32);
}
.ir-ro__no.is-hollow {
  width: 8px;
  height: 8px;
  border-color: var(--c-teal);
  background: #fff;
  box-shadow: none;
}
.ir-ro__code {
  font-size: 11px;
  letter-spacing: 0.09em;
  color: var(--accent);
}
.ir-ro__name {
  font-size: 13px;
  font-weight: 600;
  line-height: 1.35;
  color: var(--ink);
}
.ir-ro__route {
  margin-left: auto;
  font-size: 11px;
  letter-spacing: 0.03em;
  color: var(--ink-mute);
  white-space: nowrap;
}
.ir-ro__records {
  margin: 0.32rem 0 0;
  font-size: 12.5px;
  line-height: 1.55;
  color: var(--ink-soft);
  max-width: 88ch;
}
.ir-ro__specs {
  display: flex;
  flex-wrap: wrap;
  gap: 0.18rem 1.5rem;
  margin: 0.34rem 0 0;
}
.ir-ro__specs > div {
  display: flex;
  align-items: baseline;
  gap: 0.42rem;
  min-width: 0;
}
.ir-ro__specs dt {
  font-size: 11px;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--ink-mute);
  white-space: nowrap;
}
.ir-ro__specs dd {
  margin: 0;
  font-size: 12px;
  line-height: 1.45;
  color: var(--ink-body);
}
.ir-ro__specs dd.mono { font-size: 11px; letter-spacing: 0.01em; }

/* ---- narrow screens: the same relay, turned 90°, still flowing ---- */
@media (max-width: 900px) {
  .ir__relay { grid-template-columns: minmax(0, 1fr); }
  .ir-tier { min-height: auto; }
  .ir-joint { min-height: 3.1rem; }
  .ir-joint__rule {
    left: 50%;
    right: auto;
    top: 0.7rem;
    bottom: 0.7rem;
    width: 1px;
    height: auto;
    background-image: repeating-linear-gradient(
      180deg,
      var(--line-strong) 0 4px,
      transparent 4px 8px
    );
  }
  .ir-joint__plus { top: 50%; }
  .ir-joint__n {
    top: 50%;
    left: calc(50% + 1.1rem);
    transform: translateY(-50%);
  }
}
@media (max-width: 640px) {
  .ir-read {
    grid-template-columns: minmax(0, 1fr);
    gap: 0.3rem;
  }
}
</style>
