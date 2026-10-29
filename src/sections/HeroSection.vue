<script setup lang="ts">
/**
 * The cover.
 *
 * Laid out as a journal cover rather than as a landing page: a masthead rule
 * naming the project and the release, then the paper title, then one figure
 * with its own numbered caption. Nothing else — a cover carries the title, and
 * the claim and the standfirst belong to the abstract, where there is room to
 * argue them.
 *
 * The figure is the acquisition itself, shown in two registers side by side.
 * On the left, four synchronised camera views from the released L3 headband,
 * presented as real footage and left unobstructed. On the right, the channels
 * that have no image of their own — gaze, pose, glove, EMG, EEG — drawn as
 * traces at their native rates, with a shared playhead marking the instant all
 * six registers the cover claims to align.
 *
 * Motion: the ground drifts (a very long, 1%-amplitude scale, so it reads as a
 * live instrument rather than as a loop), the metric values count up once when
 * the strip enters view, and the traces draw once. All are decorative; the
 * numbers are correct at rest.
 */
import { onMounted, ref, watch } from 'vue'
import { HERO } from '@/content'
import { COVER, COVER_FIGURE } from '@/data/cover'
import { useI18n } from '@/composables/useI18n'
import { useCountUp, useInView } from '@/composables/useReveal'

const { t, isZh } = useI18n()

const playing = ref(true)
const videos = ref<HTMLVideoElement[]>([])

/** All four feeds share one transport, so the grid can never drift apart. */
function toggle() {
  const next = !playing.value
  videos.value.forEach((v) => {
    if (!v) return
    if (next) void v.play().catch(() => {})
    else v.pause()
  })
  playing.value = next
}

/** Metric strip: each value counts up once the strip is on screen. */
const { el: stripEl, shown: stripIn } = useInView<HTMLDivElement>({ margin: '0px 0px -8% 0px' })
const counters = COVER.metrics.map((m) =>
  useCountUp(m.value, { decimals: m.decimals, duration: 1200 }),
)

/* The strip is above the fold, so the observer resolves on its first callback —
   after mount. Watching the flag covers both cases: immediate entry, and the
   reader arriving at the strip by scrolling. */
watch(stripIn, (on) => {
  if (on) counters.forEach((c) => c.run())
})

onMounted(() => {
  if (stripIn.value) counters.forEach((c) => c.run())
})

/**
 * Deterministic polyline per channel, so the trace does not redraw on
 * re-render. Both the channel panel and the panel's own header use it.
 */
function trace(i: number, w = 100, h = 16): string {
  const pts: string[] = []
  const seed = i * 7 + 3
  for (let k = 0; k <= 64; k++) {
    const u = k / 64
    const phase = u * (5 + i * 1.7) + seed
    const env = 0.3 + 0.7 * Math.sin(Math.PI * u)
    const y = h / 2 - Math.sin(phase) * (h / 2 - 1) * env - Math.sin(phase * 2.7) * 1.1
    pts.push(`${(u * w).toFixed(2)},${y.toFixed(2)}`)
  }
  return pts.join(' ')
}

/** The instant the caption claims: the playhead every channel is read at. */
const PLAYHEAD = 58

function jump(id: string) {
  document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
}
</script>

