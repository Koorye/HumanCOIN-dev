<script setup lang="ts">
/**
 * Figure 1 — the middle of o → a, and why it needs a latent variable.
 *
 * Three rows only: the direct policy, the world model, and the z-conditioned
 * policy. z is a plain node in the third row; the note under it says what it is.
 * The proxies belong to Figure 2, not here.
 *
 * Drawn to fill the right-hand column of the section, in the processing
 * figure's skin: white cards, hairline borders, mono ticks, sans labels.
 */
import { useI18n } from '@/composables/useI18n'
import FigFrame from '@/components/FigFrame.vue'

const { t } = useI18n()
</script>

<template>
  <FigFrame
    n="01"
    :title="{
      en: 'Why a latent z?',
      zh: '为什么需要潜变量 z？',
    }"
    :aside="{ en: 'POLICY · PREDICTION · Z', zh: '策略 · 预测 · 潜变量 z' }"
  >
    <div class="mf1">
      <svg
        class="mf1__svg"
        viewBox="0 0 470 380"
        role="img"
        :aria-label="t({
          en: 'Three routes from observation o to action a. A direct policy maps o straight to a. A world model predicts a future observation and factors through it. The third route introduces a latent intent z, with p(z|o) and p(a|o,z); the note under z says it is the latent intent that makes the mapping well defined.',
          zh: '从观测 o 到动作 a 的三条路线。直接策略把 o 映射到 a；世界模型先预测未来观测，再经由它生成动作；第三条路线引入潜在意图 z，写成 p(z|o) 与 p(a|o,z)，z 下方的说明指出它是让映射得以成立的潜在意图。',
        })"
      >
        <defs>
          <marker
            id="mf1-arrow"
            viewBox="0 0 8 8"
            refX="7"
            refY="4"
            markerWidth="6"
            markerHeight="6"
            orient="auto-start-reverse"
          >
            <path d="M0 0L8 4L0 8Z" fill="#9aa1a9" />
          </marker>
        </defs>

        <!-- ---------- route 1: direct policy ---------- -->
        <text class="mf1__route" x="6" y="20">{{ t({ en: 'Direct policy', zh: '直接策略' }) }}</text>
        <text class="mf1__tag" x="464" y="20" text-anchor="end">{{ t({ en: 'o → a', zh: 'o → a' }) }}</text>
        <rect class="mf1__card" x="6" y="34" width="58" height="36" rx="7" />
        <text class="mf1__sym" x="35" y="57">o</text>
        <text class="mf1__nodecap" x="35" y="85" text-anchor="middle">OBSERVATION</text>
        <path class="mf1__wire" d="M64 52H400" marker-end="url(#mf1-arrow)" />
        <text class="mf1__fn" x="232" y="45">π(a | o)</text>
        <rect class="mf1__card" x="406" y="34" width="58" height="36" rx="7" />
        <text class="mf1__sym" x="435" y="57">a</text>
        <text class="mf1__nodecap" x="435" y="85" text-anchor="middle">ACTION</text>

        <!-- ---------- route 2: world model ---------- -->
        <text class="mf1__route" x="6" y="132">{{ t({ en: 'World model', zh: '世界模型' }) }}</text>
        <text class="mf1__tag" x="464" y="132" text-anchor="end">{{ t({ en: 'o → ô′ → a', zh: 'o → ô′ → a' }) }}</text>
        <rect class="mf1__card" x="6" y="146" width="58" height="36" rx="7" />
        <text class="mf1__sym" x="35" y="169">o</text>
        <text class="mf1__nodecap" x="35" y="197" text-anchor="middle">OBSERVATION</text>
        <path class="mf1__wire" d="M64 164H190" marker-end="url(#mf1-arrow)" />
        <text class="mf1__fn" x="127" y="157">p(ô′ | o)</text>
        <rect class="mf1__card mf1__card--dash" x="196" y="146" width="78" height="36" rx="7" />
        <text class="mf1__sym" x="235" y="169">ô′</text>
        <path class="mf1__wire" d="M280 164H400" marker-end="url(#mf1-arrow)" />
        <text class="mf1__fn" x="340" y="157">p(a | ô′)</text>
        <rect class="mf1__card" x="406" y="146" width="58" height="36" rx="7" />
        <text class="mf1__sym" x="435" y="169">a</text>
        <text class="mf1__nodecap" x="435" y="197" text-anchor="middle">ACTION</text>

        <!-- ---------- route 3: latent conditioned ---------- -->
        <text class="mf1__route" x="6" y="244">{{ t({ en: 'Latent conditioned', zh: '潜变量条件' }) }}</text>
        <text class="mf1__tag" x="464" y="244" text-anchor="end">{{ t({ en: 'o → z → a', zh: 'o → z → a' }) }}</text>
        <rect class="mf1__card" x="6" y="258" width="58" height="36" rx="7" />
        <text class="mf1__sym" x="35" y="281">o</text>
        <text class="mf1__nodecap" x="35" y="309" text-anchor="middle">OBSERVATION</text>
        <path class="mf1__wire" d="M64 276H198" marker-end="url(#mf1-arrow)" />
        <text class="mf1__fn mf1__fn--blue" x="132" y="269">p(z | o)</text>
        <rect class="mf1__card mf1__card--z" x="206" y="258" width="58" height="36" rx="7" />
        <text class="mf1__sym" x="235" y="281">z</text>
        <path class="mf1__wire" d="M268 276H400" marker-end="url(#mf1-arrow)" />
        <text class="mf1__fn mf1__fn--blue" x="334" y="269">p(a | o, z)</text>
        <rect class="mf1__card" x="406" y="258" width="58" height="36" rx="7" />
        <text class="mf1__sym" x="435" y="281">a</text>
        <text class="mf1__nodecap" x="435" y="309" text-anchor="middle">ACTION</text>

        <!-- one sentence about z, nothing else -->
        <path class="mf1__leader" d="M235 294V312" />
        <text class="mf1__znote" x="235" y="330" text-anchor="middle">
          {{ t({ en: 'z · the latent intent that makes the mapping well-defined.', zh: 'z · 让映射得以成立的潜在意图。' }) }}
        </text>
      </svg>
    </div>
  </FigFrame>
