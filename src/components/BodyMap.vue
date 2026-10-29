<script setup lang="ts">
import { computed } from 'vue'
import { ANATOMY, DEVICE_META, type DeviceId, type Tier } from '@/content'
import { useI18n } from '@/composables/useI18n'

/**
 * Front-view schematic of where the tier's instruments sit on the body.
 *
 * The right half of every paired part is authored against the landmark table
 * below and mirrored about x = 200, so the two sides are exactly equal and each
 * instrument anchor lands on a landmark rather than on an eyeballed pixel. Each
 * worn instrument carries a numbered badge whose number is its row in the tier's
 * inventory, so the figure and the list beside it are two views of one list.
 *
 * The canvas is deliberately wider than the figure needs: the side gutters hold
 * the badges, which keeps the plate close to square and lets it sit beside the
 * tier pyramid without leaving a column of empty page under either one.
 *
 * The art is schematic: it places instruments, and does not claim they are worn
 * simultaneously (see ANATOMY.note).
 */
const props = defineProps<{ tier: Tier; active?: DeviceId | null }>()
const emit = defineEmits<{ (e: 'select', id: DeviceId | null): void }>()
const { t } = useI18n()

/**
 * Landmarks in the 400 x 420 drawing space, in a little over seven heads — the
 * plain adult canon a placement drawing uses, rather than the eight-head fashion
 * canon, which reads as stretched at this size.
 *
 *   crown 20 · eye line 58 · chin 76 · shoulder line 112 · chest 140
 *   waist 178 · hip 226 · crotch 240 · knee 306 · ankle 376 · sole 398
 *   centre 200 · head half 22 · neck half 11 · shoulder tip 252
 *   chest side 231 · waist side 231 · hip side 241 · knee side 232
 *   ankle side 221
 */
const LANDMARKS = [112, 140, 178, 226, 306, 376]

/** Right half of the torso and pelvis, closed along the centre line. */
const HALF_TORSO = [
  'M200 98',
  'C216 98 232 100 244 106',
  'C250 110 252 116 250 122',
  'C246 130 241 134 236 138',
  'C235 150 233 162 231 174',
  'C230 180 230 184 231 190',
  'C232 200 236 208 242 216',
  'C245 222 244 228 238 232',
  'C226 237 213 240 200 240',
  'Z',
].join(' ')

/**
 * The arm, held slightly away from the body as in a placement drawing, ending in
 * a rounded hand so the wrist and glove have somewhere to sit. The top edge from
 * the armpit back to the shoulder tip is shared with HALF_TORSO, so the two
 * silhouettes meet without a seam.
 */
const HALF_ARM = [
  'M244 108',
  'C254 112 258 122 259 134',
  'C260 152 259 168 258 182',
  'C258 200 259 216 259 230',
  'C259 240 259 248 258 254',
  'C263 260 267 270 267 280',
  'C267 290 262 296 256 294',
  'C250 292 246 286 245 278',
  'C243 266 241 254 240 242',
  'C238 226 236 210 235 194',
  'C234 178 233 160 234 144',
  'C235 128 238 114 244 108',
  'Z',
].join(' ')

/** Right leg, from inside the pelvis down to a foot turned slightly out. */
const HALF_LEG = [
  'M203 226',
  'C222 224 238 228 239 242',
  'C240 258 238 276 234 292',
  'C232 300 232 308 232 316',
  'C231 330 228 344 225 356',
  'C223 366 222 372 221 376',
  'C226 382 236 386 243 388',
  'C249 390 250 394 244 396',
  'C236 398 227 397 224 393',
  'C220 388 219 382 218 376',
  'C216 366 214 356 213 346',
  'C211 330 210 316 210 304',
  'C209 288 208 272 208 256',
  'C208 244 206 234 203 226',
  'Z',
].join(' ')

/** The head, widest at the eye line, drawn once on the centre line. */
const HEAD = [
  'M200 20',
  'C213 20 222 32 222 51',
  'C222 62 219 71 213 76',
  'C209 79 205 80 200 80',
  'C195 80 191 79 187 76',
  'C181 71 178 62 178 51',
  'C178 32 187 20 200 20',
  'Z',
].join(' ')

