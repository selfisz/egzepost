import { Clock3, Pin, Search, Tag } from 'lucide-react'
import { useDeferredValue, useMemo, useState } from 'react'
import type { ActMeta, Article, UserStore, UserTag } from '../../types'
import { searchArticles, type ActFilter, type SearchHit } from '../../lib/search'
import {
  getPrefs,
  pushRecentArticle,
  pushRecentTag,
  setPrefs,
  togglePinnedTag,
} from '../../lib/storage'
import { Reader } from '../reader/Reader'
import { ActBadge } from '../article/CrossRefPopover'
import { cn } from '../../lib/cn'

type Props = {
  acts: ActMeta[]
  articles: Article[]
  store: UserStore
  onStoreChange: (next: UserStore) => void
  onXref: (actId: string, number: string) => void
  focusToken?: number
  onOpenInBrowse?: (articleId: string) => void
}

const FILTERS: { id: ActFilter; label: string }[] = [
  { id: 'all', label: 'Wszystkie' },
  { id: 'upea', label: 'u.p.e.a.' },
  { id: 'kpa', label: 'Kpa' },
  { id: 'ordynacja', label: 'Op' },
  { id: 'tags', label: 'Moje tagi' },
]

export function Lookup({
  acts,
  articles,
  store,
  onStoreChange,
  onXref,
  focusToken,
  onOpenInBrowse,
}: Props) {
  const [query, setQuery] = useState('')
  const [actFilter, setActFilter] = useState<ActFilter>('all')
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const deferred = useDeferredValue(query.trim())
  const prefs = getPrefs(store)

  const byId = useMemo(() => new Map(articles.map((a) => [a.id, a])), [articles])
  const tagById = useMemo(() => new Map(store.tags.map((t) => [t.id, t])), [store.tags])

  const hits = useMemo(
    () => searchArticles(deferred, articles, store.tags, actFilter),
    [deferred, articles, store.tags, actFilter],
  )

  const selected =
    (selectedId && byId.get(selectedId)) ||
    hits.find((h) => h.article.id === selectedId)?.article ||
    null

  const selectedHit = selectedId
    ? hits.find((h) => h.article.id === selectedId)
    : undefined

  const searched = deferred.length > 0

  const recentArticles = useMemo(() => {
    return (store.recentArticleIds ?? [])
      .map((id) => byId.get(id))
      .filter(Boolean)
      .slice(0, 8) as Article[]
  }, [store.recentArticleIds, byId])

  const pinnedTags = useMemo(() => {
    return (store.pinnedTagIds ?? [])
      .map((id) => tagById.get(id))
      .filter(Boolean) as UserTag[]
  }, [store.pinnedTagIds, tagById])

  const recentTags = useMemo(() => {
    const pinned = new Set(store.pinnedTagIds ?? [])
    const fromRecent = (store.recentTagIds ?? [])
      .map((id) => tagById.get(id))
      .filter((t): t is UserTag => !!t && !pinned.has(t.id))
    // Fallback: newest tags by updatedAt if no recent usage yet
    if (fromRecent.length === 0) {
      return [...store.tags]
        .filter((t) => !pinned.has(t.id))
        .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
        .slice(0, 6)
    }
    return fromRecent.slice(0, 6)
  }, [store.recentTagIds, store.pinnedTagIds, store.tags, tagById])

  function openArticle(id: string, viaTag?: UserTag) {
    setSelectedId(id)
    let next = pushRecentArticle(store, id)
    if (viaTag) next = pushRecentTag(next, viaTag.id)
    onStoreChange(next)
  }

  function applyTagQuery(tag: UserTag) {
    setQuery(tag.label)
    setSelectedId(null)
    onStoreChange(pushRecentTag(store, tag.id))
  }

  return (
    <section className="mx-auto w-full max-w-3xl px-4 pb-28 pt-4 md:pb-10 md:pt-8">
      <div className="mb-5">
        <h1 className="text-2xl font-semibold tracking-tight text-slate-900 dark:text-zinc-50">
          Szukaj
        </h1>
        <p className="mt-1 max-w-xl text-sm text-slate-500 dark:text-zinc-400">
          Narzędzie do szybkiego trafienia w przepis — nie ściana kart.
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
            placeholder="żargon, temat, art. 33…"
            className="w-full rounded-2xl border border-slate-200 bg-white py-3.5 pl-10 pr-14 text-base shadow-sm outline-none ring-slate-400/20 placeholder:text-slate-400 focus:border-slate-400 focus:ring-4 dark:border-zinc-800 dark:bg-zinc-900 dark:placeholder:text-zinc-500"
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

      {!searched && !selected && (
        <EmptyHome
          recentArticles={recentArticles}
          pinnedTags={pinnedTags}
          recentTags={recentTags}
          acts={acts}
          store={store}
          onStoreChange={onStoreChange}
          onOpenArticle={(id) => openArticle(id)}
          onApplyTag={applyTagQuery}
        />
      )}

      {searched && hits.length === 0 && !selected && (
        <div
          className="mt-8 rounded-2xl border border-dashed border-rose-300 bg-rose-50/70 p-5 text-rose-900 dark:border-rose-900 dark:bg-rose-950/40 dark:text-rose-100"
          role="status"
        >
          <p className="text-base font-semibold">
            Brak wyników w tekście u.p.e.a., Kpa oraz w Twoich tagach
          </p>
          <p className="mt-1 text-sm opacity-90">
            Aplikacja nie dopowiada treści prawnych. Możesz przypisać frazę „{deferred}” jako własny
            tag.
          </p>
          <button
            type="button"
            className="mt-3 rounded-xl bg-rose-700 px-3 py-2 text-sm font-semibold text-white hover:bg-rose-800 dark:bg-rose-600"
            onClick={() => {
              window.dispatchEvent(
                new CustomEvent('egzepost:assign-tag', { detail: { label: deferred } }),
              )
            }}
          >
            Przypisz tę frazę jako nowy tag do wybranego artykułu
          </button>
        </div>
      )}

      {hits.length > 0 && !selected && (
        <div className="mt-5 space-y-1.5" role="list">
          <p className="mb-2 text-xs text-slate-500">{hits.length} trafień</p>
          {hits.slice(0, 50).map((hit) => (
            <ResultRow
              key={hit.article.id}
              hit={hit}
              acts={acts}
              onClick={() => openArticle(hit.article.id, hit.tag)}
            />
          ))}
        </div>
      )}

      {selected && (
        <div className="mt-6 space-y-3">
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              className="rounded-xl border border-slate-200 px-3 py-1.5 text-sm dark:border-zinc-700"
              onClick={() => setSelectedId(null)}
            >
              ← {searched ? 'Lista wyników' : 'Wróć'}
            </button>
            {onOpenInBrowse && (
              <button
                type="button"
                className="rounded-xl border border-slate-200 px-3 py-1.5 text-sm dark:border-zinc-700"
                onClick={() => onOpenInBrowse(selected.id)}
              >
                Otwórz w Przeglądaj
              </button>
            )}
          </div>
          {selectedHit?.tag && (
            <div className="rounded-xl border border-indigo-200/80 bg-indigo-50/80 px-3 py-2 text-sm text-indigo-900 dark:border-indigo-900 dark:bg-indigo-950/40 dark:text-indigo-200">
              Trafienie po tagu: <strong>{selectedHit.tag.label}</strong>
            </div>
          )}
          <Reader
            article={selected}
            acts={acts}
            store={store}
            onStoreChange={onStoreChange}
            onXref={onXref}
            highlightLegal={prefs.highlightLegal}
            onToggleHighlight={() =>
              onStoreChange(setPrefs(store, { highlightLegal: !prefs.highlightLegal }))
            }
            showNav={false}
          />
        </div>
      )}
    </section>
  )
}

