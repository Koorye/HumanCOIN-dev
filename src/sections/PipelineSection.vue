<script setup lang="ts">
import { PIPELINE } from '@/content'
import { useI18n } from '@/composables/useI18n'
import SectionHead from '@/components/SectionHead.vue'
import PipelineFlow from '@/components/PipelineFlow.vue'

const { list } = useI18n()
</script>

<template>
  <section id="pipeline" class="section">
    <div class="shell">
      <SectionHead
        :num="PIPELINE.num"
        :kicker="PIPELINE.kicker"
        :title="PIPELINE.title"
        aside-wide
      >
        <!-- The section's argument belongs beside its title, so the diagram
             starts a band higher instead of sitting below two paragraphs. -->
        <template #aside>
          <div class="pl__lead">
            <p v-for="(p, i) in list(PIPELINE.aside)" :key="i">{{ p }}</p>
          </div>
        </template>
      </SectionHead>

      <div class="pl__fig">
        <PipelineFlow />
      </div>
    </div>
  </section>
</template>

<style scoped>
.mono { font-family: var(--ff-mono); }

/* The section's argument sits in the head's aside, at the aside's own scale. */
.pl__lead { max-width: 46ch; }
.pl__lead p { margin-bottom: 0.7em; color: var(--ink-soft); }
.pl__lead p:last-child { margin-bottom: 0; }

.pl__fig {
  border-top: 1px solid var(--line);
  padding: clamp(1rem, 0.7rem + 1.2vw, 1.6rem) 0 0;
  margin-bottom: 2rem;
}

</style>
