import { computed, ref } from 'vue'

/**
 * Three-state colour theme: follow the system, or pin light / dark.
 *
 * The initial value is applied by the inline script in `index.html` before the
 * app paints, so there is no flash. This module owns the live state: it mirrors
 * the system media query, persists a manual choice, and writes the resolved
 * theme to `<html data-theme>` (the CSS tokens key off that attribute).
 */
export type ThemeMode = 'system' | 'light' | 'dark'

const STORAGE_KEY = 'humancoin-theme'
const mode = ref<ThemeMode>('system')
const systemDark = ref(false)
const resolved = computed<'light' | 'dark'>(() =>
  mode.value === 'dark' || (mode.value === 'system' && systemDark.value) ? 'dark' : 'light',
)

let mq: MediaQueryList | null = null
let started = false

function apply() {
  if (typeof document === 'undefined') return
  const theme = resolved.value
  const root = document.documentElement
  root.dataset.theme = theme
  root.dataset.themeMode = mode.value
  root.style.colorScheme = theme
  const meta = document.querySelector('meta[name="theme-color"]')
  if (meta) meta.setAttribute('content', theme === 'dark' ? '#0b131b' : '#ffffff')
}

function setMode(next: ThemeMode) {
  mode.value = next
  try {
    localStorage.setItem(STORAGE_KEY, next)
  } catch {
    /* private mode; the choice simply lasts for the page */
  }
  apply()
}

/** system → dark → light → system */
function cycle() {
  const order: ThemeMode[] = ['system', 'dark', 'light']
  const i = order.indexOf(mode.value)
  setMode(order[(i + 1) % order.length])
}

function initTheme() {
  if (started) return
  started = true
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored === 'light' || stored === 'dark' || stored === 'system') mode.value = stored
  } catch {
    /* ignore */
  }
  if (typeof window === 'undefined' || !window.matchMedia) {
    apply()
    return
  }
  mq = window.matchMedia('(prefers-color-scheme: dark)')
  systemDark.value = mq.matches
  const onChange = (e: MediaQueryListEvent) => {
    systemDark.value = e.matches
    if (mode.value === 'system') apply()
  }
  mq.addEventListener?.('change', onChange)
  apply()
}

export function useTheme() {
  initTheme()
  return { mode, systemDark, resolved, setMode, cycle }
}

export { initTheme }