function ResultRow({
  hit,
  acts,
  onClick,
}: {
  hit: SearchHit
  acts: ActMeta[]
  onClick: () => void
}) {
  const viaTag = hit.kind === 'tag' && hit.tag
  return (
    <button
      type="button"
      role="listitem"
      onClick={onClick}
      className="w-full rounded-xl border border-slate-200/90 bg-white px-3.5 py-2.5 text-left transition hover:border-slate-300 hover:bg-stone-50/80 dark:border-zinc-800 dark:bg-zinc-900 dark:hover:bg-zinc-900/80"
    >
      {viaTag && (
        <div className="mb-1.5 flex items-center gap-1.5 text-[11px] font-medium text-indigo-700 dark:text-indigo-300">
          <Tag className="h-3 w-3" />
          tag: {hit.tag!.label}
        </div>
      )}
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-sm font-bold tracking-tight">
          <span className="font-mono">{hit.article.label}</span>
          {hit.article.title ? (
            <span className="font-sans font-medium text-slate-600 dark:text-zinc-300">
              {' '}
              · {hit.article.title}
            </span>
          ) : null}
        </span>
        <ActBadge actId={hit.article.actId} acts={acts} />
        {!viaTag && (
          <span className="font-mono text-[10px] text-slate-400">{hit.matchedVia}</span>
        )}
      </div>
      <p className="mt-1 line-clamp-2 text-[13px] leading-snug text-slate-600 dark:text-zinc-400">
        {hit.article.excerpt}
      </p>
    </button>
  )
}

