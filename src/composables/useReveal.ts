import { onBeforeUnmount, onMounted, ref, type Ref } from 'vue'

/**
 * Reveal-on-scroll.
 *
 * Returns `el` (bind to the element) and `shown`, which flips once and stays
 * flipped. Observation is one-shot: a figure that has already been seen should
 * not re-animate when the reader scrolls back up, because a re-entrance reads
 * as a glitch rather than as a flourish.
 *
 * If `IntersectionObserver` is unavailable the element is shown immediately —
 * the animation is decoration and must never be the reason content is missing.
 */
export function useInView<T extends Element>(opts: { margin?: string; threshold?: number } = {}) {
  const el = ref<T | null>(null) as Ref<T | null>
  const shown = ref(false)
  let io: IntersectionObserver | null = null

  onMounted(() => {
    const node = el.value
    if (!node || !('IntersectionObserver' in window)) {
      shown.value = true
      return
    }
    io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          shown.value = true
          io?.disconnect()
        }
      },
      {
        rootMargin: opts.margin ?? '0px 0px -12% 0px',
        threshold: opts.threshold ?? 0.05,
      },
    )
    io.observe(node)
  })

  onBeforeUnmount(() => io?.disconnect())

  return { el, shown }
}

/**
 * Shared observer for a whole page region: one observer for many nodes keeps
 * the cost flat as the figure count grows.
 */
const registry = new WeakMap<Element, (v: boolean) => void>()
let shared: IntersectionObserver | null = null

function sharedObserver(): IntersectionObserver {
  if (!shared) {
    shared = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (!e.isIntersecting) continue
          registry.get(e.target)?.(true)
          registry.delete(e.target)
          shared?.unobserve(e.target)
        }
      },
      { rootMargin: '0px 0px -10% 0px', threshold: 0.06 },
    )
  }
  return shared
}

/**
 * `v-reveal` — adds `is-in` when the element first enters view.
 * Usage: `<div v-reveal>` or `<div v-reveal="120">` to delay by 120 ms.
 */
export const vReveal = {
  mounted(node: HTMLElement, binding: { value?: number }) {
    node.classList.add('reveal')
    const delay = typeof binding.value === 'number' ? binding.value : null
    if (delay) node.style.setProperty('--reveal-delay', `${delay}ms`)
    if (!('IntersectionObserver' in window)) {
      node.classList.add('is-in')
      return
    }
    registry.set(node, () => node.classList.add('is-in'))
    sharedObserver().observe(node)
  },
  unmounted(node: HTMLElement) {
    registry.delete(node)
    shared?.unobserve(node)
  },
}

/**
 * A number that counts up once its element is in view. Returns the formatted
 * string; the caller supplies the formatter so thousands separators and
 * decimals stay a content decision rather than a component one.
 *
 * The step count is derived from the magnitude so a 5-digit figure and a
 * single-digit one take the same time and neither looks like it is stuttering.
 */
export function useCountUp(
  target: number,
  opts: { duration?: number; decimals?: number; delay?: number } = {},
) {
  const duration = opts.duration ?? 1100
  const decimals = opts.decimals ?? 0
  const text = ref(format(0))
  let raf = 0

  function format(v: number) {
    return v.toLocaleString('en-US', {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    })
  }

  function run() {
    const start = performance.now() + (opts.delay ?? 0)
    const reduce =
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (reduce) {
      text.value = format(target)
      return
    }
    const step = (now: number) => {
      const t = Math.min(1, Math.max(0, (now - start) / duration))
      // Quartic ease-out: fast settle, no overshoot on a numeric readout.
      const e = 1 - Math.pow(1 - t, 4)
      text.value = format(target * e)
      if (t < 1) raf = requestAnimationFrame(step)
      else text.value = format(target)
    }
    raf = requestAnimationFrame(step)
  }

  onBeforeUnmount(() => cancelAnimationFrame(raf))

  return { text, run }
}
