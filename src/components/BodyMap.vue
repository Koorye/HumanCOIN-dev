<script setup lang="ts">
import { computed } from 'vue'
import { ANATOMY, DEVICE_META, type DeviceId, type Tier } from '@/content'
import { useI18n } from '@/composables/useI18n'

/**
 * Front-view plate of where the tier's instruments sit on the body.
 *
 * The body is an AI-rendered photograph of a person wearing the tier's own rig,
 * one plate per tier, isolated on white so it sits on the panel without a
 * background of its own. Over the photo ride only the numbered badges: the
 * numbers are the rows of the tier inventory beside the figure, and each badge
 * leads to the landmark its instrument sits on.
 *
 * The plate is drawn in a 400 × 600 viewBox (the renders are 2:3 portrait);
 * the anchors below were calibrated against the renders' own body proportions,
 * so a leader lands on the body part the inventory names.
 */
const props = defineProps<{ tier: Tier; active?: DeviceId | null; bare?: boolean }>()
const emit = defineEmits<{ (e: 'select', id: DeviceId | null): void }>()
const { t } = useI18n()

/** One plate per tier, worn exactly what that tier wears. */
const PLATE: Record<Tier['id'], string> = {
  L1: 'generated/body-l1.png',
  L2: 'generated/body-l2.png',
  L3: 'generated/body-l3.png',
}

/**
 * Where each instrument sits, in the 400 × 600 space: `anchor` is the landmark
 * on the body, `x`/`y` the badge. Badges run down the two gutters — head
 * instruments on the right, arm instruments on the left — so no leader crosses
 * the figure. Coordinates are viewer-relative (the viewer's left is x small).
 */
const SLOTS: Record<DeviceId, { x: number; y: number; anchor: [number, number] }> = {
  vive: { x: 38, y: 34, anchor: [198, 26] },
  rgb: { x: 38, y: 92, anchor: [202, 47] },
  emg: { x: 38, y: 268, anchor: [84, 289] },
  wrist: { x: 38, y: 322, anchor: [84, 333] },
  gloves: { x: 38, y: 378, anchor: [88, 366] },
  eeg: { x: 362, y: 34, anchor: [202, 34] },
  gaze: { x: 362, y: 150, anchor: [220, 59] },
}

/** The tier decides what is worn; the figure and the inventory share the order. */
const rows = computed(() =>
  props.tier.devices.map((d, i) => {
    const slot = SLOTS[d.id]
    const left = slot.x < 200
    return {
      id: d.id,
      n: String(i + 1).padStart(2, '0'),
      meta: DEVICE_META.find((m) => m.id === d.id)!,
      badge: { x: slot.x, y: slot.y },
      leader: `M${slot.x + (left ? 12 : -12)} ${slot.y}L${slot.anchor[0]} ${slot.anchor[1]}`,
    }
  }),
)

const isActive = (id: DeviceId) => props.active === id
</script>

<template>
  <figure class="body" :class="{ 'body--bare': bare }">
    <figcaption v-if="!bare" class="body__head">
      <span class="body__kicker mono">{{ t(ANATOMY.kicker) }}</span>
      <h4 class="body__title">{{ t(ANATOMY.title) }}</h4>
      <p class="body__lead">{{ t(ANATOMY.lead) }}</p>
    </figcaption>

    <div class="body__panel">
      <svg
        viewBox="0 0 400 600"
        role="img"
        :aria-label="t(ANATOMY.figureLabel)"
        class="body__svg"
      >
        <!-- The plate: the tier's own rig, worn. White ground blends into the
             panel, so the figure stands alone with no background of its own. -->
        <image
          :href="PLATE[tier.id]"
          x="0"
          y="0"
          width="400"
          height="600"
          preserveAspectRatio="xMidYMid meet"
        />

        <!-- Numbered badges: the numbers are the rows of the tier inventory. -->
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

        <text x="12" y="594" class="body__micro mono">{{ t(ANATOMY.microTop) }}</text>
        <text x="388" y="594" class="body__micro mono" text-anchor="end">{{ t(ANATOMY.microBottom) }}</text>
      </svg>
    </div>
  </figure>
</template>

<style scoped>
.mono { font-family: var(--ff-mono); }

.body { margin: 0; display: grid; align-content: start; gap: 0.75rem; }
.body--bare { gap: 0; }

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

/* The plate's own ground is white, so the panel fades to white at its centre
     and the seam between render and panel never shows. The plate is portrait
     (2:3); left to its own ratio at full column width it would tower over the
     pyramid, so the panel caps its height and centres the render inside. */
.body__panel {
  border: 0;
  border-top: 1px solid var(--line);
  border-radius: var(--r-sm);
  background: radial-gradient(122% 92% at 50% 4%, #ffffff 0%, #ffffff 56%, var(--surface-2) 100%);
  overflow: hidden;
  display: flex;
  justify-content: center;
}
.body__svg { display: block; width: auto; max-width: 100%; max-height: 34rem; height: auto; }

.body__badges { cursor: pointer; outline: none; color: var(--ink-mute); }
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
.body__badges.is-active { color: var(--accent); }
.body__badges.is-active .body__leader { opacity: 1; stroke-width: 1.5; }
.body__badges.is-active .body__badge { fill: var(--accent); stroke: var(--accent); }
.body__badges.is-active .body__badge-n { fill: #fff; }
.body__badges.is-dim { opacity: 0.4; }
.body__badges:focus-visible .body__badge { stroke: var(--c-blue); stroke-width: 2.6; }

.body__micro {
  font-size: 0.5rem;
  letter-spacing: 0.08em;
  fill: var(--ink-mute);
}

@media (prefers-reduced-motion: reduce) {
  .body__leader, .body__badge, .body__badge-n { transition: none; }
}
</style>