/** Hollow joint marks on the silhouette half; the template mirrors them. */
const JOINTS: Array<[number, number, number]> = [
  [248, 116, 4.6],
  [258, 190, 4],
  [258, 252, 3.4],
  [238, 226, 4.2],
  [232, 306, 4.8],
  [221, 376, 3.2],
]

/**
 * Where each instrument's badge sits, and the landmark it points at. Badges run
 * down the two gutters; the head instruments take the right, the arm
 * instruments the left, so no leader has to cross the figure.
 */
const SLOTS: Record<DeviceId, { x: number; y: number; anchor: [number, number] }> = {
  vive: { x: 38, y: 28, anchor: [200, 22] },
  rgb: { x: 38, y: 74, anchor: [176, 58] },
  emg: { x: 38, y: 178, anchor: [150, 176] },
  wrist: { x: 38, y: 250, anchor: [146, 248] },
  gloves: { x: 38, y: 306, anchor: [148, 288] },
  eeg: { x: 362, y: 30, anchor: [216, 40] },
  rig: { x: 362, y: 82, anchor: [226, 64] },
  gaze: { x: 362, y: 132, anchor: [208, 58] },
}

/**
 * Instrument art in the same 400 x 420 space. `mid` pieces sit on the centre
 * line and are drawn once; `side` pieces belong to the figure's left and are
 * mirrored about x = 200, so a bilateral instrument is written once.
 */
const GLYPHS: Record<DeviceId, { mid?: string; side?: string }> = {
  vive: {
    mid:
      '<rect x="189" y="14" width="22" height="13" rx="4"/>' +
      '<circle cx="200" cy="20.5" r="2.8" fill="currentColor" fill-opacity=".95" stroke="none"/>',
    side:
      '<rect x="132" y="240" width="19" height="16" rx="4"/>' +
      '<circle cx="141.5" cy="248" r="3" fill="currentColor" fill-opacity=".95" stroke="none"/>',
  },
  rgb: {
    mid:
      '<path d="M172 51h56c4 0 7 3 7 7v9c0 4-3 7-7 7h-56c-4 0-7-3-7-7v-9c0-4 3-7 7-7Z"/>' +
      '<g fill="none">' +
      '<circle cx="182" cy="62.5" r="4"/><circle cx="194" cy="62.5" r="4"/>' +
      '<circle cx="206" cy="62.5" r="4"/><circle cx="218" cy="62.5" r="4"/>' +
      '</g>' +
      '<g fill="currentColor" fill-opacity=".95" stroke="none">' +
      '<circle cx="182" cy="62.5" r="1.6"/><circle cx="194" cy="62.5" r="1.6"/>' +
      '<circle cx="206" cy="62.5" r="1.6"/><circle cx="218" cy="62.5" r="1.6"/>' +
      '</g>',
  },
  rig: {
    mid:
      '<path d="M180 56c-3-20 7-33 20-33s23 13 20 33" fill="none"/>' +
      '<rect x="222" y="54" width="15" height="15" rx="4"/>' +
      '<rect x="163" y="54" width="15" height="15" rx="4"/>' +
      '<circle cx="229.5" cy="61.5" r="2.4" fill="currentColor" fill-opacity=".95" stroke="none"/>' +
      '<circle cx="170.5" cy="61.5" r="2.4" fill="currentColor" fill-opacity=".95" stroke="none"/>',
  },
  eeg: {
    mid:
      '<path d="M180 60c0-21 9-35 20-35s20 14 20 35c0 3-2 5-4 6-11-7-21-7-32 0-2-1-4-3-4-6Z"/>' +
      '<g fill="currentColor" fill-opacity=".95" stroke="none">' +
      '<circle cx="188" cy="35" r="2.2"/><circle cx="200" cy="32" r="2.2"/><circle cx="212" cy="35" r="2.2"/>' +
      '<circle cx="183" cy="46" r="2.2"/><circle cx="194" cy="43" r="2.2"/>' +
      '<circle cx="206" cy="43" r="2.2"/><circle cx="217" cy="46" r="2.2"/>' +
      '</g>',
  },
  gaze: {
    mid:
      '<path d="M176 73h48c4 0 7 3 7 7s-3 7-7 7h-48c-4 0-7-3-7-7s3-7 7-7Z"/>' +
      '<g fill="none"><circle cx="188" cy="80" r="4"/><circle cx="212" cy="80" r="4"/></g>' +
      '<g fill="currentColor" fill-opacity=".95" stroke="none">' +
      '<circle cx="188" cy="80" r="1.7"/><circle cx="212" cy="80" r="1.7"/><circle cx="200" cy="80" r="1.3"/>' +
      '</g>',
  },
  emg: {
    side:
      '<path d="M141 168l19-3 4 20-19 3Z"/>' +
      '<g fill="currentColor" fill-opacity=".95" stroke="none">' +
      '<circle cx="148" cy="178" r="3"/><circle cx="157" cy="177" r="3"/>' +
      '</g>',
  },
  gloves: {
    side:
      '<g fill="none">' +
      '<path d="M141 272c-4 11-4 22-1 31M149 271c3 11 4 22 2 32M139 297h15M140 285c5 3 9 4 13 3"/>' +
      '</g>' +
      '<g fill="currentColor" fill-opacity=".95" stroke="none">' +
      '<circle cx="141" cy="278" r="2.2"/><circle cx="149" cy="287" r="2.2"/>' +
      '<circle cx="140" cy="293" r="2.2"/><circle cx="150" cy="299" r="2.2"/>' +
      '</g>',
  },
  wrist: {
    side:
      '<path d="M137 240l19-2 3 18-19 2Z"/>' +
      '<circle cx="146" cy="249" r="3" fill="currentColor" fill-opacity=".95" stroke="none"/>',
  },
}

