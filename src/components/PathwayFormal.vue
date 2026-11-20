<script setup lang="ts">
/**
 * The formal statement of the section, as one numbered sequence.
 *
 * It sits in the narrow column beside Figure 1, so each statement is a single
 * stacked block — tag, formula, one plain-language sentence — rather than three
 * columns. The rail on the left and the numbered rows keep them one argument,
 * and the connectives (hence / this requires) live in the running text, not in
 * separate labels.
 *
 * The formulas are probability notation, set in the page's serif italic. There is
 * no math renderer and none is needed.
 */
import { useI18n } from '@/composables/useI18n'

const { t, isZh } = useI18n()

const steps = [
  {
    n: '01',
    accent: false,
    tag: { en: 'implicit', zh: '隐式' },
    eq: 'p(a | o) = ∫ p(a | o, z) p(z | o) dz',
    note: null,
    turn: null,
    body: {
      en: 'The policy folds z into its weights; nothing about the intent survives as data, so a failure has nothing to point at.',
      zh: '策略把 z 折进权重，意图没有以数据留下来，失败时也就无从指向。',
    },
  },
  {
    n: '02',
    accent: false,
    tag: { en: 'observable', zh: '可观测' },
    eq: 'mᵢ = fᵢ(zᵢ, o) + εᵢ',
    note: 'i ∈ {gaze, emg, eeg}',
    turn: { en: 'Hence,', zh: '因此，' },
    body: {
      en: 'intent is measured on the way out: a proxy model reads gaze, EMG and EEG, plus noise, and trains on data.',
      zh: '意图只能在向外实现的过程中测量：代理模型读眼动、肌电、脑电，再叠加噪声，而它需要数据来训练。',
    },
  },
  {
    n: '03',
    accent: true,
    tag: { en: 'usable', zh: '可用' },
    eq: 'p(a | o, m)',
    note: null,
    turn: { en: 'This requires', zh: '这要求' },
    body: {
      en: 'a policy conditioned on the measured m, not on an estimate, so both factors train and audit separately.',
      zh: '策略直接以测得的 m 为条件，而不是以对它的估计为条件；两个因子因此可以分开训练与审计。',
    },
  },
] as const
</script>

<template>
  <section
    class="formal"
    :aria-label="t({ en: 'Formal statement, in three steps', zh: '形式化表述，分三步' })"
  >
    <ol class="formal__list">
      <li v-for="s in steps" :key="s.n" class="formal__row" :data-accent="s.accent ? 'true' : 'false'">
        <span class="formal__num">{{ s.n }}</span>
        <div class="formal__body">
          <p class="formal__tag">{{ t(s.tag) }}</p>
          <p class="formal__eq">
            {{ s.eq }}
            <span v-if="s.note" class="formal__eqnote">{{ s.note }}</span>
          </p>
          <p class="formal__mean">
            <template v-if="s.turn">{{ t(s.turn) }}{{ isZh ? '' : ' ' }}</template>{{ t(s.body) }}
          </p>
        </div>
      </li>
    </ol>
  </section>
</template>

<style scoped>
.formal {
  margin: 0;
}

.formal__list {
  margin: 0;
  padding: 0;
  list-style: none;
  border-top: 1px solid var(--line-strong);
}

.formal__row {
  display: grid;
  grid-template-columns: 2rem minmax(0, 1fr);
  column-gap: 0.85rem;
}
.formal__row + .formal__row {
  border-top: 1px solid var(--line);
  margin-top: -0.5rem;
}

.formal__num {
  padding-top: 0.6rem;
  font-family: var(--ff-mono);
  font-size: var(--fs-tick);
  letter-spacing: 0.12em;
  color: var(--ink-mute);
  text-align: right;
  line-height: 1.4;
}

/* The rail is the body's own left border, so it runs unbroken from the first
   statement to the last: the sequence is one line of argument, not three cards.
   The body is stacked, because it sits in the narrow column beside Figure 2. */
/* A tight top: the sequence starts right under the last line of the prose. */
.formal__body {
  position: relative;
  padding: 0.6rem 0 0.6rem 1rem;
  border-left: 1px solid var(--line);
}
.formal__body::before {
  content: '';
  position: absolute;
  left: -3px;
  top: 0.6rem;
  width: 5px;
  height: 5px;
  border-radius: 50%;
  background: var(--line-strong);
}
.formal__row[data-accent='true'] .formal__body::before { background: var(--c-teal); }

.formal__tag {
  margin: 0 0 0.2rem;
  font-family: var(--ff-mono);
  font-size: var(--fs-tick);
  letter-spacing: 0.16em;
  text-transform: uppercase;
  line-height: 1.3;
  color: var(--ink-mute);
}
.formal__row[data-accent='true'] .formal__tag { color: var(--c-teal); }

.formal__eq {
  margin: 0 0 0.25rem;
  font-family: Georgia, 'Times New Roman', serif;
  font-style: italic;
  font-size: clamp(1rem, 0.94rem + 0.28vw, 1.12rem);
  line-height: 1.35;
  color: var(--ink);
  overflow-wrap: normal;
}
.formal__eqnote {
  display: block;
  margin-top: 0.25rem;
  font-family: var(--ff-mono);
  font-style: normal;
  font-size: var(--fs-tick);
  letter-spacing: 0.02em;
  color: var(--ink-mute);
}

.formal__mean {
  margin: 0;
  font-size: var(--fs-small);
  line-height: 1.55;
  color: var(--ink-soft);
}
</style>
