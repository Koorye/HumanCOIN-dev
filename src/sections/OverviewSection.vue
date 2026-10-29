<script setup lang="ts">
/**
 * Motivation.
 *
 * The section says one thing — that a camera records the consequence of a
 * decision and not the decision — and then shows three clips that stop at the
 * moment the difference matters. The three cards under the demo repeat that
 * structure (where the eyes go, object weight, failed attempts) so the reader
 * has both the moving evidence and the statement of what it means.
 */
import { OVERVIEW } from '@/content'
import { useI18n } from '@/composables/useI18n'
import SectionHead from '@/components/SectionHead.vue'
import MotivationDemo from '@/components/MotivationDemo.vue'

const { t } = useI18n()
</script>

<template>
  <section id="overview" class="section">
    <div class="shell">
      <SectionHead :num="OVERVIEW.num" :kicker="OVERVIEW.kicker" :title="OVERVIEW.title">
        <template #aside>
          <p>{{ t(OVERVIEW.lead) }}</p>
        </template>
      </SectionHead>

      <MotivationDemo />

      <ol class="signals">
        <li v-for="(p, i) in OVERVIEW.points" :key="p.n" v-reveal="i * 90">
          <span class="signals__n mono">{{ p.n }}</span>
          <div>
            <h3 class="signals__t">{{ t(p.t) }}</h3>
            <p class="signals__d">{{ t(p.d) }}</p>
          </div>
        </li>
      </ol>
    </div>
  </section>
</template>

<style scoped>
.mono { font-family: var(--ff-mono); }

.signals {
  list-style: none;
  margin: clamp(1.75rem, 1.3rem + 2vw, 2.75rem) 0 0;
  padding: 0;
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 1.5rem;
}
@media (max-width: 900px) {
  .signals { grid-template-columns: minmax(0, 1fr); gap: 1.1rem; }
}

.signals li {
  display: grid;
  grid-template-columns: 2.25rem minmax(0, 1fr);
  gap: 0.85rem;
  align-content: start;
  /* Each card is a hairline panel rather than bare text, so the three read as
     one strip of evidence rather than as three loose paragraphs. */
  padding: 1rem 1.05rem 1.1rem;
  border: 1px solid var(--line);
  border-radius: var(--r-md);
  background: var(--paper);
  position: relative;
  overflow: hidden;
}
/* A thin accent rule on the leading edge, keyed to the same three signals the
   demo above cycles through (gaze, EMG, EEG). */
.signals li::before {
  content: '';
  position: absolute;
  inset: 0 auto 0 0;
  width: 2px;
}
.signals li:nth-child(1)::before { background: var(--c-teal); }
.signals li:nth-child(2)::before { background: var(--c-amber); }
.signals li:nth-child(3)::before { background: var(--c-violet); }

.signals__n {
  font-size: var(--fs-micro);
  color: var(--c-blue);
  letter-spacing: 0.06em;
  padding-top: 0.25rem;
}
.signals li:nth-child(1) .signals__n { color: var(--c-teal); }
.signals li:nth-child(2) .signals__n { color: var(--c-amber); }
.signals li:nth-child(3) .signals__n { color: var(--c-violet); }
.signals__t { font-size: var(--fs-h4); margin-bottom: 0.3rem; }
.signals__d { font-size: var(--fs-small); line-height: 1.68; color: var(--ink-soft); margin: 0; }
</style>
