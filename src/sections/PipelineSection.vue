<script setup lang="ts">
import { PIPELINE } from '@/content'
import { useI18n } from '@/composables/useI18n'
import SectionHead from '@/components/SectionHead.vue'
import PipelineFlow from '@/components/PipelineFlow.vue'

const { t } = useI18n()
</script>

<template>
  <section id="pipeline" class="section">
    <div class="shell">
      <SectionHead
        :num="PIPELINE.num"
        :kicker="PIPELINE.kicker"
        :title="PIPELINE.title"
        :aside="PIPELINE.aside"
      />

      <div class="prose pl__body">
        <p v-for="(p, i) in PIPELINE.body" :key="i">{{ t(p) }}</p>
      </div>

      <div class="pl__fig">
        <PipelineFlow />
      </div>

      <div class="output">
        <div class="output__main">
          <p class="output__kicker mono">unified episode</p>
          <p class="output__title">{{ t(PIPELINE.outTitle) }}</p>
        </div>
        <ul class="output__provenance">
          <li v-for="(p, i) in PIPELINE.provenance" :key="i">
            <span class="output__tag">{{ t(p.t) }}</span>
            <span class="output__desc">{{ t(p.d) }}</span>
          </li>
        </ul>
      </div>
    </div>
  </section>
</template>

<style scoped>
.mono { font-family: var(--ff-mono); }

.pl__body { margin-bottom: 1.6rem; }
.pl__body p { max-width: 68ch; }

.pl__fig {
  border: 1px solid var(--line);
  border-radius: var(--r-md);
  background: var(--paper);
  padding: clamp(1rem, 0.7rem + 1.2vw, 1.6rem);
  margin-bottom: 2rem;
}

.output {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(0, 1.15fr);
  gap: var(--gap);
  align-items: center;
  padding: clamp(1.1rem, 1rem + 1vw, 1.6rem) clamp(1.1rem, 1rem + 1.4vw, 1.75rem);
  border: 1px solid var(--ink);
  border-radius: var(--r-md);
  background: var(--ink);
  color: #e8eef2;
}
@media (max-width: 820px) { .output { grid-template-columns: minmax(0, 1fr); } }
.output__kicker {
  font-size: var(--fs-micro);
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: #7fa8c4;
  margin: 0 0 0.4rem;
}
.output__title {
  font-size: var(--fs-h4);
  color: #fff;
  margin: 0;
  font-weight: 600;
  letter-spacing: -0.01em;
}
.output__provenance {
  list-style: none;
  margin: 0;
  padding: 0;
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 0.6rem 1.25rem;
}
@media (max-width: 520px) { .output__provenance { grid-template-columns: minmax(0, 1fr); } }
.output__provenance li { display: grid; gap: 0.1rem; }
.output__tag { font-family: var(--ff-mono); font-size: var(--fs-micro); color: #fff; letter-spacing: 0.04em; }
.output__desc { font-size: var(--fs-micro); color: #a9bcc9; line-height: 1.5; }
</style>