</template>

<style scoped>
.mf1 {
  width: 100%;
  padding-top: 0.4rem;
}
.mf1__svg {
  display: block;
  width: 100%;
  height: auto;
  overflow: visible;
}

.mf1__route {
  font-family: var(--ff-sans);
  font-size: 13px;
  font-weight: 620;
  letter-spacing: -0.01em;
  fill: var(--ink);
}
.mf1__tag {
  font-family: var(--ff-mono);
  font-size: 9px;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  fill: var(--ink-mute);
  white-space: nowrap;
}
.mf1__sym {
  font-family: Georgia, 'Times New Roman', serif;
  font-style: italic;
  font-size: 16px;
  text-anchor: middle;
  fill: var(--ink);
}
.mf1__card {
  fill: #fff;
  stroke: var(--line-strong);
  stroke-width: 1;
}
.mf1__card--dash { stroke-dasharray: 4 3; }
/* z is the one semantic node: a light blue field and a blue rule. */
.mf1__card--z {
  fill: var(--c-blue);
  fill-opacity: 0.08;
  stroke: var(--c-blue);
}
.mf1__wire {
  fill: none;
  stroke: var(--line-strong);
  stroke-width: 1.1;
}
.mf1__leader {
  fill: none;
  stroke: var(--line-strong);
  stroke-width: 1;
}
.mf1__fn {
  font-family: var(--ff-mono);
  font-size: 10px;
  text-anchor: middle;
  fill: var(--ink-mute);
  paint-order: stroke;
  stroke: #fff;
  stroke-width: 5px;
  stroke-linejoin: round;
}
.mf1__fn--blue { fill: var(--c-blue); }
.mf1__znote {
  font-family: var(--ff-sans);
  font-size: 11px;
  fill: var(--ink-soft);
}
.mf1__nodecap {
  font-family: var(--ff-mono);
  font-size: 9px;
  font-weight: 400;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  fill: var(--ink-mute);
}

/* the same restrained motion as Figure 2: a sparse dashed flow and a light
   breath on the one semantic node; reduced motion keeps the solid drawing */
@media (prefers-reduced-motion: no-preference) {
  .mf1__wire {
    stroke-dasharray: 8 6;
    animation: mf1-flow 2.8s linear infinite;
  }
  .mf1__card--z {
    animation: mf1-breath 4s ease-in-out infinite;
  }
  @keyframes mf1-flow {
    to { stroke-dashoffset: -28; }
  }
  @keyframes mf1-breath {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.92; }
  }
}

@media (max-width: 1000px) {
  .mf1 {
    width: 100%;
    max-width: 620px;
    margin-inline: auto;
  }
}
</style>
