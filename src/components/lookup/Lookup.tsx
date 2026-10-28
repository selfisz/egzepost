import { Search, Tag } from 'lucide-react'
import { useDeferredValue, useMemo, useState } from 'react'
import type { ActMeta, Article, UserStore } from '../../types'
import { searchArticles, type ActFilter } from '../../lib/search'
import { ArticleCard } from '../article/ArticleCard'
import { cn } from '../../lib/cn'

type Props = {
  acts: ActMeta[]
  articles: Article[]
  store: UserStore
  onStoreChange: (next: UserStore) => void
  onXref: (actId: string, number: string) => void
  focusToken?: number
  initialQuery?: string
}

const FILTERS: { id: ActFilter; label: string }[] = [
  { id: 'all', label: 'Wszystkie' },
  { id: 'upea', label: 'Tylko u.p.e.a.' },
  { id: 'kpa', label: 'Tylko Kpa' },
  { id: 'tags', label: 'Tylko moje tagi' },
]

export function Lookup({
  acts,
  articles,
  store,
  onStoreChange,
  onXref,
  focusToken,
  initialQuery = '',
}: Props) {
  const [query, setQuery] = useState(initialQuery)
  const [actFilter, setActFilter] = useState<ActFilter>('all')
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const deferred = useDeferredValue(query.trim())

  const hits = useMemo(
    () => searchArticles(deferred, articles, store.tags, actFilter),
    [deferred, articles, store.tags, actFilter],
  )

  const selected =
    hits.find((h) => h.article.id === selectedId)?.article ??
    articles.find((a) => a.id === selectedId) ??
    null

  const searched = deferred.length > 0

  return (
    <section className="mx-auto w-full max-w-3xl px-4 pb-28 pt-4 md:pb-10 md:pt-8">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight text-slate-900 dark:text-zinc-50">
          Szukaj
        </h1>
        <p className="mt-1 max-w-xl text-sm text-slate-500 dark:text-zinc-400">
          Zagadnienie, tag albo numer artykułu. Wyniki wyłącznie z bazy ustaw i Twoich tagów.
        </p>
      </div>

      <div className="sticky top-0 z-10 -mx-4 bg-stone-50/90 px-4 py-3 backdrop-blur dark:bg-zinc-950/90 md:static md:mx-0 md:bg-transparent md:p-0 md:backdrop-blur-none">
        <label className="relative block">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            key={focusToken}
            autoFocus
            type="search"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value)
              setSelectedId(null)
            }}
            placeholder="np. zarzut, tytuł wykonawczy, art. 33…"
            className="w-full rounded-2xl border border-slate-200 bg-white py-3.5 pl-10 pr-4 text-base shadow-sm outline-none ring-indigo-500/30 placeholder:text-slate-400 focus:border-indigo-400 focus:ring-4 dark:border-zinc-800 dark:bg-zinc-900 dark:placeholder:text-zinc-500"
            aria-label="Zapytanie"
          />
          <kbd className="pointer-events-none absolute right-3 top-1/2 hidden -translate-y-1/2 rounded border border-slate-200 bg-slate-50 px-1.5 py-0.5 font-mono text-[10px] text-slate-400 md:inline dark:border-zinc-700 dark:bg-zinc-800">
            ⌘K
          </kbd>
        </label>

        <div className="mt-3 flex flex-wrap gap-1.5" role="group" aria-label="Filtry">
          {FILTERS.map((f) => (
            <button
              key={f.id}
              type="button"
              aria-pressed={actFilter === f.id}
              onClick={() => setActFilter(f.id)}
              className={cn(
                'rounded-full border px-3 py-1.5 text-sm font-medium transition',
                actFilter === f.id
                  ? 'border-slate-900 bg-slate-900 text-white dark:border-zinc-100 dark:bg-zinc-100 dark:text-zinc-900'
                  : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300',
              )}
            >
              {f.id === 'tags' && <Tag className="mr-1 inline h-3.5 w-3.5" />}
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {searched && hits.length === 0 && (
        <div
          className="mt-8 rounded-2xl border border-dashed border-rose-300 bg-rose-50/70 p-5 text-rose-900 dark:border-rose-900 dark:bg-rose-950/40 dark:text-rose-100"
          role="status"
        >
          <p className="text-base font-semibold">
            Brak wyników w tekście u.p.e.a., Kpa oraz w Twoich tagach
          </p>
          <p className="mt-1 text-sm opacity-90">
            Aplikacja nie dopowiada treści prawnych. Możesz przypisać frazę „{deferred}” jako własny
            tag do wybranego artykułu.
          </p>
          <button
            type="button"
            className="mt-3 rounded-xl bg-rose-700 px-3 py-2 text-sm font-semibold text-white hover:bg-rose-800 dark:bg-rose-600"
            onClick={() => {
              // Jump user to tags with query as draft via custom event
              window.dispatchEvent(
                new CustomEvent('egzepost:assign-tag', { detail: { label: deferred } }),
              )
            }}
          >
            Przypisz tę frazę jako nowy tag do wybranego artykułu
          </button>
        </div>
      )}

      {hits.length > 0 && (
        <div className="mt-6 space-y-3">
          {hits.slice(0, 40).map((hit) => (
            <button
              key={hit.article.id}
              type="button"
              onClick={() => setSelectedId(hit.article.id)}
              className={cn(
                'w-full rounded-2xl border p-4 text-left transition',
                selectedId === hit.article.id
                  ? 'border-indigo-300 bg-indigo-50/50 dark:border-indigo-800 dark:bg-indigo-950/30'
                  : 'border-slate-200 bg-white hover:border-slate-300 dark:border-zinc-800 dark:bg-zinc-900',
              )}
            >
              <div className="mb-1 flex flex-wrap items-center gap-2">
                <span className="font-mono text-base font-bold">{hit.article.label}</span>
                <span className="text-xs text-slate-500">
                  {acts.find((a) => a.id === hit.article.actId)?.shortName}
                </span>
                <span className="rounded-full bg-slate-100 px-2 py-0.5 font-mono text-[11px] text-slate-600 dark:bg-zinc-800 dark:text-zinc-300">
                  {hit.matchedVia}
                </span>
              </div>
              <p className="line-clamp-3 text-sm leading-relaxed text-slate-600 dark:text-zinc-400">
                {hit.article.excerpt}
              </p>
            </button>
          ))}
        </div>
      )}

      {selected && (
        <div className="mt-6">
          <ArticleCard
            article={selected}
            acts={acts}
            tags={store.tags}
            store={store}
            onStoreChange={onStoreChange}
            query={deferred}
            highlightTag={hits.find((h) => h.article.id === selected.id)?.tag}
            onXref={onXref}
          />
        </div>
      )}
    </section>
  )
}
