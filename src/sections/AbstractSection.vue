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
.abstract-sec { border-top: 1px solid var(--line); padding-block: clamp(1.6rem, 1.2rem + 1.6vw, 2.6rem); }

.abstract__title { margin: 0; }
/* Two reading columns rather than one 150-character line: the abstract fills
   the shell the way a paper's front matter does, and the measure stays short. */
.abstract__body {
  max-width: none;
  column-count: 2;
  column-gap: clamp(1.75rem, 2.4vw, 3.25rem);
}
@media (max-width: 820px) { .abstract__body { column-count: 1; } }
.abstract__body p {
  font-size: var(--fs-lead);
  line-height: 1.6;
  color: var(--ink-body);
  orphans: 2;
  widows: 2;
}
.abstract__body p + p { margin-top: 0.7em; }
</style>
