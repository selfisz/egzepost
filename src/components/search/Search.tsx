import { ArrowRight, Hash, Search as SearchIcon, X } from 'lucide-react'
import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { cn } from '../../lib/cn'
import { searchArticles, type ActFilter, type SearchHit } from '../../lib/search'
import type { ActId, Library } from '../../lib/structure'
import { ACT_IDS, chapterLabel, isActId, plural } from '../../lib/structure'
import type { Article, UserStore } from '../../types'
import { ACT_META, Emblem, actClass } from '../shell/identity'
import { href, replaceRoute } from '../shell/router'
import { SectionLabel } from '../shell/Shell'

const FOLD: Record<string, string> = { ą: 'a', ć: 'c', ę: 'e', ł: 'l', ń: 'n', ó: 'o', ś: 's', ź: 'z', ż: 'z' }

/** Same-length fold so match offsets map 1:1 back onto the original text. */
function fold(s: string) {
  let out = ''
  for (const ch of s.toLowerCase()) out += FOLD[ch] ?? ch
  return out
}

const ACT_ALIASES: [RegExp, ActId][] = [
  [/\b(upea|egzek\w*)\b/, 'upea'],
  [/\bkpa\b/, 'kpa'],
  [/\b(op|ordynacj\w*)\b/, 'ordynacja'],
]

export function parseArticleRef(q: string): { number: string; act?: ActId } | null {
  const f = fold(q)
  const m = f.match(/^\s*(?:art\.?\s*)?(\d+[a-z]{0,3})\b\s*(?:§\s*\d+[a-z]?)?\s*(?:pkt\s*\d+[a-z]?)?\s*(.*)$/)
  if (!m) return null
  const rest = (m[2] ?? '').replace(/\./g, '')
  const act = ACT_ALIASES.find(([re]) => re.test(rest))?.[1]
  if (rest.trim() && !act) return null
  return { number: m[1], act }
}

function terms(q: string) {
  return fold(q)
    .split(/[^\p{L}\p{N}]+/u)
    .filter((t) => t.length > 1)
    .map((t) => (t.length > 5 ? t.slice(0, t.length - 1) : t))
}

function markRanges(text: string, ts: string[]): ReactNode {
  const ft = fold(text)
  const ranges: [number, number][] = []
  for (const t of ts) {
    let i = ft.indexOf(t)
    while (i >= 0) {
      let e = i + t.length
      while (e < ft.length && /\p{L}/u.test(ft[e])) e++
      ranges.push([i, e])
      i = ft.indexOf(t, e)
    }
  }
  ranges.sort((a, b) => a[0] - b[0])
  const out: ReactNode[] = []
  let pos = 0
  ranges.forEach(([s, e], k) => {
    if (s < pos) return
    out.push(text.slice(pos, s))
    out.push(
      <mark key={k} className="hit">
        {text.slice(s, e)}
      </mark>,
    )
    pos = e
  })
  out.push(text.slice(pos))
  return out
}

function snippet(text: string, ts: string[]): ReactNode {
  const flat = text.replace(/\n/g, ' ')
  const ft = fold(flat)
  const first = ts.map((t) => ft.indexOf(t)).filter((i) => i >= 0).sort((a, b) => a - b)[0] ?? 0
  let start = Math.max(0, first - 50)
  if (start > 0) start = flat.lastIndexOf(' ', start) + 1
  let end = Math.min(flat.length, first + 160)
  if (end < flat.length) {
    const sp = flat.indexOf(' ', end)
    end = sp < 0 ? flat.length : sp
  }
  return (
    <>
      {start > 0 && '…'}
      {markRanges(flat.slice(start, end), ts)}
      {end < flat.length && '…'}
    </>
  )
}

const SUGGESTIONS = ['art. 33 upea', 'zarzut w sprawie egzekucji', 'doręczenie', 'przedawnienie zobowiązania', 'art. 7 kpa']

