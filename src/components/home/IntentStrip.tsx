import { BookOpen, Library, Search, X } from 'lucide-react'
import { useEffect, useState, type ReactNode } from 'react'
import type { UserStore } from '../../types'
import { moduleProgress, resolveLearnModules } from '../../lib/storage'
import { cn } from '../../lib/cn'

const DISMISS_KEY = 'regest:intent-dismissed'

type Tab = 'browse' | 'lookup' | 'learn' | 'mine'

type Props = {
  store: UserStore
  onGo: (tab: Tab) => void
  className?: string
}

export function IntentStrip({ store, onGo, className }: Props) {
  const [dismissed, setDismissed] = useState(() => localStorage.getItem(DISMISS_KEY) === '1')

  useEffect(() => {
    if (dismissed) localStorage.setItem(DISMISS_KEY, '1')
  }, [dismissed])

  const modules = resolveLearnModules(store)
  const continueMod = modules.find((m) => m.articleIds.some((id) => store.progress[id]))
  const continuePct = continueMod
    ? moduleProgress(store, continueMod.articleIds).pct
    : 0
  const recentCount = store.recentArticleIds?.length ?? 0

  if (dismissed) {
    if (!continueMod && recentCount === 0) return null
    return (
      <div
        className={cn(
          'mx-auto flex w-full max-w-6xl flex-wrap items-center gap-2 px-4 pt-3',
          className,
        )}
      >
        {continueMod && (
          <button
            type="button"
            onClick={() => onGo('learn')}
            className="inline-flex items-center gap-2 rounded-xl border border-slate-200/80 bg-white/80 px-3 py-1.5 text-sm text-slate-700 hover:bg-stone-50 dark:border-zinc-800 dark:bg-zinc-900/70 dark:text-zinc-200"
          >
            <BookOpen className="h-3.5 w-3.5" />
            Kontynuuj: {continueMod.name}
            <span className="font-mono text-[10px] text-slate-400">{continuePct}%</span>
          </button>
        )}
        {recentCount > 0 && (
          <button
            type="button"
            onClick={() => onGo('lookup')}
            className="inline-flex items-center gap-2 rounded-xl border border-transparent px-3 py-1.5 text-sm text-slate-500 hover:bg-stone-100/80 dark:hover:bg-zinc-900"
          >
            Ostatnio otwarte ({recentCount})
          </button>
        )}
      </div>
    )
  }

  return (
    <div
      className={cn(
        'mx-auto w-full max-w-6xl px-4 pt-4',
        className,
      )}
    >
      <div className="relative rounded-2xl border border-slate-200/70 bg-gradient-to-br from-stone-100/80 to-white px-4 py-4 dark:border-zinc-800 dark:from-zinc-900/80 dark:to-zinc-950">
        <button
          type="button"
          aria-label="Ukryj"
          className="absolute right-2 top-2 rounded-lg p-1.5 text-slate-400 hover:bg-white/80 dark:hover:bg-zinc-800"
          onClick={() => setDismissed(true)}
        >
          <X className="h-4 w-4" />
        </button>
        <p className="mb-3 pr-8 text-sm text-slate-600 dark:text-zinc-400">
          Co chcesz zrobić?
        </p>
        <div className="grid gap-2 sm:grid-cols-3">
          <IntentBtn
            icon={<Search className="h-4 w-4" />}
            title="Szukam podstawy"
            hint="Lookup żargonu → przepis"
            onClick={() => {
              setDismissed(true)
              onGo('lookup')
            }}
          />
          <IntentBtn
            icon={<Library className="h-4 w-4" />}
            title="Czytam akt"
            hint="Spis Dział → Rozdział"
            onClick={() => {
              setDismissed(true)
              onGo('browse')
            }}
          />
          <IntentBtn
            icon={<BookOpen className="h-4 w-4" />}
            title="Ćwiczę"
            hint="Zakres → tryb → sesja"
            onClick={() => {
              setDismissed(true)
              onGo('learn')
            }}
          />
        </div>
      </div>
    </div>
  )
}

function IntentBtn({
  icon,
  title,
  hint,
  onClick,
}: {
  icon: ReactNode
  title: string
  hint: string
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex items-start gap-3 rounded-xl border border-slate-200/80 bg-white/90 px-3 py-3 text-left transition hover:border-slate-300 hover:bg-white dark:border-zinc-700 dark:bg-zinc-900 dark:hover:border-zinc-600"
    >
      <span className="mt-0.5 text-slate-500 dark:text-zinc-400">{icon}</span>
      <span>
        <span className="block text-sm font-semibold text-slate-900 dark:text-zinc-50">{title}</span>
        <span className="mt-0.5 block text-xs text-slate-500 dark:text-zinc-400">{hint}</span>
      </span>
    </button>
  )
}
