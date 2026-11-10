<script setup lang="ts">
/**
 * One object, recorded at two depths — the report's Fig. 2d inset.
 *
 * At L1 an object is a name and nothing else. At L2 and L3 the same instance
 * carries a colour, a shape, the size parameters that shape calls for, a
 * material and a weight, all measured at capture. The example is the chopstick
 * holder of the released L3 demo episode, so every value below is the release's
 * own record rather than a made-up specimen.
 */
import { useI18n } from '@/composables/useI18n'

const { t } = useI18n()

const NAME = { en: 'Chopstick holder', zh: '筷笼' }
const COLOUR = '#93A6AF'
const ATTRS = [
  { k: { en: 'Shape', zh: '形状' }, v: { en: 'Cylinder', zh: '圆柱' } },
  { k: { en: 'Size', zh: '尺寸' }, v: { en: 'Φ11.4 × h25.1 cm', zh: 'Φ11.4 × h25.1 cm' } },
  { k: { en: 'Material', zh: '材质' }, v: { en: 'Plastic', zh: '塑料' } },
  { k: { en: 'Weight', zh: '重量' }, v: { en: '208 g', zh: '208 g' } },
]
</script>

<template>
  <div class="obj">
    <div class="obj__level obj__level--l1">
      <p class="obj__tag mono">L1</p>
      <p class="obj__name">{{ t(NAME) }}</p>
      <p class="obj__note">
        {{ t({ en: 'Name only. No attribute is recorded at this tier.', zh: '只有名称。该层级不记录属性。' }) }}
      </p>
    </div>

    <div class="obj__level obj__level--l23">
      <p class="obj__tag mono">L2 · L3</p>
      <p class="obj__name">
        <span class="obj__sw" :style="{ background: COLOUR }" aria-hidden="true" />
        {{ t(NAME) }}
      </p>
      <dl class="obj__attrs">
        <div v-for="a in ATTRS" :key="a.k.en">
          <dt>{{ t(a.k) }}</dt>
          <dd>{{ t(a.v) }}</dd>
        </div>
      </dl>
      <p class="obj__note">
        {{ t({ en: 'Measured at capture and linked to the instance.', zh: '采集时实测，并关联到该物体实例。' }) }}
      </p>
    </div>
  </div>
</template>

<style scoped>
.mono { font-family: var(--ff-mono); }

.obj {
  display: grid;
  grid-template-columns: minmax(0, 0.9fr) minmax(0, 1.4fr);
  gap: clamp(1rem, 0.7rem + 1.2vw, 1.75rem);
}
@media (max-width: 700px) { .obj { grid-template-columns: minmax(0, 1fr); } }

.obj__level { display: grid; align-content: start; gap: 0.25rem; }
.obj__level--l23 { border-left: 1px solid var(--line); padding-left: clamp(1rem, 0.7rem + 1vw, 1.6rem); }
@media (max-width: 700px) {
  .obj__level--l23 { border-left: 0; border-top: 1px solid var(--line); padding-left: 0; padding-top: 0.7rem; }
}
.obj__tag {
  margin: 0;
  font-size: var(--fs-micro);
  letter-spacing: 0.1em;
  color: var(--ink-mute);
}
.obj__name {
  margin: 0;
  display: flex;
  align-items: center;
  gap: 0.4rem;
  font-size: var(--fs-body);
  font-weight: 550;
  color: var(--ink);
}
.obj__sw { width: 0.7rem; height: 0.7rem; border-radius: 50%; display: inline-block; }
.obj__attrs {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 0.25rem 1.25rem;
  margin: 0.35rem 0 0.1rem;
}
.obj__attrs div { display: flex; align-items: baseline; gap: 0.5rem; }
.obj__attrs dt { font-size: var(--fs-micro); color: var(--ink-mute); min-width: 4.2rem; }
.obj__attrs dd { margin: 0; font-size: var(--fs-small); color: var(--ink); }
.obj__note { margin: 0.15rem 0 0; font-size: var(--fs-micro); color: var(--ink-mute); }
</style>
