<script setup lang="ts">
/**
 * Motivation.
 *
 * Part one — why z: the direct policy and the world model are not well-defined
 * functions from observation to action, so the middle has to become a latent
 * variable. Figure 1 sits in the right half; the three paragraphs fill the left.
 *
 * Part two — how z: a question box turns to human motor control, the intent
 * pathway, and HumanCOIN's position on it. The three formal statements follow,
 * then Figure 2 draws the pathway and what is recorded.
 */
import { OVERVIEW } from '@/content'
import { useI18n } from '@/composables/useI18n'
import SectionHead from '@/components/SectionHead.vue'
import RichText from '@/components/RichText.vue'
import MotivationFigure from '@/components/MotivationFigure.vue'
import PathwayFormal from '@/components/PathwayFormal.vue'
import CupLoop from '@/components/CupLoop.vue'

const { t } = useI18n()

/** The opening: what the camera keeps, and the many actions one observation admits. */
const lead = {
  en: 'A camera records what a decision produces, not the decision itself. The same observation can precede many different actions, so a policy that maps o straight to a has to average the intent away.',
  zh: '相机记录的是决策产生的结果，而不是决策本身。同一个观测后面可以接许多不同的动作，所以把 o 直接映到 a 的策略，只能把意图平均掉。',
} as const

/** Part one: the two current forms, and why they need a latent z. */
const whyZ = [
  {
    en: 'Today’s policies take one of two forms. A direct policy learns o → a; a world model inserts a predicted future and learns o → ô′ → a. **Neither is a well-defined function from observation to action**: the same observation can be followed by a reach, a hold, or a correction, and different operators can produce the same action for different reasons, so a single map from o to a has to average those possibilities away.',
    zh: '今天的策略有两种写法：直接学 o → a；或者先预测未来，再学 o → ô′ → a。**两者都不是从观测到动作的良定义函数**：同一个观测后面可以接伸手、停住或修正，不同的操作者也可能为不同理由做出同一个动作；把 o 直接映到 a 的单一映射，只能把这些可能性平均掉。',
  },
  {
    en: 'Learning the mapping from first principles therefore **requires a latent variable**. Call it z, the intent: the observation first selects a state through p(z | o), and the action is generated from both, p(a | o, z). The middle becomes something the model can represent rather than absorb; Figure 1 stacks the three routes, and only the third keeps z explicit.',
    zh: '因此，要从原理上学好这个映射，就**必须引入一个潜变量**。把它记作 z，也就是意图：观测先经 p(z | o) 选出一个状态，动作再由观测与这个状态共同生成，p(a | o, z)。中间这一段于是成为模型可以表示的变量，而不是只能被吸收掉的残差；图 1 把三条路线上下排开，只有第三条把 z 显式保留下来。',
  },
  {
    en: 'Without z, the two routes differ only in where they hide the ambiguity: the direct policy averages it into the weights, the world model into a predicted observation. Both leave the same thing unmeasured — the operator state that made the action this one rather than another.',
    zh: '没有 z，这两条路线只是在不同的地方藏起同一份模糊：直接策略把它平均进权重，世界模型把它平均进一次预测。两者都没有真正测到同一个东西——让动作成为这一个、而不是另一个的操作者状态。',
  },
] as const

/** The turn to part two. */
const question = {
  en: 'How can the latent z be recovered?',
  zh: '潜变量 z 如何被恢复？',
} as const

/** Part two: the loop, HumanCOIN, and the cup example in prose. */
const howZ = [
  {
    en: 'Human motor control answers it. **Intent is the mediator between observation and action**: before the hand moves, gaze has already oriented to the target, posture and grip have preloaded to the expected load, and cortical activity has begun preparing the command. These processes leave a sequence of observable signals — **gaze, surface EMG, scalp EEG** — a chain we call the **intent pathway**, and HumanCOIN is positioned on it: it records the signals as the operator acts.',
    zh: '人类运动控制回答的正是这个问题。**意图是观测与动作之间的中介**：在手移动之前，视线已经转向目标，姿势与握持已经按预期负载预激活，皮层活动也已经为指令做准备。这些过程留下一串可观测信号——**眼动、表面肌电、头皮脑电**——这条链就是「**意图通路**」，HumanCOIN 的定位，就是在这条通路上随动作一起记录这些信号。',
  },
  {
    en: 'Lifting a cup makes the sequence concrete: gaze settles on the rim before the hand departs, grip force is preloaded to the weight the cup is expected to have before contact, and cortical preparation precedes the motor command. The action then changes the world, and the changed world is the next observation — which is why the loop closes. Written as notation, the argument becomes three factors in order.',
    zh: '举起一个杯子，这条序列就很具体：视线在手离开之前落定杯沿，握力在接触之前就按杯子的预期重量预加载，皮层准备先于运动指令。动作随后改变世界，而改变后的世界就是下一次观测——这也是环路闭合的原因。写成式子，论证就是按顺序排列的三个因子。',
  },
] as const
</script>

