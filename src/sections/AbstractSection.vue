<script setup lang="ts">
import { ABSTRACT } from '@/content'
import { useI18n } from '@/composables/useI18n'

const { t, list, isZh } = useI18n()
</script>

<template>
  <section id="abstract" class="section abstract-sec">
    <div class="shell">
      <p class="section-num"><b>00</b> {{ isZh ? '摘要' : 'Abstract' }}</p>
      <h2 class="abstract__title sr-only">{{ t(ABSTRACT.title) }}</h2>

      <div class="prose abstract__body">
        <p v-for="(para, i) in list(ABSTRACT.body)" :key="i">{{ para }}</p>
      </div>
    </div>
  </section>
</template>

<style scoped>
.abstract-sec { border-top: 1px solid var(--line); padding-block: clamp(2.5rem, 2rem + 3vw, 4.5rem); }

.abstract__title { margin: 0; }
/* The abstract is the release's own statement, so it is set as one full-width
   measure rather than a narrow column: the section carries nothing else. */
.abstract__body { max-width: none; }
.abstract__body p { font-size: var(--fs-lead); line-height: 1.68; color: var(--ink-body); }
.abstract__body p + p { margin-top: 0.9em; }
</style>
