<script setup lang="ts">
/**
 * Drop-in compatibility with LeRobot.
 *
 * The point being made is API shape, so the figure shows the real import, the
 * real constructor call, and the dict that comes back — the same keys LeRobot
 * returns. What the extension adds is listed separately, so a reader can see
 * that nothing about the existing interface moved.
 */
import { FORMAT } from '@/content'
import { useI18n } from '@/composables/useI18n'
import { COMPAT_CODE, COMPAT_RESULT } from '@/data/mfFormat'

const { t, isZh } = useI18n()
</script>

<template>
  <figure class="cp">
    <div class="cp__head">
      <h4 class="cp__title">{{ t(FORMAT.compatTitle) }}</h4>
      <p class="cp__lede">{{ t(FORMAT.compatLede) }}</p>
    </div>

    <div class="cp__code">
      <div class="cp__pane">
        <p class="cp__pane-k mono">{{ isZh ? '加载方式与 LeRobot 相同' : 'Load it like LeRobot' }}</p>
        <pre class="cp__pre cp__pre--in">{{ COMPAT_CODE.join('\n') }}</pre>
      </div>
      <div class="cp__pane">
        <p class="cp__pane-k mono">{{ t(FORMAT.compatKey) }}</p>
        <pre class="cp__pre cp__pre--out">{{ COMPAT_RESULT.join('\n') }}</pre>
      </div>
    </div>

    <div class="cp__cols">
      <section class="cp__col">
        <h5 class="cp__col-k mono">{{ isZh ? '保持不变' : 'Unchanged' }}</h5>
        <ul class="cp__list">
          <li v-for="(item, i) in FORMAT.compatSame" :key="i">
            <span class="cp__mark cp__mark--same" aria-hidden="true">=</span>
            <span>{{ t(item) }}</span>
          </li>
        </ul>
      </section>
      <section class="cp__col">
        <h5 class="cp__col-k mono">{{ t(FORMAT.compatDiff) }}</h5>
        <ul class="cp__list">
          <li v-for="(item, i) in FORMAT.compatAdds" :key="i">
            <span class="cp__mark cp__mark--add" aria-hidden="true">+</span>
            <span>{{ t(item) }}</span>
          </li>
        </ul>
      </section>
    </div>
  </figure>
</template>

<style scoped>
.mono { font-family: var(--ff-mono); }
.cp { margin: 0; }

.cp__head { margin-bottom: 1rem; }
.cp__title { font-size: var(--fs-small); font-weight: 620; margin-bottom: 0.4rem; }
.cp__lede { margin: 0; font-size: var(--fs-micro); color: var(--ink-body); line-height: 1.65; max-width: 72ch; }

.cp__code {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(0, 1.35fr);
  gap: 0.75rem;
}
@media (max-width: 780px) { .cp__code { grid-template-columns: minmax(0, 1fr); } }

.cp__pane { min-width: 0; }
.cp__pane-k {
  margin: 0 0 0.4rem;
  font-size: var(--fs-tick);
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: var(--ink-mute);
}
.cp__pre {
  margin: 0;
  padding: 0.8rem 0.9rem;
  border: 1px solid var(--line);
  border-radius: var(--r-sm);
  font-size: var(--fs-tick);
  line-height: 1.75;
  overflow-x: auto;
}
.cp__pre--in { background: var(--surface-2); color: var(--ink-body); }
.cp__pre--out { background: #101a22; color: #cfdae4; border-color: #26333d; }

.cp__cols {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 1.25rem 2rem;
  margin-top: 1.4rem;
  padding-top: 1.25rem;
  border-top: 1px solid var(--line);
}
@media (max-width: 700px) { .cp__cols { grid-template-columns: minmax(0, 1fr); } }

.cp__col-k {
  margin: 0 0 0.6rem;
  font-size: var(--fs-tick);
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--ink-mute);
}
.cp__list { list-style: none; margin: 0; padding: 0; display: grid; gap: 0.6rem; }
.cp__list li { display: grid; grid-template-columns: 1rem minmax(0, 1fr); gap: 0.5rem; font-size: var(--fs-micro); line-height: 1.6; color: var(--ink-body); }
.cp__mark { font-family: var(--ff-mono); font-weight: 700; line-height: 1.5; }
.cp__mark--same { color: var(--c-teal); }
.cp__mark--add { color: var(--c-amber); }
</style>
