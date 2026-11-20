?<script setup lang="ts">
/**
 * The cover.
 *
 * Laid out as a journal cover rather than as a landing page: the paper title,
 * the release film, then the numbers it is claiming. The film plays muted on
 * arrival —?the browser will not let it do otherwise —?and the bar under it
 * gives back the two controls a reader actually wants: stop it, or hear it.
 *
 * The synchronised-moment figure that used to sit here now closes the page just
 * before *Start* (see ReleaseSection), where a reader has already been told what
 * the tiers are and can read it as the last look at the data.
 */
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { COVER } from '@/data/cover'
import { useI18n } from '@/composables/useI18n'
import { useCountUp, useInView } from '@/composables/useReveal'

const { t } = useI18n()

/** The institute's wordmark, blurred into the cover's acrylic ground. */
const BAAI_MARK = 'logos/baai-acrylic.png'

/* ---------------- the film ---------------- */

const FILM = { src: 'film/HumanCOIN-film.mp4', poster: 'film/film-poster.jpg' }

const videoEl = ref<HTMLVideoElement | null>(null)
const stageEl = ref<HTMLDivElement | null>(null)
const isFull = ref(false)
/** True once the reader stopped the film themselves; scrolling must not resume it. */
const userPaused = ref(false)
let visibility: IntersectionObserver | null = null
const playing = ref(false)
const muted = ref(true)
const volume = ref(0.8)
const current = ref(0)
const duration = ref(0)

const clock = (s: number) =>
  Number.isFinite(s) && s > 0
    ? `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`
    : '0:00'

const progress = computed(() => (duration.value ? current.value / duration.value : 0))

function togglePlay() {
  const el = videoEl.value
  if (!el) return
  if (el.paused) {
    userPaused.value = false
    void el.play().catch(() => {})
  } else {
    userPaused.value = true
    el.pause()
  }
}

function setMuted(next: boolean) {
  const el = videoEl.value
  if (!el) return
  el.muted = next
  muted.value = next
  if (!next && el.volume === 0) setVolume(0.8)
}

function setVolume(next: number) {
  const el = videoEl.value
  if (!el) return
  const v = Math.min(1, Math.max(0, next))
  el.volume = v
  volume.value = v
  if (v === 0 && !el.muted) { el.muted = true; muted.value = true }
  if (v > 0 && el.muted) { el.muted = false; muted.value = false }
}

function seek(e: Event) {
  const el = videoEl.value
  if (!el) return
  const next = Number((e.target as HTMLInputElement).value)
  if (Number.isFinite(next)) el.currentTime = next
}

/** Autoplay can be refused (power saving, data saver); the button stays honest. */
const onFullChange = () => { isFull.value = !!document.fullscreenElement }

function toggleFull() {
  const el = stageEl.value
  if (!el) return
  if (document.fullscreenElement) void document.exitFullscreen().catch(() => {})
  else void el.requestFullscreen?.().catch(() => {})
}

onMounted(() => {
  const el = videoEl.value
  document.addEventListener('fullscreenchange', onFullChange)
  if (!el) return
  el.volume = volume.value
  playing.value = !el.paused
  /* The film is 1080p and software-decoded; playing it while the cover is off
     screen (reading sections 02-07) costs a frame budget on every scroll. It is
     paused as soon as it leaves the viewport and resumed only if the reader had
     not stopped it. */
  visibility = new IntersectionObserver(([entry]) => {
    const v = videoEl.value
    if (!v) return
    if (entry.isIntersecting) {
      if (!userPaused.value) void v.play().catch(() => {})
    } else if (!v.paused) {
      v.pause()
    }
  }, { threshold: 0.08 })
  visibility.observe(el)
})

onBeforeUnmount(() => {
  document.removeEventListener('fullscreenchange', onFullChange)
  visibility?.disconnect()
  visibility = null
  videoEl.value?.pause()
})

/* ---------------- metric strip ---------------- */

const { el: stripEl, shown: stripIn } = useInView<HTMLDivElement>({ margin: '0px 0px -8% 0px' })
const counters = COVER.metrics.map((m) =>
  useCountUp(m.value, { decimals: m.decimals, duration: 1200 }),
)

