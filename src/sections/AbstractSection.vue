<script setup lang="ts">
/**
 * Abstract.
 *
 * One column, three paragraphs, the argument in the order the report makes it:
 * what the existing unit hides, what the pathway is, what this release
 * records. Key phrases are set in bold rather than in colour — the paragraph
 * carries the emphasis, not the palette.
 */
import { ABSTRACT } from '@/content'
import { useI18n } from '@/composables/useI18n'
import RichText from '@/components/RichText.vue'

const { t, list, isZh } = useI18n()
</script>

<template>
  <section id="abstract" class="section abstract-sec">
    <div class="shell">
      <p class="section-num"><b>00</b> {{ isZh ? '摘要' : 'Abstract' }}</p>
      <h2 class="abstract__title sr-only">{{ t(ABSTRACT.title) }}</h2>

      <div class="abstract__body">
        <p
          v-for="(para, i) in list(ABSTRACT.body)"
          :key="i"
          :class="{ 'abstract__lead': i === 0 }"
        ><RichText :text="para" /></p>
      </div>
    </div>
  </section>
</template>

<style scoped>
.abstract-sec { border-top: 1px solid var(--line); padding-block: clamp(1.6rem, 1.2rem + 1.6vw, 2.6rem); }

.abstract__title { margin: 0; }
/* Full measure: the abstract runs from the column's left edge to its right, so
   the block reads as a band of front matter rather than as a short column with
   a ragged right. */
.abstract__body { max-width: none; }
.abstract__body p {
  font-size: var(--fs-lead);
  line-height: 1.62;
  color: var(--ink-body);
}
/* The abstract sets the page's reading size: every paragraph is identical, and
   the sections follow it (see base.css). Only the lead's slight darkening was
   dropped so the first paragraph does not read as a different register. */
.abstract__body p + p { margin-top: 0.85em; }
</style>
