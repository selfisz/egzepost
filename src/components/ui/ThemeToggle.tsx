import { Moon, Sun } from 'lucide-react'
import { useEffect, useState } from 'react'
import { cn } from '../../lib/cn'

const KEY = 'egzepost:theme'
const EVT = 'egzepost:theme'

type Theme = 'light' | 'dark'

function readTheme(): Theme {
  const saved = localStorage.getItem(KEY) as Theme | null
  if (saved === 'light' || saved === 'dark') return saved
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

function applyTheme(theme: Theme) {
  document.documentElement.classList.toggle('dark', theme === 'dark')
  localStorage.setItem(KEY, theme)
  window.dispatchEvent(new CustomEvent(EVT, { detail: theme }))
}

export function useTheme() {
  const [theme, setThemeState] = useState<Theme>(() => readTheme())

  useEffect(() => {
    applyTheme(theme)
  }, [theme])

  useEffect(() => {
    const onExt = (e: Event) => {
      const next = (e as CustomEvent<Theme>).detail
      if (next === 'light' || next === 'dark') setThemeState(next)
    }
    window.addEventListener(EVT, onExt)
    return () => window.removeEventListener(EVT, onExt)
  }, [])

  return {
    theme,
    toggle: () => setThemeState((t) => (t === 'dark' ? 'light' : 'dark')),
    setTheme: (t: Theme) => setThemeState(t),
  }
}

export function ThemeToggle({ className }: { className?: string }) {
  const { theme, toggle } = useTheme()
  return (
    <button
      type="button"
      onClick={toggle}
      className={cn(
        'inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:bg-zinc-800',
        className,
      )}
      aria-label={theme === 'dark' ? 'Włącz jasny motyw' : 'Włącz ciemny motyw'}
      title="Motyw"
    >
      {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
    </button>
  )
}
