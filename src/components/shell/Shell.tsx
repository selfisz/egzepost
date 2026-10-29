import { BookOpen, ChartColumn, ChevronLeft, GraduationCap, Moon, Search, Sun, UserRound } from 'lucide-react'
import type { ReactNode } from 'react'
import { cn } from '../../lib/cn'
import { useTheme } from '../ui/ThemeToggle'
import { Wordmark } from './identity'
import { href } from './router'

export type Tab = 'start' | 'przegladaj' | 'szukaj' | 'nauka' | 'statystyki' | 'moje'

const TABS = [
  { id: 'przegladaj', label: 'Przeglądaj', icon: BookOpen },
  { id: 'szukaj', label: 'Szukaj', icon: Search },
  { id: 'nauka', label: 'Nauka', icon: GraduationCap },
  { id: 'statystyki', label: 'Statystyki', icon: ChartColumn },
] as const

export function Shell({ tab, children, bare }: { tab: Tab; children: ReactNode; bare?: boolean }) {
  const { theme, toggle } = useTheme()
  return (
    <div className="min-h-dvh md:flex">
      <aside className="sticky top-0 hidden h-dvh w-60 shrink-0 flex-col border-r border-line px-4 py-6 md:flex">
        <a href={href('')} className="px-2">
          <Wordmark />
        </a>
        <nav className="mt-10 flex flex-col gap-1" aria-label="Moduły">
          {TABS.map((t) => (
            <a
              key={t.id}
              href={href(t.id)}
              aria-current={tab === t.id ? 'page' : undefined}
              className={cn(
                'flex items-center gap-3 rounded-xl px-3 py-2.5 text-[15px] font-medium transition',
                tab === t.id ? 'bg-ink text-paper' : 'text-ink-2 hover:bg-sunk',
              )}
            >
              <t.icon className="size-[18px]" strokeWidth={1.8} />
              {t.label}
            </a>
          ))}
        </nav>
        <div className="mt-auto flex flex-col gap-1">
          <a
            href={href('moje')}
            className={cn(
              'flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm',
              tab === 'moje' ? 'bg-sunk text-ink' : 'text-muted hover:bg-sunk',
            )}
          >
            <UserRound className="size-4" /> Moje: tagi i ustawienia
          </a>
          <button
            type="button"
            onClick={toggle}
            className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-muted hover:bg-sunk"
          >
            {theme === 'dark' ? <Sun className="size-4" /> : <Moon className="size-4" />}
            {theme === 'dark' ? 'Tryb jasny' : 'Tryb ciemny'}
          </button>
          <kbd className="px-3 pt-2 font-mono text-[11px] text-muted">⌘K / Ctrl+K — szukaj</kbd>
        </div>
      </aside>
      <div className="min-w-0 flex-1">
        <div className={cn('mx-auto max-w-3xl', !bare && 'pb-28 md:pb-12')}>{children}</div>
      </div>
      {!bare && (
        <nav
          aria-label="Moduły"
          className="fixed inset-x-0 bottom-0 z-30 border-t border-line bg-paper/85 pb-[max(env(safe-area-inset-bottom),10px)] backdrop-blur-xl md:hidden"
        >
          <div className="mx-auto grid max-w-lg grid-cols-4 px-2 pt-2">
            {TABS.map((t) => {
              const active = tab === t.id
              return (
                <a
                  key={t.id}
                  href={href(t.id)}
                  aria-current={active ? 'page' : undefined}
                  className={cn(
                    'flex flex-col items-center gap-1 py-1 text-[10.5px] font-medium tracking-wide',
                    active ? 'text-ink' : 'text-muted',
                  )}
                >
                  <span
                    className={cn(
                      'grid h-8 w-12 place-items-center rounded-full transition',
                      active && 'bg-ink text-paper',
                    )}
                  >
                    <t.icon className="size-[18px]" strokeWidth={active ? 2.1 : 1.7} />
                  </span>
                  {t.label}
                </a>
              )
            })}
          </div>
        </nav>
      )}
    </div>
  )
}

export function TopBar({ back, title, brand }: { back?: string; title?: ReactNode; brand?: boolean }) {
  const { theme, toggle } = useTheme()
  return (
    <header className="sticky top-0 z-20 flex h-14 items-center gap-2 bg-paper/85 px-4 pt-[env(safe-area-inset-top)] backdrop-blur-xl md:px-8">
      {back !== undefined && (
        <a
          href={href(back)}
          aria-label="Wstecz"
          className="-ml-2 grid size-10 place-items-center rounded-full text-ink hover:bg-sunk"
        >
          <ChevronLeft className="size-6" strokeWidth={1.8} />
        </a>
      )}
      {brand ? (
        <a href={href('')} className="md:hidden">
          <Wordmark />
        </a>
      ) : (
        <div className="min-w-0 flex-1 truncate text-[15px] font-semibold">{title}</div>
      )}
      <div className="ml-auto flex items-center gap-1 md:hidden">
        <a
          href={href('moje')}
          aria-label="Moje: tagi i ustawienia"
          className="grid size-10 place-items-center rounded-full text-ink-2 hover:bg-sunk"
        >
          <UserRound className="size-[19px]" strokeWidth={1.8} />
        </a>
        <button
          type="button"
          onClick={toggle}
          aria-label={theme === 'dark' ? 'Włącz jasny motyw' : 'Włącz ciemny motyw'}
          className="grid size-10 place-items-center rounded-full text-ink-2 hover:bg-sunk"
        >
          {theme === 'dark' ? (
            <Sun className="size-[19px]" strokeWidth={1.8} />
          ) : (
            <Moon className="size-[19px]" strokeWidth={1.8} />
          )}
        </button>
      </div>
    </header>
  )
}

export function SectionLabel({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className={cn('text-[11px] font-semibold tracking-[0.14em] text-muted uppercase', className)}>
      {children}
    </div>
  )
}

export function Ring({ value, size = 44, stroke = 4 }: { value: number; size?: number; stroke?: number }) {
  const r = (size - stroke) / 2
  const c = 2 * Math.PI * r
  return (
    <svg width={size} height={size} className="-rotate-90" aria-hidden>
      <circle cx={size / 2} cy={size / 2} r={r} stroke="currentColor" strokeOpacity={0.18} strokeWidth={stroke} fill="none" />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        stroke="currentColor"
        strokeWidth={stroke}
        fill="none"
        strokeLinecap="round"
        strokeDasharray={c}
        strokeDashoffset={c * (1 - Math.max(0, Math.min(1, value)))}
      />
    </svg>
  )
}
