<script setup lang="ts">
/**
 * The annotation over the current moment.
 *
 * Two things sit over one moment, and the panel shows both.
 *
 * 1. Six streams, each measuring a different quantity at its own rate. The
 *    table lists what each one holds and how much of it falls inside this
 *    window; nothing is resampled onto a shared grid to make the columns match.
 * 2. A text annotation. The release's own annotation is a per-step sentence and
 *    nothing else — no action label, no hand, no per-object record, and no
 *    timing. The sentence is kept, and around it are added only the attributes
 *    the data supports: the action, read off the sentence's own verb; the hand,
 *    measured from wrist travel inside the window; and every object the
 *    sentence reaches, with the name, colour, shape, size and material the
 *    capture metadata records, plus a weight where the task-design library
 *    validates one.
 *
 * The window is the step's share of the clip, because the annotation carries no
 * timing of its own; that derivation is stated rather than hidden.
 */
import { computed } from 'vue'
import { ANNOTATION, DIM_LABELS, actionLabel, materialLabel, objectLabel, shapeLabel, type Bi } from '@/content'
import { useI18n } from '@/composables/useI18n'
import type {
  AnnotatedStep,
  RecordingSample,
  SampleFrame,
  SceneObject,
} from '@/data/recordings'
import { readHand, readStreams, resolveObjects, type StreamCoverage } from '@/data/moment'

const props = defineProps<{
  step: AnnotatedStep | null
  stepIndex: number
  stepCount: number
  start: number
  end: number
  objects: SceneObject[]
  frames: SampleFrame[]
  fps: number
  sample: RecordingSample | null
}>()

const { t, lang } = useI18n()

const hand = computed(() =>
  props.frames.length && props.end > props.start
    ? readHand(props.frames, props.start, props.end, props.fps)
    : { hand: 'none' as const, left: 0, right: 0 },
)

const handLabel = computed(() => {
  switch (hand.value.hand) {
    case 'left': return t(ANNOTATION.handLeft)
    case 'right': return t(ANNOTATION.handRight)
    case 'both': return t(ANNOTATION.handBoth)
    default: return t(ANNOTATION.handNone)
  }
})

/**
 * Evidence behind the hand reading, so the claim can be checked. Native
 * tracker units, and labelled, since the two numbers are not comparable to
 * anything outside this window.
 */
const handTravel = computed(() =>
  `L ${hand.value.left.toFixed(3)} · R ${hand.value.right.toFixed(3)}`,
)

const action = computed(() => (props.step ? actionLabel(props.step.text, lang.value) : null))
const resolved = computed(() => resolveObjects(props.step, props.objects))

/**
 * The six streams over this window. Derived from the loaded sample, so the
 * counts are what the release actually delivers in this window rather than an
 * assumed grid.
 */
const streams = computed(() =>
  props.sample ? readStreams(props.sample, props.start, props.end) : [],
)

/** Stream id → the two content labels naming it and the quantity it holds. */
const STREAM_LABELS: Record<StreamCoverage['id'], { name: Bi; quantity: Bi }> = {
  rgb: { name: ANNOTATION.modRgb, quantity: ANNOTATION.modRgbQuantity },
  gaze: { name: ANNOTATION.modGaze, quantity: ANNOTATION.modGazeQuantity },
  pose: { name: ANNOTATION.modPose, quantity: ANNOTATION.modPoseQuantity },
  glove: { name: ANNOTATION.modGlove, quantity: ANNOTATION.modGloveQuantity },
  emg: { name: ANNOTATION.modEmg, quantity: ANNOTATION.modEmgQuantity },
  eeg: { name: ANNOTATION.modEeg, quantity: ANNOTATION.modEegQuantity },
}

/** Natural dimension order per primitive, so a cylinder does not read ⌀ after h. */
const DIM_ORDER: Record<string, string[]> = {
  box: ['l', 'w', 'h'],
  cyl: ['d', 'h'],
  sph: ['r'],
  hemisphere: ['r', 'h'],
  cone: ['d', 'h'],
  ellipsoid: ['rx', 'ry', 'rz'],
}

/** Dimension keys of an object in the order they should be read. */
function dimKeys(o: SceneObject): string[] {
  const order = DIM_ORDER[o.shape ?? 'box'] ?? Object.keys(o.dims)
  const keys = order.filter((k) => typeof o.dims[k] === 'number')
  for (const k of Object.keys(o.dims)) if (!keys.includes(k)) keys.push(k)
  return keys
}

/** Size as recorded, each number carrying which dimension it is. */
function sizeLabel(o: SceneObject): string {
  const keys = dimKeys(o)
  if (!keys.length) return '—'
  const parts = keys.map((k) => `${DIM_LABELS[k]?.[lang.value] ?? k}${o.dims[k]}`)
  return `${parts.join(' × ')} cm`
}

