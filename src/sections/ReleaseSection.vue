<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { RELEASE, COMMUNITY } from '@/content'
import { useI18n } from '@/composables/useI18n'
import SectionHead from '@/components/SectionHead.vue'

const { t } = useI18n()

interface Partner {
  id: string
  src: string
  url: string
}
const partners = ref<Partner[]>([])

onMounted(async () => {
  try {
    const r = await fetch('logos/partners.json')
    if (r.ok) partners.value = (await r.json()) as Partner[]
  } catch {
    partners.value = []
  }
})
</script>

<template>
  <section id="release" class="section">
    <div class="shell">
      <SectionHead :num="RELEASE.num" :kicker="RELEASE.kicker" :title="RELEASE.title" />

      <ol class="roadmap">
        <li v-for="s in RELEASE.steps" :key="s.n" class="step">
          <div class="step__top">
            <span class="step__n mono">{{ s.n }}</span>
          </div>
          <h3 class="step__title">{{ t(s.t) }}</h3>
          <p class="step__desc">{{ t(s.d) }}</p>
        </li>
      </ol>

      <div class="community">
        <header class="community__head">
          <h3 class="community__title">{{ t(COMMUNITY.title) }}</h3>
        </header>
        <ul class="logos">
          <li v-for="p in partners" :key="p.id">
            <a :href="p.url" target="_blank" rel="noopener noreferrer">
              <img :src="p.src" :alt="p.id" loading="lazy" decoding="async" />
            </a>
          </li>
        </ul>
      </div>
    </div>
  </section>
</template>

<style scoped>
.mono { font-family: var(--ff-mono); }

.roadmap {
  list-style: none;
  margin: 0 0 clamp(2rem, 1.6rem + 2.5vw, 3.5rem);
  padding: 0;
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 0.85rem;
  counter-reset: step;
}
@media (max-width: 900px) { .roadmap { grid-template-columns: repeat(2, minmax(0, 1fr)); } }
@media (max-width: 540px) { .roadmap { grid-template-columns: minmax(0, 1fr); } }

.step {
  padding: 1.1rem 1.2rem 1.25rem;
  border: 1px solid var(--line);
  border-radius: var(--r-md);
  background: var(--paper);
  display: grid;
  gap: 0.4rem;
  align-content: start;
}
.step__top { display: flex; align-items: center; justify-content: space-between; gap: 0.5rem; }
.step__n { font-size: var(--fs-micro); color: var(--c-blue); letter-spacing: 0.08em; }
.step__title { font-size: var(--fs-h4); }
.step__desc { font-size: var(--fs-small); line-height: 1.65; color: var(--ink-soft); margin: 0; }

.community { border-top: 1px solid var(--line); padding-top: clamp(1.5rem, 1.2rem + 2vw, 2.25rem); }
.community__head { margin-bottom: 1.25rem; }
.community__title { font-size: var(--fs-h3); margin-bottom: 0.3rem; }

.logos {
  list-style: none;
  margin: 0;
  padding: 0;
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(9rem, 1fr));
  gap: 0.5rem;
}
.logos li { display: grid; place-items: center; }
.logos a {
  display: grid;
  place-items: center;
  width: 100%;
  height: 4.25rem;
  padding: 0.6rem;
  border-radius: var(--r-sm);
  transition: background var(--dur) var(--ease);
}
.logos a:hover { background: var(--surface-2); }
.logos img {
  max-height: 2.4rem;
  max-width: 100%;
  width: auto;
  object-fit: contain;
  transition: transform var(--dur) var(--ease);
}
.logos a:hover img { transform: scale(1.04); }
</style>