/** The tier decides what is worn; the figure and the inventory share the order. */
const rows = computed(() =>
  props.tier.devices.map((d, i) => {
    const slot = SLOTS[d.id]
    const [ax, ay] = slot.anchor
    const left = slot.x < 200
    return {
      id: d.id,
      n: String(i + 1).padStart(2, '0'),
      meta: DEVICE_META.find((m) => m.id === d.id)!,
      glyph: GLYPHS[d.id],
      badge: { x: slot.x, y: slot.y },
      leader: `M${slot.x + (left ? 12 : -12)} ${slot.y}L${ax} ${ay}`,
    }
  }),
)

const isActive = (id: DeviceId) => props.active === id
</script>

<template>
  <figure class="body">
    <figcaption class="body__head">
      <span class="body__kicker mono">{{ t(ANATOMY.kicker) }}</span>
      <h4 class="body__title">{{ t(ANATOMY.title) }}</h4>
      <p class="body__lead">{{ t(ANATOMY.lead) }}</p>
    </figcaption>

    <div class="body__panel">
      <svg
        viewBox="0 0 400 420"
        role="img"
        :aria-label="t(ANATOMY.figureLabel)"
        class="body__svg"
      >
        <defs>
          <linearGradient id="bm-skin" x1="0.15" x2="0.85" y1="0" y2="0.6">
            <stop offset="0" stop-color="#f7fbfd" />
            <stop offset=".58" stop-color="#e9f0f6" />
            <stop offset="1" stop-color="#dbe6ee" />
          </linearGradient>
          <!-- Interior modelling: clear on the lit side, shaded at the far edge. -->
          <linearGradient id="bm-shade" x1="0" x2="1" y1="0" y2="0">
            <stop offset="0" stop-color="#6f8da3" stop-opacity="0" />
            <stop offset=".58" stop-color="#6f8da3" stop-opacity=".1" />
            <stop offset="1" stop-color="#6f8da3" stop-opacity=".28" />
          </linearGradient>
          <radialGradient id="bm-ground" cx=".5" cy=".5" r=".5">
            <stop offset="0" stop-color="#6f8da3" stop-opacity=".26" />
            <stop offset="1" stop-color="#6f8da3" stop-opacity="0" />
          </radialGradient>
          <pattern id="bm-grid" width="20" height="20" patternUnits="userSpaceOnUse">
            <path d="M20 0H0v20" fill="none" stroke="var(--line)" stroke-width=".6" />
          </pattern>
        </defs>

        <rect x="0" y="0" width="400" height="420" fill="url(#bm-grid)" />

        <!-- Construction: the centre line, and the landmark heights the anchors
             are authored against. -->
        <g class="body__guides">
          <path d="M200 12v392" stroke-dasharray="3 7" />
          <path
            v-for="y in LANDMARKS"
            :key="`guide-${y}`"
            :d="`M150 ${y}H250`"
            stroke-dasharray="2 8"
          />
        </g>

        <ellipse cx="200" cy="404" rx="86" ry="8" fill="url(#bm-ground)" />

        <!-- Figure: legs, then arms, then the torso and head over them, so every
             overlap closes on the shape in front. -->
        <g class="body__anatomy">
          <g fill="url(#bm-skin)">
            <path :d="HALF_LEG" />
            <path :d="HALF_LEG" transform="translate(400 0) scale(-1 1)" />
            <rect x="189" y="68" width="22" height="42" rx="11" />
            <path :d="HALF_TORSO" />
            <path :d="HALF_TORSO" transform="translate(400 0) scale(-1 1)" />
            <path :d="HALF_ARM" />
            <path :d="HALF_ARM" transform="translate(400 0) scale(-1 1)" />
            <path :d="HEAD" />
          </g>
          <!-- One light source, from the figure's left, so the form reads without
               turning the silhouette into a shaded illustration. -->
          <g fill="url(#bm-shade)" stroke="none">
            <path :d="HALF_LEG" transform="translate(400 0) scale(-1 1)" />
            <path :d="HALF_TORSO" transform="translate(400 0) scale(-1 1)" />
            <path :d="HALF_ARM" transform="translate(400 0) scale(-1 1)" />
            <path :d="HEAD" transform="translate(400 0) scale(-1 1)" />
          </g>
        </g>

        <!-- Faint lines of form: the collar bones, the ribcage, the navel and the
             features, enough to read as a body and no more. -->
        <g class="body__contours">
          <path d="M185 110q15 7 30 0" />
          <path d="M200 120v42" />
          <path d="M184 150q16 13 32 0" />
          <path d="M200 182v26" />
          <path d="M188 196q12 8 24 0" />
          <path d="M188 58h8M204 58h8" />
          <path d="M200 66v6M194 74q6 4 12 0" />
        </g>

        <!-- Joint marks, on the silhouette half only. -->
        <g class="body__joints">
          <circle cx="200" cy="222" r="2.8" />
          <circle v-for="(j, i) in JOINTS" :key="`j-${i}`" :cx="j[0]" :cy="j[1]" :r="j[2]" />
          <g transform="translate(400 0) scale(-1 1)">
            <circle v-for="(j, i) in JOINTS" :key="`jm-${i}`" :cx="j[0]" :cy="j[1]" :r="j[2]" />
          </g>
        </g>

        <!-- Worn instruments for the selected tier. -->
        <g class="body__worn">
          <g
            v-for="r in rows"
            :key="`worn-${r.id}`"
            :class="{ 'is-active': isActive(r.id), 'is-dim': active && !isActive(r.id) }"
            aria-hidden="true"
          >
            <g v-if="r.glyph.mid" v-html="r.glyph.mid" />
            <template v-if="r.glyph.side">
              <g v-html="r.glyph.side" />
              <g transform="translate(400 0) scale(-1 1)" v-html="r.glyph.side" />
            </template>
          </g>
        </g>

        <!-- Numbered badges: the numbers are the rows of the tier inventory. -->
        <g class="body__badges">
          <g
            v-for="r in rows"
            :key="`badge-${r.id}`"
            :class="{ 'is-active': isActive(r.id), 'is-dim': active && !isActive(r.id) }"
            role="button"
            tabindex="0"
            :aria-pressed="isActive(r.id)"
            :aria-label="`${r.n} ${t(r.meta.name)} · ${t(r.meta.location)}`"
            @click="emit('select', isActive(r.id) ? null : r.id)"
            @keydown.enter.prevent="emit('select', isActive(r.id) ? null : r.id)"
            @keydown.space.prevent="emit('select', isActive(r.id) ? null : r.id)"
            @focus="emit('select', r.id)"
            @blur="emit('select', null)"
            @mouseenter="emit('select', r.id)"
            @mouseleave="emit('select', null)"
          >
            <path class="body__leader" :d="r.leader" />
            <circle class="body__badge" :cx="r.badge.x" :cy="r.badge.y" r="12" />
            <text class="body__badge-n mono" :x="r.badge.x" :y="r.badge.y + 4" text-anchor="middle">
              {{ r.n }}
            </text>
          </g>
        </g>

        <text x="12" y="414" class="body__micro mono">{{ t(ANATOMY.microTop) }}</text>
        <text x="388" y="414" class="body__micro mono" text-anchor="end">{{ t(ANATOMY.microBottom) }}</text>
      </svg>
    </div>

    <p class="body__note">{{ t(ANATOMY.note) }}</p>
  </figure>
