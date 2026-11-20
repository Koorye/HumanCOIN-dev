<script setup lang="ts">
/**
 * The tier's full code, drawn once: its lightness, its dash rhythm and its
 * marker shape, on one short rule. The plate's legends use this instead of a
 * plain colour chip, because a chip alone cannot say which line is L2 and which
 * is L3 — that is the whole job of the second encoding.
 */
import { TIER_DASH, TIER_RAMP, TIER_SHAPE, glyphPath } from '@/data/fig8'

withDefaults(
  defineProps<{
    id: 'L1' | 'L2' | 'L3'
    w?: number
    h?: number
  }>(),
  { w: 26, h: 10 },
)
</script>

<template>
  <svg
    class="glyph"
    :width="w"
    :height="h"
    :viewBox="`0 0 ${w} ${h}`"
    aria-hidden="true"
    focusable="false"
  >
    <line
      :x1="1"
      :x2="w - 1"
      :y1="h / 2"
      :y2="h / 2"
      :stroke="TIER_RAMP[id]"
      stroke-width="1.3"
      :stroke-dasharray="TIER_DASH[id] || undefined"
    />
    <path :d="glyphPath(TIER_SHAPE[id], w / 2, h / 2)" :fill="TIER_RAMP[id]" />
  </svg>
</template>

<style scoped>
.glyph {
  display: inline-block;
  flex: none;
  vertical-align: -1px;
  overflow: visible;
}
</style>