function EmptyHome({
  recentArticles,
  pinnedTags,
  recentTags,
  acts,
  store,
  onStoreChange,
  onOpenArticle,
  onApplyTag,
}: {
  recentArticles: Article[]
  pinnedTags: UserTag[]
  recentTags: UserTag[]
  acts: ActMeta[]
  store: UserStore
  onStoreChange: (next: UserStore) => void
  onOpenArticle: (id: string) => void
  onApplyTag: (tag: UserTag) => void
}) {
  return (
    <div className="mt-8 space-y-8">
      <section>
        <h2 className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-slate-400">
          <Clock3 className="h-3.5 w-3.5" /> Ostatnio otwarte
        </h2>
        {recentArticles.length === 0 ? (
          <p className="text-sm text-slate-500 dark:text-zinc-500">
            Tu pojawią się artykuły, które otworzysz z wyszukiwania lub przeglądania.
          </p>
        ) : (
          <div className="space-y-1.5">
            {recentArticles.map((a) => (
              <button
                key={a.id}
                type="button"
                onClick={() => onOpenArticle(a.id)}
                className="flex w-full items-center gap-2 rounded-xl border border-slate-200/80 bg-white px-3 py-2 text-left hover:bg-stone-50 dark:border-zinc-800 dark:bg-zinc-900"
              >
                <span className="text-sm font-semibold">
                  <span className="font-mono">{a.label}</span>
                  {a.title ? (
                    <span className="font-sans font-medium text-slate-600 dark:text-zinc-300">
                      {' '}
                      · {a.title}
                    </span>
                  ) : null}
                </span>
                <ActBadge actId={a.actId} acts={acts} />
                <span className="truncate text-xs text-slate-500">{a.excerpt}</span>
              </button>
            ))}
          </div>
        )}
      </section>

      <section>
        <h2 className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-slate-400">
          <Pin className="h-3.5 w-3.5" /> Przypięte tagi
        </h2>
        {pinnedTags.length === 0 ? (
          <p className="text-sm text-slate-500 dark:text-zinc-500">
            Przypnij tagi w <strong>Moje</strong> albo ikoną pinezki przy tagu poniżej.
          </p>
        ) : (
          <TagChips
            tags={pinnedTags}
            pinned
            store={store}
            onStoreChange={onStoreChange}
            onApply={onApplyTag}
          />
        )}
      </section>

      {recentTags.length > 0 && (
        <section>
          <h2 className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-slate-400">
            <Tag className="h-3.5 w-3.5" /> Ostatnie / Twoje tagi
          </h2>
          <TagChips
            tags={recentTags}
            store={store}
            onStoreChange={onStoreChange}
            onApply={onApplyTag}
          />
        </section>
      )}

      {store.tags.length === 0 && recentArticles.length === 0 && (
        <p className="text-sm text-slate-500 dark:text-zinc-400">
          Albo przejdź do <strong>Przeglądaj</strong>, żeby czytać ustawę jak kodeks.
        </p>
      )}
    </div>
  )
}

function TagChips({
  tags,
  pinned,
  store,
  onStoreChange,
  onApply,
}: {
  tags: UserTag[]
  pinned?: boolean
  store: UserStore
  onStoreChange: (next: UserStore) => void
  onApply: (tag: UserTag) => void
}) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {tags.map((t) => {
        const isPinned = (store.pinnedTagIds ?? []).includes(t.id)
        return (
          <div
            key={t.id}
            className="inline-flex items-center gap-0.5 rounded-full border border-slate-200 bg-white dark:border-zinc-700 dark:bg-zinc-900"
          >
            <button
              type="button"
              onClick={() => onApply(t)}
              className="rounded-full px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-stone-50 dark:text-zinc-200 dark:hover:bg-zinc-800"
            >
              {t.label}
              <span className="ml-1 font-mono text-[10px] text-slate-400">{t.articleIds.length}</span>
            </button>
            <button
              type="button"
              title={isPinned ? 'Odepnij' : 'Przypnij'}
              aria-label={isPinned ? 'Odepnij tag' : 'Przypnij tag'}
              onClick={() => onStoreChange(togglePinnedTag(store, t.id))}
              className={cn(
                'mr-1 rounded-full p-1.5',
                isPinned || pinned
                  ? 'text-amber-600 dark:text-amber-400'
                  : 'text-slate-400 hover:text-slate-600',
              )}
            >
              <Pin className="h-3 w-3" />
            </button>
          </div>
        )
      })}
    </div>
  )
}
