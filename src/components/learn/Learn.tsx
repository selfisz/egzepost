import { ArrowLeft, Layers, ListTree, Shuffle, Sparkles, Tags } from 'lucide-react'
import { useEffect, useMemo, useState, type ReactNode } from 'react'
import type { ActMeta, Article, LearnModule, UserStore } from '../../types'
import { ArticleBody } from '../article/ArticleBody'
import { ActBadge } from '../article/CrossRefPopover'
import { isDue, review, type Grade } from '../../lib/srs'
import { buildToc } from '../../lib/toc'
import {
  moduleProgress,
  resolveLearnModules,
  setProgress,
  upsertLearnModule,
} from '../../lib/storage'
import { cn } from '../../lib/cn'
import { segmentLegalText } from '../../lib/legal-highlight'
import { useToast } from '../ui/Toast'

type Props = {
  acts: ActMeta[]
  articles: Article[]
  store: UserStore
  onStoreChange: (next: UserStore) => void
  onXref: (actId: string, number: string) => void
}

type ScopeKind = 'module' | 'chapters' | 'queue' | 'random'
type LearnMode = 'fiszki' | 'test' | 'cloze'
type Phase = 'hub' | 'mode' | 'session'

const CLOZE_KINDS = new Set(['term', 'decision'])

type PreparedScope = {
  kind: ScopeKind
  label: string
  articleIds: string[]
}

