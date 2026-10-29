import { ref, computed, watch } from 'vue'
import type { L, Bi } from '@/content'

const STORAGE_KEY = 'humancoin.lang'
const lang = ref<L>('en')

function readInitial(): L {
  if (typeof window === 'undefined') return 'en'
  const q = new URLSearchParams(window.location.search).get('lang')
  if (q === 'zh' || q === 'en') return q
  const saved = window.localStorage.getItem(STORAGE_KEY)
  if (saved === 'zh' || saved === 'en') return saved
  return 'en'
}

lang.value = readInitial()

watch(lang, (v) => {
  if (typeof document !== 'undefined') document.documentElement.lang = v === 'zh' ? 'zh-CN' : 'en'
  try { window.localStorage.setItem(STORAGE_KEY, v) } catch { /* storage unavailable */ }
}, { immediate: true })

/** Reactive translation helper. `t(entry)` returns the active locale string. */
export function useI18n() {
  const t = (v: Bi): string => v[lang.value]
  const list = (v: Record<L, readonly string[]>): readonly string[] => v[lang.value]
  const toggle = () => { lang.value = lang.value === 'en' ? 'zh' : 'en' }
  return {
    lang: computed(() => lang.value),
    isZh: computed(() => lang.value === 'zh'),
    t,
    list,
    toggle,
  }
}
