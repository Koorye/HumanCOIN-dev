<script setup lang="ts">
/**
 * The masthead bar.
 *
 * Three zones: the institute's wordmark on the left, the section index in the
 * middle, the three things a reader came for on the right — the dataset, the
 * report, the code. The middle index is the page's own order, and the section
 * in view is marked with a hairline rather than a filled chip.
 *
 * Under it, a one-pixel rule fills as the document is read.
 */
import { NAV, UI } from '@/content'
import { useI18n } from '@/composables/useI18n'
import { useScrollSpy } from '@/composables/useScrollSpy'

const { t, toggle } = useI18n()

const { active, progress } = useScrollSpy(NAV.map((n) => n.id))

function go(e: MouseEvent, id: string) {
  e.preventDefault()
  const el = document.getElementById(id)
  if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' })
  history.replaceState(null, '', `#${id}`)
}

const BAAI_MARK = 'logos/baai-acrylic.png'

/**
 * The three destinations the bar carries: the dataset manager, the paper on
 * arXiv, and the code on GitHub. All three leave the page, so they open in a
 * new tab and keep the external treatment.
 */
const ACTIONS = [
  { id: 'download', href: 'https://flagopen.github.io/HumanCOIN-DataManager', external: true, primary: true,
    label: { en: 'Download', zh: '下载' } },
  { id: 'report', href: 'https://arxiv.org/abs/2611.26434', external: true, primary: false,
    label: { en: 'Report', zh: '报告' } },
  { id: 'code', href: 'https://github.com/FlagOpen/HumanCOIN', external: true, primary: false,
    label: { en: 'Code', zh: '代码' } },
] as const
</script>

<template>
  <header class="nav">
    <div class="nav__inner shell">
      <a class="nav__brand" href="#top" aria-label="BAAI">
        <img class="nav__logo" :src="BAAI_MARK" alt="BAAI" />
      </a>

      <nav class="nav__links" :aria-label="t({ en: 'Section index', zh: '章节导航' })">
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

      <nav class="nav__actions" :aria-label="t({ en: 'Dataset resources', zh: '数据集资源' })">
        <a
          v-for="action in ACTIONS"
          :key="action.id"
          class="nav__act"
          :class="{ 'nav__act--primary': action.primary }"
          :href="action.href"
          :target="action.external ? '_blank' : undefined"
          :rel="action.external ? 'noopener noreferrer' : undefined"
        >
          <!-- The same three glyphs the cover uses, drawn at 13 px so they sit
               with the bar's smaller type and inherit the label colour. -->
          <svg
            v-if="action.id === 'download'"
            class="nav__ico"
            viewBox="0 0 16 16"
            width="13"
            height="13"
            aria-hidden="true"
          >
            <ellipse cx="8" cy="3.5" rx="5.5" ry="2.2" />
            <path d="M2.5 3.5v4c0 1.2 2.5 2.2 5.5 2.2s5.5-1 5.5-2.2v-4" />
            <path d="M8 10v4.2M5.5 11.8 8 14l2.5-2.2" />
          </svg>
          <svg
            v-else-if="action.id === 'report'"
            class="nav__ico"
            viewBox="0 0 16 16"
            width="13"
            height="13"
            aria-hidden="true"
          >
            <path d="M4 1.8h5.2L13 5.4v8.8H4z" />
            <path d="M9 1.8v3.8h4M6 8.5h4.5M6 11h4.5" />
          </svg>
          <svg
            v-else
            class="nav__ico"
            viewBox="0 0 16 16"
            width="13"
            height="13"
            aria-hidden="true"
          >
            <path d="m5.5 4.5-3.5 3.5 3.5 3.5M10.5 4.5 14 8l-3.5 3.5" />
          </svg>
          {{ t(action.label) }}
        </a>

        <button
          class="nav__lang"
          type="button"
          :aria-label="t(UI.languageToggleAria)"
          @click="toggle"
        >{{ t(UI.languageToggle) }}</button>
      </nav>
    </div>

    <div class="nav__progress" :style="{ transform: `scaleX(${progress})` }" aria-hidden="true" />
  </header>
