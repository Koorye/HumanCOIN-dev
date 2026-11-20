<script setup lang="ts">
/**
 * A measured canvas for a chart.
 *
 * The SVGs in this section are drawn in layout pixels: a tick set at 11px is
 * 11px at every viewport, rather than 11px at one width and 8px at another
 * because the viewBox was scaled down. To do that the drawing has to know how
 * wide it actually is, so this box measures itself and hands the number to its
 * slot; the chart then uses it as both width and viewBox width.
 *
 * The height is fixed by the caller so a measurement never changes the
 * document's layout, and nothing is drawn until a width is known — a chart at
 * zero width would be a chart of nothing.
 */
import { onBeforeUnmount, onMounted, ref } from 'vue'

defineProps<{ h: number }>()

const el = ref<HTMLElement | null>(null)
const w = ref(0)
let ro: ResizeObserver | null = null

function measure(node: HTMLElement) {
  const width = node.getBoundingClientRect().width
  if (width > 0 && Math.abs(width - w.value) > 0.5) w.value = width
}

onMounted(() => {
  const node = el.value
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
</script>

<template>
  <div ref="el" class="pbox" :style="{ height: `${h}px` }">
    <slot v-if="w > 0" :w="w" :h="h" />
  </div>
</template>

<style scoped>
.pbox {
  position: relative;
  width: 100%;
  min-width: 0;
}
</style>