export function Learn({ acts, articles, store, onStoreChange, onXref }: Props) {
  const toast = useToast()
  const modules = useMemo(() => resolveLearnModules(store), [store])
  const [phase, setPhase] = useState<Phase>('hub')
  const [scope, setScope] = useState<PreparedScope | null>(null)
  const [mode, setMode] = useState<LearnMode>('fiszki')
  const [builder, setBuilder] = useState<ScopeKind | null>(null)

  const queueIds = store.learnQueue ?? []

  function pickScope(next: PreparedScope) {
    if (next.articleIds.length === 0) {
      toast.push('Zakres jest pusty')
      return
    }
    setScope(next)
    setBuilder(null)
    setPhase('mode')
  }

  if (phase === 'session' && scope) {
    return (
      <Session
        scope={scope}
        mode={mode}
        acts={acts}
        articles={articles}
        store={store}
        onStoreChange={onStoreChange}
        onXref={onXref}
        onBack={() => setPhase('mode')}
      />
    )
  }

  if (phase === 'mode' && scope) {
    return (
      <ModePicker
        scope={scope}
        mode={mode}
        onMode={setMode}
        onBack={() => {
          setPhase('hub')
          setScope(null)
        }}
        onStart={() => setPhase('session')}
      />
    )
  }

  return (
    <section className="mx-auto w-full max-w-3xl px-4 pb-28 pt-4 md:pb-10 md:pt-8">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight">Ucz się</h1>
        <p className="mt-1 max-w-xl text-sm text-slate-500 dark:text-zinc-400">
          Najpierw zakres, potem tryb — nigdy sesja na całej bazie.
        </p>
      </div>

      <div className="mb-8 grid gap-2 sm:grid-cols-2">
        <ScopeCard
          icon={<Layers className="h-4 w-4" />}
          title="Moduł tematyczny"
          hint="Seedy i Twoje moduły"
          active={builder === 'module'}
          onClick={() => setBuilder(builder === 'module' ? null : 'module')}
        />
        <ScopeCard
          icon={<ListTree className="h-4 w-4" />}
          title="Wybrane rozdziały"
          hint="Jeden akt → Dział / Rozdział"
          active={builder === 'chapters'}
          onClick={() => setBuilder(builder === 'chapters' ? null : 'chapters')}
        />
        <ScopeCard
          icon={<Tags className="h-4 w-4" />}
          title="Wybrane artykuły"
          hint={
            queueIds.length
              ? `${queueIds.length} w zakresie nauki`
              : 'Dodaj z czytnika (⋯ → do nauki)'
          }
          active={builder === 'queue'}
          onClick={() => setBuilder(builder === 'queue' ? null : 'queue')}
        />
        <ScopeCard
          icon={<Shuffle className="h-4 w-4" />}
          title="Losowy zestaw"
          hint="N artykułów z aktu / działu"
          active={builder === 'random'}
          onClick={() => setBuilder(builder === 'random' ? null : 'random')}
        />
      </div>

      {builder === 'module' && (
        <ModuleScope
          modules={modules}
          store={store}
          acts={acts}
          onPick={(mod) =>
            pickScope({
              kind: 'module',
              label: mod.name,
              articleIds: mod.articleIds,
            })
          }
          onCreateFromTags={(mod) => {
            onStoreChange(upsertLearnModule(store, mod))
            pickScope({ kind: 'module', label: mod.name, articleIds: mod.articleIds })
            toast.push('Utworzono moduł z tagów')
          }}
          storeTags={store}
        />
      )}

      {builder === 'chapters' && (
        <ChapterScope
          acts={acts}
          articles={articles}
          onPick={(label, ids) => pickScope({ kind: 'chapters', label, articleIds: ids })}
        />
      )}

      {builder === 'queue' && (
        <QueueScope
          queueIds={queueIds}
          articles={articles}
          acts={acts}
          onPick={() =>
            pickScope({
              kind: 'queue',
              label: `Wybrane artykuły (${queueIds.length})`,
              articleIds: [...queueIds],
            })
          }
          onClear={() => onStoreChange({ ...store, learnQueue: [] })}
        />
      )}

      {builder === 'random' && (
        <RandomScope
          acts={acts}
          articles={articles}
          onPick={(label, ids) => pickScope({ kind: 'random', label, articleIds: ids })}
        />
      )}

      {!builder && (
        <div className="space-y-3">
          <h2 className="text-xs font-semibold uppercase tracking-wide text-slate-400">
            Szybki start — moduły
          </h2>
          {modules.slice(0, 6).map((mod) => {
            const { pct, total, mastered } = moduleProgress(store, mod.articleIds)
            const started = mod.articleIds.some((id) => store.progress[id])
            return (
              <button
                key={mod.id}
                type="button"
                onClick={() =>
                  pickScope({ kind: 'module', label: mod.name, articleIds: mod.articleIds })
                }
                className="flex w-full items-start justify-between gap-3 rounded-2xl border border-slate-200/80 bg-white/90 p-4 text-left hover:border-slate-300 dark:border-zinc-800 dark:bg-zinc-900/80"
              >
                <div className="min-w-0">
                  <div className="mb-1 flex flex-wrap items-center gap-2">
                    {mod.actId && mod.actId !== 'both' && (
                      <ActBadge actId={mod.actId} acts={acts} quiet />
                    )}
                    {mod.seeded && (
                      <span className="inline-flex items-center gap-1 text-[10px] font-medium text-slate-400">
                        <Sparkles className="h-3 w-3" /> seed
                      </span>
                    )}
                  </div>
                  <div className="font-semibold tracking-tight">{mod.name}</div>
                  <p className="mt-0.5 text-sm text-slate-500 dark:text-zinc-400">{mod.purpose}</p>
                  <p className="mt-2 font-mono text-[11px] text-slate-400">
                    {total} art. · {mastered} na blachę · {pct}%
                  </p>
                </div>
                <span className="shrink-0 rounded-xl bg-slate-900 px-3 py-2 text-xs font-semibold text-white dark:bg-zinc-100 dark:text-zinc-900">
                  {started ? 'Kontynuuj' : 'Wybierz'}
                </span>
              </button>
            )
          })}
        </div>
      )}
    </section>
  )
}

function ScopeCard({
  icon,
  title,
  hint,
  active,
  onClick,
}: {
  icon: ReactNode
  title: string
  hint: string
  active: boolean
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'flex items-start gap-3 rounded-2xl border px-3.5 py-3 text-left transition',
        active
          ? 'border-slate-900 bg-slate-900 text-white dark:border-zinc-100 dark:bg-zinc-100 dark:text-zinc-900'
          : 'border-slate-200/80 bg-white/90 hover:border-slate-300 dark:border-zinc-800 dark:bg-zinc-900/80',
      )}
    >
      <span className={cn('mt-0.5', active ? 'opacity-90' : 'text-slate-500')}>{icon}</span>
      <span>
        <span className="block text-sm font-semibold">{title}</span>
        <span
          className={cn(
            'mt-0.5 block text-xs',
            active ? 'opacity-80' : 'text-slate-500 dark:text-zinc-400',
          )}
        >
          {hint}
        </span>
      </span>
    </button>
  )
}

