<script setup lang="ts">
/**
 * Collaborating institutions.
 *
 * The mark wall is the whole section: the host institute on its own row, then
 * every collaborator in a fixed five-column grid with its name under the mark.
 * The manifest carries ids only, so the labels live in `NAMES` — the one place
 * that knows what `ant` or `ai2` is called in either language.
 */
import { computed, ref, onMounted } from 'vue'
import { COMMUNITY } from '@/content'
import { useI18n } from '@/composables/useI18n'
import SectionHead from '@/components/SectionHead.vue'

const { isZh } = useI18n()

interface Partner {
  id: string
  src: string
  url: string
}

const NAMES: Record<string, { en: string; zh: string }> = {
  baai: { en: 'BAAI', zh: '北京智源人工智能研究院' },
  jdcloud: { en: 'JD Cloud', zh: '京东云' },
  mifeng: { en: 'Maniformer', zh: '上海觅蜂' },
  ant: { en: 'Ant Digital Technologies', zh: '蚂蚁数科' },
  guanglun: { en: 'Lightwheel', zh: '光轮智能' },
  jianzhi: { en: 'Jianzhi Robotics', zh: '简智' },
  tashi: { en: 'Tashi', zh: '它石' },
  paxini: { en: 'PaXini Tech', zh: '帕西尼' },
  jijia: { en: 'GigaAI', zh: '极佳视界' },
  boden: { en: 'BODENAI', zh: '博登智能' },
  wujie: { en: 'Anyverse Dynamics', zh: '无界动力' },
  octopus: { en: 'Octopus Dynamics', zh: '章鱼动力' },
  qiyi: { en: 'QATTA', zh: '奇异吸引' },
  jiazi: { en: 'Jiazi Intelligence', zh: '甲子智启' },
  huazhi: { en: 'Huazhi AI (Wuxi)', zh: '华智（无锡）人工智能' },
  shutu: { en: 'SynaPath', zh: '枢途' },
  zhiyu: { en: 'Zhiyu Foundation', zh: '智域基石' },
  ioai: { en: 'IO-AI Tech', zh: '艾欧智能' },
  maiqing: { en: 'Maiqing Intelligence', zh: '麦擎智能' },
  lingmei: { en: 'LumiWorld', zh: '灵美' },
  purity: { en: 'Purity', zh: '珀瑞缇' },
  lingsheng: { en: 'Lingsheng', zh: '灵生' },
  zhiyue: { en: 'Zhiyue Infinite', zh: '智跃无限' },
}
const LEAD_ID = 'baai'

const partners = ref<Partner[]>([])

onMounted(async () => {
  try {
    const r = await fetch('logos/partners.json')
    if (r.ok) partners.value = (await r.json()) as Partner[]
  } catch {
    partners.value = []
  }
})

const nameOf = (id: string) => NAMES[id] ?? { en: id, zh: id }
const lead = computed(() => partners.value.find((p) => p.id === LEAD_ID) ?? null)
const rest = computed(() => partners.value.filter((p) => p.id !== LEAD_ID))
</script>

<template>
  <section id="community" class="section">
    <div class="shell">
      <SectionHead :num="COMMUNITY.num" :kicker="COMMUNITY.kicker" :title="COMMUNITY.title" />

      <div class="community">
        <!-- the host institute, on its own row above the collaborators -->
        <a
          v-if="lead"
          class="host"
          :href="lead.url"
          target="_blank"
          rel="noopener noreferrer"
        >
          <img :src="lead.src" :alt="nameOf(lead.id).en" loading="lazy" decoding="async" />
          <span class="logos__name">{{ isZh ? nameOf(lead.id).zh : nameOf(lead.id).en }}</span>
        </a>

        <ul class="logos">
          <li v-for="p in rest" :key="p.id">
            <component
              :is="p.url ? 'a' : 'div'"
              class="logos__item"
              :href="p.url || undefined"
              :target="p.url ? '_blank' : undefined"
              :rel="p.url ? 'noopener noreferrer' : undefined"
            >
              <img
                v-if="p.src"
                :src="p.src"
                :alt="nameOf(p.id).en"
                loading="lazy"
                decoding="async"
              />
              <span v-else class="logos__word">{{ nameOf(p.id).zh }}</span>
              <span class="logos__name">{{ p.src ? (isZh ? nameOf(p.id).zh : nameOf(p.id).en) : nameOf(p.id).en }}</span>
            </component>
          </li>
        </ul>
      </div>
    </div>
  </section>
</template>

<style scoped>
.community { margin-top: clamp(1.5rem, 1.2rem + 2vw, 2.25rem); }

/* The host institute occupies a row of its own above the grid, with no border
   so it reads as the lead mark rather than as another card. */
.host {
  display: grid;
  justify-items: center;
  gap: 0.5rem;
  padding: 0.4rem 1rem 1rem;
  margin-bottom: 1.1rem;
}
.host img {
  max-height: 5.4rem;
  width: auto;
  object-fit: contain;
  transition: transform var(--dur) var(--ease);
}
.host:hover img { transform: scale(1.03); }

/* Five to a row, as a fixed grid rather than auto-fill, so the marks are sized
   by the row they sit in instead of by how many partners happen to load. */
.logos {
  list-style: none;
  margin: 0;
  padding: 0;
  display: grid;
  grid-template-columns: repeat(5, minmax(0, 1fr));
  gap: 0.75rem;
}
@media (max-width: 980px) { .logos { grid-template-columns: repeat(4, minmax(0, 1fr)); } }
@media (max-width: 700px) { .logos { grid-template-columns: repeat(3, minmax(0, 1fr)); } }
@media (max-width: 460px) { .logos { grid-template-columns: repeat(2, minmax(0, 1fr)); } }
.logos li { display: grid; }
.logos__item {
  display: grid;
  grid-template-rows: 1fr auto;
  justify-items: center;
  align-content: center;
  gap: 0.5rem;
  width: 100%;
  height: 7rem;
  padding: 0.7rem 0.6rem 0.6rem;
  border-radius: var(--r-sm);
  transition: background var(--dur) var(--ease);
}
.logos__item:hover { background: var(--surface-2); }
.logos img {
  max-height: 3.4rem;
  max-width: 100%;
  width: auto;
  object-fit: contain;
  transition: transform var(--dur) var(--ease);
}
.logos__item:hover img { transform: scale(1.04); }
/* Companies whose mark has not been supplied yet are set as a wordmark, so the
   wall keeps one cell size and no placeholder graphic is invented. */
.logos__word {
  font-family: var(--ff-display);
  font-size: 1.02rem;
  font-weight: 550;
  letter-spacing: -0.02em;
  color: var(--ink-soft);
  text-align: center;
  line-height: 1.25;
  max-width: 100%;
}
.logos__name {
  font-size: var(--fs-mark);
  color: var(--ink-soft);
  text-align: center;
  line-height: 1.35;
}
</style>