/** Weight as recorded, or the reason there is none. */
function weightLabel(o: SceneObject): string {
  if (o.weightG == null) return t(ANNOTATION.weightAbsent)
  return o.weightG >= 1000 ? `${(o.weightG / 1000).toFixed(2)} kg` : `${o.weightG} g`
}

/** Colour as recorded. Some objects were recorded with no colour at all. */
function colorLabel(o: SceneObject): string {
  const c = o.color
  return !c || c === 'transparent' ? t(ANNOTATION.colorAbsent) : c
}

function hasColor(o: SceneObject): boolean {
  const c = o.color
  return !!c && c !== 'transparent'
}

const isEmptyObject = computed(() => !resolved.value.mentioned.length && !resolved.value.grouped.length)
</script>

<template>
  <section class="moment">
    <header class="moment__head">
      <h4>
        {{ t(ANNOTATION.momentTitle) }}
        <span v-if="step" class="moment__at mono">
          {{ t(ANNOTATION.stepOf) }} {{ stepIndex + 1 }}/{{ stepCount }}
          <span class="sep">·</span>
          {{ t(ANNOTATION.momentWindow) }} {{ start.toFixed(1) }}–{{ end.toFixed(1) }} s
        </span>
      </h4>
      <span class="moment__follow mono">{{ t(ANNOTATION.momentFollow) }}</span>
    </header>

    <!-- The text annotation leads: it is what a reader is actually annotating
         against, and the streams beside it are only the coverage that backs it. -->
    <div class="moment__ann">
    <p class="moment__label moment__label--ann">{{ t(ANNOTATION.annTitle) }}</p>

    <template v-if="step">
      <p class="moment__text">{{ step.text }}</p>

      <dl class="attrs">
        <div class="attrs__row">
          <dt>{{ t(ANNOTATION.attrAction) }}</dt>
          <dd>
            <span v-if="action" class="attrs__strong">{{ action }}</span>
            <span v-else class="attrs__none">{{ t(ANNOTATION.actionNone) }}</span>
          </dd>
        </div>
        <div class="attrs__row">
          <dt>{{ t(ANNOTATION.attrHand) }}</dt>
          <dd>
            <span class="attrs__strong">{{ handLabel }}</span>
            <span class="attrs__ev mono">{{ handTravel }}</span>
          </dd>
        </div>
      </dl>
      <p class="moment__note">{{ t(ANNOTATION.handNote) }}</p>
    </template>

    <div class="moment__objects">
      <p class="moment__label">
        {{ t(ANNOTATION.attrObject) }}
        <span v-if="resolved.mentioned.length" class="mono moment__count">
          {{ resolved.mentioned.length }}
        </span>
      </p>

      <p v-if="isEmptyObject" class="attrs__none">{{ t(ANNOTATION.objectNone) }}</p>

      <ul v-if="resolved.mentioned.length" class="objs">
        <li v-for="o in resolved.mentioned" :key="o.name" class="obj">
          <div class="obj__top">
            <span
              class="obj__sw"
              :class="{ 'obj__sw--none': !hasColor(o) }"
              :style="hasColor(o) ? { background: o.color ?? undefined } : undefined"
            />
            <p class="obj__name">{{ objectLabel(o.name, lang) }}</p>
          </div>
          <dl class="obj__attrs">
            <div>
              <dt>{{ t(ANNOTATION.attrColor) }}</dt>
              <dd class="mono">{{ colorLabel(o) }}</dd>
            </div>
            <div>
              <dt>{{ t(ANNOTATION.attrShape) }}</dt>
              <dd>{{ shapeLabel(o.shape, lang) ?? '—' }}</dd>
            </div>
            <div>
              <dt>{{ t(ANNOTATION.attrSize) }}</dt>
              <dd class="mono">{{ sizeLabel(o) }}</dd>
            </div>
            <div>
              <dt>{{ t(ANNOTATION.attrMaterial) }}</dt>
              <dd>{{ materialLabel(o.material, lang) ?? '—' }}</dd>
            </div>
            <div>
              <dt>{{ t(ANNOTATION.attrWeight) }}</dt>
              <dd class="mono" :class="{ 'dd--absent': o.weightG == null }">{{ weightLabel(o) }}</dd>
            </div>
          </dl>
        </li>
      </ul>

      <details v-for="g in resolved.grouped" :key="g.word" class="grp">
        <summary>
          <span class="grp__word">{{ g.word }}</span>
          <span class="mono grp__n">{{ g.members.length }}</span>
          <span class="grp__tag">{{ t(ANNOTATION.groupLabelled) }}</span>
        </summary>
        <p class="grp__hint">{{ t(ANNOTATION.groupMembers) }}</p>
        <ul class="grp__list">
          <li v-for="o in g.members" :key="o.name">
            <span
              class="obj__sw obj__sw--sm"
              :class="{ 'obj__sw--none': !hasColor(o) }"
              :style="hasColor(o) ? { background: o.color ?? undefined } : undefined"
            />
            <span class="grp__name">{{ objectLabel(o.name, lang) }}</span>
            <span class="grp__spec mono">
              {{ shapeLabel(o.shape, lang) }} · {{ sizeLabel(o) }} · {{ materialLabel(o.material, lang) }}
            </span>
          </li>
        </ul>
      </details>
    </div>
    </div>

    <!-- Coverage, reduced to what the window counts hold and how fast. -->
    <div class="moment__split">
      <p class="moment__label moment__label--ann">{{ t(ANNOTATION.modTitle) }}</p>
      <table class="tbl mods">
        <thead>
          <tr>
            <th>{{ t(ANNOTATION.modCarries) }}</th>
            <th class="mods__num">{{ t(ANNOTATION.modRate) }}</th>
            <th class="mods__num">{{ t(ANNOTATION.modHere) }}</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="s in streams" :key="s.id">
            <td>
              <span class="mods__name">{{ t(STREAM_LABELS[s.id].name) }}</span>
              <span class="mods__q">
                <span v-if="s.units" class="mods__units">{{ s.units }}</span>{{ t(STREAM_LABELS[s.id].quantity) }}
              </span>
            </td>
            <td class="mods__num mono">
              {{ s.rate.toFixed(s.rateUnit === 'fps' ? 0 : 1) }} {{ s.rateUnit }}
              <span v-if="s.native" class="mods__native">
                {{ t(ANNOTATION.modCaptured) }} {{ s.native.toFixed(0) }} Hz
              </span>
            </td>
            <td class="mods__num mono">
              {{ s.count }}
              <span class="mods__unit">{{ t(s.countUnit === 'frames' ? ANNOTATION.modFrames : ANNOTATION.modSamples) }}</span>
            </td>
          </tr>
        </tbody>
      </table>
      <p class="moment__note">{{ t(ANNOTATION.modNote) }}</p>
      <p class="moment__foot">{{ t(ANNOTATION.weightNote) }}</p>
    </div>
  </section>