function ModuleScope({
  modules,
  store,
  acts,
  onPick,
  onCreateFromTags,
  storeTags,
}: {
  modules: LearnModule[]
  store: UserStore
  acts: ActMeta[]
  onPick: (mod: LearnModule) => void
  onCreateFromTags: (mod: LearnModule) => void
  storeTags: UserStore
}) {
  const [creating, setCreating] = useState(false)
  return (
    <div className="mb-8 space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold">Wybierz moduł</h2>
        <button
          type="button"
          className="text-sm text-slate-500 underline"
          onClick={() => setCreating((v) => !v)}
        >
          Z tagów
        </button>
      </div>
      {creating && (
        <CreateFromTags
          store={storeTags}
          onDone={onCreateFromTags}
          onCancel={() => setCreating(false)}
        />
      )}
      {modules.map((mod) => {
        const { pct, total } = moduleProgress(store, mod.articleIds)
        return (
          <button
            key={mod.id}
            type="button"
            onClick={() => onPick(mod)}
            className="flex w-full items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white px-3 py-3 text-left dark:border-zinc-800 dark:bg-zinc-900"
          >
            <div>
              <div className="flex items-center gap-2">
                {mod.actId && mod.actId !== 'both' && (
                  <ActBadge actId={mod.actId} acts={acts} quiet />
                )}
                <span className="font-medium">{mod.name}</span>
              </div>
              <p className="mt-0.5 text-xs text-slate-500">
                {total} art. · {pct}%
              </p>
            </div>
            <span className="text-xs font-semibold text-slate-500">Dalej →</span>
          </button>
        )
      })}
    </div>
  )
}

function ChapterScope({
  acts,
  articles,
  onPick,
}: {
  acts: ActMeta[]
  articles: Article[]
  onPick: (label: string, ids: string[]) => void
}) {
  const [actId, setActId] = useState(acts[0]?.id ?? 'upea')
  const [selected, setSelected] = useState<string[]>([])
  const actArticles = useMemo(
    () => articles.filter((a) => a.actId === actId),
    [articles, actId],
  )
  const toc = useMemo(() => buildToc(actArticles), [actArticles])

  function toggleChapter(label: string) {
    setSelected((prev) =>
      prev.includes(label) ? prev.filter((x) => x !== label) : [...prev, label],
    )
  }

  function confirm() {
    const ids = actArticles
      .filter((a) => a.chapter && selected.includes(a.chapter))
      .map((a) => a.id)
    const short = acts.find((a) => a.id === actId)?.shortName ?? actId
    onPick(`${short}: ${selected.length} dział(ów)`, ids)
  }

  return (
    <div className="mb-8 space-y-3 rounded-2xl border border-slate-200/80 bg-white/90 p-4 dark:border-zinc-800 dark:bg-zinc-900/80">
      <div className="flex flex-wrap gap-1.5">
        {acts.map((a) => (
          <button
            key={a.id}
            type="button"
            onClick={() => {
              setActId(a.id)
              setSelected([])
            }}
            className={cn(
              'rounded-full border px-3 py-1 text-sm',
              actId === a.id
                ? 'border-slate-900 bg-slate-900 text-white dark:border-zinc-100 dark:bg-zinc-100 dark:text-zinc-900'
                : 'border-slate-200 dark:border-zinc-700',
            )}
          >
            {a.shortName}
          </button>
        ))}
      </div>
      <div className="max-h-64 space-y-1 overflow-auto">
        {toc.map((ch) => {
          const count =
            ch.articles.length + ch.sections.reduce((n, s) => n + s.articles.length, 0)
          return (
            <label
              key={ch.id}
              className="flex cursor-pointer items-start gap-2 rounded-lg px-2 py-1.5 text-sm hover:bg-stone-50 dark:hover:bg-zinc-800"
            >
              <input
                type="checkbox"
                className="mt-1"
                checked={selected.includes(ch.label)}
                onChange={() => toggleChapter(ch.label)}
              />
              <span>
                <span className="font-medium leading-snug">{ch.label}</span>
                <span className="ml-2 font-mono text-[10px] text-slate-400">{count}</span>
              </span>
            </label>
          )
        })}
      </div>
      <button
        type="button"
        disabled={selected.length === 0}
        onClick={confirm}
        className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white disabled:opacity-40 dark:bg-zinc-100 dark:text-zinc-900"
      >
        Użyj zakresu ({selected.length} dział.)
      </button>
    </div>
  )
}

