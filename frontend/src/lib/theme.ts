/**
 * Theme management — light / dark / auto.
 * Tailwind `darkMode: 'class'` strategy. initTheme() must run before render.
 */

export type Theme = 'light' | 'dark' | 'auto'

const KEY = 'fm_theme'

export function getTheme(): Theme {
  try {
    const v = localStorage.getItem(KEY)
    if (v === 'light' || v === 'dark' || v === 'auto') return v
  } catch {}
  return 'auto'
}

export function setTheme(t: Theme) {
  try { localStorage.setItem(KEY, t) } catch {}
  applyTheme(t)
  window.dispatchEvent(new CustomEvent('fm-theme-change', { detail: t }))
}

export function toggleTheme(): Theme {
  const cur = getTheme()
  const next: Theme = cur === 'light' ? 'dark' : cur === 'dark' ? 'auto' : 'light'
  setTheme(next)
  return next
}

export function applyTheme(t: Theme = getTheme()) {
  const isDark =
    t === 'dark' ||
    (t === 'auto' && window.matchMedia('(prefers-color-scheme: dark)').matches)
  const root = document.documentElement
  if (isDark) root.classList.add('dark')
  else root.classList.remove('dark')
  root.dataset.theme = isDark ? 'dark' : 'light'
}

export function initTheme() {
  applyTheme()
  // Follow system when 'auto'
  if (window.matchMedia) {
    const mq = window.matchMedia('(prefers-color-scheme: dark)')
    mq.addEventListener?.('change', () => {
      if (getTheme() === 'auto') applyTheme('auto')
    })
  }
}
