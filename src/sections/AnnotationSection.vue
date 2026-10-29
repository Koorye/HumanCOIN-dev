<script setup lang="ts">
import { defineAsyncComponent, onMounted, ref } from 'vue'
import { ANNOTATION } from '@/content'
import SectionHead from '@/components/SectionHead.vue'

/**
 * Deferred so the three.js chunk stays out of the initial module graph. The
 * section carries no standing paragraph: the viewer is the argument, and the
 * copy that would have sat beside the title now sits where it is read — on the
 * streams, the window and the annotation themselves.
 */
const ViewerSection = defineAsyncComponent(() => import('@/sections/ViewerSection.vue'))

const visible = ref(false)
const host = ref<HTMLElement | null>(null)

onMounted(() => {
  const el = host.value
  if (!el || !('IntersectionObserver' in window)) {
    visible.value = true
    return
  }
  const io = new IntersectionObserver(
    (entries) => {
      if (entries.some((e) => e.isIntersecting)) {
        visible.value = true
        io.disconnect()
      }
    },
    { rootMargin: '700px 0px' },
  )
  io.observe(el)
})
</script>

<template>
  <section id="annotation" class="section">
    <div class="shell">
      <SectionHead :num="ANNOTATION.num" :kicker="ANNOTATION.kicker" :title="ANNOTATION.title" />

      <div ref="host" class="host">
        <ViewerSection v-if="visible" />
        <div v-else class="skeleton" aria-hidden="true">
          <span v-for="i in 4" :key="i" />
        </div>
      </div>
    </div>
  </section>
</template>

<style scoped>
.host { min-height: 20rem; }
.skeleton { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 0.6rem; }
.skeleton span {
  display: block;
  aspect-ratio: 4 / 3;
  border-radius: var(--r-sm);
  background: linear-gradient(100deg, var(--surface-2) 30%, var(--surface) 50%, var(--surface-2) 70%);
  background-size: 220% 100%;
  animation: shimmer 1.6s linear infinite;
}
@keyframes shimmer { to { background-position: -220% 0; } }
@media (prefers-reduced-motion: reduce) { .skeleton span { animation: none; } }
</style>
