import { ref, onMounted, onBeforeUnmount } from 'vue'

/**
 * Tracks which section is currently in view so the navigation can highlight it,
 * and reports overall reading progress for the thin bar under the header.
 */
export function useScrollSpy(ids: readonly string[]) {
  const active = ref<string>(ids[0] ?? '')
  const progress = ref(0)
  const atTop = ref(true)
  let ticking = false

  function measure() {
    ticking = false
    const navH = parseFloat(
      getComputedStyle(document.documentElement).getPropertyValue('--nav-h'),
    ) || 60
    const probe = window.scrollY + navH + 90

    let current = ids[0] ?? ''
    for (const id of ids) {
      const el = document.getElementById(id)
      if (!el) continue
      const top = el.getBoundingClientRect().top + window.scrollY
      if (top <= probe) current = id
    }
    active.value = current

    const doc = document.documentElement
    const max = doc.scrollHeight - window.innerHeight
    progress.value = max > 0 ? Math.min(1, Math.max(0, window.scrollY / max)) : 0
    atTop.value = window.scrollY < 12
  }

  function onScroll() {
    if (ticking) return
    ticking = true
    requestAnimationFrame(measure)
  }

  onMounted(() => {
    measure()
    window.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('resize', onScroll, { passive: true })
  })
  onBeforeUnmount(() => {
    window.removeEventListener('scroll', onScroll)
    window.removeEventListener('resize', onScroll)
  })

  return { active, progress, atTop }
}