<template>
  <section id="top" class="cover">
    <!-- drifting ground: three soft radial fields, very slow, full-bleed -->
    <div class="cover__ground" aria-hidden="true">
      <span class="cover__blob cover__blob--a" />
      <span class="cover__blob cover__blob--b" />
      <span class="cover__blob cover__blob--c" />
      <span class="cover__grain" />
    </div>

    <div class="shell cover__inner">
      <!-- masthead -->
      <header class="masthead">
        <span class="masthead__name">{{ t(COVER.masthead) }}</span>
        <span class="masthead__disc">{{ t(COVER.discipline) }}</span>
        <span class="masthead__issue mono">{{ t(COVER.issue) }}</span>
      </header>

      <h1 class="cover__title">{{ t(COVER.title) }}</h1>

      <div class="cover__actions">
        <button class="btn btn--cover" type="button" @click="jump('data')">
          {{ t(HERO.ctaPrimary) }}
        </button>
        <button class="btn btn--cover-ghost" type="button" @click="jump('abstract')">
          {{ t(HERO.ctaSecondary) }}
        </button>
      </div>

      <figure class="coverfig">
        <div class="coverfig__grid">
          <!-- Left: four real, synchronised views, unobstructed. -->
          <div class="cams" :aria-label="t(COVER_FIGURE.camsLabel)">
            <div v-for="c in COVER_FIGURE.cameras" :key="c.id" class="cam">
              <video
                ref="videos"
                :src="c.file"
                :poster="c.poster"
                autoplay
                muted
                loop
                playsinline
                preload="metadata"
              />
              <span class="cam__tag mono">{{ c.id }}</span>
              <span class="cam__name">{{ t(c.label) }}</span>
            </div>
            <button class="coverfig__toggle" type="button" @click="toggle">
              <span aria-hidden="true">{{ playing ? '❚❚' : '▶' }}</span>
              <span class="sr-only">{{ playing ? 'Pause' : 'Play' }}</span>
            </button>
          </div>

          <!-- Right: the channels that have no image, at their own rates. -->
          <div class="chans">
            <p class="chans__label mono">{{ t(COVER_FIGURE.signalsLabel) }}</p>
            <ul class="chans__list" :aria-label="t(COVER_FIGURE.modality)">
              <li
                v-for="(s, i) in COVER_FIGURE.streams"
                :key="s.id"
                class="chan"
                :style="{ '--k': s.color, '--i': i }"
              >
                <span class="chan__id mono">{{ t(s.label) }}</span>
                <svg class="chan__trace" viewBox="0 0 100 16" preserveAspectRatio="none" aria-hidden="true">
                  <polyline :points="trace(i)" />
                </svg>
                <span class="chan__rate mono">{{ s.rate }}</span>
              </li>
            </ul>
            <span class="chans__playhead" :style="{ left: `${PLAYHEAD}%` }" aria-hidden="true" />
            <p class="chans__note">{{ t(COVER_FIGURE.signalsNote) }}</p>
          </div>
        </div>

        <!-- The released takes, as a plate of real frames. Kept separate from
             the live views so nothing is drawn across the footage. -->
        <div class="plate" :aria-label="t(COVER_FIGURE.plateLabel)">
          <p class="plate__label mono">{{ t(COVER_FIGURE.plateLabel) }}</p>
          <ul class="plate__list">
            <li v-for="id in COVER_FIGURE.plate" :key="id">
              <img :src="`real/${id}.jpg`" alt="" loading="lazy" decoding="async" />
            </li>
          </ul>
        </div>

        <figcaption class="coverfig__cap">
          <span class="coverfig__n">{{ isZh ? '封面图' : 'Cover figure' }}</span>
          <span>{{ t(COVER.figureNote) }}</span>
        </figcaption>
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

    <p class="cover__scroll mono">{{ t(COVER.scroll) }} ↓</p>
  </section>
</template>

<style scoped>
.mono { font-family: var(--ff-mono); }

.cover {
  position: relative;
  overflow: hidden;
  background: var(--night);
  color: #e9f1f6;
  padding-top: clamp(1.5rem, 1rem + 1.6vw, 2.5rem);
  padding-bottom: clamp(1.75rem, 1.2rem + 2vw, 3rem);
  /* The seam to the white body below is a hairline, not a shadow: the cover
     ends and the paper starts. */
  border-bottom: 1px solid var(--night-3);
}