function QueueScope({
  queueIds,
  articles,
  acts,
  onPick,
  onClear,
}: {
  queueIds: string[]
  articles: Article[]
  acts: ActMeta[]
  onPick: () => void
  onClear: () => void
}) {
  const list = queueIds
    .map((id) => articles.find((a) => a.id === id))
    .filter(Boolean) as Article[]
  return (
    <div className="mb-8 space-y-3 rounded-2xl border border-slate-200/80 bg-white/90 p-4 dark:border-zinc-800 dark:bg-zinc-900/80">
      {list.length === 0 ? (
        <p className="text-sm text-slate-500">
          Zakres pusty. W czytniku: ⋯ → „Dodaj do zakresu nauki”.
        </p>
      ) : (
        <>
          <ul className="max-h-48 space-y-1 overflow-auto text-sm">
            {list.map((a) => (
              <li key={a.id} className="flex items-center gap-2">
                <ActBadge actId={a.actId} acts={acts} quiet />
                <span className="font-mono text-xs font-semibold">{a.label}</span>
                {a.title && <span className="truncate text-slate-500">· {a.title}</span>}
              </li>
            ))}
          </ul>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={onPick}
              className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white dark:bg-zinc-100 dark:text-zinc-900"
            >
              Użyj zakresu
            </button>
            <button type="button" onClick={onClear} className="rounded-xl px-3 py-2 text-sm text-slate-500">
              Wyczyść
            </button>
          </div>
        </>
      )}
    </div>
  )
}

function RandomScope({
  acts,
  articles,
  onPick,
}: {
  acts: ActMeta[]
  articles: Article[]
  onPick: (label: string, ids: string[]) => void
}) {
  const [actId, setActId] = useState<'all' | string>('upea')
  const [chapter, setChapter] = useState<string>('all')
  const [n, setN] = useState(12)

  const pool = useMemo(() => {
    let list = articles
    if (actId !== 'all') list = list.filter((a) => a.actId === actId)
    if (chapter !== 'all') list = list.filter((a) => a.chapter === chapter)
    return list
  }, [articles, actId, chapter])

  const chapters = useMemo(() => {
    const set = new Set<string>()
    for (const a of articles) {
      if (actId !== 'all' && a.actId !== actId) continue
      if (a.chapter) set.add(a.chapter)
    }
    return [...set]
  }, [articles, actId])

  function roll() {
    const shuffled = [...pool].sort(() => Math.random() - 0.5).slice(0, Math.min(n, pool.length))
    const short =
      actId === 'all' ? 'wszystkie' : (acts.find((a) => a.id === actId)?.shortName ?? actId)
    onPick(`Losowe ${shuffled.length} · ${short}`, shuffled.map((a) => a.id))
  }

  return (
    <div className="mb-8 space-y-3 rounded-2xl border border-slate-200/80 bg-white/90 p-4 dark:border-zinc-800 dark:bg-zinc-900/80">
      <div className="flex flex-wrap gap-1.5">
        <FilterChip active={actId === 'all'} onClick={() => { setActId('all'); setChapter('all') }}>
          Wszystkie
        </FilterChip>
        {acts.map((a) => (
          <FilterChip
            key={a.id}
            active={actId === a.id}
            onClick={() => {
              setActId(a.id)
              setChapter('all')
            }}
          >
            {a.shortName}
          </FilterChip>
        ))}
      </div>
      <select
        value={chapter}
        onChange={(e) => setChapter(e.target.value)}
        className="w-full rounded-xl border border-slate-200 bg-transparent px-3 py-2 text-sm dark:border-zinc-700"
      >
        <option value="all">Dowolny dział ({pool.length} art.)</option>
        {chapters.map((c) => (
          <option key={c} value={c}>
            {c}
          </option>
        ))}
      </select>
      <label className="flex items-center gap-3 text-sm">
        Liczba kart
        <input
          type="number"
          min={5}
          max={40}
          value={n}
          onChange={(e) => setN(Number(e.target.value) || 12)}
          className="w-20 rounded-lg border border-slate-200 px-2 py-1 font-mono dark:border-zinc-700"
        />
      </label>
      <button
        type="button"
        disabled={pool.length === 0}
        onClick={roll}
        className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white disabled:opacity-40 dark:bg-zinc-100 dark:text-zinc-900"
      >
        Wylosuj zakres
      </button>
    </div>
  )
}