</template>

<style scoped>
.mono { font-family: var(--ff-mono); }
.sep { margin-inline: 0.4em; color: var(--line-strong); }

.moment {
  margin-top: 1rem;
  padding: 0.75rem 0.9rem 0.85rem;
  border: 1px solid var(--line);
  border-radius: var(--r-md);
  background: var(--surface);
  /* Annotation and coverage side by side: the annotation is what is being read,
     the coverage is the evidence behind it, and both fit on one screen. */
  display: grid;
  grid-template-columns: minmax(0, 1.15fr) minmax(0, 1fr);
  gap: 0.15rem 1.4rem;
  align-items: start;
}
@media (max-width: 900px) { .moment { grid-template-columns: minmax(0, 1fr); } }
.moment__ann { grid-column: 1; min-width: 0; }
.moment__split { grid-column: 2; min-width: 0; }
@media (max-width: 900px) {
  .moment__ann, .moment__split { grid-column: 1; }
}

.moment__head {
  grid-column: 1 / -1;
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  justify-content: space-between;
  gap: 0.4rem 0.9rem;
  padding-bottom: 0.45rem;
  margin-bottom: 0.5rem;
  border-bottom: 1px solid var(--line);
}
.moment__head h4 {
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  gap: 0.5rem;
  font-size: var(--fs-small);
  font-weight: 620;
}
.moment__at { font-size: var(--fs-tick); font-weight: 500; color: var(--ink-mute); }
.moment__follow {
  font-size: var(--fs-tick);
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: var(--ink-mute);
}

.moment__text { font-size: var(--fs-body); color: var(--ink); line-height: 1.5; margin: 0 0 0.6rem; }

.attrs { margin: 0; display: grid; gap: 0.25rem; max-width: 34rem; }
.attrs__row {
  display: grid;
  grid-template-columns: 5rem minmax(0, 1fr);
  gap: 0.6rem;
  align-items: baseline;
}
.attrs dt {
  font-size: var(--fs-micro);
  color: var(--ink-mute);
}
.attrs dd { margin: 0; display: flex; flex-wrap: wrap; align-items: baseline; gap: 0.5rem; }
.attrs__strong { font-size: var(--fs-body); color: var(--ink); font-weight: 600; }
.attrs__ev { font-size: var(--fs-tick); color: var(--ink-mute); font-variant-numeric: tabular-nums; }
.attrs__none { font-size: var(--fs-small); color: var(--ink-mute); margin: 0; }
.moment__note { font-size: var(--fs-tick); color: var(--ink-mute); line-height: 1.55; margin: 0.7rem 0 0; max-width: var(--prose-max); }

