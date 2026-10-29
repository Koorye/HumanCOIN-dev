<script setup lang="ts">
import { FORMAT } from '@/content'
import { useI18n } from '@/composables/useI18n'
import SectionHead from '@/components/SectionHead.vue'
import FigFrame from '@/components/FigFrame.vue'
import MultiFreqFormat from '@/components/MultiFreqFormat.vue'
import MfCompat from '@/components/MfCompat.vue'
import EpisodeReadout from '@/components/EpisodeReadout.vue'

const { t, list, isZh } = useI18n()

/** Native rates per stream, both head-mounted and per-wrist capture. */
const rates = [
  { name: { en: 'RGB · head band', zh: 'RGB · 头环' }, hz: 30, color: 'var(--c-blue)' },
  { name: { en: 'RGB · wrist ×2', zh: 'RGB · 双腕 ×2' }, hz: 30, color: 'var(--c-blue)' },
  { name: { en: 'Depth', zh: '深度' }, hz: 15, color: 'var(--c-slate)' },
  { name: { en: 'Gaze', zh: '注视' }, hz: 120, color: 'var(--c-teal)' },
  { name: { en: 'Hand pose', zh: '手部姿态' }, hz: 60, color: 'var(--c-rose)' },
  { name: { en: 'EMG', zh: '肌电' }, hz: 1000, color: 'var(--c-amber)' },
  { name: { en: 'EEG', zh: '脑电' }, hz: 500, color: 'var(--c-violet)' },
  { name: { en: 'Audio', zh: '音频' }, hz: 48000, color: 'var(--c-slate)' },
]
const maxHz = 48000
const logWidth = (hz: number) => 12 + (Math.log10(hz) / Math.log10(maxHz)) * 88

const layout = `data/chunk-000/episode_000000/
  ├─ master_index.parquet
  ├─ observation.eeg.parquet
  ├─ observation.emg.parquet
  ├─ observation.gaze.parquet
  ├─ observation.pose.parquet
  └─ observation.skeleton.parquet
videos/chunk-000/
  ├─ observation.images.headband_left_rgb/
  ├─ observation.images.headband_right_rgb/
  ├─ observation.images.wrist_left_rgb/
  └─ observation.images.wrist_right_rgb/
meta/
  ├─ info.json
  └─ alignment_check.jsonl`
</script>

<template>
  <section id="format" class="section section--tinted">
    <div class="shell">
      <SectionHead
        :num="FORMAT.num"
        :kicker="FORMAT.kicker"
        :title="FORMAT.title"
      />

      <div class="prose format__body">
        <p v-for="(p, i) in list(FORMAT.body)" :key="i">{{ p }}</p>
      </div>

      <!-- the write / read cycle, animated -->
      <div class="format__fig">
        <MultiFreqFormat />
      </div>

      <!-- drop-in compatibility -->
      <div class="format__compat">
        <MfCompat />
      </div>

      <!-- what a query actually returns, on a released episode -->
      <div class="format__readout">
        <FigFrame
          n="14"
          class="fig--wide"
          :title="FORMAT.readoutFig"
          :aside="FORMAT.readoutFigAside"
          :note="FORMAT.readoutNote"
        >
          <EpisodeReadout />
        </FigFrame>
      </div>

      <div class="format">
        <div>
          <figure class="rates">
            <figcaption class="rates__cap">
              {{ t(FORMAT.formatChart) }}
            </figcaption>
            <div class="rates__list">
              <div v-for="r in rates" :key="r.name.en" class="rate">
                <span class="rate__name">{{ t(r.name) }}</span>
                <span class="rate__track">
                  <span class="rate__fill" :style="{ width: `${logWidth(r.hz)}%`, background: r.color }" />
                </span>
                <span class="rate__hz mono">{{ r.hz.toLocaleString('en-US') }} Hz</span>
              </div>
            </div>
            <p class="caption">
              {{ isZh
                ? '各信号流保留原生采样率，不做上采样或重采样。'
                : 'Each stream keeps its native rate; nothing is resampled or upsampled.' }}
            </p>
          </figure>
        </div>

        <div class="layout">
          <div class="layout__head">
            <h4>{{ t(FORMAT.layoutTitle) }}</h4>
          </div>
          <pre class="layout__code">{{ layout }}</pre>
          <div class="layout__tags">
            <span>Parquet <small>{{ t(FORMAT.layoutParquet) }}</small></span>
            <span>MP4 <small>{{ t(FORMAT.layoutVideo) }}</small></span>
            <span>{{ t(FORMAT.masterIndex) }} <small>{{ t(FORMAT.layoutIndex) }}</small></span>
          </div>
          <div class="layout__io">
            <code>add_frame(key, value, timestamp=t)</code>
            <span aria-hidden="true">→</span>
            <code>ds[i] → {{ t(FORMAT.readResult) }}</code>
          </div>
        </div>
      </div>
    </div>
  </section>
