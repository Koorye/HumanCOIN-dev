<script setup lang="ts">
/**
 * The scene grid — all 38 classes of the report's Fig. 8, as a mosaic rather
 * than a strip.
 *
 * The frames are dealt into rows whose length follows the column's width, and
 * each row is its own flex line, so opening a tile takes width from the tiles
 * beside it instead of pushing the row wider or re-wrapping it. A hovered or
 * focused tile also lifts to twice its height, which moves the rows below down
 * to make room: the photograph comes to the front of the mosaic and the mosaic
 * makes space around it. The class, its zone, its hours and its share appear
 * across the tile's foot while it is open.
 *
 * The grid is the last thing in the section, so the shift stays inside it: no
 * tile escapes the column and the page never gains a horizontal scrollbar.
 */
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { useI18n } from '@/composables/useI18n'
import { SCENES, ZONES } from '@/data/fig2'
import { SCENE_FRAMES } from '@/data/fig8'

const { t, isZh } = useI18n()

const zoneName = (id: string) => {
  const zone = ZONES.find((z) => z.id === id)
  return zone ? t(zone.name) : id
}

const label = isZh.value
  ? `场景 · FIG. 8 — 38 类全部`
  : `Scenes · Fig. 8 — ${SCENES.length} of ${SCENES.length} classes`

const aria = isZh.value
  ? '报告 fig. 8 的 38 幅真实场景画面，按区域顺序排列；悬停或聚焦某幅可读取类别、区域、小时与占比。'
  : '38 real scene frames from the report’s figure 8, in zone order; hover or focus a tile for its class, zone, hours and share.'

/* ---- how many tiles stand in a row ---- */
const MIN_TILE = 88
const GAP = 1
const cols = ref(11)
const gridEl = ref<HTMLElement | null>(null)
let ro: ResizeObserver | null = null

function measure(node: HTMLElement) {
  const w = node.getBoundingClientRect().width
  if (w <= 0) return
  const next = Math.max(2, Math.floor((w + GAP) / (MIN_TILE + GAP)))
  if (next !== cols.value) cols.value = next
}

onMounted(() => {
  const node = gridEl.value
  if (!node) return
  measure(node)
  if (typeof ResizeObserver === 'undefined') return
  ro = new ResizeObserver(() => measure(node))
  ro.observe(node)
})

onBeforeUnmount(() => {
  ro?.disconnect()
  ro = null
})

/* Rows are balanced rather than packed: 38 tiles over the rows the column allows
   gives 10/10/10/8, where packing would leave a five-tile row stretched twice as
   wide as the rest. */
const rows = computed(() => {
  const n = SCENE_FRAMES.length
  const rowCount = Math.max(1, Math.ceil(n / cols.value))
  const perRow = Math.ceil(n / rowCount)
  const out = []
  for (let i = 0; i < n; i += perRow) out.push(SCENE_FRAMES.slice(i, i + perRow))
  return out
})

/** images that fail keep their tile: the class name stands in for the frame */
const broken = ref<Set<string>>(new Set())
function markBroken(key: string) {
  const next = new Set(broken.value)
  next.add(key)
  broken.value = next
}
</script>

<template>
  <section class="strip" role="group" :aria-label="aria">
    <p class="strip__k mono">{{ label }}</p>

    <div ref="gridEl" class="strip__grid">
      <div v-for="(row, ri) in rows" :key="ri" class="strip__row">
        <figure
          v-for="frame in row"
          :key="frame.key"
          class="tile"
          tabindex="0"
          :aria-label="`${t(frame.scene.name)} · ${zoneName(frame.scene.zone)} · ${Math.round(frame.scene.total).toLocaleString('en-US')} h · ${frame.scene.share.toFixed(1)}%`"
        >
          <img
            v-if="!broken.has(frame.key)"
            :src="frame.file"
            :alt="t(frame.scene.name)"
            width="900"
            height="676"
            draggable="false"
            loading="lazy"
            decoding="async"
            @error="markBroken(frame.key)"
          />
          <span v-else class="tile__fallback">{{ t(frame.scene.name) }}</span>
          <figcaption class="tile__cap">
            <span class="tile__name">{{ t(frame.scene.name) }}</span>
            <span class="tile__meta">
              {{ zoneName(frame.scene.zone) }} · {{ Math.round(frame.scene.total).toLocaleString('en-US') }} h ·
              {{ frame.scene.share.toFixed(1) }}%
            </span>
          </figcaption>
        </figure>
      </div>
    </div>
  </section>
</template>

<style scoped>
.strip {
  min-width: 0;
}

.strip__k {
  margin: 0 0 0.5rem;
  font-family: var(--ff-mono);
  font-size: var(--fs-tick);
  letter-spacing: 0.09em;
  text-transform: uppercase;
  line-height: 1.4;
  color: var(--ink-mute);
}

/* the 1px rule is the only separation: no border, no radius, no shadow */
.strip__grid {
  display: flex;
  flex-direction: column;
  gap: 1px;
  background: var(--line);
}

/* one flex line per row, so opening a tile divides its own row and never re-wraps */
.strip__row {
  display: flex;
  gap: 1px;
  background: var(--line);
}

.tile {
  position: relative;
  flex: 1 1 0;
  min-width: 0;
  height: 62px;
  margin: 0;
  overflow: hidden;
  background: var(--paper);
  outline: none;
  transition:
    flex-grow 380ms var(--ease-out),
    height 380ms var(--ease-out);
}
.tile:hover,
.tile:focus-visible {
  flex-grow: 4.4;
  height: 166px;
  z-index: 1;
}
/* the whole band opens with the tile, so its neighbours fill the new height
   instead of leaving a white strip under themselves */
.strip__row:has(.tile:hover, .tile:focus-visible) .tile { height: 166px; }
.tile:focus-visible { box-shadow: inset 0 0 0 1px var(--c-blue); }

.tile img {
  display: block;
  width: 100%;
  height: 100%;
  object-fit: cover;
  filter: saturate(0.9) contrast(0.98);
  transition: filter 380ms var(--ease-out);
}
.tile:hover img,
.tile:focus-visible img { filter: saturate(1) contrast(1); }

.tile__fallback {
  display: grid;
  place-items: center;
  width: 100%;
  height: 100%;
  padding: 0 6px;
  background: var(--surface-2);
  font-size: var(--fs-micro);
  color: var(--ink-soft);
  text-align: center;
}

/* the caption rides the foot of the tile and arrives as the tile opens; two
   lines, never truncated — the tile is wide enough for the longest class */
.tile__cap {
  position: absolute;
  left: 0;
  right: 0;
  bottom: 0;
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 1px;
  padding: 5px 9px 6px;
  background: linear-gradient(
    to top,
    rgba(255, 255, 255, 0.97) 0%,
    rgba(255, 255, 255, 0.94) 70%,
    rgba(255, 255, 255, 0) 100%
  );
  opacity: 0;
  transition: opacity 220ms var(--ease-out);
}
.tile:hover .tile__cap,
.tile:focus-visible .tile__cap { opacity: 1; }

.tile__name {
  font-size: var(--fs-micro);
  line-height: 1.2;
  color: var(--ink);
}
.tile__meta {
  font-size: var(--fs-tick);
  line-height: 1.2;
  color: var(--ink-soft);
}

@media (prefers-reduced-motion: reduce) {
  .tile,
  .tile img,
  .tile__cap { transition: none; }
}
</style>