/* ---- drifting ground ---- */
.cover__ground {
  position: absolute;
  inset: -20% -10% -10% -10%;
  pointer-events: none;
}
.cover__blob {
  position: absolute;
  border-radius: 50%;
  filter: blur(70px);
  opacity: 0.5;
  animation: hc-drift var(--dur-5) var(--ease-io) infinite;
}
.cover__blob--a {
  width: 46vw; height: 46vw;
  left: 2%; top: 4%;
  background: radial-gradient(circle, rgba(28, 95, 140, 0.85) 0%, transparent 68%);
  animation-duration: 28s;
}
.cover__blob--b {
  width: 40vw; height: 40vw;
  right: 4%; top: -6%;
  background: radial-gradient(circle, rgba(91, 69, 168, 0.7) 0%, transparent 70%);
  animation-duration: 36s;
  animation-direction: reverse;
}
.cover__blob--c {
  width: 38vw; height: 38vw;
  left: 34%; bottom: -14%;
  background: radial-gradient(circle, rgba(15, 107, 99, 0.62) 0%, transparent 70%);
  animation-duration: 44s;
}
/* A faint ruled grid: the cover's "graph paper", which the figures below sit on. */
.cover__grain {
  position: absolute;
  inset: 0;
  background-image:
    linear-gradient(rgba(255, 255, 255, 0.028) 1px, transparent 1px),
    linear-gradient(90deg, rgba(255, 255, 255, 0.028) 1px, transparent 1px);
  background-size: 68px 68px;
  mask-image: radial-gradient(ellipse 90% 70% at 50% 40%, #000 20%, transparent 78%);
}

.cover__inner { position: relative; }

/* ---- masthead ---- */
.masthead {
  display: flex;
  align-items: baseline;
  gap: 0.9rem;
  padding-bottom: 0.55rem;
  border-bottom: 1px solid rgba(255, 255, 255, 0.22);
  margin-bottom: clamp(1.4rem, 1rem + 1.6vw, 2.4rem);
}
.masthead__name {
  font-family: var(--ff-display);
  font-size: var(--fs-h4);
  font-weight: 600;
  letter-spacing: -0.01em;
  color: #fff;
}
.masthead__disc {
  font-size: var(--fs-micro);
  color: #9fbccd;
}
.masthead__issue {
  margin-left: auto;
  font-size: var(--fs-tick);
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: #7fa8c4;
}

/* ---- the paper title ---- */
.cover__title {
  font-family: var(--ff-display);
  /* A title, not a claim: the type is large but it has to carry 15 words across
     two or three lines, so the scale is capped well under the old claim size. */
  font-size: clamp(1.9rem, 1.1rem + 2.6vw, 3.35rem);
  font-weight: 500;
  line-height: 1.14;
  letter-spacing: -0.022em;
  color: #fff;
  margin: 0;
  max-width: 46ch;
  text-wrap: balance;
}
.cover__actions { display: flex; flex-wrap: wrap; gap: 0.6rem; margin-top: clamp(1.1rem, 0.9rem + 1vw, 1.6rem); }

.btn--cover {
  background: #fff;
  border-color: #fff;
  color: var(--night);
}
.btn--cover:hover { background: var(--k-blue); border-color: var(--k-blue); color: var(--night); }
.btn--cover-ghost {
  background: transparent;
  border-color: rgba(255, 255, 255, 0.34);
  color: #e9f1f6;
}
.btn--cover-ghost:hover {
  background: rgba(255, 255, 255, 0.08);
  border-color: rgba(255, 255, 255, 0.6);
  color: #fff;
}

/* ---- cover figure: real views left, channels right ---- */
.coverfig {
  margin: clamp(1.5rem, 1.2rem + 1.6vw, 2.2rem) 0 0;
}
.coverfig__grid {
  display: grid;
  grid-template-columns: minmax(0, 1.42fr) minmax(0, 1fr);
  gap: clamp(0.85rem, 0.6rem + 1.2vw, 1.4rem);
  align-items: stretch;
}
@media (max-width: 940px) { .coverfig__grid { grid-template-columns: minmax(0, 1fr); } }

/* ---- the four headband views ---- */
.cams {
  position: relative;
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 0.5rem;
}
.cam {
  position: relative;
  aspect-ratio: 4 / 3;
  border: 1px solid rgba(255, 255, 255, 0.16);
  border-radius: var(--r-sm);
  overflow: hidden;
  background: var(--night-2);
  box-shadow: var(--e-night);
}
.cam video { display: block; width: 100%; height: 100%; object-fit: cover; }
.cam__tag {
  position: absolute;
  top: 0.45rem;
  left: 0.45rem;
  padding: 0.05rem 0.35rem;
  border-radius: var(--r-xs);
  background: rgba(6, 18, 26, 0.66);
  font-size: var(--fs-tick);
  letter-spacing: 0.1em;
  color: #dcebf3;
  backdrop-filter: blur(4px);
}
.cam__name {
  position: absolute;
  right: 0.5rem;
  bottom: 0.4rem;
  font-size: var(--fs-tick);
  color: #b9d2e0;
  text-shadow: 0 1px 4px rgba(4, 12, 18, 0.9);
}

.coverfig__toggle {
  position: absolute;
  right: 0.5rem;
  top: 0.45rem;
  z-index: 2;
  width: 1.9rem;
  height: 1.9rem;
  display: grid;
  place-items: center;
  border: 0;
  border-radius: var(--r-xs);
  background: rgba(6, 18, 26, 0.68);
  color: #fff;
  font-size: var(--fs-micro);
  cursor: pointer;
  backdrop-filter: blur(6px);
  transition: background var(--dur-1) var(--ease);
}
.coverfig__toggle:hover { background: rgba(6, 18, 26, 0.9); }

/* ---- the non-visual channels ---- */
.chans {
  position: relative;
  display: grid;
  align-content: start;
  gap: 0.5rem;
  padding: clamp(0.8rem, 0.6rem + 0.8vw, 1.1rem);
  border: 1px solid rgba(255, 255, 255, 0.14);
  border-radius: var(--r-sm);
  background: rgba(255, 255, 255, 0.035);
}
.chans__label {
  margin: 0;
  font-size: var(--fs-tick);
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: #8fb0c6;
}
.chans__list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: grid;
  grid-template-rows: repeat(5, minmax(2.05rem, auto));
  gap: 0.15rem;
  flex: 1;
}
.chan {
  display: grid;
  grid-template-columns: 3.4rem minmax(0, 1fr) 3.6rem;
  gap: 0.45rem;
  align-items: center;
  padding: 0.15rem 0;
  border-bottom: 1px solid rgba(255, 255, 255, 0.07);
  animation: lane-in var(--dur-3) var(--ease-out) backwards;
  animation-delay: calc(var(--i) * var(--stagger));
}
.chan:last-child { border-bottom: 0; }
.chan__id {
  font-size: var(--fs-tick);
  letter-spacing: 0.08em;
  color: var(--k);
}
.chan__trace { width: 100%; height: 22px; display: block; overflow: visible; }
.chan__trace polyline {
  fill: none;
  stroke: var(--k);
  stroke-width: 1.1;
  stroke-linejoin: round;
  vector-effect: non-scaling-stroke;
  stroke-dasharray: 320;
  stroke-dashoffset: 320;
  animation: chan-draw var(--dur-5) var(--ease-out) forwards;
  animation-delay: calc(var(--i) * var(--stagger) + 150ms);
}
.chan__rate {
  font-size: var(--fs-tick);
  color: #8fa9ba;
  text-align: right;
}
/* The shared instant: one rule down the channel panel, drawn behind the
   traces, so "same instant" is a mark rather than an assertion. */
