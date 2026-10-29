<script setup lang="ts">
import { onBeforeUnmount, ref } from 'vue'
import { FOOTER, CITATION, AUTHORS, SITE, UI } from '@/content'
import { useI18n } from '@/composables/useI18n'

const { t } = useI18n()
const year = new Date().getFullYear()

/**
 * Built in script so the template never has to escape BibTeX braces.
 *
 * The author list runs to dozens of names, so it is wrapped across lines and
 * hangs under the field indent: one unwrapped line would be far wider than any
 * column and would hide most of the list behind a horizontal scrollbar.
 */
const FIELD_W = 7
const authorPrefix = `  ${'author'.padEnd(FIELD_W)} = {`
const authorHang = ' '.repeat(authorPrefix.length)

function authorLines(names: readonly string[], width = 110): string[] {
  const lines: string[] = []
  let cur = ''
  for (const name of names) {
    const base = lines.length === 0 ? authorPrefix : authorHang
    const add = cur ? `, ${name}` : name
    if (cur && base.length + cur.length + add.length > width) {
      lines.push(`${base}${cur},`)
      cur = name
    } else {
      cur += add
    }
  }
  lines.push(`${lines.length === 0 ? authorPrefix : authorHang}${cur}},`)
  return lines
}

const bibtex = [
  `@${CITATION.type}{${CITATION.key},`,
  ...authorLines(AUTHORS),
  `  ${'title'.padEnd(FIELD_W)} = {${CITATION.title}},`,
  `  ${'year'.padEnd(FIELD_W)} = {${CITATION.year}},`,
  `  ${'license'.padEnd(FIELD_W)} = {${CITATION.license}},`,
  '}',
].join('\n')

function toTop() {
  window.scrollTo({ top: 0, behavior: 'smooth' })
}

/* Copy the entry as plain text. `navigator.clipboard` needs a secure context,
 * so a selection-based fallback runs where it is missing — a viewer opened over
 * plain http is common enough that a dead button would be the normal case. */
const copyState = ref<'idle' | 'done' | 'failed'>('idle')
let resetTimer = 0

function legacyCopy(text: string): boolean {
  const area = document.createElement('textarea')
  area.value = text
  area.setAttribute('readonly', '')
  area.style.position = 'fixed'
  area.style.opacity = '0'
  document.body.appendChild(area)
  area.select()
  let ok = false
  try {
    ok = document.execCommand('copy')
  } catch {
    ok = false
  }
  document.body.removeChild(area)
  return ok
}

async function copyBibtex() {
  let ok = false
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(bibtex)
      ok = true
    } else {
      ok = legacyCopy(bibtex)
    }
  } catch {
    ok = legacyCopy(bibtex)
  }
  copyState.value = ok ? 'done' : 'failed'
  clearTimeout(resetTimer)
  resetTimer = window.setTimeout(() => (copyState.value = 'idle'), 2000)
}

onBeforeUnmount(() => clearTimeout(resetTimer))
</script>

<template>
  <footer class="foot">
    <div class="shell foot__inner">
      <div class="foot__brand">
        <p class="foot__mark mono">{{ SITE.name }}</p>
        <p class="foot__tagline">{{ t(FOOTER.tagline) }}</p>
      </div>

      <!-- the citation takes a row of its own: the author list needs the width -->
      <section class="foot__cite">
        <div class="foot__citehead">
          <h3 class="foot__h">{{ t(FOOTER.citeTitle) }}</h3>
          <button
            class="foot__copy"
            type="button"
            :class="`is-${copyState}`"
            :aria-label="t(UI.copyBibtex)"
            @click="copyBibtex"
          >
            {{ copyState === 'done' ? t(UI.copied) : copyState === 'failed' ? t(UI.copyFailed) : t(UI.copy) }}
          </button>
        </div>
        <pre class="foot__code">{{ bibtex }}</pre>
      </section>

      <div class="foot__cols">
        <section>
          <h3 class="foot__h">{{ t(FOOTER.licenseTitle) }}</h3>
          <p class="foot__p">{{ t(FOOTER.licenseBody) }}</p>
          <p class="foot__p foot__p--strong">CC BY-NC 4.0</p>
        </section>

        <section>
          <h3 class="foot__h">{{ t(FOOTER.consentTitle) }}</h3>
          <p class="foot__p">{{ t(FOOTER.consentBody) }}</p>
        </section>

        <section>
          <h3 class="foot__h">{{ t(FOOTER.contactTitle) }}</h3>
          <p class="foot__p">{{ t(FOOTER.contactBody) }}</p>
          <p class="foot__p"><a href="mailto:humancoin@baai.ac.cn">humancoin@baai.ac.cn</a></p>
        </section>
      </div>

      <div class="foot__base">
        <p>{{ t(FOOTER.rights) }} © {{ year }} {{ SITE.name }}</p>
        <button class="foot__top" type="button" @click="toTop">{{ t(UI.toTop) }} ↑</button>
      </div>
    </div>
  </footer>