/* The strip is above the fold, so the observer resolves on its first callback —?   after mount. Watching the flag covers both cases: immediate entry, and the
   reader arriving at the strip by scrolling. */
watch(stripIn, (on) => {
  if (on) counters.forEach((c) => c.run())
})

onMounted(() => {
  if (stripIn.value) counters.forEach((c) => c.run())
})
</script>

<template>
  <section id="top" class="cover">
    <!-- The institute's wordmark, blurred into the acrylic: a watermark, not a
         logo lockup. Decorative, so it carries no alt text and no link. -->
    <img class="cover__mark" :src="BAAI_MARK" alt="" aria-hidden="true" />

    <div class="shell cover__inner">
      <h1 class="cover__title">{{ t(COVER.title) }}</h1>

      <p class="cover__tldr">{{ t(COVER.tldr) }}</p>
      <p class="cover__byline">
        <span>{{ COVER.team }}</span>
        <span class="cover__sep" aria-hidden="true">·</span>
        <span>{{ COVER.date }}</span>
      </p>

      <figure ref="stageEl" class="film">
        <div class="film__stage">
          <div class="film__glow">
            <video
            ref="videoEl"
            class="film__video"
            :src="FILM.src"
            :poster="FILM.poster"
            autoplay
            muted
            loop
            playsinline
            preload="metadata"
            :aria-label="t({ en: 'HumanCOIN release film', zh: 'HumanCOIN 发布短片' })"
            @play="playing = true"
            @pause="playing = false"
            @timeupdate="current = videoEl?.currentTime ?? 0"
            @loadedmetadata="duration = videoEl?.duration ?? 0; current = 0"
            @durationchange="duration = videoEl?.duration ?? 0"
            @click="togglePlay"
            />
          </div>
        </div>

        <div class="film__bar">
            <button
              class="film__btn"
              type="button"
              :aria-label="playing
                ? t({ en: 'Pause film', zh: '暂停短片' })
                : t({ en: 'Play film', zh: '播放短片' })"
              @click="togglePlay"
            >
              <svg v-if="playing" viewBox="0 0 16 16" width="12" height="12" aria-hidden="true">
                <rect x="4" y="3" width="3" height="10" rx="1" fill="currentColor" stroke="none" />
                <rect x="9" y="3" width="3" height="10" rx="1" fill="currentColor" stroke="none" />
              </svg>
              <svg v-else viewBox="0 0 16 16" width="12" height="12" aria-hidden="true">
                <path d="M5 3.2 13 8l-8 4.8z" fill="currentColor" stroke="none" />
              </svg>
            </button>

            <span class="film__time mono">{{ clock(current) }}<i>/</i>{{ clock(duration) }}</span>

            <input
              class="film__seek"
              type="range"
              min="0"
              :max="duration || 0"
              step="0.1"
              :value="current"
              :style="{ '--p': progress }"
              :aria-label="t({ en: 'Film position', zh: '短片进度' })"
              @input="seek"
            />

            <button
              class="film__btn film__btn--vol"
              type="button"
              :aria-label="muted
                ? t({ en: 'Unmute film', zh: '打开声音' })
                : t({ en: 'Mute film', zh: '静音' })"
              :aria-pressed="!muted"
              @click="setMuted(!muted)"
            >
              <svg v-if="muted || volume === 0" viewBox="0 0 16 16" width="13" height="13" aria-hidden="true">
                <path d="M2.5 6v4h2.2L8 12.6V3.4L4.7 6z" fill="currentColor" stroke="none" />
                <path d="m10.4 6.2 3.2 3.2m0-3.2-3.2 3.2" />
              </svg>
              <svg v-else viewBox="0 0 16 16" width="13" height="13" aria-hidden="true">
                <path d="M2.5 6v4h2.2L8 12.6V3.4L4.7 6z" fill="currentColor" stroke="none" />
                <path d="M10.4 5.9a3.2 3.2 0 0 1 0 4.2M12.4 4a5.8 5.8 0 0 1 0 8" />
              </svg>
            </button>

            <input
              class="film__vol"
              type="range"
              min="0"
              max="1"
              step="0.01"
              :value="muted ? 0 : volume"
              :style="{ '--p': muted ? 0 : volume }"
              :aria-label="t({ en: 'Film volume', zh: '短片音量' })"
              @input="setVolume(Number(($event.target as HTMLInputElement).value))"
            />

            <button
              class="film__btn"
              type="button"
              :aria-label="isFull
                ? t({ en: 'Exit full screen', zh: '退出全屏' })
                : t({ en: 'Full screen', zh: '全屏' })"
              :aria-pressed="isFull"
              @click="toggleFull"
            >
              <svg v-if="isFull" viewBox="0 0 16 16" width="12" height="12" aria-hidden="true">
                <path d="M6.4 2.2v3.9H2.4M9.6 13.8v-3.9h4M6.4 9.9 2.9 13.4M9.6 6.1l3.5-3.5" />
              </svg>
              <svg v-else viewBox="0 0 16 16" width="12" height="12" aria-hidden="true">
                <path d="M2.6 6V2.6H6M13.4 6V2.6H10M2.6 10v3.4H6M13.4 10v3.4H10" />
              </svg>
            </button>
          </div>
      </figure>
    </div>

    <!-- metric strip -->
    <div ref="stripEl" class="strip">
      <div class="shell strip__inner">
        <div v-for="(m, i) in COVER.metrics" :key="m.label.en" class="metric">
          <p class="metric__value">
            <span v-if="i === 0" class="metric__eq">≈</span>{{ counters[i].text.value
            }}<span class="metric__suffix">{{ t(m.suffix) }}</span>
          </p>
          <p class="metric__label">{{ t(m.label) }}</p>
          <p class="metric__sub">{{ t(m.sub) }}</p>
        </div>
      </div>
    </div>

    <!-- the cover's actions: the dataset, the report, the code -->
    <div class="shell">
      <ul class="actions">
        <li v-for="a in COVER.actions" :key="a.id">
          <a
            class="cta"
            :class="{ 'cta--primary': a.primary }"
            :href="a.href"
            :target="a.href.startsWith('#') ? undefined : '_blank'"
            :rel="a.href.startsWith('#') ? undefined : 'noopener noreferrer'"
          >
            <!-- One 16 px glyph per destination, drawn inline so the buttons
                 stay self-contained and the stroke follows the label colour. -->
            <svg
              v-if="a.id === 'seek'"
              class="cta__icon"
              viewBox="0 0 16 16"
              width="16"
              height="16"
              aria-hidden="true"
            >
              <ellipse cx="8" cy="3.5" rx="5.5" ry="2.2" />
              <path d="M2.5 3.5v4c0 1.2 2.5 2.2 5.5 2.2s5.5-1 5.5-2.2v-4" />
              <path d="M8 10v4.2M5.5 11.8 8 14l2.5-2.2" />
            </svg>
            <svg
              v-else-if="a.id === 'report'"
              class="cta__icon"
              viewBox="0 0 16 16"
              width="16"
              height="16"
              aria-hidden="true"
            >
              <path d="M4 1.8h5.2L13 5.4v8.8H4z" />
              <path d="M9 1.8v3.8h4M6 8.5h4.5M6 11h4.5" />
            </svg>
            <svg v-else class="cta__icon" viewBox="0 0 16 16" width="16" height="16" aria-hidden="true">
              <path d="m5.5 4.5-3.5 3.5 3.5 3.5M10.5 4.5 14 8l-3.5 3.5" />
            </svg>
            {{ t(a.label) }}</a>
        </li>
      </ul>
    </div>

    <p class="cover__scroll mono">{{ t(COVER.scroll) }} ↓</p>
  </section>