export function SearchScreen({
  lib,
  articles,
  store,
  initial,
  focusToken,
}: {
  lib: Library
  articles: Article[]
  store: UserStore
  initial: string
  focusToken: number
}) {
  const [q, setQ] = useState(initial)
  const [scope, setScope] = useState<ActFilter>('all')
  const [expanded, setExpanded] = useState<Record<string, boolean>>({})
  const input = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (focusToken) input.current?.focus()
  }, [focusToken])

  const ref = useMemo(() => parseArticleRef(q), [q])
  const refHits = useMemo(() => {
    if (!ref) return []
    const ids = ref.act ? [ref.act] : ACT_IDS
    return ids.map((id) => lib.acts[id]?.byNumber.get(ref.number)).filter((a): a is Article => !!a)
  }, [ref, lib])

  const hits = useMemo(
    () => (ref || !q.trim() ? [] : searchArticles(q, articles, store.tags, 'all')),
    [q, ref, articles, store.tags],
  )
  const ts = useMemo(() => terms(q), [q])

  const groups = useMemo(() => {
    const g: Record<ActId, SearchHit[]> = { upea: [], kpa: [], ordynacja: [] }
    for (const h of hits) {
      if (scope === 'tags' && h.kind !== 'tag') continue
      if (isActId(h.article.actId)) g[h.article.actId].push(h)
    }
    return g
  }, [hits, scope])
  const tagHitCount = hits.filter((h) => h.kind === 'tag').length

  function commit(v: string) {
    setQ(v)
    setExpanded({})
    replaceRoute(v ? `szukaj?q=${encodeURIComponent(v)}` : 'szukaj')
  }

  const chips: { id: ActFilter; label: string; count: number }[] = [
    { id: 'all', label: 'Wszystkie', count: hits.length },
    ...ACT_IDS.map((id) => ({ id: id as ActFilter, label: ACT_META[id].short, count: groups[id].length })),
    ...(store.tags.length ? [{ id: 'tags' as ActFilter, label: 'Moje tagi', count: tagHitCount }] : []),
  ]
  const visibleActs = ACT_IDS.filter(
    (id) => groups[id].length && (scope === 'all' || scope === 'tags' || scope === id),
  )
  const visibleTotal = visibleActs.reduce((n, id) => n + groups[id].length, 0)

  return (
    <div className="px-5 pt-2 md:px-8 md:pt-8">
      <h1 className="font-serif text-[32px] leading-tight font-semibold tracking-tight">Szukaj</h1>
      <div className="sticky top-14 z-10 -mx-5 bg-paper/90 px-5 pt-3 pb-3 backdrop-blur md:-mx-8 md:px-8">
        <label className="flex h-13 items-center gap-3 rounded-2xl border border-line bg-surface px-4 focus-within:border-ink/40">
          <SearchIcon className="size-5 text-muted" strokeWidth={1.8} />
          <input
            ref={input}
            value={q}
            onChange={(e) => commit(e.target.value)}
            placeholder="np. zarzut, doręczenie, art. 33 upea"
            aria-label="Szukaj w aktach"
            enterKeyHint="search"
            className="h-12 min-w-0 flex-1 bg-transparent text-[16px] outline-none placeholder:text-muted"
          />
          {q && (
            <button type="button" onClick={() => commit('')} aria-label="Wyczyść" className="text-muted">
              <X className="size-5" />
            </button>
          )}
        </label>
        {q && !ref && (
          <div className="no-scrollbar mt-3 flex gap-2 overflow-x-auto">
            {chips.map((c) => {
              const active = scope === c.id
              return (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => setScope(c.id)}
                  className={cn(
                    isActId(c.id) && actClass(c.id),
                    'flex shrink-0 items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-[13.5px] font-medium',
                    active ? 'border-ink bg-ink text-paper' : 'border-line bg-surface text-ink-2',
                  )}
                >
                  {isActId(c.id) && <Emblem act={c.id} className={cn('size-3.5', !active && 'text-act')} />}
                  {c.id === 'tags' && <Hash className="size-3.5" />}
                  {c.label}
                  <span className="tabular-nums opacity-60">{c.count}</span>
                </button>
              )
            })}
          </div>
        )}
      </div>

      {!q && (
        <div className="mt-2">
          {store.tags.length > 0 && (
            <>
              <SectionLabel className="mb-3">Twoje tagi</SectionLabel>
              <div className="mb-6 flex flex-wrap gap-2">
                {store.tags.slice(0, 10).map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => commit(t.label)}
                    className="rounded-full bg-gold-tint px-3 py-1.5 text-[13.5px] font-medium text-ink-2"
                  >
                    #{t.label}
                  </button>
                ))}
              </div>
            </>
          )}
          <SectionLabel className="mb-3">Spróbuj</SectionLabel>
          <div className="space-y-2">
            {SUGGESTIONS.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => commit(s)}
                className="flex w-full items-center justify-between rounded-xl border border-line bg-surface px-4 py-3 text-left text-[15px]"
              >
                {s}
                <ArrowRight className="size-4 text-muted" />
              </button>
            ))}
          </div>
          <p className="mt-5 text-[13px] leading-relaxed text-muted">
            Wpisz numer („art. 33”, „33 kpa”), słowo, całe wyrażenie albo swój tag. Wielkość liter i polskie znaki
            nie mają znaczenia. Regest szuka tylko w tekście ustaw i Twoich tagach — niczego nie dopowiada.
          </p>
        </div>
      )}

      {ref && (
        <div className="mt-3 space-y-3">
          <SectionLabel>Przepis</SectionLabel>
          {refHits.length === 0 && (
            <div className="rounded-2xl border border-dashed border-line p-6 text-center text-muted">
              Brak w bazie: art. {ref.number}
              {ref.act ? ` ${ACT_META[ref.act].short}` : ''}
            </div>
          )}
          {refHits.map((a) => (
            <RefCard key={a.id} lib={lib} article={a} />
          ))}
          {ref.act && (
            <div className="pt-3">
              <SectionLabel className="mb-2">Ten sam numer w innych aktach</SectionLabel>
              <div className="flex flex-wrap gap-2">
                {ACT_IDS.filter((id) => id !== ref.act)
                  .map((id) => lib.acts[id]?.byNumber.get(ref.number))
                  .filter((a): a is Article => !!a)
                  .map((a) => (
                    <a
                      key={a.id}
                      href={href(`art/${a.id}`)}
                      className={cn(
                        actClass(a.actId),
                        'flex items-center gap-2 rounded-xl border border-line bg-surface px-3 py-2 text-[13.5px]',
                      )}
                    >
                      <Emblem act={a.actId} className="size-4 text-act" />
                      <span className="font-semibold">
                        {a.label} {isActId(a.actId) ? ACT_META[a.actId].short : a.actId}
                      </span>
                      <span className="max-w-[9rem] truncate text-muted">{a.title}</span>
                    </a>
                  ))}
              </div>
            </div>
          )}
        </div>
      )}

      {q && !ref && (
        <div className="mt-2 space-y-8">
          {visibleTotal === 0 && (
            <div className="rounded-2xl border border-dashed border-line p-6 text-center text-muted">
              Brak w bazie dla „{q}”. Regest nie dopowiada — spróbuj innego słowa albo dodaj własny tag.
              <button
                type="button"
                onClick={() =>
                  window.dispatchEvent(new CustomEvent('egzepost:assign-tag', { detail: { label: q.trim() } }))
                }
                className="mx-auto mt-4 flex items-center gap-1.5 rounded-full bg-ink px-4 py-2 text-[13.5px] font-medium text-paper"
              >
                <Hash className="size-4" /> Utwórz tag „{q.trim()}”
              </button>
            </div>
          )}
          {visibleActs.map((id) => {
            const list = groups[id]
            const show = expanded[id] ? list : list.slice(0, 4)
            return (
              <section key={id} className={actClass(id)}>
                <div className="mb-2.5 flex items-center gap-2">
                  <span className="grid size-7 place-items-center rounded-lg bg-act text-white dark:text-black/80">
                    <Emblem act={id} className="size-4" />
                  </span>
                  <h2 className="font-serif text-[18px] font-semibold">{ACT_META[id].short}</h2>
                  <span className="text-[13px] text-muted tabular-nums">
                    {list.length} {plural(list.length, 'trafienie', 'trafienia', 'trafień')}
                  </span>
                </div>
                <div className="overflow-hidden rounded-2xl border border-line bg-surface">
                  {show.map((h) => {
                    const ch = lib.acts[id].chapterOf.get(h.article.id)
                    return (
                      <a
                        key={h.article.id}
                        href={href(`art/${h.article.id}`)}
                        className="block border-b border-line px-4 py-3.5 last:border-b-0 active:bg-sunk"
                      >
                        <div className="flex items-baseline gap-2">
                          <span className="shrink-0 font-serif text-[16px] font-semibold text-act">{h.article.label}</span>
                          <span className="truncate text-[14.5px] font-medium">
                            {h.article.title ? markRanges(h.article.title, ts) : ''}
                          </span>
                        </div>
                        {h.tag && (
                          <div className="mt-1 inline-flex rounded-full bg-gold-tint px-2 py-0.5 text-[12px] font-medium text-ink-2">
                            #{h.tag.label}
                          </div>
                        )}
                        <p className="law mt-1 text-[14.5px] leading-snug text-ink-2">{snippet(h.article.text, ts)}</p>
                        {ch && (
                          <div className="mt-1.5 truncate text-[11.5px] text-muted">
                            {chapterLabel(ch)} · {ch.title}
                          </div>
                        )}
                      </a>
                    )
                  })}
                </div>
                {list.length > 4 && !expanded[id] && (
                  <button
                    type="button"
                    onClick={() => setExpanded({ ...expanded, [id]: true })}
                    className="mt-2 w-full py-2 text-[13.5px] font-medium text-act"
                  >
                    Pokaż wszystkie {list.length}
                  </button>
                )}
              </section>
            )
          })}
        </div>
      )}
    </div>
  )
}

