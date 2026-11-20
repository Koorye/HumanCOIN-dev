<script setup lang="ts">
/**
 * The release figure, re-housed.
 *
 * The cover used to carry it; it now closes the argument just before *Start*.
 * By this point the reader has met the tiers, the scenes and the processing, so
 * the figure reads as the last concrete look at the data — one synchronised
 * moment, every channel its capture actually records — before the page turns to
 * how to obtain it.
 */
import SectionHead from '@/components/SectionHead.vue'
import CoverFigure from '@/components/CoverFigure.vue'
</script>

<template>
  <section id="release" class="section">
    <div class="shell">
      <SectionHead
        :kicker="{ en: 'The release', zh: '发布内容' }"
        :title="{ en: 'One moment, in every channel.', zh: '同一个瞬间，所有通道。' }"
        :aside="{
          en: 'A take from each tier, drawn on the clock its capture shares. Hover a card to open its moment; the channel a take does not ship is drawn as a labelled gap, never filled in.',
          zh: '每个层级各取一段录制，按它们共享的时钟展开。指向任意卡片即可打开那一瞬；该层级未采集的通道会标为空白，而不是补画。',
        }"
        single
      />

      <CoverFigure />
    </div>
  </section>
</template>

<style scoped>
.shell {
  /* The figure is the section: no extra bottom padding beyond the section's. */
  padding-bottom: 0.25rem;
}
</style>
