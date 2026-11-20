<script setup lang="ts">
/**
 * A high-frequency cloud, set as type rather than scattered.
 *
 * Words are ranked by count and set in three bands — head, body, tail — on one
 * modular scale, so the distribution keeps its shape (a few heavy words, a long
 * tail of light ones) while the block stays a block: every full line is
 * justified to the panel's measure. The head band is set ragged, because
 * justified display type at that size opens gaps a reader mistakes for
 * punctuation; the small bands are dense enough that justification only
 * tightens them.
 *
 * Colour is a second, continuous reading of the same rank: each word takes a
 * step along a two-anchor ramp, deepest at rank 1 and lightest at the tail, so
 * the block reads as a gradient from its head to its tail. Both anchors are
 * picked to clear 4.5:1 on the panel's white, which is why the ramp is a shift
 * in hue and weight rather than a fade to pastel.
 *
 * `size` sets the scale of the whole block. The verbs are short words and the
 * objects are long ones, so the two panels are set at different sizes to sit at
 * the same height — the panel's type is fitted, not fixed.
 */
import { computed } from 'vue'
import type { Bi } from '@/content'
import { useI18n } from '@/composables/useI18n'
import type { CloudWord } from '@/data/fig8'

const props = defineProps<{
  kicker: Bi
  summary: string
  foot: Bi
  words: CloudWord[]
  size: string
  /** colour at rank 1 (the deepest end) */
  deep: string
  /** colour at the last rank (the lightest end) */
  light: string
}>()

const { t } = useI18n()

type Tinted = CloudWord & { colour: string }

/* Rank cuts: eight heavy, eighteen body, the rest tail. */
const CUTS = [8, 26]

function rgb(hex: string): [number, number, number] {
  const h = hex.replace('#', '')
  return [
    parseInt(h.slice(0, 2), 16),
    parseInt(h.slice(2, 4), 16),
    parseInt(h.slice(4, 6), 16),
  ]
}

const DEEP = computed(() => rgb(props.deep))
const LIGHT = computed(() => rgb(props.light))

/**
 * Position along the ramp. The exponent spreads the first ranks over more of
 * the ramp, because the head is where the eye is and a linear position would
 * leave the eight largest words all but identical in colour.
 */
function colourAt(i: number, n: number): string {
  const pos = n > 1 ? Math.pow(i / (n - 1), 0.55) : 0
  const a = DEEP.value
  const b = LIGHT.value
  const mix = (x: number, y: number) => Math.round(x + (y - x) * pos)
  return `#${[mix(a[0], b[0]), mix(a[1], b[1]), mix(a[2], b[2])]
    .map((v) => v.toString(16).padStart(2, '0'))
    .join('')}`
}

const bands = computed(() => {
  const total = props.words.length
  const out: { cls: string; words: Tinted[] }[] = []
  let i = 0
  for (const [bi, to] of [...CUTS, total].entries()) {
    const slice: Tinted[] = []
    while (i < to && i < total) {
      slice.push({ ...props.words[i], colour: colourAt(i, total) })
      i += 1
    }
    if (slice.length) out.push({ cls: ['one', 'two', 'three'][bi] ?? 'three', words: slice })
  }
  return out
})
</script>

<template>
  <section class="wc">
    <header class="wc__bar">
      <p class="wc__k mono">{{ t(kicker) }}</p>
      <p class="wc__sum mono">{{ summary }}</p>
    </header>

    <div class="wc__cloud" :style="{ fontSize: size }">
      <p v-for="band in bands" :key="band.cls" class="wc__b" :class="`wc__b--${band.cls}`">
        <template v-for="(w, i) in band.words" :key="w.label">
          <span class="wc__w" :style="{ color: w.colour }" :title="`${w.label} · ${w.count}`">{{ w.label }}</span>{{ i < band.words.length - 1 ? ' ' : '' }}
        </template>
      </p>
    </div>

    <p class="wc__foot mono">{{ t(foot) }}</p>
  </section>
</template>

<style scoped>
.wc {
  display: flex;
  flex-direction: column;
  height: 100%;
  min-width: 0;
  padding: 12px 16px 12px;
  border: 1px solid var(--line);
  border-radius: 8px;
  background: #fff;
}

.wc__bar {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 0.1rem 0.9rem;
  padding-bottom: 0.4rem;
  border-bottom: 1px solid var(--line);
}
.wc__k,
.wc__sum {
  margin: 0;
  font-family: var(--ff-mono);
  font-size: var(--fs-tick);
  letter-spacing: 0.08em;
  text-transform: uppercase;
  line-height: 1.4;
  color: var(--ink-mute);
}
.wc__k { color: var(--ink-soft); }
.wc__sum { text-transform: none; letter-spacing: 0.03em; text-align: right; }

.wc__cloud {
  flex: 1 1 auto;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  padding: 0.8rem 0 0.5rem;
}

.wc__b {
  margin: 0;
  text-align: justify;
  line-height: 1.16;
}
.wc__b + .wc__b { margin-top: 0.1em; }

.wc__w { display: inline; }

/* three steps of one scale: 1.85 / 1.27 / 1 of the panel's base size */
.wc__b--one {
  font-size: 1.85em;
  font-weight: 500;
  letter-spacing: -0.012em;
  text-align: left;
}
.wc__b--two { font-size: 1.27em; }
.wc__b--three { font-size: 1em; }

.wc__foot {
  margin: 0;
  padding-top: 0.45rem;
  border-top: 1px solid var(--line);
  font-family: var(--ff-mono);
  font-size: var(--fs-tick);
  line-height: 1.4;
  color: var(--ink-mute);
}
</style>
