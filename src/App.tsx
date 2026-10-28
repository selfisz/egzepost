import { BookOpen, Library, Search, UserRound } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Browse } from './components/browse/Browse'
import { Lookup } from './components/lookup/Lookup'
import { Learn } from './components/learn/Learn'
import { Tags } from './components/tags/Tags'
import { CrossRefPopover } from './components/article/CrossRefPopover'
import { ThemeToggle, useTheme } from './components/ui/ThemeToggle'
import { ToastProvider } from './components/ui/Toast'
import { loadAppData, type AppData } from './lib/data'
import { loadUserStore, saveUserStore } from './lib/storage'
import type { Article, UserStore } from './types'
import { cn } from './lib/cn'

type Tab = 'browse' | 'lookup' | 'learn' | 'mine'

function Shell() {
  useTheme()
  const [tab, setTab] = useState<Tab>('browse')
  const [data, setData] = useState<AppData | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [store, setStore] = useState<UserStore>(() => loadUserStore())
  const [focusToken, setFocusToken] = useState(0)
  const [draftTag, setDraftTag] = useState<string | null>(null)
  const [browseFocusId, setBrowseFocusId] = useState<string | null>(null)
  const [xrefArticle, setXrefArticle] = useState<Article | null>(null)
  const [xrefOpen, setXrefOpen] = useState(false)

  useEffect(() => {
    let cancelled = false
    loadAppData()
      .then((d) => {
        if (!cancelled) setData(d)
      })
      .catch((e: unknown) => {
        if (!cancelled) setError(e instanceof Error ? e.message : 'Nie udało się wczytać bazy')
      })
    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        setTab('lookup')
        setFocusToken((n) => n + 1)
      }
      if (e.key === 'Escape') setXrefOpen(false)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  useEffect(() => {
    const onAssign = (e: Event) => {
      const detail = (e as CustomEvent<{ label: string }>).detail
      setDraftTag(detail.label)
      setTab('mine')
    }
    window.addEventListener('egzepost:assign-tag', onAssign)
    return () => window.removeEventListener('egzepost:assign-tag', onAssign)
  }, [])

  function updateStore(next: UserStore) {
    setStore(next)
    saveUserStore(next)
  }

  function openXref(actId: string, number: string) {
    const article = data?.byId.get(`${actId}:${number}`)
    if (!article) {
      setXrefArticle(null)
      setXrefOpen(false)
      return
    }
    setXrefArticle(article)
    setXrefOpen(true)
  }

  const navItems = [
    ['browse', 'Przeglądaj', Library],
    ['lookup', 'Szukaj', Search],
    ['learn', 'Ucz się', BookOpen],
    ['mine', 'Moje', UserRound],
  ] as const

  return (
    <div className="min-h-full">
      <header className="border-b border-slate-200/80 bg-stone-50/80 backdrop-blur dark:border-zinc-800 dark:bg-zinc-950/80">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-3">
          <div className="min-w-0">
            <div className="text-lg font-semibold tracking-tight">
              Egze <span className="text-indigo-600 dark:text-indigo-400">Post</span>
            </div>
            <p className="truncate text-xs text-slate-500 dark:text-zinc-500">
              Kodeks do pracy i nauki · tylko baza + Twoje tagi
            </p>
          </div>
          <div className="flex items-center gap-2">
            {data && (
              <span className="hidden rounded-full border border-slate-200 px-2.5 py-1 font-mono text-[11px] text-slate-500 sm:inline dark:border-zinc-700">
                {data.articles.length} art.
              </span>
            )}
            <button
              type="button"
              className="hidden items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-sm text-slate-600 hover:bg-slate-50 md:inline-flex dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300"
              onClick={() => {
                setTab('lookup')
                setFocusToken((n) => n + 1)
              }}
            >
              <Search className="h-3.5 w-3.5" />
              Szukaj
              <kbd className="font-mono text-[10px] text-slate-400">⌘K</kbd>
            </button>
            <ThemeToggle />
          </div>
        </div>

        <nav className="mx-auto hidden max-w-6xl gap-1 px-4 pb-2 md:flex" aria-label="Główne">
          {navItems.map(([id, label, Icon]) => (
            <button
              key={id}
              type="button"
              aria-current={tab === id ? 'page' : undefined}
              onClick={() => setTab(id)}
              className={cn(
                'inline-flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-medium',
                tab === id
                  ? 'bg-slate-900 text-white dark:bg-zinc-100 dark:text-zinc-900'
                  : 'text-slate-600 hover:bg-slate-100 dark:text-zinc-300 dark:hover:bg-zinc-900',
              )}
            >
              <Icon className="h-4 w-4" />
              {label}
            </button>
          ))}
        </nav>
      </header>

      <main>
        {error && (
          <div className="mx-auto mt-8 max-w-xl rounded-2xl border border-dashed border-rose-300 p-5 text-rose-800 dark:border-rose-900 dark:text-rose-200">
            <strong>brak w bazie</strong>
            <p className="text-sm">{error}</p>
          </div>
        )}
        {!error && !data && (
          <p className="p-8 text-center text-sm text-slate-500">Ładowanie bazy aktów…</p>
        )}

        {data && tab === 'browse' && (
          <Browse
            acts={data.acts}
            articles={data.articles}
            store={store}
            onStoreChange={updateStore}
            onXref={openXref}
            focusArticleId={browseFocusId}
            onFocusConsumed={() => setBrowseFocusId(null)}
          />
        )}
        {data && tab === 'lookup' && (
          <Lookup
            acts={data.acts}
            articles={data.articles}
            store={store}
            onStoreChange={updateStore}
            onXref={openXref}
            focusToken={focusToken}
            onOpenInBrowse={(id) => {
              setBrowseFocusId(id)
              setTab('browse')
            }}
          />
        )}
        {data && tab === 'learn' && (
          <Learn
            acts={data.acts}
            articles={data.articles}
            store={store}
            onStoreChange={updateStore}
            onXref={openXref}
          />
        )}
        {data && tab === 'mine' && (
          <Tags
            acts={data.acts}
            articles={data.articles}
            store={store}
            onStoreChange={updateStore}
            onXref={openXref}
            draftLabel={draftTag}
            onDraftConsumed={() => setDraftTag(null)}
          />
        )}
      </main>

      <nav
        className="fixed inset-x-2 bottom-3 z-30 grid grid-cols-4 gap-1 rounded-2xl border border-slate-200 bg-white/95 p-1 shadow-lg backdrop-blur md:hidden dark:border-zinc-700 dark:bg-zinc-900/95"
        aria-label="Główne"
      >
        {navItems.map(([id, label, Icon]) => (
          <button
            key={id}
            type="button"
            aria-current={tab === id ? 'page' : undefined}
            onClick={() => {
              setTab(id)
              if (id === 'lookup') setFocusToken((n) => n + 1)
            }}
            className={cn(
              'flex flex-col items-center gap-0.5 rounded-xl py-2 text-[10px] font-semibold',
              tab === id
                ? 'bg-slate-900 text-white dark:bg-zinc-100 dark:text-zinc-900'
                : 'text-slate-600 dark:text-zinc-300',
            )}
          >
            <Icon className="h-4 w-4" />
            {label}
          </button>
        ))}
      </nav>

      {data && (
        <CrossRefPopover
          open={xrefOpen}
          onOpenChange={setXrefOpen}
          article={xrefArticle}
          acts={data.acts}
        />
      )}
    </div>
  )
}

export default function App() {
  return (
    <ToastProvider>
      <Shell />
    </ToastProvider>
  )
}