</template>

<style scoped>
.mono { font-family: var(--ff-mono); }

.foot {
  border-top: 1px solid var(--line);
  background: var(--surface);
  padding-block: clamp(2.25rem, 1.75rem + 2.5vw, 3.5rem) 1.5rem;
}
.foot__inner { display: grid; gap: clamp(1.75rem, 1.4rem + 2vw, 2.75rem); }

.foot__mark { font-size: var(--fs-h4); font-weight: 660; color: var(--ink); margin: 0 0 0.3rem; letter-spacing: -0.02em; }
.foot__tagline { font-size: var(--fs-small); color: var(--ink-soft); margin: 0; max-width: 40ch; }

/* ---- citation: a single full-width row ---- */
.foot__cite { min-width: 0; }
.foot__citehead {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 0.75rem;
}
.foot__citehead .foot__h { margin-bottom: 0.6rem; }
.foot__copy {
  font: inherit;
  font-family: var(--ff-mono);
  font-size: var(--fs-tick);
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: var(--ink-soft);
  background: var(--paper);
  border: 1px solid var(--line-strong);
  border-radius: var(--r-xs);
  padding: 0.22rem 0.55rem;
  cursor: pointer;
  transition: color var(--dur) var(--ease), border-color var(--dur) var(--ease);
}
.foot__copy:hover { color: var(--ink); border-color: var(--ink-mute); }
.foot__copy.is-done { color: var(--c-teal); border-color: var(--c-teal); }
.foot__copy.is-failed { color: var(--c-amber); border-color: var(--c-amber); }

.foot__cols {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: clamp(1.25rem, 1rem + 1.5vw, 2.25rem);
}
@media (max-width: 860px) { .foot__cols { grid-template-columns: repeat(2, minmax(0, 1fr)); } }
@media (max-width: 520px) { .foot__cols { grid-template-columns: minmax(0, 1fr); } }

.foot__h {
  font-family: var(--ff-mono);
  font-size: var(--fs-micro);
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: var(--ink-mute);
  margin-bottom: 0.6rem;
  font-weight: 600;
}
.foot__p { font-size: var(--fs-micro); line-height: 1.7; color: var(--ink-soft); margin: 0 0 0.5rem; }
.foot__p--strong { color: var(--ink); font-weight: 600; font-family: var(--ff-mono); }
.foot__code {
  margin: 0;
  padding: 0.8rem 0.9rem;
  background: var(--paper);
  border: 1px solid var(--line);
  border-radius: var(--r-sm);
  font-size: var(--fs-micro);
  line-height: 1.7;
  color: var(--ink-body);
  white-space: pre-wrap;
  overflow-wrap: anywhere;
}

.foot__base {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
  padding-top: 1.1rem;
  border-top: 1px solid var(--line);
}
.foot__base p { font-size: var(--fs-micro); color: var(--ink-mute); margin: 0; }
.foot__top {
  border: 1px solid var(--line-strong);
  background: var(--paper);
  color: var(--ink-soft);
  font: inherit;
  font-size: var(--fs-micro);
  padding: 0.35rem 0.7rem;
  border-radius: var(--r-xs);
  cursor: pointer;
  transition: color var(--dur) var(--ease), border-color var(--dur) var(--ease);
}
.foot__top:hover { color: var(--ink); border-color: var(--ink-mute); }
</style>
