<script setup lang="ts">
import { ref, computed } from 'vue'
import { NAV, SITE, UI } from '@/content'
import { useI18n } from '@/composables/useI18n'
import { useScrollSpy } from '@/composables/useScrollSpy'

const { t, lang, toggle } = useI18n()
const ids = NAV.map((n) => n.id)
const { active, progress } = useScrollSpy(ids)
const open = ref(false)

const toggleLabel = computed(() => t(UI.languageToggle))

function go(e: MouseEvent, id: string) {
  e.preventDefault()
  open.value = false
  const el = document.getElementById(id)
  if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' })
  history.replaceState(null, '', `#${id}`)
}
</script>

<template>
  <header class="nav">
    <div class="nav__inner shell">
      <a class="nav__brand" href="#top" @click="go($event, 'top')">
        <span class="nav__mark" aria-hidden="true">HC</span>
        <span class="nav__name">{{ SITE.name }}</span>
      </a>

      <nav class="nav__links" :aria-label="lang === 'zh' ? '章节导航' : 'Section navigation'">
        <a
          v-for="item in NAV"
          :key="item.id"
          :href="`#${item.id}`"
          :aria-current="active === item.id ? 'true' : undefined"
          @click="go($event, item.id)"
        >
          <span class="nav__num">{{ item.num }}</span>{{ t(item.label) }}
        </a>
      </nav>

      <div class="nav__actions">
        <button class="nav__lang" type="button" :aria-label="t(UI.languageToggleAria)" @click="toggle">
          {{ toggleLabel }}
        </button>
        <button
          class="nav__menu"
          type="button"
          :aria-expanded="open"
          :aria-label="t(UI.menu)"
          @click="open = !open"
        >
          <span aria-hidden="true" />
        </button>
      </div>
    </div>

    <div v-if="open" class="nav__drawer">
      <a
        v-for="item in NAV"
        :key="item.id"
        :href="`#${item.id}`"
        :aria-current="active === item.id ? 'true' : undefined"
        @click="go($event, item.id)"
      >
        <span class="nav__num">{{ item.num }}</span>{{ t(item.label) }}
      </a>
    </div>

    <div class="nav__progress" :style="{ transform: `scaleX(${progress})` }" aria-hidden="true" />
  </header>
</template>

<style scoped>
.nav {
  position: sticky;
  top: 0;
  z-index: 60;
  background: rgba(255, 255, 255, 0.86);
  backdrop-filter: saturate(180%) blur(14px);
  border-bottom: 1px solid var(--line);
}
.nav__inner {
  height: var(--nav-h);
  display: flex;
  align-items: center;
  gap: 1.25rem;
}
.nav__brand {
  display: flex;
  align-items: center;
  gap: 0.55rem;
  font-weight: 640;
  color: var(--ink);
  letter-spacing: -0.02em;
  white-space: nowrap;
}
.nav__brand:hover { text-decoration: none; }
.nav__mark {
  display: grid;
  place-items: center;
  width: 1.6rem;
  height: 1.6rem;
  border-radius: var(--r-xs);
  background: var(--ink);
  color: #fff;
  font-family: var(--ff-mono);
  font-size: var(--fs-mark);
  letter-spacing: 0;
}
.nav__name { font-size: 1rem; }

.nav__links {
  margin-left: auto;
  display: flex;
  align-items: center;
  gap: 0.15rem;
}
.nav__links a {
  display: inline-flex;
  align-items: baseline;
  gap: 0.35em;
  padding: 0.4rem 0.6rem;
  border-radius: var(--r-xs);
  font-size: var(--fs-small);
  color: var(--ink-soft);
  transition: color var(--dur) var(--ease), background var(--dur) var(--ease);
}
.nav__links a:hover { color: var(--ink); background: var(--surface-2); text-decoration: none; }
.nav__links a[aria-current='true'] { color: var(--ink); background: var(--surface-2); font-weight: 600; }
.nav__num {
  font-family: var(--ff-mono);
  font-size: var(--fs-tick);
  color: var(--ink-mute);
  margin-right: 0.45em;
}
.nav__links a[aria-current='true'] .nav__num { color: var(--c-blue); }

.nav__actions { display: flex; align-items: center; gap: 0.4rem; margin-left: 0.4rem; }
.nav__lang {
  border: 1px solid var(--line-strong);
  background: transparent;
  color: var(--ink-soft);
  font: inherit;
  font-size: var(--fs-micro);
  font-weight: 600;
  letter-spacing: 0.04em;
  padding: 0.3rem 0.6rem;
  border-radius: var(--r-xs);
  cursor: pointer;
  transition: color var(--dur) var(--ease), border-color var(--dur) var(--ease);
}
.nav__lang:hover { color: var(--ink); border-color: var(--ink-mute); }

.nav__menu { display: none; }

.nav__progress {
  height: 2px;
  background: var(--c-blue);
  transform-origin: 0 50%;
  transition: transform 90ms linear;
}

@media (max-width: 1080px) {
  .nav__links { display: none; }
  .nav__menu {
    display: grid;
    place-items: center;
    width: 2.25rem;
    height: 2.25rem;
    margin-left: auto;
    border: 1px solid var(--line-strong);
    border-radius: var(--r-xs);
    background: transparent;
    cursor: pointer;
  }
  .nav__menu span,
  .nav__menu span::before,
  .nav__menu span::after {
    display: block;
    width: 1rem;
    height: 1.5px;
    background: var(--ink);
    position: relative;
  }
  .nav__menu span::before,
  .nav__menu span::after { content: ''; position: absolute; left: 0; }
  .nav__menu span::before { top: -5px; }
  .nav__menu span::after { top: 5px; }

  .nav__drawer {
    display: grid;
    gap: 0.15rem;
    padding: 0.6rem 1.25rem 1rem;
    border-bottom: 1px solid var(--line);
    background: var(--paper);
  }
  .nav__drawer a {
    display: flex;
    align-items: baseline;
    gap: 0.6em;
    padding: 0.6rem 0.3rem;
    border-bottom: 1px solid var(--line);
    color: var(--ink-soft);
    font-size: var(--fs-body);
  }
  .nav__drawer a:last-child { border-bottom: 0; }
  .nav__drawer a[aria-current='true'] { color: var(--ink); font-weight: 600; }
}
</style>
