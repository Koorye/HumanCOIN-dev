<script setup lang="ts">
/**
 * The contents column.
 *
 * Anchored to the container's left edge rather than the viewport's, the way the
 * reference release page sets its table of contents: a small caps label, the
 * section index, and the section in view marked by colour alone. It is type,
 * not a panel — no sheet, no rule, nothing boxed.
 */
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { NAV, UI } from '@/content'
import { useI18n } from '@/composables/useI18n'
import { useScrollSpy } from '@/composables/useScrollSpy'

const { t } = useI18n()

/* The spy watches the sections and their sub-blocks in one flat list, so a
   sub-entry can take the highlight without the section losing it. */
const ids = NAV.flatMap((n) => [n.id, ...(n.children?.map((c) => c.id) ?? [])])
const { active } = useScrollSpy(ids)

/* A click sets the highlight straight away: the footer blocks sit too close to
   the end of the document for the scroll probe to ever reach them. */
const clicked = ref<string | null>(null)
let clearClick = 0

const current = computed(() => clicked.value ?? active.value)

const openSection = (item: (typeof NAV)[number]) =>
  current.value === item.id || item.children?.some((c) => c.id === current.value)

/* The cover is a title page, not an article: while it still holds most of the
   view, the contents has nothing to point at, so it stays out of the way. It
   hands over as soon as the cover is more than half scrolled past, rather than
   waiting for the last of it to leave the viewport. */
const heroVisible = ref(true)
let io: IntersectionObserver | null = null

onMounted(() => {
  const hero = document.getElementById('top')
  if (!hero || typeof IntersectionObserver === 'undefined') return
  io = new IntersectionObserver(([entry]) => { heroVisible.value = entry.intersectionRatio > 0.5 }, {
    threshold: [0, 0.5, 1],
  })
  io.observe(hero)
})

onBeforeUnmount(() => {
  io?.disconnect()
  io = null
})

function go(e: MouseEvent, id: string) {
  e.preventDefault()
  const el = document.getElementById(id)
  if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' })
  history.replaceState(null, '', `#${id}`)
  clicked.value = id
  window.clearTimeout(clearClick)
  clearClick = window.setTimeout(() => { clicked.value = null }, 1600)
}
</script>

<template>
  <aside
    class="toc"
    :data-hidden="heroVisible ? 'true' : 'false'"
    :aria-label="t({ en: 'Contents', zh: '目录' })"
  >
    <p class="toc__label">{{ t(UI.contents) }}</p>
    <nav class="toc__links">
      <template v-for="item in NAV" :key="item.id">
        <a
          class="toc__item"
          :class="{ 'is-open': openSection(item) }"
          :href="`#${item.id}`"
          :aria-current="current === item.id ? 'true' : undefined"
          @click="go($event, item.id)"
        >
          <span v-if="item.num" class="toc__num">{{ item.num }}</span>{{ t(item.label) }}
        </a>
        <a
          v-for="child in item.children"
          :key="child.id"
          class="toc__sub"
          :href="`#${child.id}`"
          :aria-current="current === child.id ? 'true' : undefined"
          @click="go($event, child.id)"
        >{{ t(child.label) }}</a>
      </template>
    </nav>
  </aside>
</template>

<style scoped>
.toc {
  position: fixed;
  /* same left edge as the page container, not the viewport */
  /* 1.25rem floor, not the page gutter: the rail may sit closer to the edge than
     the article, or its 208px would collide with the article near the breakpoint. */
  left: max(1.25rem, calc(50% - var(--article-w) / 2 - var(--toc-w) - var(--toc-gap)));
  top: calc(var(--nav-h) + 2.8rem);
  width: var(--toc-w);
  z-index: 40;
  transition: opacity var(--dur-3) var(--ease), transform var(--dur-3) var(--ease);
}
.toc[data-hidden='true'] {
  opacity: 0;
  transform: translateY(-0.4rem);
  pointer-events: none;
}
.toc__label {
  margin: 0 0 1rem;
  font-size: 0.72rem;
  letter-spacing: 0.2em;
  text-transform: uppercase;
  color: var(--ink-mute);
}
.toc__links { display: grid; gap: 0.18rem; }
.toc__links a {
  display: flex;
  align-items: baseline;
  gap: 0.45em;
  padding: 0.45rem 0;
  color: var(--ink-soft);
  font-size: 0.95rem;
  line-height: 1.45;
  white-space: nowrap;
  text-decoration: none;
  transition: color var(--dur) var(--ease);
}
.toc__links a:hover { color: var(--ink); text-decoration: none; }
.toc__links a[aria-current='true'] { color: var(--c-blue); font-weight: 560; }
.toc__item.is-open { color: var(--ink); }
.toc__item:not(:has(.toc__num)) { color: var(--ink-mute); }
.toc__item:not(:has(.toc__num))[aria-current='true'] { color: var(--c-blue); }
.toc__sub {
  margin-left: 0.15rem;
  padding: 0.34rem 0 0.34rem 1.1rem !important;
  border-left: 1px solid var(--line);
  font-size: 0.82rem !important;
  line-height: 1.4;
  color: var(--ink-mute) !important;
}
.toc__sub:hover { color: var(--ink) !important; }
.toc__sub[aria-current='true'] {
  color: var(--c-blue) !important;
  font-weight: 560;
  border-left-color: var(--c-blue);
}
.toc__num {
  font-family: var(--ff-mono);
  font-size: var(--fs-micro);
  color: var(--ink-mute);
}
.toc__links a[aria-current='true'] .toc__num { color: var(--c-blue); }

/* The contents column needs a clear gutter left of the article. Between 1680
   and 1360 the article narrows (see --article-w in tokens.css) so the column
   keeps its place; below that there is no room left and the page takes the
   width back. */
@media (max-width: 1359px) {
  .toc { display: none; }
}
</style>
