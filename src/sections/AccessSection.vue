<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { ACCESS } from '@/content'
import { useI18n } from '@/composables/useI18n'
import SectionHead from '@/components/SectionHead.vue'
import { loadRecordings, asset, type ReleasedRecording } from '@/data/recordings'

const { t, isZh } = useI18n()

const recordings = ref<ReleasedRecording[]>([])
const tier = ref<'all' | 'L1' | 'L2' | 'L3'>('all')
const modality = ref('all')
const query = ref('')
const selected = ref<Set<string>>(new Set())
const copied = ref(false)

const modalities = ['EEG', 'EMG', 'Gaze', 'RGB', 'Hands', 'Pose']

const filtered = computed(() =>
  recordings.value.filter((r) => {
    if (tier.value !== 'all' && !r.id.startsWith(tier.value)) return false
    if (modality.value !== 'all' && !r.modalities.includes(modality.value)) return false
    const q = query.value.trim().toLowerCase()
    if (!q) return true
    return [r.title, r.titleEn, r.task, r.taskEn, r.scene, r.sceneEn, r.id]
      .join(' ')
      .toLowerCase()
      .includes(q)
  }),
)

function toggle(id: string) {
  const next = new Set(selected.value)
  if (next.has(id)) next.delete(id)
  else next.add(id)
  selected.value = next
}

const command = computed(() => {
  const ids = selected.value.size
    ? [...selected.value]
    : filtered.value.slice(0, 1).map((r) => r.id)
  return ids.length
    ? ids.map((id) => `humancoin download ${id}`).join('\n')
    : '# select an episode above'
})

async function copy() {
  try {
    await navigator.clipboard.writeText(`pip install humancoin\n\n${command.value}`)
    copied.value = true
    setTimeout(() => (copied.value = false), 1600)
  } catch {
    copied.value = false
  }
}

onMounted(async () => {
  try {
    recordings.value = await loadRecordings()
  } catch {
    recordings.value = []
  }
})
</script>

<template>
  <section id="access" class="section section--tinted">
    <div class="shell">
      <SectionHead :num="ACCESS.num" :kicker="ACCESS.kicker" :title="ACCESS.title">
        <template #aside>
        </template>
      </SectionHead>

      <div class="filters">
        <label class="field">
          <span class="field__label">{{ t(ACCESS.filterTier) }}</span>
          <select v-model="tier" class="select">
            <option value="all">{{ t(ACCESS.all) }}</option>
            <option value="L1">L1</option>
            <option value="L2">L2</option>
            <option value="L3">L3</option>
          </select>
        </label>

        <label class="field">
          <span class="field__label">{{ t(ACCESS.filterModality) }}</span>
          <select v-model="modality" class="select">
            <option value="all">{{ t(ACCESS.noModality) }}</option>
            <option v-for="m in modalities" :key="m" :value="m">{{ m }}</option>
          </select>
        </label>

        <label class="field field--wide">
          <span class="field__label">{{ t(ACCESS.filterSearch) }}</span>
          <input
            v-model="query"
            class="select"
            type="search"
            :placeholder="t(ACCESS.filterSearchPlaceholder)"
          />
        </label>

        <p class="filters__count">
          <b>{{ filtered.length }}</b> {{ t(ACCESS.results) }}
          <template v-if="selected.size">
            · <b>{{ selected.size }}</b> {{ isZh ? '已选' : 'selected' }}
          </template>
        </p>
      </div>

      <div v-if="filtered.length" class="results">
        <article
          v-for="r in filtered"
          :key="r.id"
          class="card"
          :class="{ 'card--on': selected.has(r.id) }"
        >
          <button
            type="button"
            class="card__pick"
            :aria-pressed="selected.has(r.id)"
            :aria-label="`${isZh ? '选择' : 'Select'} ${isZh ? r.title : r.titleEn}`"
            @click="toggle(r.id)"
          >
            <span class="card__check" aria-hidden="true">✓</span>
          </button>
          <div class="card__media">
            <img :src="asset(r.poster)" alt="" loading="lazy" decoding="async" />
          </div>
          <div class="card__body">
            <h3 class="card__title">{{ isZh ? r.title : r.titleEn || r.title }}</h3>
            <p class="card__meta mono">{{ r.id }}</p>
            <p class="card__scene">
              {{ isZh ? r.scene : r.sceneEn }} · {{ r.duration.toFixed(0) }} s ·
              {{ r.fps }} fps
            </p>
            <p class="card__mods">
              <span v-for="m in r.modalities" :key="m" class="mod-chip">{{ m }}</span>
            </p>
          </div>
        </article>
      </div>
      <p v-else class="results__empty">{{ t(ACCESS.emptyState) }}</p>

      <div class="cli">
        <div class="cli__head">
          <span class="cli__title mono">terminal · bash</span>
          <div class="cli__actions">
            <button
              v-if="selected.size"
              class="btn cli__btn"
              type="button"
              @click="selected = new Set()"
            >
              {{ t(ACCESS.clear) }}
            </button>
            <button class="btn cli__btn" type="button" @click="copy">
              {{ copied ? t(ACCESS.copied) : t(ACCESS.copy) }}
            </button>
          </div>
        </div>
        <pre class="cli__code"><span class="c"># {{ t(ACCESS.installLabel) }}</span>
