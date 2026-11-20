<script setup lang="ts">
/**
 * The left rail.
 *
 * A fixed column that carries the institute's wordmark, the section index and
 * the three destinations — the dataset, the report, the code — so the page
 * itself keeps its full width for figures. The section in view is marked with a
 * tinted row rather than a filled chip, and a hairline down the rail's right
 * edge fills as the document is read.
 *
 * Below 1080 px the rail folds back into a top bar: the page gets the width
 * back and the index is the first thing to go.
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
    <div class="nav__inner">
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
          :aria-label="t(action.label)"
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
          <span class="nav__act-label">{{ t(action.label) }}</span>
        </a>

        <button
          class="nav__lang"
          type="button"
          :aria-label="t(UI.languageToggleAria)"
          @click="toggle"
        >{{ t(UI.languageToggle) }}</button>
      </nav>
    </div>

    <div class="nav__progress" :style="{ transform: `scaleY(${progress})` }" aria-hidden="true" />
  </header>
</template>

<style scoped>
.nav {
  position: fixed;
  inset: 0 auto 0 0;
  width: var(--rail-w);
  z-index: 60;
  background: rgba(255, 255, 255, 0.9);
  backdrop-filter: saturate(160%) blur(12px);
  border-right: 1px solid var(--line);
}
.nav__inner {
  position: relative;
  height: 100%;
  display: flex;
  flex-direction: column;
  gap: 1.4rem;
  padding: 1.15rem 0.9rem 1.25rem 1.05rem;
}

.nav__brand { display: flex; align-items: center; flex: none; }
.nav__brand:hover { text-decoration: none; }
.nav__logo { height: 22px; width: auto; display: block; }

.nav__links {
  display: grid;
  align-content: start;
  gap: 0.05rem;
  min-width: 0;
}
.nav__links a {
  display: flex;
  align-items: baseline;
  gap: 0.45em;
  padding: 0.36rem 0.55rem;
  border-radius: 6px;
  color: var(--ink-soft);
  font-size: 0.8rem;
  line-height: 1.35;
  white-space: nowrap;
  text-decoration: none;
  transition: color var(--dur) var(--ease), background var(--dur) var(--ease);
}
.nav__links a:hover { color: var(--ink); background: var(--surface-2); text-decoration: none; }
.nav__links a[aria-current='true'] {
  color: var(--ink);
  font-weight: 560;
  background: var(--t-blue);
}
.nav__num {
  font-family: var(--ff-mono);
  font-size: var(--fs-tick);
  color: var(--ink-mute);
}
.nav__links a[aria-current='true'] .nav__num { color: var(--c-blue); }

.nav__actions {
  margin-top: auto;
  display: grid;
  gap: 0.3rem;
}
.nav__act {
  display: inline-flex;
  align-items: center;
  justify-content: flex-start;
  padding: 0.42rem 0.7rem;
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
  margin-right: 0.35rem;
  margin-bottom: -0.06em;
  fill: none;
  stroke: currentColor;
  stroke-width: 1.4;
  stroke-linecap: round;
  stroke-linejoin: round;
}

.nav__lang {
  justify-self: start;
  margin: 0.35rem 0 0 0.15rem;
  border: 0;
  background: none;
  padding: 0.2rem 0;
  font: inherit;
  font-size: var(--fs-micro);
  font-weight: 550;
  letter-spacing: 0.02em;
  color: var(--ink-mute);
  cursor: pointer;
  transition: color var(--dur) var(--ease);
}
.nav__lang:hover { color: var(--ink); }

/* the reading progress runs down the rail's outer edge */
.nav__progress {
  position: absolute;
  top: 0;
  right: -1px;
  width: 2px;
  height: 100%;
  background: var(--c-blue);
  transform-origin: 50% 0;
  transition: transform 90ms linear;
}

/* ---- below the rail breakpoint: back to a top bar ---- */
@media (max-width: 1080px) {
  .nav {
    inset: 0 0 auto 0;
    width: auto;
    border-right: 0;
    border-bottom: 1px solid var(--line);
    position: sticky;
    top: 0;
  }
  .nav__inner {
    height: var(--nav-h);
    flex-direction: row;
    align-items: center;
    justify-content: space-between;
    gap: 1.25rem;
    padding: 0 1.25rem;
  }
  .nav__links { display: none; }
  .nav__actions {
    margin-top: 0;
    display: flex;
    align-items: center;
    gap: 0.35rem;
  }
  .nav__act { padding: 0.32rem 0.72rem; }
  .nav__lang { margin: 0 0 0 0.35rem; justify-self: auto; }
  .nav__progress {
    top: auto;
    bottom: 0;
    left: 0;
    right: 0;
    width: 100%;
    height: 1px;
    transform-origin: 0 50%;
  }
}

@media (max-width: 560px) {
  .nav__act { padding: 0.3rem 0.6rem; font-size: var(--fs-micro); }
  .nav__lang { display: none; }
}
/* Below this the three pills would push the bar past the viewport, so they
   collapse to their glyphs — the icon is what carries the meaning, and the
   label survives as the link's accessible name. */
@media (max-width: 440px) {
  .nav__act { padding: 0.34rem 0.5rem; }
  .nav__act-label { display: none; }
  .nav__ico { margin-right: 0; }
}
</style>