</template>

<style scoped>
.mono { font-family: var(--ff-mono); }

.cover {
  position: relative;
  overflow: hidden;
  isolation: isolate;
  color: var(--ink-body);
  padding-top: clamp(1rem, 0.8rem + 0.9vw, 1.6rem);
  padding-bottom: clamp(1.1rem, 0.9rem + 1vw, 1.9rem);
  /* One even wash, top to bottom: the blue of the release page settles into the
     white of the article, so the cover has no visible seam with the page below. */
  background: linear-gradient(180deg, #cfe6fa 0%, #e6f3fd 42%, #f7fbff 74%, #ffffff 100%);
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.92),
    inset 0 -36px 70px rgba(255, 255, 255, 0.38);
}

/* The blurred wordmark sits behind the figure, under the glass. */
.cover__mark {
  position: absolute;
  top: clamp(1rem, -1rem + 8vw, 7rem);
  right: clamp(-1rem, 2vw, 5rem);
  width: clamp(320px, 31vw, 500px);
  height: auto;
  opacity: 0.22;
  filter: blur(5px) saturate(0.85);
  mix-blend-mode: multiply;
  transform: rotate(-4deg);
  pointer-events: none;
  user-select: none;
  z-index: 0;
}

.cover__inner { position: relative; z-index: 1; }