</template>

<style scoped>
.mono { font-family: var(--ff-mono); }

.body { margin: 0; display: grid; align-content: start; gap: 0.75rem; }

.body__head { display: grid; gap: 0.35rem; }
.body__kicker {
  font-size: var(--fs-tick);
  letter-spacing: 0.15em;
  text-transform: uppercase;
  color: var(--accent);
}
.body__title { font-size: var(--fs-h4); margin: 0; }
.body__lead {
  font-size: var(--fs-small);
  line-height: 1.68;
  color: var(--ink-soft);
  margin: 0;
}

.body__panel {
  border: 1px solid var(--line);
  border-radius: var(--r-sm);
  background: linear-gradient(180deg, var(--paper) 0%, var(--surface) 100%);
  overflow: hidden;
}
.body__svg { display: block; width: 100%; height: auto; }

.body__guides { fill: none; stroke: var(--line-strong); stroke-width: 0.8; opacity: 0.42; }

.body__anatomy {
  fill: var(--surface-2);
  stroke: #7d99ad;
  stroke-width: 1.2;
  stroke-linejoin: round;
}

/* The contours are lines of form, so they must not inherit the fill. */
.body__contours {
  fill: none;
  stroke: #a3bac9;
  stroke-width: 0.8;
  opacity: 0.6;
  stroke-linecap: round;
}