</template>

<style scoped>
.mono { font-family: var(--ff-mono); }

.format__body { margin-bottom: 1.5rem; }
.format__body p { max-width: 68ch; }

.format__fig {
  border: 1px solid var(--line);
  border-radius: var(--r-md);
  background: var(--paper);
  padding: clamp(1rem, 0.7rem + 1.2vw, 1.6rem);
  margin-bottom: 1.6rem;
}

.format__compat {
  border-top: 1px solid var(--line);
  padding-top: 1.5rem;
  margin-bottom: 2rem;
}

.format__readout {
  border-top: 1px solid var(--line);
  padding-top: 1.5rem;
  margin-bottom: 2rem;
}

.format {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(0, 1.05fr);
  gap: clamp(1.75rem, 1rem + 3vw, 3.5rem);
  /* The file-tree panel is far taller than the rate chart; centring the chart in
     the shared row keeps the whitespace balanced instead of pooling at the foot. */
  align-items: stretch;
}
@media (max-width: 940px) { .format { grid-template-columns: minmax(0, 1fr); align-items: start; } }

/* ---- rate chart ---- */
.rates { margin: 0; display: grid; align-content: center; }
.rates__cap {
  display: flex;
  align-items: center;
  gap: 0.6rem;
  font-family: var(--ff-mono);
  font-size: var(--fs-micro);
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--ink-mute);
  margin-bottom: 0.85rem;
}
.rates__list { display: grid; gap: 0.4rem; }
.rate { display: grid; grid-template-columns: 8.5rem minmax(0, 1fr) 4rem; gap: 0.7rem; align-items: center; font-size: var(--fs-small); }
.rate__name { color: var(--ink-soft); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.rate__track { height: 0.5rem; background: var(--surface-2); border-radius: var(--r-pill); overflow: hidden; }
.rate__fill { display: block; height: 100%; border-radius: var(--r-pill); }
.rate__hz { text-align: right; color: var(--ink); font-size: var(--fs-micro); font-variant-numeric: tabular-nums; }
.caption { margin: 0.7rem 0 0; font-size: var(--fs-micro); color: var(--ink-mute); line-height: 1.55; }
@media (max-width: 560px) {
  .rate { grid-template-columns: 7rem minmax(0, 1fr) 3.5rem; }
}

/* ---- layout ---- */
.layout {
  border: 1px solid var(--line);
  border-radius: var(--r-md);
  background: var(--paper);
  padding: 1.1rem 1.2rem 1.25rem;
}
.layout__head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.6rem;
  padding-bottom: 0.7rem;
  margin-bottom: 0.9rem;
  border-bottom: 1px solid var(--line);
}
.layout__head h4 { font-size: var(--fs-small); font-weight: 620; }
.layout__code {
  margin: 0 0 1rem;
  padding: 0.9rem 1rem;
  background: var(--surface-2);
  border: 1px solid var(--line);
  border-radius: var(--r-sm);
  font-size: var(--fs-micro);
  line-height: 1.65;
  color: var(--ink-body);
  overflow-x: auto;
}
.layout__tags { display: flex; flex-wrap: wrap; gap: 0.4rem; margin-bottom: 1rem; }
.layout__tags span {
  display: inline-flex;
  align-items: baseline;
  gap: 0.35rem;
  font-family: var(--ff-mono);
  font-size: var(--fs-micro);
  color: var(--ink);
  border: 1px solid var(--line);
  border-radius: var(--r-xs);
  padding: 0.2rem 0.5rem;
}
.layout__tags small { color: var(--ink-mute); font-family: var(--ff-sans); font-size: var(--fs-micro); }
.layout__io {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.55rem;
  font-size: var(--fs-micro);
  color: var(--ink-mute);
}
.layout__io code {
  font-size: var(--fs-micro);
  color: var(--ink);
  background: var(--surface-2);
  border: 1px solid var(--line);
  border-radius: var(--r-xs);
  padding: 0.2rem 0.45rem;
}
</style>