/* ---- the paper title ---- */
.cover__title {
  font-family: var(--ff-display);
  /* Two rows are allowed: at this scale the longest title sets as a pair of
     balanced lines instead of being shrunk to fit a single one. */
  font-size: var(--fs-cover);
  font-weight: 500;
  line-height: 1.16;
  letter-spacing: -0.025em;
  color: var(--ink);
  margin: 0;
  text-wrap: balance;
}
.cover__tldr {
  margin: 0.75rem 0 0;
  max-width: 74ch;
  font-size: var(--fs-body);
  line-height: 1.55;
  color: var(--ink-soft);
}
.cover__byline {
  display: flex;
  align-items: baseline;
  gap: 0.4rem;
  margin: 0.55rem 0 0;
  font-size: var(--fs-micro);
  letter-spacing: 0.02em;
  color: var(--ink-mute);
}
.cover__sep { opacity: 0.6; }

/* ---- the film ----
   One 16:9 frame on the acrylic ground, with a glass bar that carries the two
   controls a reader wants and the one piece of information they need. */
.film {
  margin: clamp(0.9rem, 0.7rem + 0.8vw, 1.35rem) 0 0;
}
.film__stage {
  position: relative;
  aspect-ratio: 16 / 9;
}
.film__glow {
  position: relative;
}
/* The halo is painted behind the plate as a gradient, not as a drop-shadow
   filter: a filter over a playing 1080p video re-rasterises every frame and was
   the main cause of scroll jank on the way back up to the cover. */
