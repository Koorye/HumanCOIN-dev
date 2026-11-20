<script setup lang="ts">
/**
 * The masthead.
 *
 * One horizontal bar carries everything: the institute's wordmark at the left,
 * the section index in the middle, the three destinations a reader came for at
 * the right. Set as type rather than as a panel — no chips, no boxes; the
 * section in view is marked with colour. A hairline along the bottom edge fills
 * as the document is read.
 */
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { UI } from '@/content'
import { useI18n } from '@/composables/useI18n'
import { useScrollSpy } from '@/composables/useScrollSpy'
import { useTheme, type ThemeMode } from '@/composables/useTheme'

const { t, toggle } = useI18n()
const { mode, resolved, setMode } = useTheme()

const { progress } = useScrollSpy([])

const THEMES: { id: ThemeMode; label: { en: string; zh: string } }[] = [
  { id: 'system', label: { en: 'Follow system', zh: '跟随系统' } },
  { id: 'light', label: { en: 'Light', zh: '浅色' } },
  { id: 'dark', label: { en: 'Dark', zh: '深色' } },
]

const themeOpen = ref(false)
const themeRoot = ref<HTMLElement | null>(null)

const themeLabel = computed(() =>
  t({
    en: `Theme: ${mode.value === 'system' ? 'follow system' : mode.value}`,
    zh: `主题：${mode.value === 'system' ? '跟随系统' : mode.value === 'dark' ? '深色' : '浅色'}`,
  }),
)

function chooseTheme(next: ThemeMode) {
  setMode(next)
  themeOpen.value = false
}

function onThemeOutside(e: PointerEvent) {
  if (themeOpen.value && themeRoot.value && !themeRoot.value.contains(e.target as Node)) {
    themeOpen.value = false
  }
}
function onThemeKey(e: KeyboardEvent) {
  if (e.key === 'Escape') themeOpen.value = false
}
onMounted(() => {
  document.addEventListener('pointerdown', onThemeOutside)
  document.addEventListener('keydown', onThemeKey)
})
onBeforeUnmount(() => {
  document.removeEventListener('pointerdown', onThemeOutside)
  document.removeEventListener('keydown', onThemeKey)
})

const BAAI_MARK = 'logos/baai-acrylic.png'

/**
 * The three destinations: the dataset manager, the paper on arXiv, and the code
 * on GitHub. All three leave the page, so they open in a new tab.
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
          <svg v-else class="nav__ico" viewBox="0 0 16 16" width="13" height="13" aria-hidden="true">
            <path d="m5.5 4.5-3.5 3.5 3.5 3.5M10.5 4.5 14 8l-3.5 3.5" />
          </svg>
          <span class="nav__act-label">{{ t(action.label) }}</span>
        </a>

        <div ref="themeRoot" class="nav__themewrap">
          <button
            class="nav__theme"
            type="button"
            :aria-label="themeLabel"
            :title="themeLabel"
            aria-haspopup="menu"
            :aria-expanded="themeOpen"
            @click="themeOpen = !themeOpen"
          >
            <svg v-if="mode === 'system'" viewBox="0 0 16 16" width="14" height="14" aria-hidden="true">
              <circle cx="8" cy="8" r="5.2" />
              <path d="M8 2.8a5.2 5.2 0 0 0 0 10.4z" fill="currentColor" stroke="none" />
            </svg>
            <svg v-else-if="resolved === 'dark'" viewBox="0 0 16 16" width="14" height="14" aria-hidden="true">
              <path d="M13.2 9.8A5.6 5.6 0 0 1 6.2 2.8a5.6 5.6 0 1 0 7 7z" />
            </svg>
            <svg v-else viewBox="0 0 16 16" width="14" height="14" aria-hidden="true">
              <circle cx="8" cy="8" r="3.1" />
              <path d="M8 1.4v1.7M8 12.9v1.7M1.4 8h1.7M12.9 8h1.7M3.3 3.3l1.2 1.2M11.5 11.5l1.2 1.2M3.3 12.7l1.2-1.2M11.5 4.5l1.2-1.2" />
            </svg>
          </button>

          <div v-if="themeOpen" class="nav__thememenu" role="menu" :aria-label="themeLabel">
            <button
              v-for="opt in THEMES"
              :key="opt.id"
              type="button"
              role="menuitemradio"
              :aria-checked="mode === opt.id"
              @click="chooseTheme(opt.id)"
            >
              <span>{{ t(opt.label) }}</span>
              <span v-if="mode === opt.id" class="nav__themeticks" aria-hidden="true">✓</span>
            </button>
          </div>
        </div>

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
  position: fixed;
  inset: 0 0 auto 0;
  z-index: 60;
  background: var(--nav-bg);
  backdrop-filter: saturate(160%) blur(12px);
}
.nav__inner {
  height: var(--nav-h);
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1.25rem;
  /* the bar runs from the contents column's left edge to the article's right */
  width: min(100% - var(--page-gutter) * 2, calc(var(--article-w) + var(--toc-w) + var(--toc-gap)));
  margin-left: max(1.25rem, calc(50% - var(--article-w) / 2 - var(--toc-w) - var(--toc-gap)));
}