.chans__playhead {
  position: absolute;
  top: clamp(0.8rem, 0.6rem + 0.8vw, 1.1rem);
  bottom: 3.6rem;
  width: 1px;
  background: linear-gradient(180deg, transparent, rgba(255, 255, 255, 0.42) 12%, rgba(255, 255, 255, 0.42) 88%, transparent);
  pointer-events: none;
}
.chans__note {
  margin: 0.5rem 0 0;
  font-size: var(--fs-tick);
  line-height: 1.6;
  color: #7fa8c4;
}

@keyframes lane-in { from { opacity: 0; transform: translateX(-6px); } to { opacity: 1; transform: none; } }
@keyframes chan-draw { to { stroke-dashoffset: 0; } }

/* ---- plate of released takes ---- */
.plate {
  margin-top: clamp(0.75rem, 0.6rem + 0.8vw, 1.1rem);
  padding-top: 0.7rem;
  border-top: 1px solid rgba(255, 255, 255, 0.12);
}
.plate__label {
  margin: 0 0 0.5rem;
  font-size: var(--fs-tick);
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: #8fb0c6;
}
.plate__list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: grid;
  grid-template-columns: repeat(6, minmax(0, 1fr));
  gap: 0.4rem;
}
@media (max-width: 480px) { .plate__list { grid-template-columns: repeat(4, minmax(0, 1fr)); } }
.plate__list li {
  aspect-ratio: 4 / 3;
  border: 1px solid rgba(255, 255, 255, 0.12);
  border-radius: var(--r-xs);
  overflow: hidden;
  background: var(--night-2);
}
.plate__list img {
  display: block;
  width: 100%;
  height: 100%;
  object-fit: cover;
  filter: saturate(0.92);
  transition: transform var(--dur-2) var(--ease), filter var(--dur-2) var(--ease);
}
.plate__list li:hover img { transform: scale(1.06); filter: saturate(1.05); }

