<script setup lang="ts">
/**
 * Closing call to action.
 *
 * A dark band that borrows the cover's ground — drifting colour fields under a
 * faint ruled grid — so the page opens and closes on the same surface. The only
 * object on it is a terminal: the install line types itself out when the band
 * first enters view, then a second line prints the slogan beneath it.
 *
 * The typing is decoration over a string that is already in the DOM's data, not
 * a substitute for it: with reduced motion, or once the animation has run, the
 * full line is simply present. Replay restarts the same run for a reader who
 * scrolled past it.
 */
import { onBeforeUnmount, ref, watch } from 'vue'
import { INSTALL } from '@/content'
import { useI18n } from '@/composables/useI18n'
import { useInView } from '@/composables/useReveal'

const { t } = useI18n()

const { el, shown } = useInView<HTMLElement>({ margin: '0px 0px -18% 0px', threshold: 0.25 })

/** Characters typed so far. */
const typed = ref('')
/** The slogan has printed on its own line. */
const printed = ref(false)

let timer = 0
let hold = 0

const reduce = () =>
  typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches

function clearTimers() {
  clearTimeout(timer)
  clearTimeout(hold)
}

function finish() {
  clearTimers()
  typed.value = INSTALL.command
  printed.value = true
}

function type(from = 0) {
  if (reduce()) return finish()
  typed.value = INSTALL.command.slice(0, from)
  printed.value = false
  if (from >= INSTALL.command.length) {
    hold = window.setTimeout(() => (printed.value = true), 420)
    return
  }
  // A steady cadence with a slightly longer beat after each space, which is
  // how a person actually types a command.
  const ch = INSTALL.command[from]
  const beat = ch === ' ' ? 130 : 58 + (from % 3) * 14
  timer = window.setTimeout(() => type(from + 1), beat)
}

function replay() {
  type(0)
}

watch(shown, (on) => {
  if (on) type(0)
})

onBeforeUnmount(clearTimers)
</script>

<template>
  <section id="install" ref="el" class="install">
    <div class="shell install__inner">
      <div class="install__copy">
        <p class="install__kicker mono">
          <span class="install__rule" aria-hidden="true"></span>{{ t(INSTALL.kicker) }}
        </p>
        <h2 class="install__title">{{ t(INSTALL.title) }}</h2>
        <p class="install__aside">{{ t(INSTALL.aside) }}</p>
        <a class="install__cta" :href="INSTALL.ctaHref">{{ t(INSTALL.cta) }} →</a>
      </div>

      <!-- The terminal is one object: chrome, prompt, typed line, then the
           printed result. It reads as a device rather than as a code sample. -->
      <div class="term">
        <div class="term__bar">
          <span class="term__dots" aria-hidden="true"><i></i><i></i><i></i></span>
          <span class="term__name mono">terminal · bash</span>
          <button class="term__replay mono" type="button" @click="replay">
            {{ t(INSTALL.replay) }}
          </button>
        </div>

        <div class="term__body">
          <p class="term__line">
            <span class="term__prompt mono">$</span>
            <span class="term__cmd mono">{{ typed }}</span>
            <span v-if="!printed" class="term__caret" aria-hidden="true"></span>
          </p>

          <p class="term__out mono" :class="{ 'is-printed': printed }">
            <span class="term__ok" aria-hidden="true">✓</span>{{ t(INSTALL.output) }}
          </p>

          <!-- The full command stays available to assistive tech and to copy,
               since a partially typed string is not a useful reading of it. -->
          <p class="sr-only">{{ INSTALL.command }}</p>
        </div>
      </div>
    </div>
  </section>
</template>

<style scoped>
.mono { font-family: var(--ff-mono); }

.install {
  position: relative;
  background: var(--paper);
  color: var(--ink);
  padding-block: clamp(3.5rem, 2.6rem + 4vw, 6.5rem);
  border-top: 1px solid var(--line);
}

.install__inner {
  position: relative;
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(0, 1.05fr);
  gap: clamp(2rem, 1.4rem + 3vw, 4rem);
  align-items: center;
}
@media (max-width: 900px) {
  .install__inner { grid-template-columns: minmax(0, 1fr); }
}

