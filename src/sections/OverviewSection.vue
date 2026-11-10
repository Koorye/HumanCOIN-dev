<script setup lang="ts">
/**
 * Motivation.
 *
 * The section says one thing — that a camera records the consequence of a
 * decision and not the decision — and then shows three clips that stop at the
 * moment the difference matters. The clip carries the argument: each case's
 * readout names its claim, from the same three points the section is built on,
 * rather than repeating them again as cards underneath.
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
    </div>
  </section>
</template>

<style scoped>
</style>
