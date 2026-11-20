<script setup lang="ts">
/**
 * Inline emphasis for prose strings.
 *
 * `**phrase**` becomes <strong>; everything else is text. The source strings
 * are ours, and the text is rendered through Vue interpolation rather than
 * `v-html`, so no escaping step is needed at the call site.
 */
import { computed } from 'vue'

const props = defineProps<{ text: string }>()

interface Part {
  text: string
  strong: boolean
}

const parts = computed<Part[]>(() => {
  const out: Part[] = []
  const re = /\*\*(.+?)\*\*/g
  let last = 0
  for (const m of props.text.matchAll(re)) {
    const at = m.index ?? 0
    if (at > last) out.push({ text: props.text.slice(last, at), strong: false })
    out.push({ text: m[1], strong: true })
    last = at + m[0].length
  }
  if (last < props.text.length) out.push({ text: props.text.slice(last), strong: false })
  return out
})
</script>

<template>
  <template v-for="(part, i) in parts" :key="i">
    <strong v-if="part.strong">{{ part.text }}</strong>
    <template v-else>{{ part.text }}</template>
  </template>
</template>