.install__kicker {
  display: flex;
  align-items: center;
  gap: 0.7rem;
  font-size: var(--fs-micro);
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: var(--ink-mute);
  margin-bottom: 1rem;
}
.install__rule {
  width: 1.75rem;
  height: 1px;
  background: var(--line-strong);
  flex: none;
}
.install__title {
  font-family: var(--ff-display);
  font-size: var(--fs-h2);
  font-weight: 520;
  letter-spacing: -0.028em;
  line-height: 1.15;
  max-width: 22ch;
  margin-bottom: 1rem;
  color: var(--ink);
}
.install__aside {
  font-size: var(--fs-small);
  line-height: 1.6;
  color: var(--ink-soft);
  max-width: 46ch;
  margin-bottom: 1.6rem;
}
.install__cta {
  display: inline-flex;
  align-items: baseline;
  gap: 0.45rem;
  padding: 0;
  border-bottom: 1px solid transparent;
  color: var(--c-blue);
  font-size: var(--fs-small);
  font-weight: 600;
  text-decoration: none;
  transition: border-color var(--dur) var(--ease);
}
.install__cta:hover { border-bottom-color: var(--c-blue); }

/* ---- terminal ----
   One dark object on the white page: a macOS Terminal window, title bar and
   traffic lights included. Everything inside it is the terminal's own palette,
   not the page's ink tokens. */
.term {
  border-radius: 10px;
  border: 1px solid #2b3038;
  background: #16191e;
  box-shadow: 0 18px 44px rgba(18, 27, 36, 0.16);
  overflow: hidden;
}
.term__bar {
  display: flex;
  align-items: center;
  gap: 0.7rem;
  padding: 0.5rem 0.75rem;
  background: #23272e;
  border-bottom: 1px solid #2f343c;
}
.term__dots { display: flex; gap: 0.38rem; }
.term__dots i {
  width: 0.56rem;
  height: 0.56rem;
  border-radius: 50%;
  background: #4a5058;
}
.term__dots i:nth-child(1) { background: #ff5f57; }
.term__dots i:nth-child(2) { background: #febc2e; }
.term__dots i:nth-child(3) { background: #28c840; }
.term__name {
  font-size: var(--fs-micro);
  letter-spacing: 0.06em;
  color: #8d949e;
}
.term__replay {
  margin-left: auto;
  font: inherit;
  font-family: var(--ff-mono);
  font-size: var(--fs-micro);
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: #9aa1ab;
  background: none;
  border: 1px solid #3a4048;
  border-radius: var(--r-xs);
  padding: 0.18rem 0.5rem;
  cursor: pointer;
  transition: color var(--dur) var(--ease), border-color var(--dur) var(--ease);
}
.term__replay:hover { color: #e6edf3; border-color: #6b737d; }

.term__body {
  padding: clamp(0.9rem, 0.7rem + 0.8vw, 1.35rem);
  font-size: clamp(0.85rem, 0.78rem + 0.4vw, 1.05rem);
  line-height: 1.7;
  color: #dbe3ec;
}
.term__line { display: flex; align-items: baseline; gap: 0.5rem; flex-wrap: wrap; }
.term__prompt { color: #7fd88f; user-select: none; }
.term__cmd { color: #e9eff7; }
.term__caret {
  width: 0.55em;
  height: 1.05em;
  align-self: center;
  background: #7fd88f;
  animation: hc-caret 1s steps(1) infinite;
}
@keyframes hc-caret {
  0%, 50% { opacity: 1; }
  50.01%, 100% { opacity: 0; }
}

/* The result line starts hidden and slides in under the command, so it reads as
   output rather than as a second caption. */
.term__out {
  display: flex;
  align-items: baseline;
  gap: 0.5rem;
  margin-top: 0.35rem;
  color: #9fce9f;
  opacity: 0;
  transform: translateY(-0.15em);
  transition: opacity var(--dur-2) var(--ease-out), transform var(--dur-2) var(--ease-out);
}
.term__out.is-printed { opacity: 1; transform: none; }
.term__ok { font-size: 0.9em; }

@media (prefers-reduced-motion: reduce) {
  .term__caret { animation: none; }
  .term__out { transition: none; }
}
</style>