function FilterChip({
  active,
  onClick,
  children,
}: {
  active: boolean
  onClick: () => void
  children: ReactNode
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'rounded-full border px-3 py-1 text-sm',
        active
          ? 'border-slate-900 bg-slate-900 text-white dark:border-zinc-100 dark:bg-zinc-100 dark:text-zinc-900'
          : 'border-slate-200 dark:border-zinc-700',
      )}
    >
      {children}
    </button>
  )
}

function ModePicker({
  scope,
  mode,
  onMode,
  onBack,
  onStart,
}: {
  scope: PreparedScope
  mode: LearnMode
  onMode: (m: LearnMode) => void
  onBack: () => void
  onStart: () => void
}) {
  return (
    <section className="mx-auto w-full max-w-lg px-4 pb-28 pt-4 md:pb-10 md:pt-8">
      <button
        type="button"
        onClick={onBack}
        className="mb-4 inline-flex items-center gap-1 text-sm text-slate-500"
      >
        <ArrowLeft className="h-4 w-4" /> Zmień zakres
      </button>
      <h1 className="text-2xl font-semibold tracking-tight">Tryb sesji</h1>
      <p className="mt-1 text-sm text-slate-500">
        Zakres: <strong className="text-slate-700 dark:text-zinc-200">{scope.label}</strong> ·{' '}
        {scope.articleIds.length} art.
      </p>
      <div className="mt-6 space-y-2">
        {(
          [
            ['fiszki', 'Fiszki', 'Zagadnienie → odsłoń przepis (domyślne)'],
            ['test', 'Test', 'Fragment → który artykuł?'],
            ['cloze', 'Cloze', 'Uzupełnij luki w cytacie'],
          ] as const
        ).map(([id, title, hint]) => (
          <button
            key={id}
            type="button"
            onClick={() => onMode(id)}
            className={cn(
              'flex w-full flex-col rounded-2xl border px-4 py-3 text-left',
              mode === id
                ? 'border-slate-900 bg-slate-900 text-white dark:border-zinc-100 dark:bg-zinc-100 dark:text-zinc-900'
                : 'border-slate-200 bg-white dark:border-zinc-800 dark:bg-zinc-900',
            )}
          >
            <span className="font-semibold">{title}</span>
            <span className={cn('text-xs', mode === id ? 'opacity-80' : 'text-slate-500')}>
              {hint}
            </span>
          </button>
        ))}
      </div>
      <button
        type="button"
        onClick={onStart}
        className="mt-6 w-full rounded-2xl bg-emerald-700 py-3.5 text-sm font-semibold text-white hover:bg-emerald-800 dark:bg-emerald-600"
      >
        Start sesji
      </button>
    </section>
  )
}