.nav__brand { display: flex; align-items: center; flex: none; }

.nav__links {
  display: flex;
  align-items: center;
  gap: 0.9rem;
  margin-right: auto;
  margin-left: 1.6rem;
  min-width: 0;
}
.nav__links a {
  display: inline-flex;
  align-items: baseline;
  gap: 0.3em;
  color: var(--ink-soft);
  font-size: 0.8rem;
  white-space: nowrap;
  text-decoration: none;
  transition: color var(--dur) var(--ease);
}
.nav__links a:hover { color: var(--ink); text-decoration: none; }
.nav__links a[aria-current='true'] { color: var(--c-blue); font-weight: 560; }
.nav__num {
  font-family: var(--ff-mono);
  font-size: var(--fs-tick);
  color: var(--ink-mute);
}
.nav__links a[aria-current='true'] .nav__num { color: var(--c-blue); }

@media (max-width: 1180px) {
  .nav__links { display: none; }
}
.nav__brand:hover { text-decoration: none; }
.nav__logo { height: 22px; width: auto; display: block; }

.nav__actions {
  display: flex;
  align-items: center;
  gap: 0.9rem;
  flex: none;
}
.nav__act {
  display: inline-flex;
  align-items: center;
  padding: 0.3rem 0;
  color: var(--ink-soft);
  font-size: var(--fs-small);
  font-weight: 550;
  line-height: 1.2;
  text-decoration: none;
  transition: color var(--dur) var(--ease);
}
.nav__act:hover { color: var(--ink); text-decoration: none; }
.nav__act--primary { color: var(--c-blue); }

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
  margin-left: 0.2rem;
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

.nav__theme {
  display: grid;
  place-items: center;
  width: 26px;
  height: 26px;
  margin-left: 0.1rem;
  padding: 0;
  border: 0;
  border-radius: 50%;
  background: none;
  color: var(--ink-mute);
  cursor: pointer;
  transition: color var(--dur) var(--ease), background var(--dur) var(--ease);
}
.nav__theme:hover {
  color: var(--ink);
  background: color-mix(in srgb, var(--ink) 7%, transparent);
}
.nav__theme svg {
  fill: none;
  stroke: currentColor;
  stroke-width: 1.2;
  stroke-linecap: round;
  stroke-linejoin: round;
}

.nav__themewrap {
  position: relative;
  display: flex;
  align-items: center;
}
.nav__thememenu {
  position: absolute;
  top: calc(100% + 10px);
  right: 0;
  z-index: 80;
  min-width: 168px;
  padding: 0.35rem;
  display: grid;
  gap: 1px;
  background: var(--paper);
  border: 1px solid var(--line-strong);
  border-radius: var(--r-md);
  box-shadow: var(--e-2);
}
.nav__thememenu button {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  width: 100%;
  padding: 0.45rem 0.55rem;
  border: 0;
  border-radius: var(--r-sm);
  background: none;
  color: var(--ink-soft);
  font: inherit;
  font-size: var(--fs-micro);
  text-align: left;
  cursor: pointer;
}
.nav__thememenu button:hover { background: var(--surface-2); color: var(--ink); }
.nav__thememenu button[aria-checked='true'] { color: var(--ink); font-weight: 600; }
.nav__themeticks { color: var(--c-blue); }

.nav__progress {
  height: 1px;
  background: var(--c-blue);
  transform-origin: 0 50%;
  opacity: 0.6;
  transition: transform 90ms linear;
}

@media (max-width: 560px) {
  .nav__act { font-size: var(--fs-micro); }
  .nav__lang { display: none; }
}
/* Below this the three links would push the bar past the viewport, so they
   collapse to their glyphs; the label survives as the link's accessible name. */
@media (max-width: 440px) {
  .nav__actions { gap: 0.5rem; }
  .nav__act-label { display: none; }
  .nav__ico { margin-right: 0; }
}

/* with the contents column hidden, the bar simply rides the article */
@media (max-width: 1359px) {
  .nav__inner {
    width: min(100% - 2.5rem, var(--article-w));
    margin-inline: auto;
  }
}
</style>
