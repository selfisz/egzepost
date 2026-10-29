import { BookOpen, ChevronDown, ListTree, Rows3 } from 'lucide-react'
import { useEffect, useMemo, useState, type ReactNode } from 'react'
import type { ActMeta, Article, UserStore } from '../../types'
import { buildToc, chapterPeers, siblingArticles } from '../../lib/toc'
import { getPrefs, pushRecentArticle, setPrefs } from '../../lib/storage'
import { Reader } from '../reader/Reader'
import { cn } from '../../lib/cn'

type Props = {
  acts: ActMeta[]
  articles: Article[]
  store: UserStore
  onStoreChange: (next: UserStore) => void
  onXref: (actId: string, number: string) => void
  /** Open a specific article from search */
  focusArticleId?: string | null
  onFocusConsumed?: () => void
}

type ReadMode = 'single' | 'chapter'

export function Browse({
  acts,
  articles,
  store,
  onStoreChange,
  onXref,
  focusArticleId,
  onFocusConsumed,
}: Props) {
  const [actId, setActId] = useState(acts[0]?.id ?? 'upea')
  const [articleId, setArticleId] = useState<string | null>(null)
  const [readMode, setReadMode] = useState<ReadMode>('single')
  const [jump, setJump] = useState('')
  const [openChapters, setOpenChapters] = useState<Record<string, boolean>>({})
  const [mobileToc, setMobileToc] = useState(true)
  const prefs = getPrefs(store)
  const highlightLegal = prefs.highlightLegal
  const toggleHighlight = () =>
    onStoreChange(setPrefs(store, { highlightLegal: !prefs.highlightLegal }))

  const actArticles = useMemo(
    () => articles.filter((a) => a.actId === actId),
    [articles, actId],
  )
  const toc = useMemo(() => buildToc(actArticles), [actArticles])

  const current =
    (articleId && actArticles.find((a) => a.id === articleId)) ||
    actArticles[0] ||
    null

  useEffect(() => {
    if (!focusArticleId) return
    const art = articles.find((a) => a.id === focusArticleId)
    if (art) {
      setActId(art.actId)
      setArticleId(art.id)
      setMobileToc(false)
      if (art.chapter) setOpenChapters((o) => ({ ...o, [art.chapter!]: true }))
      onStoreChange(pushRecentArticle(store, art.id))
    }
    onFocusConsumed?.()
    // intentionally once per focus id
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [focusArticleId, articles, onFocusConsumed])

  useEffect(() => {
    // Default open first chapter; pick first article when act changes
    if (!actArticles.length) return
    const first = actArticles[0]
    setArticleId((prev) => {
      if (prev && actArticles.some((a) => a.id === prev)) return prev
      return first.id
    })
    if (first.chapter) {
      setOpenChapters((o) => ({ ...o, [first.chapter!]: true }))
    }
  }, [actId, actArticles])

  const { prev, next } = current
    ? siblingArticles(actArticles, current)
    : { prev: null, next: null }

  const continuous = current ? chapterPeers(actArticles, current) : []

  function selectArticle(a: Article) {
    setArticleId(a.id)
    setMobileToc(false)
    if (a.chapter) setOpenChapters((o) => ({ ...o, [a.chapter!]: true }))
    onStoreChange(pushRecentArticle(store, a.id))
    requestAnimationFrame(() => {
      document.getElementById(`reader-${a.id}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    })
  }

  function doJump() {
    const m = jump.trim().match(/^(?:art\.?\s*)?(\d+[a-z]?)$/i)
    if (!m) return
    const a = actArticles.find((x) => x.number.toLowerCase() === m[1].toLowerCase())
    if (a) {
      selectArticle(a)
      setJump('')
    }
  }

  const tree = (
    <nav className="space-y-1 text-sm" aria-label="Spis treści">
      {toc.map((ch) => {
        const open = openChapters[ch.label] ?? false
        return (
          <div key={ch.id}>
            <button
              type="button"
              className="flex w-full items-start gap-1 rounded-lg px-2 py-1.5 text-left font-medium text-slate-800 hover:bg-slate-100 dark:text-zinc-100 dark:hover:bg-zinc-800"
              onClick={() => setOpenChapters((o) => ({ ...o, [ch.label]: !open }))}
            >
              <ChevronDown
                className={cn('mt-0.5 h-3.5 w-3.5 shrink-0 transition', !open && '-rotate-90')}
              />
              <span className="leading-snug">{ch.label}</span>
            </button>
            {open && (
              <div className="ml-3 space-y-2 border-l border-slate-200 pl-2 dark:border-zinc-700">
                {ch.sections.map((sec) => (
                  <div key={sec.id}>
                    <div className="px-2 py-1 text-xs font-semibold uppercase tracking-wide text-slate-400">
                      {sec.label}
                    </div>
                    <ul className="space-y-0.5">
                      {sec.articles.map((a) => (
                        <li key={a.id}>
                          <button
                            type="button"
                            onClick={() => selectArticle(a)}
                            className={cn(
                              'w-full rounded-md px-2 py-1 text-left text-[12px] leading-snug',
                              current?.id === a.id
                                ? 'bg-slate-900 text-white dark:bg-zinc-100 dark:text-zinc-900'
                                : 'text-slate-600 hover:bg-slate-50 dark:text-zinc-300 dark:hover:bg-zinc-800',
                            )}
                          >
                            <span className="font-mono font-semibold">{a.label}</span>
                            {a.title ? (
                              <span
                                className={cn(
                                  'font-sans font-normal',
                                  current?.id === a.id
                                    ? 'text-white/80 dark:text-zinc-700'
                                    : 'text-slate-500 dark:text-zinc-400',
                                )}
                              >
                                {' '}
                                · {a.title}
                              </span>
                            ) : null}
                          </button>
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
                {ch.articles.map((a) => (
                  <button
                    key={a.id}
                    type="button"
                    onClick={() => selectArticle(a)}
                    className={cn(
                      'block w-full rounded-md px-2 py-1 text-left text-[12px] leading-snug',
                      current?.id === a.id
                        ? 'bg-slate-900 text-white dark:bg-zinc-100 dark:text-zinc-900'
                        : 'text-slate-600 hover:bg-slate-50 dark:text-zinc-300 dark:hover:bg-zinc-800',
                    )}
                  >
                    <span className="font-mono font-semibold">{a.label}</span>
                    {a.title ? (
                      <span
                        className={cn(
                          'font-sans font-normal',
                          current?.id === a.id
                            ? 'text-white/80 dark:text-zinc-700'
                            : 'text-slate-500 dark:text-zinc-400',
                        )}
                      >
                        {' '}
                        · {a.title}
                      </span>
                    ) : null}
                  </button>
                ))}
              </div>
            )}
          </div>
        )
      })}
    </nav>
  )

  return (
    <section className="mx-auto w-full max-w-6xl px-4 pb-28 pt-4 md:pb-10 md:pt-6">
      <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Przeglądaj</h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-zinc-400">
            Spis aktu i spokojne czytanie — bez ściany wyników.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {acts.map((a) => (
            <button
              key={a.id}
              type="button"
              aria-pressed={actId === a.id}
              onClick={() => setActId(a.id)}
              className={cn(
                'rounded-full border px-3 py-1.5 text-sm font-medium',
                actId === a.id
                  ? 'border-slate-900 bg-slate-900 text-white dark:border-zinc-100 dark:bg-zinc-100 dark:text-zinc-900'
                  : 'border-slate-200 bg-white dark:border-zinc-800 dark:bg-zinc-900',
              )}
            >
              {a.shortName}
            </button>
          ))}
        </div>
      </div>

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <div className="flex rounded-xl border border-slate-200 bg-white p-0.5 dark:border-zinc-800 dark:bg-zinc-900">
          <ModeBtn
            active={readMode === 'single'}
            onClick={() => setReadMode('single')}
            icon={<BookOpen className="h-3.5 w-3.5" />}
            label="Art. po art."
          />
          <ModeBtn
            active={readMode === 'chapter'}
            onClick={() => setReadMode('chapter')}
            icon={<Rows3 className="h-3.5 w-3.5" />}
            label="Scroll rozdziału"
          />
        </div>
        <form
          className="flex items-center gap-1"
          onSubmit={(e) => {
            e.preventDefault()
            doJump()
          }}
        >
          <input
            value={jump}
            onChange={(e) => setJump(e.target.value)}
            placeholder="Art. N…"
            className="w-28 rounded-xl border border-slate-200 bg-white px-3 py-1.5 font-mono text-sm outline-none dark:border-zinc-800 dark:bg-zinc-900"
            aria-label="Skok do artykułu"
          />
          <button
            type="submit"
            className="rounded-xl border border-slate-200 px-3 py-1.5 text-sm dark:border-zinc-800"
          >
            Idź
          </button>
        </form>
        <button
          type="button"
          className="inline-flex items-center gap-1 rounded-xl border border-slate-200 px-3 py-1.5 text-sm md:hidden dark:border-zinc-800"
          onClick={() => setMobileToc((v) => !v)}
        >
          <ListTree className="h-3.5 w-3.5" />
          {mobileToc ? 'Ukryj spis' : 'Spis'}
        </button>
      </div>

      {current && (
        <p className="mb-3 text-xs text-slate-500 dark:text-zinc-500">
          Jesteś w:{' '}
          <span className="text-slate-700 dark:text-zinc-300">
            {[current.chapter, current.section, current.label].filter(Boolean).join(' › ')}
          </span>
        </p>
      )}

      <div className="grid gap-6 md:grid-cols-[280px_minmax(0,1fr)]">
        <aside
          className={cn(
            'max-h-[70vh] overflow-y-auto rounded-2xl border border-slate-200/80 bg-white/70 p-3 dark:border-zinc-800 dark:bg-zinc-900/50 md:sticky md:top-4 md:block',
            mobileToc ? 'block' : 'hidden md:block',
          )}
        >
          {tree}
        </aside>

        <div className="min-w-0">
          {!current ? (
            <p className="text-sm text-slate-500">Brak artykułów w tym akcie.</p>
          ) : readMode === 'single' ? (
            <Reader
              article={current}
              acts={acts}
              store={store}
              onStoreChange={onStoreChange}
              onXref={onXref}
              highlightLegal={highlightLegal}
              onToggleHighlight={toggleHighlight}
              hasPrev={!!prev}
              hasNext={!!next}
              onPrev={() => prev && selectArticle(prev)}
              onNext={() => next && selectArticle(next)}
            />
          ) : (
            <div className="rounded-2xl border border-slate-200/80 bg-white/90 px-5 dark:border-zinc-800 dark:bg-zinc-900/80">
              {continuous.map((a) => (
                <Reader
                  key={a.id}
                  article={a}
                  acts={acts}
                  store={store}
                  onStoreChange={onStoreChange}
                  onXref={onXref}
                  highlightLegal={highlightLegal}
                  onToggleHighlight={toggleHighlight}
                  bare
                  showNav={false}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </section>
  )
}

function ModeBtn({
  active,
  onClick,
  icon,
  label,
}: {
  active: boolean
  onClick: () => void
  icon: ReactNode
  label: string
}) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={cn(
        'inline-flex items-center gap-1.5 rounded-[10px] px-3 py-1.5 text-sm font-medium',
        active
          ? 'bg-slate-900 text-white dark:bg-zinc-100 dark:text-zinc-900'
          : 'text-slate-600 dark:text-zinc-300',
      )}
    >
      {icon}
      {label}
    </button>
  )
}