function CreateFromTags({
  store,
  onDone,
  onCancel,
}: {
  store: UserStore
  onDone: (mod: LearnModule) => void
  onCancel: () => void
}) {
  const [name, setName] = useState('')
  const [purpose, setPurpose] = useState('')
  const [tagIds, setTagIds] = useState<string[]>([])

  function save() {
    if (!name.trim() || tagIds.length === 0) return
    const articleIds = [
      ...new Set(tagIds.flatMap((id) => store.tags.find((t) => t.id === id)?.articleIds ?? [])),
    ]
    if (articleIds.length === 0) return
    onDone({
      id: `user_${crypto.randomUUID().slice(0, 8)}`,
      name: name.trim(),
      purpose: purpose.trim() || 'Moduł z Twoich tagów.',
      actId: 'both',
      articleIds,
      seeded: false,
      createdAt: new Date().toISOString(),
    })
  }

  return (
    <div className="space-y-3 rounded-xl border border-slate-200 bg-stone-50 p-3 dark:border-zinc-700 dark:bg-zinc-950">
      <input
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="Nazwa modułu"
        className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
      />
      <input
        value={purpose}
        onChange={(e) => setPurpose(e.target.value)}
        placeholder="Po co (jedno zdanie)"
        className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
      />
      <div className="max-h-36 space-y-1 overflow-auto">
        {store.tags.map((t) => (
          <label key={t.id} className="flex cursor-pointer items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={tagIds.includes(t.id)}
              onChange={() =>
                setTagIds((prev) =>
                  prev.includes(t.id) ? prev.filter((x) => x !== t.id) : [...prev, t.id],
                )
              }
            />
            {t.label}
            <span className="font-mono text-[10px] text-slate-400">{t.articleIds.length}</span>
          </label>
        ))}
      </div>
      <div className="flex gap-2">
        <button
          type="button"
          disabled={!name.trim() || tagIds.length === 0}
          onClick={save}
          className="rounded-xl bg-slate-900 px-3 py-2 text-sm font-semibold text-white disabled:opacity-40 dark:bg-zinc-100 dark:text-zinc-900"
        >
          Utwórz
        </button>
        <button type="button" className="px-3 py-2 text-sm" onClick={onCancel}>
          Anuluj
        </button>
      </div>
    </div>
  )
}