.body__joints {
  fill: var(--paper);
  stroke: #93adbf;
  stroke-width: 0.8;
  opacity: 0.85;
}

/* `fill`/`stroke`/opacity set here are inherited by the v-html glyph children;
   the markup only overrides what must not inherit (lines, dots). */
.body__worn > g {
  color: var(--accent);
  fill: currentColor;
  fill-opacity: 0.2;
  stroke: currentColor;
  stroke-width: 1.4;
  stroke-linejoin: round;
  transition: opacity var(--dur) var(--ease), fill-opacity var(--dur) var(--ease);
}
.body__worn > g.is-active { fill-opacity: 0.42; }
.body__worn > g.is-dim { opacity: 0.26; }

.body__badges > g { cursor: pointer; outline: none; color: var(--ink-mute); }
.body__leader {
  fill: none;
  stroke: currentColor;
  stroke-width: 1;
  stroke-dasharray: 3 3;
  opacity: 0.5;
  transition: opacity var(--dur) var(--ease), stroke-width var(--dur) var(--ease);
}
.body__badge {
  fill: var(--paper);
  stroke: currentColor;
  stroke-width: 1.2;
  transition: fill var(--dur) var(--ease), stroke var(--dur) var(--ease);
}
.body__badge-n {
  font-size: 0.6rem;
  fill: currentColor;
  pointer-events: none;
  transition: fill var(--dur) var(--ease);
}
.body__badges > g.is-active { color: var(--accent); }
.body__badges > g.is-active .body__leader { opacity: 1; stroke-width: 1.5; }
.body__badges > g.is-active .body__badge { fill: var(--accent); stroke: var(--accent); }
.body__badges > g.is-active .body__badge-n { fill: #fff; }
.body__badges > g.is-dim { opacity: 0.4; }
.body__badges > g:focus-visible .body__badge { stroke: var(--c-blue); stroke-width: 2.6; }

.body__micro {
  font-size: 0.5rem;
  letter-spacing: 0.08em;
  fill: var(--ink-mute);
}

.body__note {
  font-size: var(--fs-micro);
  line-height: 1.7;
  color: var(--ink-mute);
  margin: 0;
}

@media (prefers-reduced-motion: reduce) {
  .body__worn > g, .body__leader, .body__badge, .body__badge-n { transition: none; }
}
</style>
