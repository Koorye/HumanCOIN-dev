<script setup lang="ts">
/**
 * The contents column.
 *
 * Anchored to the container's left edge rather than the viewport's, the way the
 * reference release page sets its table of contents: a small caps label, the
 * section index, and the section in view marked by colour alone. It is type,
 * not a panel — no sheet, no rule, nothing boxed.
 */
import { NAV, UI } from '@/content'
import { useI18n } from '@/composables/useI18n'
import { useScrollSpy } from '@/composables/useScrollSpy'

const { t } = useI18n()
const { active } = useScrollSpy(NAV.map((n) => n.id))

function go(e: MouseEvent, id: string) {
  e.preventDefault()
  const el = document.getElementById(id)
  if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' })
  history.replaceState(null, '', `#${id}`)
}
</script>

<template>
  <aside class="toc" :aria-label="t({ en: 'Contents', zh: '目录' })">
    <p class="toc__label">{{ t(UI.contents) }}</p>
    <nav class="toc__links">
      <a
        v-for="item in NAV"
        :key="item.id"
        :href="`#${item.id}`"
        :aria-current="active === item.id ? 'true' : undefined"
        @click="go($event, item.id)"
      >
        <span class="toc__num">{{ item.num }}</span>{{ t(item.label) }}
      </a>
    </nav>
  </aside>
</template>

<style scoped>
.toc {
  position: fixed;
  /* same left edge as the page container, not the viewport */
  left: max(1.25rem, calc(50% - var(--shell-max) / 2));
  top: calc(var(--nav-h) + 2.4rem);
  width: 220px;
  z-index: 40;
}
.toc__label {
  margin: 0 0 0.85rem;
  font-size: var(--fs-micro);
  letter-spacing: 0.18em;
  text-transform: uppercase;
  color: var(--ink-mute);
}
.toc__links { display: grid; gap: 0.12rem; }
.toc__links a {
  display: flex;
  align-items: baseline;
  gap: 0.45em;
  padding: 0.42rem 0;
  color: var(--ink-soft);
  font-size: 0.9rem;
  line-height: 1.35;
  white-space: nowrap;
  text-decoration: none;
  transition: color var(--dur) var(--ease);
}
.toc__links a:hover { color: var(--ink); text-decoration: none; }
.toc__links a[aria-current='true'] { color: var(--c-blue); font-weight: 560; }
.toc__num {
  font-family: var(--ff-mono);
  font-size: var(--fs-micro);
  color: var(--ink-mute);
}
.toc__links a[aria-current='true'] .toc__num { color: var(--c-blue); }

@media (max-width: 1180px) {
  .toc { display: none; }
}
</style>