.moment__label {
  display: flex;
  align-items: baseline;
  gap: 0.5rem;
  font-family: var(--ff-mono);
  font-size: var(--fs-micro);
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--ink-mute);
  margin: 0 0 0.55rem;
}
.moment__label--ann {
  margin-top: 0;
  padding-top: 0;
  border-top: 0;
  color: var(--ink);
}
.moment__split .moment__label--ann {
  margin-top: 0;
  padding-top: 0;
  border-top: 0;
}
.moment__count { color: var(--ink); }

/* ---- six streams, six quantities ---- */
.mods { font-size: var(--fs-micro); }
.mods th, .mods td { padding: 0.4rem 0.6rem; }
.mods td { border-bottom: 1px solid var(--line); }
.mods tbody tr:hover { background: var(--paper); }
.mods__num { text-align: right; white-space: nowrap; font-variant-numeric: tabular-nums; }
.mods__name { display: block; color: var(--ink); font-size: var(--fs-small); font-weight: 550; }
.mods__q { display: block; color: var(--ink-mute); font-size: var(--fs-tick); }
.mods__units { color: var(--ink); font-weight: 600; margin-right: 0.35em; }
.mods__native { display: block; font-size: var(--fs-mark); color: var(--ink-mute); }
.mods__unit { color: var(--ink-mute); font-size: var(--fs-tick); margin-left: 0.3em; }

/* ---- objects, attribute by attribute ---- */
.moment__objects {
  margin-top: 0.8rem;
  padding-top: 0.65rem;
  border-top: 1px solid var(--line);
}

.objs { list-style: none; margin: 0 0 0.6rem; padding: 0; display: grid; gap: 0.5rem; }
.obj {
  padding: 0.6rem 0.7rem 0.65rem;
  border: 1px solid var(--line);
  border-radius: var(--r-sm);
  background: var(--paper);
}
.obj__top { display: flex; align-items: center; gap: 0.6rem; margin-bottom: 0.5rem; }
.obj__sw {
  flex: none;
  width: 1.05rem;
  height: 1.05rem;
  border-radius: var(--r-xs);
  border: 1px solid rgba(22, 33, 42, 0.22);
}
.obj__sw--sm { width: 0.6rem; height: 0.6rem; }
/* The capture recorded `transparent` for a few objects; hatch it rather than
   paint a colour the data does not claim. */
.obj__sw--none {
  background-image: linear-gradient(45deg, var(--line-strong) 25%, transparent 25% 75%, var(--line-strong) 75%);
  background-size: 5px 5px;
}
.obj__name { font-size: var(--fs-body); color: var(--ink); font-weight: 600; margin: 0; }

.obj__attrs {
  margin: 0;
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(8.5rem, 1fr));
  gap: 0.4rem 1rem;
}
.obj__attrs > div { min-width: 0; }
.obj__attrs dt {
  font-size: var(--fs-mark);
  font-family: var(--ff-mono);
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--ink-mute);
  margin-bottom: 0.1rem;
}
.obj__attrs dd { margin: 0; font-size: var(--fs-small); color: var(--ink); }
.obj__attrs .dd--absent { color: var(--ink-mute); }

.grp { border-top: 1px solid var(--line); padding-top: 0.5rem; margin-top: 0.5rem; }
.grp summary {
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  gap: 0.5rem;
  cursor: pointer;
  font-size: var(--fs-micro);
  color: var(--ink);
  padding: 0.2rem 0;
}
.grp__word { font-weight: 550; }
.grp__n { color: var(--ink-mute); }
.grp__tag { font-size: var(--fs-tick); color: var(--ink-mute); }
.grp__hint { font-size: var(--fs-tick); color: var(--ink-mute); margin: 0.4rem 0 0.5rem; }
.grp__list {
  list-style: none;
  margin: 0 0 0.35rem;
  padding: 0;
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(16rem, 1fr));
  gap: 0.25rem 0.9rem;
}
.grp__list li { display: flex; align-items: center; gap: 0.45rem; font-size: var(--fs-micro); }
.grp__name { color: var(--ink); white-space: nowrap; }
.grp__spec { color: var(--ink-mute); font-size: var(--fs-tick); margin-left: auto; text-align: right; }

.moment__foot {
  margin: 0.9rem 0 0;
  padding-top: 0.65rem;
  border-top: 1px solid var(--line);
  font-size: var(--fs-tick);
  color: var(--ink-mute);
  line-height: 1.6;
}
</style>
