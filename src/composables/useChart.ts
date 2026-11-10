import { nextTick, onBeforeUnmount, onMounted, ref, watch, type Ref } from 'vue'
import { useInView } from './useReveal'

/**
 * Live width of a chart host.
 *
 * The long-tail figures set type at a fixed pixel size, so they cannot be drawn
 * in one fixed viewBox and scaled: at half the width the axis labels would be
 * five pixels tall. Measuring the host and redrawing keeps the labels legible
 * and the bars at least a hairline wide. The fallback is used before mount.
 */
export function useChartWidth<T extends HTMLElement>(fallback = 960) {
  const el = ref<T | null>(null) as Ref<T | null>
  const width = ref(fallback)
  let observer: ResizeObserver | null = null
  let frame = 0

  function measure() {
    const node = el.value
    if (!node) return
    const next = Math.round(node.clientWidth)
    if (next > 0 && Math.abs(next - width.value) > 1) width.value = next
  }

  onMounted(async () => {
    await nextTick()
    measure()
    if (!el.value || !('ResizeObserver' in window)) return
    observer = new ResizeObserver(() => {
      cancelAnimationFrame(frame)
      frame = requestAnimationFrame(measure)
    })
    observer.observe(el.value)
  })

  onBeforeUnmount(() => {
    observer?.disconnect()
    cancelAnimationFrame(frame)
  })

  return { el, width }
}

/**
 * Play-once entrance plus an explicit replay.
 *
 * `shown` flips when the chart first enters view; `playing` is what the stage
 * binds to `is-play`. Replay blanks the stage for two frames so the browser
 * sees the animation classes removed and then re-applied, which is what makes
 * a CSS animation restart without remounting a six-hundred-mark SVG.
 */
export function useChartPlay<T extends Element>(opts: { margin?: string } = {}) {
  const { el, shown } = useInView<T>({ margin: opts.margin ?? '0px 0px -18% 0px' })
  const playing = ref(false)
  let timer = 0

  watch(shown, (value) => {
    if (value) playing.value = true
  })

  function replay() {
    if (timer) window.clearTimeout(timer)
    playing.value = false
    timer = window.setTimeout(() => {
      playing.value = true
      timer = 0
    }, 110)
  }

  onBeforeUnmount(() => {
    if (timer) window.clearTimeout(timer)
  })

  return { el, shown, playing, replay }
}