.film__glow::before {
  content: '';
  position: absolute;
  inset: -6%;
  border-radius: 32px;
  background: radial-gradient(closest-side, rgba(255, 255, 255, 0.95), rgba(255, 255, 255, 0) 72%);
  z-index: -1;
  pointer-events: none;
}
.film:fullscreen { display: grid; place-items: center; background: #0b141c; }
.film:fullscreen .film__stage { width: 100%; flex: 1 1 auto; }
.film:fullscreen .film__video {
  width: 100%;
  height: 100%;
  max-height: 100vh;
  object-fit: contain;
  border-radius: 0;
  -webkit-mask-image: none;
  mask-image: none;
}
.film:fullscreen .film__bar { color: rgba(255,255,255,.85); border-top-color: rgba(255,255,255,.18); }
/* fullscreen puts the bar back on the dark stage, so the controls go white again */
.film:fullscreen .film__btn { color: rgba(255, 255, 255, 0.92); background: rgba(255, 255, 255, 0.16); }
.film:fullscreen .film__btn:hover { background: rgba(255, 255, 255, 0.28); }
.film:fullscreen .film__time { color: rgba(255, 255, 255, 0.86); }
.film:fullscreen .film__seek::-webkit-slider-runnable-track,
.film:fullscreen .film__vol::-webkit-slider-runnable-track {
  background: linear-gradient(
    to right,
    #fff calc(var(--p, 0) * 100%),
    rgba(255, 255, 255, 0.28) calc(var(--p, 0) * 100%)
  );
}
.film:fullscreen .film__seek::-webkit-slider-thumb,
.film:fullscreen .film__vol::-webkit-slider-thumb { background: #fff; box-shadow: 0 1px 3px rgba(0, 0, 0, 0.45); }
.film:fullscreen .film__seek::-moz-range-track,
.film:fullscreen .film__vol::-moz-range-track { background: rgba(255, 255, 255, 0.26); }
.film:fullscreen .film__seek::-moz-range-progress,
.film:fullscreen .film__vol::-moz-range-progress { background: rgba(255, 255, 255, 0.92); }
.film:fullscreen .film__seek::-moz-range-thumb,
.film:fullscreen .film__vol::-moz-range-thumb { background: #fff; }
.film__video {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
  border-radius: 22px;
  background: var(--night);
  cursor: pointer;
  /* No frame: the picture's own edges dissolve into the acrylic ground, so the
     plate reads as glass under the film rather than as a box drawn around it. */
  -webkit-mask-image: radial-gradient(126% 126% at 50% 48%, #000 74%, rgba(0, 0, 0, 0.62) 92%, transparent 100%);
  mask-image: radial-gradient(126% 126% at 50% 48%, #000 74%, rgba(0, 0, 0, 0.62) 92%, transparent 100%);
}
/* The controls sit under the plate, on the page's own white, not on the film. */
.film__bar {
  position: relative;
  display: flex;
  align-items: center;
  gap: 0.7rem;
  margin-top: 0.55rem;
  padding: 0.45rem 0.1rem 0.1rem;
  border-top: 1px solid rgba(23, 42, 58, 0.12);
  color: var(--ink-soft);
  opacity: 0.95;
  transition: opacity var(--dur) var(--ease);
}
.film:hover .film__bar,
.film:focus-within .film__bar { opacity: 1; }

.film__btn {
  display: grid;
  place-items: center;
  width: 26px;
  height: 26px;
  flex: none;
  padding: 0;
  border: 0;
  border-radius: 50%;
  /* the bar sits on the page's white, so its controls are inked, not white */
  color: var(--ink-soft);
  background: rgba(23, 42, 58, 0.06);
  cursor: pointer;
  transition: background var(--dur) var(--ease);
}
.film__btn:hover { background: rgba(23, 42, 58, 0.13); }
.film__btn:focus-visible { outline: 2px solid var(--c-blue); outline-offset: 2px; }
.film__btn svg {
  fill: none;
  stroke: currentColor;
  stroke-width: 1.4;
  stroke-linecap: round;
  stroke-linejoin: round;
}
.film__btn--vol { margin-left: 0.1rem; }

.film__time {
  flex: none;
  font-size: var(--fs-tick);
  letter-spacing: 0.02em;
  color: var(--ink-soft);
  font-variant-numeric: tabular-nums;
}
.film__time i { margin: 0 0.28em; font-style: normal; opacity: 0.5; }

/* Range inputs, drawn as hairlines with a small white handle; --p carries the
   filled fraction so the track reads as a progress bar rather than a slider. */
.film__seek,
.film__vol {
  appearance: none;
  -webkit-appearance: none;
  background: transparent;
  cursor: pointer;
  height: 16px;
  margin: 0;
}
.film__seek { flex: 1 1 auto; min-width: 0; }
.film__vol { flex: none; width: 58px; }
.film__seek::-webkit-slider-runnable-track,
.film__vol::-webkit-slider-runnable-track {
  height: 3px;
  border-radius: 2px;
  background: linear-gradient(
    to right,
    var(--c-blue) calc(var(--p, 0) * 100%),
    rgba(23, 42, 58, 0.18) calc(var(--p, 0) * 100%)
  );
}
.film__seek::-moz-range-track,
.film__vol::-moz-range-track {
  height: 3px;
  border-radius: 2px;
  background: rgba(23, 42, 58, 0.18);
}
.film__seek::-moz-range-progress,
.film__vol::-moz-range-progress {
  height: 3px;
  border-radius: 2px;
  background: var(--c-blue);
}
.film__seek::-webkit-slider-thumb,
.film__vol::-webkit-slider-thumb {
  -webkit-appearance: none;
  width: 9px;
  height: 9px;
  margin-top: -3px;
  border-radius: 50%;
  background: var(--c-blue);
  box-shadow: 0 0 0 3px rgba(31, 95, 150, 0.12);
}
.film__seek::-moz-range-thumb,
.film__vol::-moz-range-thumb {
  width: 9px;
  height: 9px;
  border: 0;
  border-radius: 50%;
  background: var(--c-blue);
}

/* ---- metric strip ---- */
.strip {
  position: relative;
  margin-top: clamp(1.75rem, 1.3rem + 2vw, 2.75rem);
  border-top: 1px solid rgba(23, 42, 58, 0.11);
  border-bottom: 1px solid rgba(23, 42, 58, 0.07);
  background: transparent;
}
.strip__inner {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
}
@media (max-width: 820px) { .strip__inner { grid-template-columns: repeat(2, minmax(0, 1fr)); } }
.metric {
  padding: clamp(0.6rem, 0.5rem + 0.4vw, 0.85rem) clamp(0.6rem, 0.5rem + 0.4vw, 0.9rem);
  border-left: 1px solid rgba(23, 42, 58, 0.09);
  min-width: 0;
}
.metric:first-child { border-left: 0; }
@media (max-width: 820px) {
  .metric:nth-child(3), .metric:nth-child(4) { border-top: 1px solid rgba(23, 42, 58, 0.09); }
  .metric:nth-child(3) { border-left: 0; }
}
.metric__value {
  display: flex;
  align-items: baseline;
  gap: 0.12em;
  font-size: var(--fs-stat);
  font-weight: 560;
  line-height: 1;
  letter-spacing: -0.035em;
  color: var(--ink);
  margin: 0;
  font-variant-numeric: tabular-nums;
  text-shadow:
    0 12px 24px rgba(43, 92, 133, 0.12),
    0 1px 0 rgba(255, 255, 255, 0.55);
}
.metric__eq { font-size: 0.55em; color: var(--c-teal); margin-right: 0.1em; }
.metric__suffix { font-size: var(--fs-small); font-weight: 500; color: var(--ink-mute); margin-left: 0.15em; }
.metric__label {
  font-size: var(--fs-small);
  color: var(--ink-soft);
  margin: 0.4rem 0 0.1rem;
  line-height: 1.4;
}
.metric__sub {
  font-family: var(--ff-mono);
  font-size: var(--fs-tick);
  color: var(--ink-mute);
  margin: 0;
  line-height: 1.5;
}

/* ---- the cover's actions ----
   Below the metric strip, on the cover's dark ground: the row carries the
   dataset, the report and the code, and the first is filled so the set reads as
   one primary action rather than three equal ones. */
.actions {
  position: relative;
  list-style: none;
  margin: clamp(0.9rem, 0.7rem + 0.6vw, 1.25rem) 0 0;
  padding: 0;
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: clamp(1.2rem, 1rem + 1vw, 2rem);
}
.cta {
  display: inline-flex;
  align-items: baseline;
  gap: 0.45rem;
  padding: 0.15rem 0;
  border: 0;
  border-bottom: 1px solid transparent;
  background: transparent;
  color: var(--ink);
  font-size: var(--fs-small);
  font-weight: 550;
  text-decoration: none;
  transition: color var(--dur) var(--ease), border-color var(--dur) var(--ease);
}
.cta__icon {
  fill: none;
  stroke: currentColor;
  stroke-width: 1.4;
  stroke-linecap: round;
  stroke-linejoin: round;
  /* Optical, not geometric: sits on the text baseline-ish so the pair reads
     centered without nudging the pill. */
  margin-bottom: -0.06em;
}
.cta:hover { color: #14527d; border-bottom-color: #14527d; }
.cta--primary { color: #14527d; font-weight: 600; }
.cta--primary:hover { color: #14527d; border-bottom-color: #14527d; }
.cta:focus-visible { outline: var(--focus); outline-offset: 2px; }

.cover__scroll {
  position: relative;
  text-align: center;
  margin: clamp(0.6rem, 0.5rem + 0.4vw, 0.9rem) 0 0;
  font-size: var(--fs-tick);
  letter-spacing: 0.18em;
  text-transform: uppercase;
  color: #4a7595;
}
</style>