.coverfig__cap {
  display: flex;
  flex-wrap: wrap;
  gap: 0.3rem 0.7rem;
  margin-top: 0.6rem;
  font-size: var(--fs-micro);
  line-height: 1.6;
  color: #9fbccd;
  max-width: 82ch;
}
.coverfig__n {
  font-family: var(--ff-display);
  font-weight: 600;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  color: var(--k-teal);
  white-space: nowrap;
}

/* ---- metric strip ---- */
.strip {
  position: relative;
  margin-top: clamp(1.75rem, 1.3rem + 2vw, 2.75rem);
  border-top: 1px solid rgba(255, 255, 255, 0.16);
  border-bottom: 1px solid rgba(255, 255, 255, 0.16);
  background: rgba(255, 255, 255, 0.032);
}
.strip__inner {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
}
@media (max-width: 820px) { .strip__inner { grid-template-columns: repeat(2, minmax(0, 1fr)); } }
.metric {
  padding: clamp(0.9rem, 0.7rem + 0.6vw, 1.3rem) clamp(0.75rem, 0.6rem + 0.6vw, 1.15rem);
  border-left: 1px solid rgba(255, 255, 255, 0.12);
  min-width: 0;
}
.metric:first-child { border-left: 0; }
@media (max-width: 820px) {
  .metric:nth-child(3), .metric:nth-child(4) { border-top: 1px solid rgba(255, 255, 255, 0.12); }
  .metric:nth-child(3) { border-left: 0; }
}
.metric__value {
  display: flex;
  align-items: baseline;
  gap: 0.12em;
  font-size: var(--fs-stat);
  font-weight: 620;
  line-height: 1;
  letter-spacing: -0.03em;
  color: #fff;
  margin: 0;
  font-variant-numeric: tabular-nums;
}
.metric__eq { font-size: 0.55em; color: var(--k-teal); margin-right: 0.1em; }
.metric__suffix { font-size: var(--fs-small); font-weight: 500; color: #9fbccd; margin-left: 0.15em; }
.metric__label {
  font-size: var(--fs-small);
  color: #d3e2ea;
  margin: 0.4rem 0 0.1rem;
  line-height: 1.4;
}
.metric__sub {
  font-family: var(--ff-mono);
  font-size: var(--fs-tick);
  color: #7fa8c4;
  margin: 0;
  line-height: 1.5;
}

.cover__scroll {
  position: relative;
  text-align: center;
  margin: clamp(1rem, 0.8rem + 0.8vw, 1.5rem) 0 0;
  font-size: var(--fs-tick);
  letter-spacing: 0.18em;
  text-transform: uppercase;
  color: #5f8aa6;
}

@media (prefers-reduced-motion: reduce) {
  .cover__blob,
  .chan,
  .chan__trace polyline { animation: none; }
  .chan__trace polyline { stroke-dashoffset: 0; }
}
</style>
