<script setup lang="ts">
/**
 * Modality availability by tier — the report's Fig. 5b matrix.
 *
 * Three columns, one per tier, and the streams a reader might assume are
 * everywhere. A stream is not collapsed into "available": the cell says whether
 * the tier measures it, predicts it from video, reconstructs it from video, or
 * does not carry it at all. That distinction is the corpus's actual claim.
 *
 * The rates live in the viewer's per-stream metadata and in the report's
 * Table IV; this figure stays a matrix so the four states stay comparable.
 */
import { useI18n } from '@/composables/useI18n'

const { t } = useI18n()

type State = 'measured' | 'predicted' | 'reconstructed' | 'absent'
type Bi = { en: string; zh: string }

const TIERS = ['L1', 'L2', 'L3'] as const

const ROWS: { label: Bi; states: readonly State[] }[] = [
  { label: { en: 'Head RGB ×4', zh: '头环 RGB ×4' }, states: ['measured', 'measured', 'measured'] },
  { label: { en: 'Depth / point cloud', zh: '深度 / 点云' }, states: ['reconstructed', 'reconstructed', 'reconstructed'] },
  { label: { en: 'Gaze', zh: '注视' }, states: ['predicted', 'predicted', 'measured'] },
  { label: { en: 'Head / wrist pose', zh: '头 / 腕位姿' }, states: ['predicted', 'predicted', 'measured'] },
  { label: { en: 'Finger kinematics', zh: '手指运动学' }, states: ['predicted', 'predicted', 'measured'] },
  { label: { en: 'Surface EMG', zh: '表面肌电' }, states: ['absent', 'measured', 'measured'] },
  { label: { en: 'EEG', zh: '脑电' }, states: ['absent', 'absent', 'measured'] },
  { label: { en: 'Subtask annotation', zh: '步骤标注' }, states: ['measured', 'measured', 'measured'] },
  { label: { en: 'Object annotation', zh: '物体标注' }, states: ['absent', 'measured', 'measured'] },
]

const SYMBOL: Record<State, string> = {
  measured: '✓',
  predicted: 'P',
  reconstructed: 'R',
  absent: '–',
}

const STATE_LABEL: Record<State, Bi> = {
  measured: { en: 'measured', zh: '实测' },
  predicted: { en: 'predicted from video', zh: '由视频预测' },
  reconstructed: { en: 'reconstructed from video', zh: '由视频重建' },
  absent: { en: 'not carried', zh: '不提供' },
}

</script>

<template>
  <section class="mm">
    <header class="mm__head">
      <div>
        <p class="mm__kicker">{{ t({ en: 'Modality availability', zh: '模态可用性' }) }}</p>
        <p class="mm__note">
          {{
            t({
              en: 'Measured, predicted or absent — the tier decides which, and no stream is silently upgraded.',
              zh: '实测、预测或缺席——由层级决定，没有哪条流被悄悄升级。',
            })
          }}
        </p>
      </div>
      <ul class="mm__legend">
        <li v-for="state in (['measured', 'predicted', 'reconstructed', 'absent'] as const)" :key="state">
          <span class="mm__mark" :class="`mm__mark--${state}`">{{ SYMBOL[state] }}</span>
          {{ t(STATE_LABEL[state]) }}
        </li>
      </ul>
    </header>

    <div class="mm__body">
      <div class="mm__grid" role="table">
      <div class="mm__row mm__row--head" role="row">
        <span class="mm__label" />
        <span v-for="tier in TIERS" :key="tier" class="mm__tier mono">{{ tier }}</span>
      </div>
      <div v-for="row in ROWS" :key="row.label.en" class="mm__row" role="row">
        <span class="mm__label">{{ t(row.label) }}</span>
        <span
          v-for="(state, i) in row.states"
          :key="`${row.label.en}-${i}`"
          class="mm__cell"
          :class="`mm__cell--${state}`"
          :title="`${TIERS[i]} · ${t(STATE_LABEL[state])}`"
        >
          <span class="mm__mark" :class="`mm__mark--${state}`">{{ SYMBOL[state] }}</span>
        </span>
        </div>
      </div>

    </div>
  </section>
</template>

<style scoped>
.mono { font-family: var(--ff-mono); }

.mm { margin-top: clamp(1.1rem, 0.8rem + 1vw, 1.6rem); }
.mm__head {
  display: flex;
  flex-wrap: wrap;
  align-items: end;
  justify-content: space-between;
  gap: 0.6rem 1.5rem;
  padding-top: 0.65rem;
  border-top: 1px solid var(--line);
  margin-bottom: 0.3rem;
}
.mm__kicker {
  margin: 0;
  font-size: var(--fs-micro);
  font-weight: 600;
  letter-spacing: 0.09em;
  text-transform: uppercase;
  color: var(--ink);
}
.mm__note { margin: 0.15rem 0 0; font-size: var(--fs-tick); color: var(--ink-soft); max-width: 62ch; }

.mm__legend { display: flex; flex-wrap: wrap; gap: 0.35rem 1rem; margin: 0; padding: 0; list-style: none; }
.mm__legend li { display: inline-flex; align-items: center; gap: 0.3rem; font-size: var(--fs-micro); color: var(--ink-mute); }

.mm__body { display: block; }

.mm__grid { display: grid; }
.mm__row {
  display: grid;
  grid-template-columns: minmax(0, 1fr) repeat(3, 4.5rem);
  align-items: center;
  border-top: 1px solid var(--line);
}
.mm__row--head { border-top: 0; }
.mm__label { padding: 0.17rem 0; font-size: var(--fs-small); color: var(--ink-body); }
.mm__tier {
  justify-self: center;
  font-size: var(--fs-micro);
  letter-spacing: 0.1em;
  color: var(--ink-mute);
  padding-bottom: 0.2rem;
}
.mm__cell { display: grid; place-items: center; padding: 0.17rem 0; }

/* One symbol system for all four states; measured is filled, inferred is an
   outline, and a stream the tier does not carry is a dash. */
.mm__mark {
  display: inline-grid;
  place-items: center;
  width: 1.1rem;
  height: 1.1rem;
  border-radius: 50%;
  font-family: var(--ff-mono);
  font-size: 0.62rem;
  line-height: 1;
}
.mm__mark--measured { background: var(--c-blue); color: #fff; }
.mm__mark--predicted { border: 1px solid var(--c-amber); color: var(--c-amber); }
.mm__mark--reconstructed { border: 1px solid var(--c-teal); color: var(--c-teal); }
.mm__mark--absent { color: var(--ink-mute); }

</style>