function Session({
  scope,
  mode,
  acts,
  articles,
  store,
  onStoreChange,
  onXref,
  onBack,
}: {
  scope: PreparedScope
  mode: LearnMode
  acts: ActMeta[]
  articles: Article[]
  store: UserStore
  onStoreChange: (next: UserStore) => void
  onXref: (actId: string, number: string) => void
  onBack: () => void
}) {
  const [revealed, setRevealed] = useState(false)
  const [showFull, setShowFull] = useState(false)
  const [cursor, setCursor] = useState(0)
  const [openedCloze, setOpenedCloze] = useState<Record<number, boolean>>({})
  const [guess, setGuess] = useState('')
  const [sessionDone, setSessionDone] = useState(0)

  const pool = useMemo(() => {
    const list = scope.articleIds
      .map((id) => articles.find((a) => a.id === id))
      .filter(Boolean) as Article[]
    const scored = list.map((a) => {
      const p = store.progress[a.id]
      return { a, due: !p || isDue(p), unseen: !p, dueAt: p?.dueAt ?? '' }
    })
    scored.sort((x, y) => {
      if (x.due !== y.due) return x.due ? -1 : 1
      if (x.unseen !== y.unseen) return x.unseen ? -1 : 1
      return x.dueAt.localeCompare(y.dueAt)
    })
    return scored.map((s) => s.a)
  }, [scope.articleIds, articles, store.progress])

  const sessionTotal = Math.min(12, Math.max(pool.length, 1))
  const card = pool.length ? pool[cursor % pool.length] : null
  const tagForCard = card
    ? store.tags.find((t) => t.articleIds.includes(card.id))
    : undefined

  const clozeSegments = useMemo(() => {
    if (!card) return []
    return segmentLegalText(card.excerpt || card.text.slice(0, 320))
  }, [card])

  const choices = useMemo(() => {
    if (!card) return []
    const others = pool
      .filter((a) => a.id !== card.id)
      .sort(() => Math.random() - 0.5)
      .slice(0, 2)
    return [card, ...others].sort(() => Math.random() - 0.5)
  }, [card, pool, cursor])

  useEffect(() => {
    setRevealed(false)
    setShowFull(false)
    setOpenedCloze({})
    setGuess('')
  }, [cursor, mode, card?.id])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return
      if (e.key === ' ' || e.code === 'Space') {
        e.preventDefault()
        setRevealed(true)
        return
      }
      if (!revealed || !card) return
      if (e.key === '1') grade('hard')
      if (e.key === '2') grade('good')
      if (e.key === '3') grade('easy')
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  })

  function grade(g: Grade) {
    if (!card) return
    onStoreChange(setProgress(store, review(store.progress[card.id], card.id, g)))
    setSessionDone((n) => n + 1)
    setCursor((c) => c + 1)
  }

  const pos = Math.min(sessionDone + 1, sessionTotal)
  const finished = sessionDone >= sessionTotal

  return (
    <section className="fixed inset-0 z-40 flex flex-col bg-stone-100 dark:bg-zinc-950 md:static md:z-auto md:min-h-[80vh] md:rounded-none md:bg-transparent">
      <div className="mx-auto flex w-full max-w-2xl flex-1 flex-col px-4 pb-8 pt-4 md:pb-16 md:pt-6">
        <div className="mb-4 flex items-start justify-between gap-3">
          <button
            type="button"
            onClick={onBack}
            className="inline-flex items-center gap-1 text-sm font-medium text-slate-600 dark:text-zinc-300"
          >
            <ArrowLeft className="h-4 w-4" /> Tryb
          </button>
          <div className="text-right">
            <p className="text-sm font-semibold">{scope.label}</p>
            <p className="text-xs capitalize text-slate-500">
              {mode} · {finished ? 'koniec' : `${pos} / ${sessionTotal}`}
            </p>
          </div>
        </div>

        <div className="mb-4 h-1 overflow-hidden rounded-full bg-slate-200/80 dark:bg-zinc-800">
          <div
            className="h-full rounded-full bg-emerald-600/90 transition-all"
            style={{ width: `${(Math.min(sessionDone, sessionTotal) / sessionTotal) * 100}%` }}
          />
        </div>

        {finished ? (
          <div className="flex flex-1 flex-col items-center justify-center rounded-3xl border border-slate-200/80 bg-white/90 p-8 text-center dark:border-zinc-800 dark:bg-zinc-900/80">
            <p className="text-lg font-semibold">Sesja zakończona</p>
            <p className="mt-1 text-sm text-slate-500">{sessionDone} ocen w zakresie „{scope.label}”</p>
            <button
              type="button"
              onClick={onBack}
              className="mt-6 rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white dark:bg-zinc-100 dark:text-zinc-900"
            >
              Wróć
            </button>
          </div>
        ) : !card ? (
          <div className="rounded-2xl border border-dashed border-rose-300 p-5 text-rose-800">
            <strong>brak w bazie</strong>
            <p className="text-sm">Brak artykułów w zakresie.</p>
          </div>
        ) : (
          <>
            <div
              key={`${card.id}-${mode}-${cursor}`}
              className="flex-1 rounded-3xl border border-slate-200/70 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900"
            >
              <div className="mb-3 flex items-center gap-2">
                <ActBadge actId={card.actId} acts={acts} quiet />
                {mode !== 'test' && revealed && (
                  <span className="font-mono text-lg font-bold">{card.label}</span>
                )}
                {mode !== 'test' && revealed && card.title && (
                  <span className="text-sm text-slate-500">· {card.title}</span>
                )}
              </div>

              {mode === 'fiszki' && (
                <div className="space-y-4">
                  <p className="text-sm text-slate-500">Przypomnij przepis:</p>
                  <p className="text-xl font-semibold tracking-tight">
                    {tagForCard?.label ??
                      card.title ??
                      card.section ??
                      card.chapter ??
                      acts.find((a) => a.id === card.actId)?.shortName}
                  </p>
                  {tagForCard?.note && <p className="text-sm text-slate-500">{tagForCard.note}</p>}
                  {!revealed ? (
                    <p className="text-sm text-slate-400">Spacja lub „Pokaż odpowiedź”</p>
                  ) : (
                    <ArticleBody
                      article={card}
                      plain
                      onXref={(raw) => {
                        const m = raw.match(/art(?:ykuł|\.)?\s*(\d+[a-z]?)/i)
                        if (m) onXref(card.actId, m[1])
                      }}
                    />
                  )}
                </div>
              )}

              {mode === 'test' && (
                <div className="space-y-4">
                  <p className="text-sm text-slate-500">Z którego artykułu pochodzi ten fragment?</p>
                  <blockquote className="max-w-2xl border-l-2 border-slate-300 pl-4 text-[15px] leading-relaxed text-slate-800 dark:border-zinc-600 dark:text-zinc-200">
                    {card.excerpt}
                  </blockquote>
                  {!revealed && (
                    <div className="space-y-2">
                      <div className="grid gap-2">
                        {choices.map((c) => (
                          <button
                            key={c.id}
                            type="button"
                            className="rounded-xl border border-slate-200 px-3 py-2 text-left text-sm hover:bg-slate-50 dark:border-zinc-700 dark:hover:bg-zinc-800"
                            onClick={() => {
                              setGuess(c.label)
                              setRevealed(true)
                            }}
                          >
                            <span className="font-mono font-semibold">
                              {acts.find((a) => a.id === c.actId)?.shortName} {c.label}
                            </span>
                            {c.title ? (
                              <span className="ml-1 text-slate-500">· {c.title}</span>
                            ) : null}
                          </button>
                        ))}
                      </div>
                      <input
                        value={guess}
                        onChange={(e) => setGuess(e.target.value)}
                        placeholder="lub wpisz numer, np. 33"
                        className="w-full rounded-xl border border-slate-200 bg-transparent px-3 py-2 text-sm dark:border-zinc-700"
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') setRevealed(true)
                        }}
                      />
                    </div>
                  )}
                  {revealed && (
                    <p className="text-lg font-bold text-emerald-700 dark:text-emerald-300">
                      <span className="font-mono">
                        {acts.find((a) => a.id === card.actId)?.shortName} {card.label}
                      </span>
                      {card.title ? ` · ${card.title}` : ''}
                    </p>
                  )}
                </div>
              )}

              {mode === 'cloze' && (
                <div className="max-w-2xl space-y-3 text-[15px] leading-relaxed">
                  <p className="text-sm text-slate-500">Uzupełnij luki w cytacie z ustawy:</p>
                  <p>
                    {clozeSegments.map((seg, i) => {
                      if (CLOZE_KINDS.has(seg.kind) && !openedCloze[i] && !revealed) {
                        return (
                          <button
                            key={i}
                            type="button"
                            className="mx-0.5 inline-flex min-w-[2.5rem] items-center justify-center rounded-md border border-dashed border-slate-300 bg-stone-50 px-2 py-0.5 font-mono text-sm text-slate-600 dark:border-zinc-600 dark:bg-zinc-950 dark:text-zinc-300"
                            onClick={() => setOpenedCloze((o) => ({ ...o, [i]: true }))}
                          >
                            ?
                          </button>
                        )
                      }
                      return <span key={i}>{seg.value}</span>
                    })}
                  </p>
                </div>
              )}

              {showFull && (
                <div className="mt-4 border-t border-slate-100 pt-4 dark:border-zinc-800">
                  <ArticleBody article={card} plain />
                </div>
              )}
            </div>

            <div className="mt-4 space-y-2">
              <button
                type="button"
                className="text-sm font-medium text-slate-600 dark:text-zinc-300"
                onClick={() => setShowFull((v) => !v)}
              >
                {showFull ? 'Ukryj pełny kontekst' : 'Pokaż pełny kontekst artykułu'}
              </button>

              {!revealed ? (
                <button
                  type="button"
                  className="w-full rounded-2xl bg-slate-900 py-3.5 text-sm font-semibold text-white dark:bg-zinc-100 dark:text-zinc-900"
                  onClick={() => setRevealed(true)}
                >
                  Pokaż odpowiedź <span className="ml-2 font-mono text-xs opacity-70">Spacja</span>
                </button>
              ) : (
                <div className="grid grid-cols-3 gap-2">
                  <GradeBtn label="Trudne" hint="1" tone="rose" onClick={() => grade('hard')} />
                  <GradeBtn label="Dobrze" hint="2" tone="amber" onClick={() => grade('good')} />
                  <GradeBtn label="Na blachę" hint="3" tone="emerald" onClick={() => grade('easy')} />
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </section>
  )
}

function GradeBtn({
  label,
  hint,
  tone,
  onClick,
}: {
  label: string
  hint: string
  tone: 'rose' | 'amber' | 'emerald'
  onClick: () => void
}) {
  const tones = {
    rose: 'border-rose-200/80 bg-rose-50/80 text-rose-900 dark:border-rose-900 dark:bg-rose-950 dark:text-rose-100',
    amber:
      'border-amber-200/80 bg-amber-50/80 text-amber-900 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-100',
    emerald:
      'border-emerald-200/80 bg-emerald-50/80 text-emerald-900 dark:border-emerald-900 dark:bg-emerald-950 dark:text-emerald-100',
  }
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn('rounded-2xl border px-2 py-3 text-center', tones[tone])}
    >
      <div className="text-sm font-semibold">{label}</div>
      <div className="font-mono text-[10px] opacity-70">{hint}</div>
    </button>
  )
}