</template>

<style scoped>
.nav {
  position: sticky;
  top: 0;
  z-index: 60;
  background: rgba(255, 255, 255, 0.88);
  backdrop-filter: saturate(160%) blur(12px);
  border-bottom: 1px solid var(--line);
}
.nav__inner {
  position: relative;
  height: var(--nav-h);
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1.25rem;
}

.nav__brand { display: flex; align-items: center; flex: none; }
.nav__brand:hover { text-decoration: none; }
.nav__logo { height: 30px; width: auto; display: block; }
@media (max-width: 520px) { .nav__logo { height: 26px; } }

.nav__links {
  position: absolute;
  left: 50%;
  top: 50%;
  transform: translate(-50%, -50%);
  display: flex;
  align-items: center;
  gap: 0;
  min-width: 0;
}
.nav__links a {
  display: inline-flex;
  align-items: baseline;
  gap: 0.3em;
  padding: 0.32rem 0.42rem;
  color: var(--ink-soft);
  font-size: 0.8rem;
  white-space: nowrap;
  text-decoration: none;
  box-shadow: inset 0 -1px 0 transparent;
  transition: color var(--dur) var(--ease), box-shadow var(--dur) var(--ease);
}
.nav__links a:hover { color: var(--ink); text-decoration: none; }
.nav__links a[aria-current='true'] {
  color: var(--ink);
  font-weight: 560;
  box-shadow: inset 0 -1px 0 var(--c-blue);
}
.nav__num {
  font-family: var(--ff-mono);
  font-size: var(--fs-tick);
  color: var(--ink-mute);
}
.nav__links a[aria-current='true'] .nav__num { color: var(--c-blue); }

.nav__actions {
  display: flex;
  align-items: center;
  gap: 0.35rem;
  flex: none;
}
.nav__act {
  display: inline-flex;
  align-items: center;
  padding: 0.32rem 0.72rem;
  border: 1px solid var(--line-strong);
  border-radius: var(--r-pill);
  color: var(--ink);
  font-size: var(--fs-small);
  font-weight: 550;
  line-height: 1.2;
  text-decoration: none;
  transition: color var(--dur) var(--ease), border-color var(--dur) var(--ease),
    background var(--dur) var(--ease);
}
.nav__act:hover {
  color: var(--c-blue);
  border-color: var(--c-blue);
  background: var(--t-blue);
  text-decoration: none;
}
.nav__act--primary {
  color: var(--c-blue);
  border-color: var(--c-blue);
}
.nav__act--primary:hover { background: var(--t-blue); }

.nav__ico {
  flex: none;
  margin-right: 0.3rem;
  margin-bottom: -0.06em;
  fill: none;
  stroke: currentColor;
  stroke-width: 1.4;
  stroke-linecap: round;
  stroke-linejoin: round;
}

.nav__lang {
  margin-left: 0.35rem;
  border: 0;
  background: none;
  padding: 0.3rem 0.15rem;
  font: inherit;
  font-size: var(--fs-micro);
  font-weight: 550;
  letter-spacing: 0.02em;
  color: var(--ink-mute);
  cursor: pointer;
  transition: color var(--dur) var(--ease);
}
.nav__lang:hover { color: var(--ink); }

.nav__progress {
  height: 1px;
  background: var(--c-blue);
  transform-origin: 0 50%;
  transition: transform 90ms linear;
}

/* The index is the first thing to go: the bar keeps the two ends, and the page
   still reads in order without it. */
@media (max-width: 1140px) {
  .nav__links { display: none; }
}
@media (max-width: 560px) {
  .nav__act { padding: 0.3rem 0.6rem; font-size: var(--fs-micro); }
  .nav__lang { display: none; }
}
</style>