<span class="p">$</span> pip install humancoin

<span class="c"># {{ t(ACCESS.fetchLabel) }}</span>
<span class="p">$</span> {{ command }}</pre>
      </div>
    </div>
  </section>
</template>

<style scoped>
.mono { font-family: var(--ff-mono); }

.filters {
  display: grid;
  grid-template-columns: 8rem 10rem minmax(0, 1fr) auto;
  gap: 0.85rem;
  align-items: end;
  padding-bottom: 1.1rem;
  border-bottom: 1px solid var(--line);
  margin-bottom: 1.25rem;
}
@media (max-width: 880px) {
  .filters { grid-template-columns: minmax(0, 1fr) minmax(0, 1fr); }
  .field--wide { grid-column: 1 / -1; }
  .filters__count { grid-column: 1 / -1; }
}
.field { display: grid; gap: 0.35rem; }
.field__label {
  font-family: var(--ff-mono);
  font-size: var(--fs-micro);
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: var(--ink-mute);
}
.select {
  width: 100%;
  padding: 0.5rem 0.6rem;
  font: inherit;
  font-size: var(--fs-small);
  color: var(--ink);
  background: var(--paper);
  border: 1px solid var(--line-strong);
  border-radius: var(--r-sm);
}
.filters__count { font-size: var(--fs-small); color: var(--ink-mute); margin: 0 0 0.35rem; white-space: nowrap; }
.filters__count b { color: var(--ink); }

.results {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(17rem, 1fr));
  gap: 0.75rem;
  margin-bottom: 1.75rem;
}
.results__empty { font-size: var(--fs-small); color: var(--ink-mute); padding: 2rem 0; }

.card {
  position: relative;
  display: grid;
  grid-template-rows: auto 1fr;
  border: 1px solid var(--line);
  border-radius: var(--r-md);
  background: var(--paper);
  overflow: hidden;
  transition: border-color var(--dur) var(--ease), box-shadow var(--dur) var(--ease);
}
.card:hover { border-color: var(--line-strong); box-shadow: var(--e-1); }
.card--on { border-color: var(--c-blue); box-shadow: 0 0 0 1px var(--c-blue); }
.card__pick {
  position: absolute;
  top: 0.5rem;
  right: 0.5rem;
  z-index: 2;
  width: 1.5rem;
  height: 1.5rem;
  display: grid;
  place-items: center;
  border: 1px solid var(--line-strong);
  border-radius: var(--r-xs);
  background: rgba(255, 255, 255, 0.92);
  color: transparent;
  font-size: var(--fs-micro);
  cursor: pointer;}
.card--on .card__pick { background: var(--c-blue); border-color: var(--c-blue); color: #fff; }
.card__media { aspect-ratio: 16 / 10; background: var(--surface-2); overflow: hidden; }
.card__media img { width: 100%; height: 100%; object-fit: cover; }
.card__body { padding: 0.8rem 0.9rem 0.95rem; display: grid; gap: 0.25rem; align-content: start; }
.card__title { font-size: var(--fs-small); font-weight: 600; color: var(--ink); }
.card__meta { font-size: var(--fs-micro); color: var(--ink-mute); margin: 0; overflow: hidden; text-overflow: ellipsis; }
.card__scene { font-size: var(--fs-micro); color: var(--ink-soft); margin: 0; }
.card__mods { display: flex; flex-wrap: wrap; gap: 0.25rem; margin: 0.35rem 0 0; }
.mod-chip {
  font-size: var(--fs-micro);
  color: var(--ink-soft);
  background: var(--surface-2);
  border: 1px solid var(--line);
  border-radius: var(--r-pill);
  padding: 0.05rem 0.4rem;
}

.cli {
  border: 1px solid var(--line);
  border-radius: var(--r-md);
  background: var(--paper);
  overflow: hidden;
  max-width: 52rem;
}
.cli__head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
  padding: 0.6rem 0.9rem;
  border-bottom: 1px solid var(--line);
  background: var(--surface);
}
.cli__title { font-size: var(--fs-micro); letter-spacing: 0.08em; text-transform: uppercase; color: var(--ink-mute); }
.cli__actions { display: flex; gap: 0.4rem; }
.cli__btn { padding: 0.3rem 0.6rem; font-size: var(--fs-micro); }
.cli__code {
  margin: 0;
  padding: 1rem 1.1rem;
  font-size: var(--fs-micro);
  line-height: 1.75;
  color: var(--ink);
  overflow-x: auto;
}
.c { color: var(--ink-mute); }
.p { color: var(--c-teal); font-weight: 600; }
</style>