<template>
  <section id="overview" class="section">
    <div class="shell">
      <SectionHead class="mot__head" :num="OVERVIEW.num" :kicker="OVERVIEW.kicker" :title="OVERVIEW.title">
        <template #aside>
          <p>{{ t(lead) }}</p>
        </template>
      </SectionHead>

      <div class="mot__intro">
        <div class="mot__intro-copy">
          <p v-for="(p, i) in whyZ" :key="i"><RichText :text="t(p)" /></p>
        </div>
        <div class="mot__fig1">
          <MotivationFigure />
        </div>
      </div>

      <div class="mot__question">
        <span class="mot__question-kicker">{{ t({ en: 'THE QUESTION', zh: '问题' }) }}</span>
        <p>{{ t(question) }}</p>
      </div>

      <div class="mot__how-row">
        <div class="mot__how-copy">
          <p v-for="(p, i) in howZ" :key="i">
            <RichText :text="t(p)" />
          </p>
          <PathwayFormal class="mot__formal" />
        </div>
        <div class="mot__fig2">
          <CupLoop />
        </div>
      </div>
    </div>
  </section>
</template>

<style scoped>
/* ---- section head: the title is held to one line ---- */
.mot__head :deep(.section__title) {
  font-size: clamp(1rem, 1.78vw, 1.75rem);
  letter-spacing: -0.028em;
  white-space: nowrap;
}
.mot__head :deep(.section__aside) {
  font-size: var(--fs-lead);
  line-height: 1.65;
  color: var(--ink-soft);
}
.mot__head :deep(.section__aside p) {
  max-width: 82ch;
}

/* ---- part one and part two share one grid: text left, figure right ---- */
.mot__intro,
.mot__how-row {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 47%;
  column-gap: clamp(2rem, 1.2rem + 3vw, 4rem);
  align-items: start;
}
.mot__intro-copy,
.mot__how-copy { min-width: 0; }
.mot__intro-copy p,
.mot__how-copy p {
  margin: 0 0 1em;
  font-size: var(--fs-body);
  line-height: 1.66;
  color: var(--ink-body);
}
.mot__intro-copy p:last-child,
.mot__how-copy p:last-of-type { margin-bottom: 0; }

.mot__fig1,
.mot__fig2 { min-width: 0; }

/* ---- the question box that turns to part two ---- */
.mot__question {
  display: flex;
  align-items: baseline;
  gap: 1.4rem;
  margin: 0.9rem 0 clamp(1.2rem, 1rem + 0.8vw, 1.6rem);
  border: 1px solid var(--line-strong);
  padding: 0.7rem clamp(1rem, 0.8rem + 0.6vw, 1.4rem);
}
.mot__question-kicker {
  flex: none;
  font-family: var(--ff-mono);
  font-size: var(--fs-tick);
  letter-spacing: 0.16em;
  text-transform: uppercase;
  color: var(--ink-mute);
}
.mot__question p {
  margin: 0;
  font-family: var(--ff-sans);
  font-size: clamp(1.1rem, 1rem + 0.6vw, 1.4rem);
  font-weight: 500;
  line-height: 1.2;
  letter-spacing: -0.015em;
  color: var(--ink);
  white-space: nowrap;
}

/* ---- the formal sequence follows the prose closely, in the left column ---- */
.mot__formal {
  display: block;
  margin-top: 0.5rem;
}

/* Below 1000 both rows stack, text first; each plate keeps a readable width. */
@media (max-width: 1000px) {
  .mot__intro,
  .mot__how-row {
    grid-template-columns: minmax(0, 1fr);
    row-gap: clamp(1.6rem, 1.2rem + 1.4vw, 2.2rem);
  }
  .mot__fig1,
  .mot__fig2 {
    width: 100%;
    max-width: 620px;
    margin-inline: auto;
  }
}

@media (max-width: 640px) {
  .mot__head :deep(.section__title) {
    font-size: var(--fs-h2);
    white-space: normal;
  }
  .mot__question {
    flex-direction: column;
    gap: 0.5rem;
  }
  .mot__question p { white-space: normal; }
}
</style>
