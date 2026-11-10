<script setup lang="ts">
import { FORMAT } from '@/content'
import { useI18n } from '@/composables/useI18n'
import SectionHead from '@/components/SectionHead.vue'
import MultiFreqFormat from '@/components/MultiFreqFormat.vue'

const { list } = useI18n()

</script>

<template>
  <section id="format" class="section section--tinted">
    <div class="shell">
      <SectionHead
        :num="FORMAT.num"
        :kicker="FORMAT.kicker"
        :title="FORMAT.title"
        aside-wide
      >
        <!-- The section's argument belongs beside its title, so the figures start
             a band higher instead of pushing the reader past two paragraphs. -->
        <template #aside>
          <div class="format__lead">
            <p v-for="(p, i) in list(FORMAT.body)" :key="i">{{ p }}</p>
          </div>
        </template>
      </SectionHead>

      <!-- the write / read cycle, animated -->
      <div class="format__fig">
        <MultiFreqFormat />
      </div>

    </div>
  </section>
</template>

<style scoped>
.mono { font-family: var(--ff-mono); }

/* Body copy sits in the section head's aside, so it is set at the aside's own
   scale rather than the prose scale. */
.format__lead { max-width: 46ch; }
.format__lead p { margin-bottom: 0.7em; color: var(--ink-soft); }
.format__lead p:last-child { margin-bottom: 0; }

.format__fig {
  border-top: 1px solid var(--line);
  padding: clamp(1rem, 0.7rem + 1.2vw, 1.6rem) 0 0;
  margin-bottom: 1.6rem;
}

</style>