function RefCard({ lib, article: a }: { lib: Library; article: Article }) {
  const act = isActId(a.actId) ? lib.acts[a.actId] : undefined
  const ch = act?.chapterOf.get(a.id)
  const first = a.blocks[0]
  return (
    <a href={href(`art/${a.id}`)} className={cn(actClass(a.actId), 'block rounded-[22px] bg-act-tint p-5 text-act-ink')}>
      <div className="flex items-center gap-2 text-[12.5px] font-semibold">
        <Emblem act={a.actId} className="size-4 text-act" /> {act?.shortName}
        {ch && <span className="font-normal opacity-60">· {chapterLabel(ch)}</span>}
      </div>
      <div className="mt-3 flex flex-wrap items-baseline gap-x-2.5">
        <span className="font-serif text-[28px] leading-none font-semibold">{a.label}</span>
        <span className="text-[16px] font-medium">{a.title}</span>
      </div>
      <p className="law mt-3 line-clamp-3 text-[15px] leading-snug opacity-85">
        {first?.type === 'para' ? `${first.marker} ` : ''}
        {first?.text}
      </p>
      <div className="mt-4 flex items-center gap-1.5 text-[13.5px] font-semibold">
        Otwórz przepis <ArrowRight className="size-4" />
      </div>
    </a>
  )
}
